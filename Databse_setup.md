# Create a new database connection module for the project:

# Module Name: database.js
# Location: src/main/

# Requirements:
1. The module should handle connections to multiple databases, including:
   - Google Sheets API (for structured data storage)
   - Google Drive API (for file and asset management)
2. Use the `googleapis` library to interact with Google APIs.
3. Include functions to:
   - Authenticate with Google APIs using OAuth 2.0.
   - Fetch, read, and write data to Google Sheets.
   - Upload, download, and manage files in Google Drive.
4. Ensure reusability by exporting functions for:
   - `initializeGoogleAPIs`: Authenticates and sets up Google APIs.
   - `readSheet`: Reads data from a specific Google Sheet.
   - `writeSheet`: Writes or updates data in a Google Sheet.
   - `manageDrive`: Handles file operations like uploading and downloading files.
5. Store credentials securely in a `.env` file and load them using the `dotenv` library.
   - Expected environment variables:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REFRESH_TOKEN`
     - `GOOGLE_REDIRECT_URI`
6. Implement proper error handling and logging.

# Example Code Structure:
```javascript
// src/main/database.js
const { google } = require('googleapis');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Google APIs
async function initializeGoogleAPIs() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  return { sheets, drive };
}

// Example function to read from a Google Sheet
async function readSheet(spreadsheetId, range) {
  const { sheets } = await initializeGoogleAPIs();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values;
}

// Example function to write to a Google Sheet
async function writeSheet(spreadsheetId, range, values) {
  const { sheets } = await initializeGoogleAPIs();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

// Example function to manage files in Google Drive
async function manageDrive(action, fileId = null, fileData = null) {
  const { drive } = await initializeGoogleAPIs();

  switch (action) {
    case 'upload':
      return await drive.files.create({
        resource: { name: fileData.name },
        media: { mimeType: fileData.mimeType, body: fileData.body },
      });
    case 'download':
      return await drive.files.get({ fileId, alt: 'media' });
    case 'delete':
      return await drive.files.delete({ fileId });
    default:
      throw new Error('Invalid Drive action');
  }
}

module.exports = {
  initializeGoogleAPIs,
  readSheet,
  writeSheet,
  manageDrive,
};
