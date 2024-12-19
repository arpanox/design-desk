const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const url = require('url');

// Debug logging function
function debugLog(...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, ...args);
    
    try {
        // Log to file in both dev and prod
        const logPath = app.isPackaged 
            ? path.join(process.resourcesPath, 'logs', 'app.log')
            : path.join(__dirname, '../../logs/app.log');
        
        const logDir = path.dirname(logPath);
        
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(logPath, `[${timestamp}] ${JSON.stringify(args)}\n`);
    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
}

// Get the correct app path for resources
const getResourcePath = (relativePath) => {
    try {
        let resourcePath;
        if (app.isPackaged) {
            resourcePath = path.join(process.resourcesPath, relativePath);
            // Check if the path exists, if not try the app.getAppPath() location
            if (!fs.existsSync(resourcePath)) {
                resourcePath = path.join(app.getAppPath(), relativePath);
            }
        } else {
            resourcePath = path.join(__dirname, '../../', relativePath);
        }

        debugLog('Resource path resolution:', {
            relativePath,
            resourcePath,
            exists: fs.existsSync(resourcePath),
            isPackaged: app.isPackaged
        });

        return resourcePath;
    } catch (error) {
        debugLog('Error in getResourcePath:', error);
        return path.join(app.getAppPath(), relativePath);
    }
};

// Initialize app paths
app.whenReady().then(() => {
    debugLog('Application startup');
    debugLog('Application paths:', {
        dirname: __dirname,
        resourcesPath: process.resourcesPath,
        appPath: app.getAppPath(),
        exePath: process.execPath,
        cwd: process.cwd(),
        platform: process.platform,
        arch: process.arch,
        versions: process.versions,
        isPackaged: app.isPackaged
    });
});

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
    return;
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (BrowserWindow.getAllWindows().length) {
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

const isDev = !app.isPackaged;

// Initialize electron reloader only in development
if (isDev && process.env.ELECTRON_RELOADER !== 'true') {
    process.env.ELECTRON_RELOADER = 'true';
    try {
        require('electron-reloader')(module, {
            debug: true,
            watchRenderer: true
        });
    } catch (err) {
        console.error('Error initializing electron-reloader:', err);
    }
}

// Session management
let currentUser = null;

// Login and Session Management
let rbacPermissions = null;

async function loadRBACPermissions() {
    try {
        const rbacSheetId = await db.findSheet('RBAC');
        if (!rbacSheetId) {
            throw new Error('RBAC sheet not found');
        }

        const rbacData = await db.readSheet(rbacSheetId, 'A:D');
        if (!rbacData || rbacData.length < 2) {
            throw new Error('RBAC data not found');
        }

        // Convert sheet data to permissions object
        rbacPermissions = {};
        rbacData.slice(1).forEach(([role, feature, access]) => {
            if (!rbacPermissions[role]) {
                rbacPermissions[role] = {};
            }
            rbacPermissions[role][feature] = access;
        });

        console.log('RBAC permissions loaded successfully');
    } catch (error) {
        console.error('Error loading RBAC permissions:', error);
        throw error;
    }
}

ipcMain.handle('login', async (event, email, password) => {
    try {
        await db.initialize();
        
        // Load RBAC permissions if not loaded
        if (!rbacPermissions) {
            await loadRBACPermissions();
        }

        const usersSheetId = await db.findSheet('Users');
        if (!usersSheetId) {
            throw new Error('Users sheet not found');
        }

        const users = await db.readSheet(usersSheetId, 'A:F');
        if (!users || users.length < 2) {
            return { success: false };
        }

        // Find user by email (case insensitive)
        const user = users.slice(1).find(row => 
            row[2].toLowerCase() === email.toLowerCase()
        );

        if (user && user[4] === password) {
            const role = user[3];
            currentUser = {
                id: user[0],
                name: user[1],
                email: user[2],
                role: role,
                permissions: rbacPermissions[role] || {}
            };
            return { success: true, user: currentUser };
        }

        return { success: false };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false };
    }
});

ipcMain.handle('logout', async () => {
    try {
        currentUser = null;
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false };
    }
});

ipcMain.handle('check-session', async () => {
    try {
        if (currentUser) {
            // Ensure permissions are loaded
            if (!rbacPermissions) {
                await loadRBACPermissions();
                currentUser.permissions = rbacPermissions[currentUser.role] || {};
            }
            return { success: true, user: currentUser };
        }
        return { success: false };
    } catch (error) {
        console.error('Session check error:', error);
        return { success: false };
    }
});

ipcMain.handle('get-current-user', () => {
    return currentUser;
});

