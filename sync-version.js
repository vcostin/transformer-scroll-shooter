#!/usr/bin/env node

// Script to sync package.json with version.js
const fs = require('fs');
const path = require('path');

// Read version.js content
const versionPath = path.join(__dirname, 'js', 'version.js');
const versionContent = fs.readFileSync(versionPath, 'utf8');

// Extract version using regex
const versionMatch = versionContent.match(/version:\s*['"]([^'"]+)['"]/);
const nameMatch = versionContent.match(/name:\s*['"]([^'"]+)['"]/);
const descMatch = versionContent.match(/description:\s*['"]([^'"]+)['"]/);

if (!versionMatch || !nameMatch || !descMatch) {
    console.error('Could not extract version info from version.js');
    process.exit(1);
}

const version = versionMatch[1];
const name = nameMatch[1].toLowerCase().replace(/\s+/g, '-');
const description = descMatch[1];

// Read package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update package.json
packageJson.version = version;
packageJson.name = name;
packageJson.description = description;

// Write back package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Updated package.json to version ${version}`);
console.log(`   Name: ${name}`);
console.log(`   Description: ${description}`);
