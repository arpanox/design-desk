# Windows Build Configuration

This document outlines the working configuration for building the Electron application on Windows.

## Package.json Build Configuration

```json
{
  "build": {
    "appId": "com.mvp.app",
    "productName": "MVP",
    "asar": true,
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "src/**/*",
      "public/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "src/main",
        "to": "app/src/main"
      },
      {
        "from": "public",
        "to": "public"
      }
    ],
    "win": {
      "target": ["nsis"],
      "icon": "build/icon.ico",
      "artifactName": "${productName}-Setup-${version}.${ext}",
      "signAndEditExecutable": false
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "perMachine": false
    },
    "electronDownload": {
      "cache": "./electron-cache"
    },
    "npmRebuild": false,
    "buildDependenciesFromSource": true
  }
}
```

## Build Scripts

```json
{
  "scripts": {
    "start": "electron .",
    "dev": "concurrently \"npm run watch:css\" \"cross-env ELECTRON_RELOADER=false electron . --dev\"",
    "watch:css": "tailwindcss -i ./public/styles/tailwind.css -o ./public/styles/output.css --watch",
    "build:css": "tailwindcss -i ./public/styles/tailwind.css -o ./public/styles/output.css --minify",
    "clean": "rimraf dist .webpack logs",
    "build:win": "npm run clean && npm run build:css && electron-builder --win",
    "debug:win": "electron . --enable-logging --log-level=debug"
  }
}
```

## Important Configuration Notes

1. **Code Signing**: Disabled using `"signAndEditExecutable": false`
2. **NSIS Installer**: Configured for user-choice installation with `"oneClick": false`
3. **ASAR Packaging**: Enabled with `"asar": true`
4. **Resource Handling**: 
   - Main process files copied to `app/src/main`
   - Public files copied to `public`
5. **Build Optimization**:
   - NPM rebuild disabled: `"npmRebuild": false`
   - Dependencies built from source: `"buildDependenciesFromSource": true`
   - Local electron cache: `"cache": "./electron-cache"`

## Build Steps

1. Clean previous build:
```bash
rmdir /s /q dist
rmdir /s /q .webpack
rmdir /s /q logs
```

2. Clear npm cache:
```bash
npm cache clean --force
```

3. Install dependencies:
```bash
npm install --force
```

4. Run build:
```bash
npm run build:win
```

## Troubleshooting

If encountering permission errors or locked files:

1. Run Command Prompt as Administrator
2. Clear electron-builder cache:
```bash
rmdir /s /q "%USERPROFILE%\AppData\Local\electron-builder\Cache\winCodeSign"
```

3. Remove dist directory:
```bash
rmdir /s /q dist
```

4. Rebuild from scratch following the build steps above 