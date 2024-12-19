const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const https = require('https');

let auth = null;
let sheets = null;
let drive = null;
let appFolderId = null;

// Check if we're in development mode
const isDev = process.argv.includes('--dev');

// Check internet connectivity with retry mechanism
async function checkInternetConnection(retries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await new Promise((resolve, reject) => {
                const request = https.get('https://www.google.com', (res) => {
                    if (res.statusCode === 200) {
                        resolve(true);
                    } else {
                        reject(new Error(`HTTP status ${res.statusCode}`));
                    }
                    res.resume();
                });

                request.on('error', (err) => {
                    console.error(`Connection attempt ${attempt} failed:`, err.message);
                    reject(err);
                });

                request.setTimeout(5000, () => {
                    request.destroy();
                    reject(new Error('Connection timeout'));
                });
            });

            if (result) return true;
        } catch (error) {
            console.error(`Connection attempt ${attempt}/${retries} failed:`, error.message);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return false;
}

// Load service account credentials
function loadCredentials() {
    if (isDev) {
        console.log('Running in development mode - skipping Google API initialization');
        return null;
    }
    try {
        const credentialsPath = path.join(__dirname, 'service-account.json');
        if (!fs.existsSync(credentialsPath)) {
            throw new Error('Service account credentials not found');
        }
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        return credentials;
    } catch (error) {
        console.error('Error loading credentials:', error);
        throw error;
    }
}

