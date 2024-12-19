# Design Desk App

A desktop application for managing design projects and team members.

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Google Cloud Platform account

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/design-desk.git
   cd design-desk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Google Cloud Platform:
   1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
   2. Create a new project or select an existing one
   3. Enable the following APIs:
      - Google Sheets API
      - Google Drive API
   4. Create a service account:
      1. Go to "APIs & Services" > "Credentials"
      2. Click "Create Credentials" > "Service Account"
      3. Fill in the service account details:
         - Name: Design Desk App
         - ID: design-desk
         - Description: Service account for Design Desk application
      4. Click "Create"
      5. For the role, select "Editor" under "Basic"
      6. Click "Continue" and then "Done"
      7. Click on the newly created service account
      8. Go to the "Keys" tab
      9. Click "Add Key" > "Create new key"
      10. Choose "JSON" format
      11. Click "Create"
   5. Save the downloaded JSON file as `src/main/service-account.json`

4. Initialize the Google Sheets:
   ```bash
   node src/main/init-sheets.js
   ```

5. Run the application in development mode:
   ```bash
   npm run dev
   ```

## Default Admin Account

After initialization, you can log in with the following credentials:
- Email: admin@designdesk.com
- Password: 12345

## Building for Production

To create a production build:

```bash
npm run build
```

The built application will be available in the `dist` directory.

## Development

- `npm run dev` - Start the application in development mode
- `npm run build` - Build the application for production
- `npm run test` - Run tests
- `npm run lint` - Run linting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 