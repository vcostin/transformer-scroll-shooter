// Single source of truth for game version and metadata
const GAME_INFO = {
    name: 'Transformer Scroll Shooter',
    version: '1.1.0',
    description: 'A retro-style side-scrolling shooter game featuring a transforming vehicle with comprehensive audio system and options menu',
    author: 'Game Developer',
    buildDate: new Date().toISOString().split('T')[0], // Auto-generated build date
    
    // Version components for semantic versioning
    get versionMajor() { return parseInt(this.version.split('.')[0]); },
    get versionMinor() { return parseInt(this.version.split('.')[1]); },
    get versionPatch() { return parseInt(this.version.split('.')[2]); },
    
    // Display formats
    get fullTitle() { return `${this.name} v${this.version}`; },
    get shortVersion() { return `v${this.version}`; },
    get buildInfo() { return `${this.version} (${this.buildDate})`; },
    
    // Console welcome message
    get welcomeMessage() {
        return [
            `🚗 ${this.fullTitle} Initialized! 🚁`,
            'Transform between Car, Scuba, Boat, and Plane modes!',
            'Collect powerups and discover synergies!',
            '🔊 Audio system enabled - Press ESC for options menu!'
        ];
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_INFO;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.GAME_INFO = GAME_INFO;
}
