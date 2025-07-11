#!/bin/bash

# Manual Version Increment Script
# Usage: ./increment-version.sh [major|minor|patch]
#
# Single Source of Truth: package.json
# This script updates:
# 1. package.json (primary source)
# 2. src/constants/game-constants.js (ES module GAME_INFO)

set -e

# Default to patch if no argument provided
INCREMENT_TYPE=${1:-patch}

# Validate increment type
if [[ ! "$INCREMENT_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo "Error: Invalid increment type. Use 'major', 'minor', or 'patch'"
    exit 1
fi

# Get current version from package.json (single source of truth)
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found"
    exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")

echo "Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"

# Increment version based on type
case $INCREMENT_TYPE in
    major)
        major=$((major + 1))
        minor=0
        patch=0
        ;;
    minor)
        minor=$((minor + 1))
        patch=0
        ;;
    patch)
        patch=$((patch + 1))
        ;;
esac

NEW_VERSION="$major.$minor.$patch"

echo "New version: $NEW_VERSION"

# Update package.json (single source of truth)
node -e "
    const pkg = require('./package.json');
    pkg.version = '$NEW_VERSION';
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Updated package.json"

# Update src/constants/game-constants.js (ES module source)
if [ -f "src/constants/game-constants.js" ]; then
    BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    node -e "
        const fs = require('fs');
        const filePath = './src/constants/game-constants.js';
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Update the version in GAME_INFO
        content = content.replace(
            /version: '[^']*'/,
            \"version: '$NEW_VERSION'\"
        );
        
        // Update the build date
        content = content.replace(
            /buildDate: '[^']*'/,
            \"buildDate: '$BUILD_DATE'\"
        );
        
        fs.writeFileSync(filePath, content);
    "
    echo "Updated src/constants/game-constants.js"
fi

# Update js/version.js (legacy compatibility)
# Note: Removed - We use modern ES6 modules only
# Legacy js/ directory removed during Vite migration

echo "Version updated successfully!"
echo "Modern ES6 module structure - no legacy files needed"
echo "Don't forget to:"
echo "1. git add package.json src/constants/game-constants.js"
echo "2. git commit -m 'chore: bump version to $NEW_VERSION'"
echo "3. git tag v$NEW_VERSION"
echo "4. git push origin master --tags"
