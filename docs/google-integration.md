# Google Drive & Sheets Integration Documentation

## Required APIs and Services

1. Google Drive API
2. Google Sheets API
3. Google OAuth 2.0

## Required Scopes

```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/spreadsheets
```

## Database Structure

### Users Collection
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "string",
  "googleTokens": {
    "access_token": "string",
    "refresh_token": "string",
    "expiry_date": "number"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Projects Collection
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "driveFolder": {
    "id": "string",
    "name": "string",
    "url": "string"
  },
  "mainSheet": {
    "id": "string",
    "name": "string",
    "url": "string"
  },
  "createdBy": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Required Environment Variables

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:1420/auth/callback
```

## Google Drive Structure

```
Project Folder/
├── Main Sheet.xlsx
├── Designs/
│   ├── Design1.pdf
│   └── Design2.pdf
└── Documents/
    ├── Specifications/
    └── References/
```

## Main Sheet Structure

### Sheet 1: Project Overview
- Project Name
- Client Details
- Timeline
- Status
- Team Members

### Sheet 2: Design Tracking
- Design ID
- Design Name
- Designer
- Status
- Last Modified
- Comments
- Link to File

### Sheet 3: Timeline
- Task Name
- Assignee
- Start Date
- Due Date
- Status
- Dependencies

## API Integration Code Examples

### Authentication
```typescript
const getGoogleAuthUrl = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
};
```

### Create Project Structure
```typescript
const createProjectStructure = async (auth, projectName) => {
  const drive = google.drive({ version: 'v3', auth });
  
  // Create main project folder
  const folderMetadata = {
    name: projectName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id'
  });

  // Create subfolders
  const subfolders = ['Designs', 'Documents/Specifications', 'Documents/References'];
  for (const subfolder of subfolders) {
    await createNestedFolders(drive, subfolder, folder.data.id);
  }

  return folder.data.id;
};
```

### Create and Initialize Sheet
```typescript
const createMainSheet = async (auth, folderId, projectName) => {
  const sheets = google.sheets({ version: 'v4', auth });
  
  const resource = {
    properties: {
      title: `${projectName} - Main Sheet`
    },
    sheets: [
      { properties: { title: 'Project Overview' } },
      { properties: { title: 'Design Tracking' } },
      { properties: { title: 'Timeline' } }
    ]
  };

  const spreadsheet = await sheets.spreadsheets.create({
    resource,
    fields: 'spreadsheetId'
  });

  // Move to project folder
  const drive = google.drive({ version: 'v3', auth });
  await drive.files.update({
    fileId: spreadsheet.data.spreadsheetId,
    addParents: folderId,
    fields: 'id, parents'
  });

  return spreadsheet.data.spreadsheetId;
};
```

## Token Refresh Logic
```typescript
const refreshTokens = async (userId) => {
  const user = await db.collection('users').doc(userId).get();
  const { refresh_token } = user.data().googleTokens;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: refresh_token
  });

  const { tokens } = await oauth2Client.refreshAccessToken();
  
  await db.collection('users').doc(userId).update({
    'googleTokens.access_token': tokens.access_token,
    'googleTokens.expiry_date': tokens.expiry_date
  });

  return tokens;
};
```

## Error Handling
```typescript
const handleGoogleApiError = (error) => {
  if (error.code === 401) {
    return refreshTokens(userId);
  }
  
  if (error.code === 403) {
    // Handle rate limiting
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw error;
};
``` 