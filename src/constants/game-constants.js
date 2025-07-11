/**
 * Game Constants - Phase 2 Module Extraction
 * 
 * Central configuration for game mechanics, timing, and scoring.
 * Extracted from global variables to ES module for better maintainability.
 */

export const GAME_CONSTANTS = {
    // Boss and Level Configuration
    BOSS_LEVEL_INTERVAL: 5,  // Boss every 5 levels
    ENEMIES_PER_LEVEL: 10,   // Regular enemies per level
    BOSS_BONUS_SCORE: 1000,  // Bonus score for boss defeat
    BOSS_HEALTH_RESTORE: 25, // Health restored on boss defeat
    
    // Message System Configuration
    MESSAGE_DURATION: {
        BOSS: 3000,
        VICTORY: 2000,
        INFO: 2000,
        LEVEL_UP: 2500
    },
    MAX_MESSAGES: 3,
    
    // Game Mechanics
    PLAYER_LIVES: 3,
    POWERUP_SPAWN_RATE: 0.1,
    
    // Performance Settings
    MAX_PARTICLES: 100,
    MAX_BULLETS: 50,
    MAX_ENEMIES: 20
};

export const GAME_INFO = {
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
            `🎮 ${this.name} ${this.shortVersion} 🎮`,
            `📅 Built: ${this.buildDate}`,
            `🚀 Ready to transform and shoot!`,
            `💡 Press ESC for help and controls`
        ];
    }
};

// Default export for convenience
export default { GAME_CONSTANTS, GAME_INFO };
