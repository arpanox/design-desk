const db = require('./database');

// Application folder structure
const APP_FOLDER_NAME = 'Design Desk App';
const SUBFOLDERS = ['Assets', 'Documents', 'Templates'];
const REQUIRED_SHEETS = [
    { name: 'Users', headers: ['ID', 'Name', 'Email', 'Role', 'Created At'] },
    { name: 'Projects', headers: ['ID', 'Name', 'Client', 'Status', 'Created At', 'Updated At'] },
    { name: 'Tasks', headers: ['ID', 'Project ID', 'Title', 'Description', 'Status', 'Assigned To', 'Due Date'] }
];

class AppStorageInitializer {
    constructor() {
        this.appFolderId = null;
        this.subFolderIds = {};
        this.sheetIds = {};
    }

    async initialize() {
        try {
            console.log('Initializing Design Desk App storage...');
            
            // Initialize database connection
            await db.initialize();
            
            // Create or get main application folder
            await this.createAppFolder();
            
            // Create subfolders
            await this.createSubFolders();
            
            // Create required sheets
            await this.createRequiredSheets();
            
            console.log('\nApplication storage initialized successfully!');
            console.log('\nFolder Structure:');
            console.log(`- ${APP_FOLDER_NAME} (${this.appFolderId})`);
            for (const [name, id] of Object.entries(this.subFolderIds)) {
                console.log(`  ├─ ${name} (${id})`);
            }
            console.log('\nSheets:');
            for (const [name, id] of Object.entries(this.sheetIds)) {
                console.log(`- ${name} (${id})`);
            }
        } catch (error) {
            console.error('Failed to initialize app storage:', error);
            throw error;
        }
    }

    async createAppFolder() {
        try {
            // Check if app folder already exists
            const files = await db.listFiles(`name = '${APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder'`);
            
            if (files.length > 0) {
                this.appFolderId = files[0].id;
                console.log(`Found existing app folder: ${APP_FOLDER_NAME} (${this.appFolderId})`);
            } else {
                // Create new app folder
                const folder = await db.drive.files.create({
                    requestBody: {
                        name: APP_FOLDER_NAME,
                        mimeType: 'application/vnd.google-apps.folder'
                    }
                });
                this.appFolderId = folder.data.id;
                console.log(`Created new app folder: ${APP_FOLDER_NAME} (${this.appFolderId})`);
            }
        } catch (error) {
            console.error('Error creating app folder:', error);
            throw error;
        }
    }

    async createSubFolders() {
        try {
            for (const folderName of SUBFOLDERS) {
                // Check if subfolder exists
                const files = await db.listFiles(
                    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${this.appFolderId}' in parents`
                );

                if (files.length > 0) {
                    this.subFolderIds[folderName] = files[0].id;
                    console.log(`Found existing subfolder: ${folderName} (${files[0].id})`);
                } else {
                    // Create new subfolder
                    const folder = await db.drive.files.create({
                        requestBody: {
                            name: folderName,
                            mimeType: 'application/vnd.google-apps.folder',
                            parents: [this.appFolderId]
                        }
                    });
                    this.subFolderIds[folderName] = folder.data.id;
                    console.log(`Created new subfolder: ${folderName} (${folder.data.id})`);
                }
            }
        } catch (error) {
            console.error('Error creating subfolders:', error);
            throw error;
        }
    }

    async createRequiredSheets() {
        try {
            for (const sheet of REQUIRED_SHEETS) {
                // Check if sheet exists
                const files = await db.listFiles(
                    `name = '${sheet.name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and '${this.appFolderId}' in parents`
                );

                if (files.length > 0) {
                    this.sheetIds[sheet.name] = files[0].id;
                    console.log(`Found existing sheet: ${sheet.name} (${files[0].id})`);
                    
                    // Verify headers
                    const headers = await db.readSheet(files[0].id, 'A1:Z1');
                    if (!headers || !this.arraysEqual(headers[0], sheet.headers)) {
                        await db.writeSheet(files[0].id, 'A1:Z1', [sheet.headers]);
                        console.log(`Updated headers for: ${sheet.name}`);
                    }
                } else {
                    // Create new sheet
                    const newSheet = await db.sheets.spreadsheets.create({
                        requestBody: {
                            properties: {
                                title: sheet.name
                            }
                        }
                    });
                    
                    // Move to app folder
                    await db.drive.files.update({
                        fileId: newSheet.data.spreadsheetId,
                        addParents: this.appFolderId,
                        fields: 'id, parents'
                    });
                    
                    // Add headers
                    await db.writeSheet(newSheet.data.spreadsheetId, 'A1:Z1', [sheet.headers]);
                    
                    this.sheetIds[sheet.name] = newSheet.data.spreadsheetId;
                    console.log(`Created new sheet: ${sheet.name} (${newSheet.data.spreadsheetId})`);
                }
            }
        } catch (error) {
            console.error('Error creating sheets:', error);
            throw error;
        }
    }

    arraysEqual(a, b) {
        return Array.isArray(a) && Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index]);
    }
}

// Run the initialization
const initializer = new AppStorageInitializer();
initializer.initialize(); 