const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '../package.json');
const package = require(packagePath);

// Get version type from command line argument
const versionType = process.argv[2] || 'patch';

// Current version parts
const [major, minor, patch] = package.version.split('.').map(Number);

// Calculate new version
let newVersion;
switch (versionType) {
    case 'major':
        newVersion = `${major + 1}.0.0`;
        break;
    case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        break;
    case 'patch':
    default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
}

// Update package.json
package.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');

console.log(`Version bumped to ${newVersion}`);

// Create commit message template
console.log('\nGit commands to run:');
console.log(`git add package.json`);
console.log(`git commit -m "chore: bump version to ${newVersion} [release]"`);
console.log('git push'); 