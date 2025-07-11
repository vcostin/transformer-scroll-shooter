#!/usr/bin/env node

// Script to sync version from package.json to other files
// Single Source of Truth: package.json
const fs = require('fs');
const path = require('path');

// Read package.json (single source of truth)
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const version = packageJson.version;
const name = packageJson.name;
const description = packageJson.description;

console.log(`🔄 Syncing version ${version} from package.json...`);

// Update src/constants/game-constants.js (ES module source)
const constantsPath = path.join(__dirname, 'src', 'constants', 'game-constants.js');
if (fs.existsSync(constantsPath)) {
    let content = fs.readFileSync(constantsPath, 'utf8');
    
    // Update the version in GAME_INFO
    content = content.replace(
        /version: '[^']*'/,
        `version: '${version}'`
    );
    
    // Update the build date
    const buildDate = new Date().toISOString();
    content = content.replace(
        /buildDate: '[^']*'/,
        `buildDate: '${buildDate}'`
    );
    
    fs.writeFileSync(constantsPath, content);
    console.log(`✅ Updated src/constants/game-constants.js`);
}

// Update js/version.js (legacy compatibility)
const versionPath = path.join(__dirname, 'js', 'version.js');
const versionContent = `// Application Version Information
const VERSION_INFO = {
    VERSION: '${version}',
    BUILD_DATE: '${new Date().toISOString()}',
    RELEASE_NOTES: {
        '${version}': 'Version synchronized from package.json'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VERSION_INFO;
}

// Global access for browser
if (typeof window !== 'undefined') {
    window.VERSION_INFO = VERSION_INFO;
}
`;

fs.writeFileSync(versionPath, versionContent);
console.log(`✅ Updated js/version.js`);

console.log(`🎉 Version sync complete!`);
console.log(`   Version: ${version}`);
console.log(`   Name: ${name}`);
console.log(`   Description: ${description}`);
