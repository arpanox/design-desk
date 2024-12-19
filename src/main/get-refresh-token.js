const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create OAuth 2.0 client
const oAuth2Client = new google.auth.OAuth2(
    '758909453734-sco0rs3hnjdbd7eam7kushft56o6v7ml.apps.googleusercontent.com',
    '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',
    'urn:ietf:wg:oauth:2.0:oob'
);

// Define scopes
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
];

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getAuthorizationCode() {
    return new Promise((resolve, reject) => {
        try {
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
                prompt: 'consent'
            });

            console.log('\nAuthorize this app by visiting this URL:\n', authUrl);
            console.log('\nAfter authorization, Google will display a code. Please enter that code here:\n');
            
            rl.question('Enter the code from that page here: ', (code) => {
                rl.close();
                resolve(code.trim());
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function getRefreshToken() {
    try {
        console.log('Starting OAuth2 flow for desktop application...');
        
        // Get authorization code
        const code = await getAuthorizationCode();
        console.log('Authorization code received:', code);

        // Exchange authorization code for refresh token
        console.log('Exchanging authorization code for tokens...');
        const { tokens } = await oAuth2Client.getToken(code);
        
        console.log('\nAccess Token:', tokens.access_token);
        console.log('\nRefresh Token:', tokens.refresh_token);
        console.log('\nToken Type:', tokens.token_type);
        console.log('\nExpiry Date:', new Date(tokens.expiry_date).toLocaleString());
        
        // Update .env file with new refresh token
        const envPath = path.join(__dirname, '../../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(
            /GOOGLE_REFRESH_TOKEN=.*/,
            `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
        );
        fs.writeFileSync(envPath, envContent);
        
        console.log('\nAuthentication successful!');
        console.log('Refresh token has been saved to .env file\n');
    } catch (error) {
        console.error('\nError getting refresh token:', error);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
}

// Start the OAuth flow
console.log('Starting the OAuth flow to get refresh token...');
getRefreshToken(); 