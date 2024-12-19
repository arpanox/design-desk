const db = require('./database');
require('dotenv').config();

async function addManagerUser() {
    try {
        console.log('Adding admin user...');
        
        // Initialize database
        await db.initialize();
        console.log('Database initialized');
        
        // Find Users sheet
        const usersSheetId = await db.findSheet('Users');
        if (!usersSheetId) {
            throw new Error('Users sheet not found');
        }
        console.log('Found Users sheet:', usersSheetId);
        
        // Check if admin already exists
        const existingUsers = await db.readSheet(usersSheetId, 'A:F');
        console.log('Existing users:', existingUsers);
        
        const adminExists = existingUsers?.slice(1).some(row => row[3] === 'Admin');
        
        if (!adminExists) {
            // Add admin user
            const adminData = [
                [
                    'ADM001',                    // ID
                    'Satish',                    // Name
                    'admin@designdesk.com',      // Email
                    'Admin',                     // Role
                    '12345',                     // Password
                    new Date().toISOString()     // Created At
                ]
            ];
            
            await db.appendSheet(usersSheetId, 'A:F', adminData);
            console.log('Admin user added successfully');
            console.log('Admin data:', adminData[0]);
        } else {
            // Update existing admin's name and password
            const adminIndex = existingUsers.findIndex(row => row[3] === 'Admin');
            if (adminIndex > 0) {  // Skip header row
                await db.writeSheet(usersSheetId, `B${adminIndex + 1}:E${adminIndex + 1}`, [['Satish', 'admin@designdesk.com', 'Admin', '12345']]);
                console.log('Admin details updated successfully');
                console.log('Updated admin row index:', adminIndex + 1);
            }
        }
        
    } catch (error) {
        console.error('Error adding admin user:', error);
        throw error;
    }
}

// Run the script
addManagerUser(); 