#!/bin/bash

# Manual Version Increment Script
# Usage: ./increment-version.sh [major|minor|patch]

set -e

# Default to patch if no argument provided
INCREMENT_TYPE=${1:-patch}

# Validate increment type
if [[ ! "$INCREMENT_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo "Error: Invalid increment type. Use 'major', 'minor', or 'patch'"
    exit 1
fi

# Get current version from version.js
if [ ! -f "js/version.js" ]; then
    echo "Error: js/version.js not found"
    exit 1
fi

CURRENT_VERSION=$(node -p "require('./js/version.js').VERSION" 2>/dev/null || echo "1.0.0")

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

# Update js/version.js
cat > js/version.js << EOF
// Application Version Information
const VERSION_INFO = {
    VERSION: '$NEW_VERSION',
    BUILD_DATE: '$(date -u +"%Y-%m-%dT%H:%M:%SZ")',
    RELEASE_NOTES: {
        '$NEW_VERSION': 'Manual version increment - $INCREMENT_TYPE update'
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
EOF

# Update package.json if it exists
if [ -f package.json ]; then
    node -e "
        const pkg = require('./package.json');
        pkg.version = '$NEW_VERSION';
        require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "Updated package.json"
fi

echo "Version updated successfully!"
echo "Don't forget to:"
echo "1. git add js/version.js"
echo "2. git commit -m 'chore: bump version to $NEW_VERSION'"
echo "3. git tag v$NEW_VERSION"
echo "4. git push origin master --tags"
