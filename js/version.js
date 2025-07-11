// Application Version Information
const VERSION_INFO = {
    VERSION: '1.1.0',
    BUILD_DATE: '2025-07-11T18:04:34.373Z',
    RELEASE_NOTES: {
        '1.1.0': 'Version synchronized from package.json'
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
