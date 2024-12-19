const db = require('./database');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Data verification utilities
function findDuplicates(array, key) {
    const counts = {};
    const duplicates = [];
    
    array.forEach((item, index) => {
        if (index === 0) return; // Skip header row
        const value = item[key];
        counts[value] = (counts[value] || 0) + 1;
        if (counts[value] > 1) {
            duplicates.push(value);
        }
    });
    
    return [...new Set(duplicates)];
}

function verifyDataIntegrity(usersData, projectsData, teamData) {
    console.log('\nPerforming data integrity checks:');
    
    // Check for duplicates in critical fields
    const userDuplicates = findDuplicates(usersData, 1); // Check names
    const emailDuplicates = findDuplicates(usersData, 2); // Check emails
    const projectDuplicates = findDuplicates(projectsData, 1); // Check project titles
    
    if (userDuplicates.length > 0) {
        console.log('Warning: Duplicate user names found:', userDuplicates);
    }
    if (emailDuplicates.length > 0) {
        console.log('Warning: Duplicate emails found:', emailDuplicates);
    }
    if (projectDuplicates.length > 0) {
        console.log('Warning: Duplicate project titles found:', projectDuplicates);
    }
    
    // Verify user references in projects
    const userIds = new Set(usersData.slice(1).map(user => user[0]));
    const invalidProjects = projectsData.slice(1).filter(project => {
        const designerId = project[7];
        const managerId = project[9];
        return !userIds.has(designerId) || !userIds.has(managerId);
    });
    
    if (invalidProjects.length > 0) {
        console.log('Warning: Found projects with invalid user references:', 
            invalidProjects.map(p => p[1]).join(', '));
    }
    
    // Verify team member data consistency
    const teamIds = new Set(teamData.slice(1).map(member => member[0]));
    const designerIds = new Set(usersData.slice(1)
        .filter(user => user[3].includes('Designer'))
        .map(user => user[0]));
    
    const missingTeamMembers = [...designerIds].filter(id => !teamIds.has(id));
    if (missingTeamMembers.length > 0) {
        console.log('Warning: Designers missing from team sheet:', missingTeamMembers);
    }

    // Verify admin exists
    const hasAdmin = usersData.slice(1).some(user => user[3].includes('Admin'));
    if (!hasAdmin) {
        console.log('Warning: No Admin found in users');
    }
    
    return {
        hasDuplicates: userDuplicates.length > 0 || emailDuplicates.length > 0 || projectDuplicates.length > 0,
        hasInvalidReferences: invalidProjects.length > 0,
        hasMissingTeamMembers: missingTeamMembers.length > 0,
        hasNoAdmin: !hasAdmin
    };
}

async function shareWithUser(drive, fileId, userEmail) {
    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'writer',
                type: 'user',
                emailAddress: userEmail
            }
        });
        console.log(`Shared with ${userEmail} successfully`);
    } catch (error) {
        console.error(`Error sharing with ${userEmail}:`, error);
    }
}

async function createAppFolder() {
    try {
        // Load credentials
        const credentialsPath = path.join(__dirname, 'service-account.json');
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        
        // Create auth client
        const auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            [
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/drive'
            ]
        );
        
        // Initialize drive
        const drive = google.drive({ version: 'v3', auth });
        
        // Get user email from environment
        const userEmail = process.env.GOOGLE_USER_EMAIL;
        if (!userEmail) {
            throw new Error('Please set GOOGLE_USER_EMAIL environment variable');
        }

        // Check if folder exists
        const folderResponse = await drive.files.list({
            q: "name='Design Desk App' and mimeType='application/vnd.google-apps.folder'",
            fields: 'files(id, name, webViewLink)'
        });

        let folderId;
        let folderUrl;

        if (folderResponse.data.files.length > 0) {
            folderId = folderResponse.data.files[0].id;
            folderUrl = folderResponse.data.files[0].webViewLink;
            console.log('Found existing Design Desk App folder');
        } else {
            // Create folder
            const folderMetadata = {
                name: 'Design Desk App',
                mimeType: 'application/vnd.google-apps.folder'
            };

            const folder = await drive.files.create({
                resource: folderMetadata,
                fields: 'id, webViewLink'
            });

            folderId = folder.data.id;
            folderUrl = folder.data.webViewLink;
            console.log('Created new Design Desk App folder');
        }

        // Share folder with user
        await shareWithUser(drive, folderId, userEmail);

        // Create sheets if they don't exist
        const sheets = ['Users', 'Projects', 'Team Members'];
        for (const sheetName of sheets) {
            const sheetResponse = await drive.files.list({
                q: `name='${sheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents`,
                fields: 'files(id, name, webViewLink)'
            });

            let sheetId;
            if (sheetResponse.data.files.length === 0) {
                const sheetMetadata = {
                    name: sheetName,
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    parents: [folderId]
                };

                const sheet = await drive.files.create({
                    resource: sheetMetadata,
                    fields: 'id, webViewLink'
                });

                sheetId = sheet.data.id;
                console.log(`Created ${sheetName} sheet: ${sheet.data.webViewLink}`);
            } else {
                sheetId = sheetResponse.data.files[0].id;
                console.log(`Found existing ${sheetName} sheet: ${sheetResponse.data.files[0].webViewLink}`);
            }

            // Share sheet with user
            await shareWithUser(drive, sheetId, userEmail);
        }

        console.log('\nGoogle Drive Folder URL:', folderUrl);
        console.log(`All files have been shared with: ${userEmail}`);
        
        return folderId;
    } catch (error) {
        console.error('Error creating/finding app folder:', error);
        throw error;
    }
}

async function initializeData() {
    try {
        console.log('Creating/Finding Google Drive folder...');
        await createAppFolder();

        console.log('\nInitializing database...');
        await db.initialize();

        // Get sheet IDs
        const usersSheetId = await db.findSheet('Users');
        const projectsSheetId = await db.findSheet('Projects');
        const teamSheetId = await db.findSheet('Team Members');

        if (!usersSheetId || !projectsSheetId || !teamSheetId) {
            throw new Error('One or more required sheets not found');
        }

        // Read existing data
        let usersData = await db.readSheet(usersSheetId, 'A:F');
        let projectsData = await db.readSheet(projectsSheetId, 'A:M');
        let teamData = await db.readSheet(teamSheetId, 'A:G');

        if (!usersData || !projectsData || !teamData) {
            throw new Error('Failed to read data from one or more sheets');
        }

        // Verify data integrity
        const integrityResults = verifyDataIntegrity(usersData, projectsData, teamData);
        if (integrityResults.hasDuplicates || integrityResults.hasInvalidReferences || 
            integrityResults.hasMissingTeamMembers || integrityResults.hasNoAdmin) {
            console.log('\nWarning: Data integrity issues found. Please review the warnings above.');
            const proceed = process.env.FORCE_UPDATE === 'true';
            if (!proceed) {
                throw new Error('Data integrity checks failed. Set FORCE_UPDATE=true to override.');
            }
            console.log('Proceeding with update due to FORCE_UPDATE=true');
        }

        console.log('\nData verification completed successfully!');
        console.log('✓ All data integrity checks completed');
    } catch (error) {
        console.error('Error initializing data:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeData(); 