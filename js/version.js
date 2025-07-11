// Application Version Information
const VERSION_INFO = {
    VERSION: '1.2.2',
    BUILD_DATE: '2025-07-12T00:15:30Z',
    RELEASE_NOTES: {
        '1.2.2': 'Manual version increment - patch update'
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
