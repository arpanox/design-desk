const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Wrap database initialization in a try-catch
let db;
try {
    db = require(path.join(__dirname, 'database.js'));
} catch (error) {
    console.error('Failed to load database module:', error);
    db = {
        initialize: async () => { throw new Error('Database module not loaded'); },
        listFiles: async () => { throw new Error('Database module not loaded'); },
        readSheet: async () => { throw new Error('Database module not loaded'); },
        appendSheet: async () => { throw new Error('Database module not loaded'); },
        writeSheet: async () => { throw new Error('Database module not loaded'); }
    };
}

// Create store wrapper using IPC
const store = {
    get: (key) => ipcRenderer.sendSync('electron-store-get', key),
    set: (key, value) => ipcRenderer.sendSync('electron-store-set', key, value),
    delete: (key) => ipcRenderer.sendSync('electron-store-delete', key)
};

let usersSheetId = null;
let currentUser = null;

async function findUsersSheet() {
    if (!usersSheetId) {
        try {
            const files = await db.listFiles(
                `name = 'Users' and mimeType = 'application/vnd.google-apps.spreadsheet'`
            );
            if (files.length > 0) {
                usersSheetId = files[0].id;
            }
        } catch (error) {
            console.error('Error finding Users sheet:', error);
        }
    }
    return usersSheetId;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'api', {
        login: async (email, password) => {
            try {
                return await ipcRenderer.invoke('login', email, password);
            } catch (error) {
                console.error('Login error:', error);
                return { success: false, error: error.message };
            }
        },
        logout: async () => {
            try {
                return await ipcRenderer.invoke('logout');
            } catch (error) {
                console.error('Logout error:', error);
                return { success: false, error: error.message };
            }
        },
        checkSession: async () => {
            try {
                return await ipcRenderer.invoke('check-session');
            } catch (error) {
                console.error('Session check error:', error);
                return { success: false, error: error.message };
            }
        },
        getCurrentUser: async () => {
            try {
                return await ipcRenderer.invoke('get-current-user');
            } catch (error) {
                console.error('Get user error:', error);
                return null;
            }
        },
        getProjects: async () => {
            try {
                return await ipcRenderer.invoke('get-projects');
            } catch (error) {
                console.error('Get projects error:', error);
                return [];
            }
        },
        getProject: async (id) => {
            try {
                return await ipcRenderer.invoke('get-project', id);
            } catch (error) {
                console.error('Get project error:', error);
                return null;
            }
        },
        getTeamMembers: async () => {
            try {
                return await ipcRenderer.invoke('get-team-members');
            } catch (error) {
                console.error('Get team members error:', error);
                return [];
            }
        },
        checkDatabaseStatus: async () => {
            try {
                return await ipcRenderer.invoke('check-database-status');
            } catch (error) {
                console.error('Database status check error:', error);
                return {
                    connected: false,
                    sheetsAccessible: false,
                    error: error.message
                };
            }
        }
    }
);
  