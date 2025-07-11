/**
 * Main Entry Point - Phase 2 Module System
 * 
 * This file imports ES modules and maintains backward compatibility
 * by exposing them as global variables for the existing codebase.
 */

// Import ES modules
import { GAME_CONSTANTS, GAME_INFO } from './constants/game-constants.js';
import * as CollisionUtils from './utils/collision.js';
import * as MathUtils from './utils/math.js';

// Make constants available globally for backward compatibility
window.GAME_CONSTANTS = GAME_CONSTANTS;
window.GAME_INFO = GAME_INFO;

// Make utility functions available globally
window.CollisionUtils = CollisionUtils;
window.MathUtils = MathUtils;

// For debugging and development
window.ModuleSystem = {
    GAME_CONSTANTS,
    GAME_INFO,
    CollisionUtils,
    MathUtils
};

// Log successful module loading
console.log('🔧 Phase 2 Module System loaded successfully');
console.log('📦 Available modules: Constants, Collision Utils, Math Utils');

// Export for potential future use
export {
    GAME_CONSTANTS,
    GAME_INFO,
    CollisionUtils,
    MathUtils
};