// Find or get Design Desk App folder
async function getAppFolder() {
    if (!appFolderId) {
        const response = await drive.files.list({
            q: "name='Design Desk App' and mimeType='application/vnd.google-apps.folder'",
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.data.files.length > 0) {
            appFolderId = response.data.files[0].id;
        }
    }
    return appFolderId;
}

async function checkDatabaseStatus() {
    try {
        // Check internet connectivity
        const isOnline = await checkInternetConnection();
        if (!isOnline) {
            return {
                connected: false,
                error: 'No internet connection'
            };
        }

        // Initialize if not already initialized
        if (!auth) {
            await initialize();
        }

        // Check app folder
        const folderId = await getAppFolder();
        if (!folderId) {
            return {
                connected: true,
                sheetsAccessible: false,
                error: 'Design Desk App folder not found'
            };
        }

        // Check required sheets
        const requiredSheets = ['Users', 'Projects', 'Team Members'];
        const sheetsStatus = await Promise.all(
            requiredSheets.map(async (sheetName) => {
                const files = await drive.files.list({
                    q: `name='${sheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents`,
                    fields: 'files(id, name)',
                    spaces: 'drive'
                });
                return {
                    name: sheetName,
                    exists: files.data.files.length > 0,
                    id: files.data.files[0]?.id
                };
            })
        );

        const missingSheets = sheetsStatus.filter(sheet => !sheet.exists);
        if (missingSheets.length > 0) {
            return {
                connected: true,
                sheetsAccessible: false,
                error: `Missing sheets: ${missingSheets.map(s => s.name).join(', ')}`
            };
        }

        return {
            connected: true,
            sheetsAccessible: true,
            sheetIds: Object.fromEntries(sheetsStatus.map(s => [s.name, s.id]))
        };
    } catch (error) {
        console.error('Database status check error:', error);
        return {
            connected: false,
            sheetsAccessible: false,
            error: error.message
        };
    }
}

// Initialize the database connection
async function initialize() {
    if (isDev) {
        console.log('Running in development mode - skipping database initialization');
        return;
    }
    try {
        const credentials = loadCredentials();
        if (!credentials) return;
        
        auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
        );

        sheets = google.sheets({ version: 'v4', auth });
        drive = google.drive({ version: 'v3', auth });

        // Get the app folder
        await getAppFolder();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

async function findSheet(sheetName) {
    try {
        if (!auth || !drive) {
            await initialize();
        }

        const folderId = await getAppFolder();
        if (!folderId) {
            return null;
        }

        const files = await drive.files.list({
            q: `name='${sheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });
        
        if (files.data.files.length > 0) {
            return files.data.files[0].id;
        }
        
        return null;
    } catch (error) {
        console.error(`Error finding sheet ${sheetName}:`, error);
        return null;
    }
}

async function readSheet(sheetId, range) {
    try {
        if (!auth || !sheets) {
            await initialize();
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range,
        });
        return response.data.values;
    } catch (error) {
        console.error('Error reading sheet:', error);
        throw error;
    }
}

async function appendSheet(sheetId, range, values) {
    try {
        if (!auth || !sheets) {
            await initialize();
        }

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range,
            valueInputOption: 'RAW',
            resource: { values },
        });
        return response.data;
    } catch (error) {
        console.error('Error appending to sheet:', error);
        throw error;
    }
}

async function writeSheet(sheetId, range, values) {
    try {
        if (!auth || !sheets) {
            await initialize();
        }

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range,
            valueInputOption: 'RAW',
            resource: { values },
        });
        return response.data;
    } catch (error) {
        console.error('Error writing to sheet:', error);
        throw error;
    }
}

// Get auth object for direct API access
function getAuth() {
    if (!auth) {
        const credentials = loadCredentials();
        auth = new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file']
        );
    }
    return auth;
}

// Create task sheet for a project
async function createTaskSheet(projectId, projectTitle) {
    try {
        if (!auth || !sheets || !drive) {
            await initialize();
        }

        const folderId = await getAppFolder();
        if (!folderId) {
            throw new Error('Design Desk App folder not found');
        }

        // Check if task sheet already exists
        const taskSheetName = `Tasks_${projectId}`;
        const existingSheet = await findSheet(taskSheetName);
        if (existingSheet) {
            return existingSheet;
        }

        // Create new spreadsheet
        const spreadsheet = await sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: taskSheetName
                },
                sheets: [{
                    properties: {
                        title: 'Tasks',
                        gridProperties: {
                            frozenRowCount: 1
                        }
                    }
                }]
            }
        });

        const sheetId = spreadsheet.data.spreadsheetId;

        // Move to Design Desk App folder
        await drive.files.update({
            fileId: sheetId,
            addParents: folderId,
            fields: 'id, parents'
        });

        // Add headers
        const headers = [
            'Task ID',
            'Title',
            'Description',
            'Status',
            'Assigned To',
            'Start Date',
            'Due Date',
            'Completed Date',
            'Hours Spent',
            'Priority',
            'Comments',
            'Created At',
            'Updated At'
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'A1:M1',
            valueInputOption: 'RAW',
            resource: {
                values: [headers]
            }
        });

        // Add metadata row
        const metadata = [
            'Project Info',
            projectId,
            projectTitle,
            new Date().toISOString(),
            '', '', '', '', '', '', '', '', ''
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            resource: {
                values: [metadata]
            }
        });

        console.log(`Created task sheet for project ${projectId}`);
        return sheetId;
    } catch (error) {
        console.error('Error creating task sheet:', error);
        throw error;
    }
}

// Get task sheet ID for a project
async function getTaskSheet(projectId) {
    try {
        const taskSheetName = `Tasks_${projectId}`;
        return await findSheet(taskSheetName);
    } catch (error) {
        console.error('Error getting task sheet:', error);
        throw error;
    }
}

// Add task to project's task sheet
async function addTask(projectId, task) {
    try {
        const sheetId = await getTaskSheet(projectId);
        if (!sheetId) {
            throw new Error(`Task sheet not found for project ${projectId}`);
        }

        const taskData = [
            task.id || `TSK${Date.now()}`,
            task.title,
            task.description,
            task.status || 'New',
            task.assignedTo,
            task.startDate,
            task.dueDate,
            task.completedDate || '',
            task.hoursSpent || 0,
            task.priority || 'Medium',
            task.comments || '',
            new Date().toISOString(),
            new Date().toISOString()
        ];

        await appendSheet(sheetId, 'A:M', [taskData]);
        return taskData[0]; // Return task ID
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
}

// Get tasks for a project
async function getProjectTasks(projectId) {
    try {
        const sheetId = await getTaskSheet(projectId);
        if (!sheetId) {
            return [];
        }

        const data = await readSheet(sheetId, 'A:M');
        if (!data || data.length < 3) { // Account for headers and metadata
            return [];
        }

        const headers = data[0];
        return data.slice(2).map(row => {
            const task = {};
            headers.forEach((header, index) => {
                task[header.toLowerCase().replace(/ /g, '_')] = row[index];
            });
            return task;
        });
    } catch (error) {
        console.error('Error getting project tasks:', error);
        throw error;
    }
}

// Update task in project's task sheet
async function updateTask(projectId, taskId, updates) {
    try {
        const sheetId = await getTaskSheet(projectId);
        if (!sheetId) {
            throw new Error(`Task sheet not found for project ${projectId}`);
        }

        const data = await readSheet(sheetId, 'A:M');
        if (!data || data.length < 3) {
            throw new Error('Task sheet is empty or malformed');
        }

        const taskRowIndex = data.findIndex(row => row[0] === taskId);
        if (taskRowIndex < 2) { // Account for headers and metadata
            throw new Error(`Task ${taskId} not found`);
        }

        const currentTask = data[taskRowIndex];
        const updatedTask = [...currentTask];

        // Update fields
        if (updates.title) updatedTask[1] = updates.title;
        if (updates.description) updatedTask[2] = updates.description;
        if (updates.status) updatedTask[3] = updates.status;
        if (updates.assignedTo) updatedTask[4] = updates.assignedTo;
        if (updates.startDate) updatedTask[5] = updates.startDate;
        if (updates.dueDate) updatedTask[6] = updates.dueDate;
        if (updates.completedDate) updatedTask[7] = updates.completedDate;
        if (updates.hoursSpent) updatedTask[8] = updates.hoursSpent;
        if (updates.priority) updatedTask[9] = updates.priority;
        if (updates.comments) updatedTask[10] = updates.comments;
        updatedTask[12] = new Date().toISOString(); // Updated At

        await writeSheet(sheetId, `A${taskRowIndex + 1}:M${taskRowIndex + 1}`, [updatedTask]);
        return true;
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
}

module.exports = {
    initialize,
    findSheet,
    readSheet,
    appendSheet,
    writeSheet,
    checkInternetConnection,
    checkDatabaseStatus,
    getAuth,
    createTaskSheet,
    getTaskSheet,
    addTask,
    getProjectTasks,
    updateTask
}; 