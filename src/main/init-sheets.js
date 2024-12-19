const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load service account credentials
function loadCredentials() {
    try {
        const credentialsPath = path.join(__dirname, 'service-account.json');
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        return credentials;
    } catch (error) {
        console.error('Error loading credentials:', error);
        throw error;
    }
}

// Sheet definitions
const SHEETS = {
    USERS: {
        name: 'Users',
        headers: ['ID', 'Name', 'Email', 'Role', 'Password', 'Created At']
    },
    PROJECTS: {
        name: 'Projects',
        headers: ['ID', 'Title', 'Start Date', 'End Date', 'Project Type', 'Total Hours', 'Consumed Hours', 'Designer ID', 'Designer Name', 'Manager ID', 'Manager Name', 'Basecamp Link', 'Status']
    },
    TEAM_MEMBERS: {
        name: 'Team Members',
        headers: ['ID', 'Name', 'Role', 'Status', 'Current Project ID', 'Skills', 'Created At', 'Updated At']
    }
};

async function initializeSheets() {
    try {
        console.log('Initializing Google Sheets...');

        const credentials = loadCredentials();

        // Create JWT client
        const auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
        );

        // Initialize services
        const sheets = google.sheets({ version: 'v4', auth });
        const drive = google.drive({ version: 'v3', auth });

        // Create main spreadsheet
        console.log('Creating main spreadsheet...');
        const spreadsheet = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: 'Design Desk App'
                },
                sheets: Object.values(SHEETS).map(sheet => ({
                    properties: {
                        title: sheet.name
                    }
                }))
            }
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;
        console.log('Spreadsheet created with ID:', spreadsheetId);

        // Add headers to each sheet
        for (const sheet of Object.values(SHEETS)) {
            console.log(`Adding headers to ${sheet.name}...`);
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheet.name}!A1:Z1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [sheet.headers]
                }
            });
        }

        // Add initial manager user
        console.log('Adding initial manager user...');
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Users!A2',
            valueInputOption: 'RAW',
            resource: {
                values: [[
                    'MGR001',
                    'Satish',
                    'admin@designdesk.com',
                    'Manager',
                    '12345',
                    new Date().toISOString()
                ]]
            }
        });

        console.log('Sheets initialized successfully!');
        return spreadsheetId;
    } catch (error) {
        console.error('Error initializing sheets:', error);
        throw error;
    }
}

// Run initialization
console.log('Starting sheets initialization...');
initializeSheets()
    .then(spreadsheetId => {
        console.log('All done! Spreadsheet ID:', spreadsheetId);
    })
    .catch(error => {
        console.error('Failed to initialize sheets:', error);
    }); 