// IPC Handlers for Dashboard
ipcMain.handle('get-projects', async () => {
    try {
        if (!currentUser) {
            throw new Error('No active session');
        }

        await db.initialize();
        const projectsSheetId = await db.findSheet('Projects');
        if (!projectsSheetId) {
            throw new Error('Projects sheet not found');
        }

        const projects = await db.readSheet(projectsSheetId, 'A:M');
        if (!projects || projects.length < 2) {
            return [];
        }

        // Convert sheet data to objects
        const allProjects = projects.slice(1).map(row => ({
            id: row[0],
            title: row[1],
            start_date: row[2],
            end_date: row[3],
            project_type: row[4],
            total_hours: row[5],
            consumed_hours: row[6],
            designer_id: row[7],
            designer_name: row[8],
            manager_id: row[9],
            manager_name: row[10],
            basecamp_link: row[11],
            status: row[12]
        }));

        // Filter projects based on permissions
        if (currentUser.permissions.view_all_projects !== 'true') {
            return allProjects.filter(project => project.designer_id === currentUser.id);
        }

        return allProjects;
    } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
    }
});

ipcMain.handle('get-team-members', async () => {
    try {
        await db.initialize();
        const teamSheetId = await db.findSheet('Team Members');
        if (!teamSheetId) {
            throw new Error('Team Members sheet not found');
        }

        const members = await db.readSheet(teamSheetId, 'A:G');
        if (!members || members.length < 2) {
            return [];
        }

        // Convert sheet data to objects
        return members.slice(1).map(row => ({
            id: row[0],
            name: row[1],
            role: row[2],
            status: row[3],
            current_project_id: row[4],
            created_at: row[5],
            updated_at: row[6]
        }));
    } catch (error) {
        console.error('Error fetching team members:', error);
        return [];
    }
});

ipcMain.handle('get-project', async (event, id) => {
    try {
        await db.initialize();
        const projectsSheetId = await db.findSheet('Projects');
        if (!projectsSheetId) {
            throw new Error('Projects sheet not found');
        }

        const projects = await db.readSheet(projectsSheetId, 'A:M');
        if (!projects || projects.length < 2) {
            return null;
        }

        const project = projects.slice(1).find(row => row[0] === id);
        if (!project) {
            return null;
        }

        return {
            id: project[0],
            title: project[1],
            start_date: project[2],
            end_date: project[3],
            project_type: project[4],
            total_hours: project[5],
            consumed_hours: project[6],
            designer_id: project[7],
            designer_name: project[8],
            manager_id: project[9],
            manager_name: project[10],
            basecamp_link: project[11],
            status: project[12]
        };
    } catch (error) {
        console.error('Error fetching project:', error);
        return null;
    }
});

// Database Status Check
ipcMain.handle('check-database-status', async () => {
    try {
        const status = await db.checkDatabaseStatus();
        console.log('Database status check:', status);
        return status;
    } catch (error) {
        console.error('Database status check error:', error);
        return {
            connected: false,
            sheetsAccessible: false,
            error: error.message || 'Failed to check database status'
        };
    }
});

function createWindow() {
    debugLog('Creating main window');
    
    // Get the preload script path
    const preloadPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app/src/main/preload.js')
        : path.join(__dirname, 'preload.js');
    
    debugLog('Preload script path:', preloadPath);

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#000000',
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath,
            sandbox: false,
            webSecurity: !isDev,
            allowRunningInsecureContent: isDev,
            enableRemoteModule: false,
            devTools: true
        }
    });

    mainWindow.removeMenu();

    // Load the index.html
    const indexPath = isDev
        ? path.join(__dirname, '..', '..', 'public', 'index.html')
        : path.join(process.resourcesPath, 'public', 'index.html');

    debugLog('Loading index.html from:', indexPath);

    try {
        // Basic error handling
        mainWindow.webContents.on('did-fail-load', () => {
            debugLog('Failed to load index.html');
        });

        mainWindow.webContents.on('did-finish-load', () => {
            debugLog('Successfully loaded index.html');
        });

        // Load the file
        mainWindow.loadFile(indexPath);

        if (isDev) {
            mainWindow.webContents.openDevTools();
        }

    } catch (error) {
        debugLog('Error in window creation:', error);
        app.quit();
    }

    return mainWindow;
}

// Initialize app when ready
app.whenReady().then(async () => {
    try {
        // Initialize database connection early
        await db.initialize();
        console.log('Database initialized successfully');
        createWindow();
    } catch (error) {
        console.error('Failed to initialize database:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
}); 