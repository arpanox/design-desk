const db = require('./database');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Sheet structure definitions (no test data)
const SHEETS = {
    USERS: {
        name: 'Users',
        headers: ['ID', 'Name', 'Email', 'Role', 'Password', 'Status']
    },
    PROJECTS: {
        name: 'Projects',
        headers: ['ID', 'Title', 'Start Date', 'End Date', 'Project Type', 'Total Hours', 'Consumed Hours', 
                 'Designer ID', 'Designer Name', 'Manager ID', 'Manager Name', 'Basecamp Link', 'Status']
    },
    TEAM_MEMBERS: {
        name: 'Team Members',
        headers: ['ID', 'Name', 'Role', 'Status', 'Current Project ID', 'Created At', 'Updated At']
    }
};

async function verifySheetStructure(drive, sheets, folderId, sheetConfig) {
    try {
        // Check for existing sheet
        const response = await drive.files.list({
            q: `name='${sheetConfig.name}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.data.files.length === 0) {
            console.log(`✗ ${sheetConfig.name} sheet not found`);
            return false;
        }

        const sheetId = response.data.files[0].id;
        console.log(`✓ Found ${sheetConfig.name} sheet:`, sheetId);
        
        // Verify headers
        const data = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'A1:Z1'
        });

        if (!data.data.values || data.data.values.length === 0) {
            console.log(`✗ ${sheetConfig.name} sheet is empty`);
            return false;
        }

        const headers = data.data.values[0];
        const missingHeaders = sheetConfig.headers.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
            console.log(`✗ ${sheetConfig.name} sheet is missing headers:`, missingHeaders);
            return false;
        }

        console.log(`✓ ${sheetConfig.name} sheet structure verified`);
        return true;
    } catch (error) {
        console.error(`Error verifying ${sheetConfig.name} sheet:`, error.message);
        return false;
    }
}

async function testDatabaseConnection() {
    try {
        console.log('Testing database connection...');
        
        // Test initialization
        await db.initialize();
        console.log('✓ Database initialized successfully');

        // Find Design Desk App folder
        console.log('\nChecking for Design Desk App folder...');
        const drive = google.drive({ version: 'v3', auth: db.getAuth() });
        const sheets = google.sheets({ version: 'v4', auth: db.getAuth() });
        
        const folderResponse = await drive.files.list({
            q: "name='Design Desk App' and mimeType='application/vnd.google-apps.folder'",
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (folderResponse.data.files.length === 0) {
            throw new Error('Design Desk App folder not found');
        }

        const folderId = folderResponse.data.files[0].id;
        console.log('✓ Found Design Desk App folder:', folderId);

        // Verify all sheet structures
        console.log('\nVerifying sheet structures...');
        let allSheetsValid = true;
        for (const sheetConfig of Object.values(SHEETS)) {
            const isValid = await verifySheetStructure(drive, sheets, folderId, sheetConfig);
            if (!isValid) {
                allSheetsValid = false;
            }
        }

        if (!allSheetsValid) {
            throw new Error('One or more sheets have invalid structure');
        }

        // List all files in Design Desk App folder
        console.log('\nListing all files in Design Desk App folder:');
        const filesResponse = await drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name, mimeType)',
            spaces: 'drive'
        });

        filesResponse.data.files.forEach(file => {
            console.log(`- ${file.name} (${file.id}): ${file.mimeType}`);
        });
        
        console.log('\n✓ Database connection test completed successfully!');
        
    } catch (error) {
        console.error('\nDatabase test failed:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        process.exit(1);
    }
}

// Run the test
console.log('Starting database connection test...');
testDatabaseConnection(); 