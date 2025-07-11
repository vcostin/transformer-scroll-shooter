/**
 * Main Entry Point - Phase 3 Module System
 * 
 * This file imports ES modules and initializes the game
 */

// Import ES modules
import { GAME_CONSTANTS, GAME_INFO } from './constants/game-constants.js';
import * as CollisionUtils from './utils/collision.js';
import * as MathUtils from './utils/math.js';

// Import Phase 3 Game Object Modules
import Player from './entities/player.js';
import Bullet from './entities/bullet.js';
import Enemy from './entities/enemies/enemy.js';

// Make constants available globally for backward compatibility
window.GAME_CONSTANTS = GAME_CONSTANTS;
window.GAME_INFO = GAME_INFO;

// Make utility functions available globally
window.CollisionUtils = CollisionUtils;
window.MathUtils = MathUtils;

// Make Phase 3 game object classes available globally
window.Player = Player;
window.Bullet = Bullet;
window.Enemy = Enemy;

// For debugging and development
window.ModuleSystem = {
    GAME_CONSTANTS,
    GAME_INFO,
    CollisionUtils,
    MathUtils,
    Player,
    Bullet,
    Enemy
};

// Log successful module loading
console.log('🔧 Phase 3 Module System loaded successfully');
console.log('📦 Available modules: Constants, Utils, Player, Bullet, Enemy');
console.log('🎮 Game object classes are now available globally');

// ===== GAME INITIALIZATION =====
// Import the rest of the game files that we haven't modularized yet
// We'll load them as classic scripts for now

const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

// Load the remaining game files in order
Promise.all([
    loadScript('/js/version.js'),
    loadScript('/js/audio.js'),
    loadScript('/js/options.js'),
    loadScript('/js/game.js'),
    loadScript('/js/powerups.js'),
    loadScript('/js/background.js'),
    loadScript('/js/effects.js')
]).then(() => {
    console.log('🎮 All game files loaded, starting game...');
    
    // Now start the game like the original main.js
    let game;
    
    // Initialize the game
    game = new Game();
    
    // Add welcome messages from centralized version info
    GAME_INFO.welcomeMessage.forEach(msg => console.log(msg));
    
    // Add event listeners for additional controls
    document.addEventListener('keydown', handleSpecialKeys);
    
    // Add touch/mobile support
    addMobileControls();
    
    // Start background music simulation (visual feedback)
    startAudioVisualFeedback();
    
    // Store game globally for debugging
    window.game = game;
    
    function handleSpecialKeys(event) {
        switch(event.code) {
            case 'KeyP':
                // Toggle pause
                if (game) {
                    game.paused = !game.paused;
                    console.log(game.paused ? 'Game Paused' : 'Game Resumed');
                }
                break;
                
            case 'KeyM':
                // Toggle mute (placeholder for future audio)
                console.log('Audio toggle (not implemented yet)');
                break;
                
            case 'Escape':
                // ESC key is now handled by the options menu in game.js
                break;
        }
    }
    
    function addMobileControls() {
        // Add virtual controls for mobile devices
        if ('ontouchstart' in window) {
            const canvas = document.getElementById('gameCanvas');
            
            canvas.addEventListener('touchstart', handleTouch);
            canvas.addEventListener('touchmove', handleTouchMove);
            
            function handleTouch(event) {
                event.preventDefault();
                // Basic touch controls (can be expanded)
                const touch = event.touches[0];
                const rect = canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // Simple touch-to-shoot
                if (game && game.player) {
                    game.player.shoot();
                }
            }
            
            function handleTouchMove(event) {
                event.preventDefault();
                // Could add touch movement here
            }
        }
    }
    
    function startAudioVisualFeedback() {
        // Placeholder for audio feedback
        console.log('🎵 Audio system initialized (placeholder)');
    }
    
}).catch(error => {
    console.error('❌ Failed to load game files:', error);
});

// Export for potential future use
export {
    GAME_CONSTANTS,
    GAME_INFO,
    CollisionUtils,
    MathUtils,
    Player,
    Bullet,
    Enemy
};
