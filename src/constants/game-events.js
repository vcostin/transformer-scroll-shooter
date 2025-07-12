/**
 * Game Events Constants
 * Centralized event definitions for the event-driven game architecture
 */

// Core game loop events
export const GAME_EVENTS = {
    // Game loop events
    GAME_UPDATE: 'game:update',
    GAME_RENDER: 'game:render',
    GAME_FRAME: 'game:frame',
    
    // Game state events
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    GAME_RESTART: 'game:restart',
    
    // Level events
    LEVEL_START: 'level:start',
    LEVEL_COMPLETE: 'level:complete',
    LEVEL_PROGRESS: 'level:progress',
    
    // Entity events
    ENTITY_SPAWN: 'entity:spawn',
    ENTITY_UPDATE: 'entity:update',
    ENTITY_DESTROY: 'entity:destroy',
    
    // Player events
    PLAYER_MOVE: 'player:move',
    PLAYER_SHOOT: 'player:shoot',
    PLAYER_TRANSFORM: 'player:transform',
    PLAYER_DAMAGE: 'player:damage',
    PLAYER_HEAL: 'player:heal',
    PLAYER_DEATH: 'player:death',
    
    // Enemy events
    ENEMY_SPAWN: 'enemy:spawn',
    ENEMY_UPDATE: 'enemy:update',
    ENEMY_DEATH: 'enemy:death',
    
    // Boss events
    BOSS_SPAWN: 'boss:spawn',
    BOSS_PHASE_CHANGE: 'boss:phase_change',
    BOSS_DEATH: 'boss:death',
    
    // Bullet events
    BULLET_FIRE: 'bullet:fire',
    BULLET_HIT: 'bullet:hit',
    BULLET_DESTROY: 'bullet:destroy',
    
    // Powerup events
    POWERUP_SPAWN: 'powerup:spawn',
    POWERUP_COLLECT: 'powerup:collect',
    POWERUP_ACTIVATE: 'powerup:activate',
    POWERUP_EXPIRE: 'powerup:expire',
    
    // Collision events
    COLLISION_PLAYER_ENEMY: 'collision:player_enemy',
    COLLISION_PLAYER_BULLET: 'collision:player_bullet',
    COLLISION_BULLET_ENEMY: 'collision:bullet_enemy',
    COLLISION_PLAYER_POWERUP: 'collision:player_powerup',
    
    // Effect events
    EFFECT_EXPLOSION: 'effect:explosion',
    EFFECT_POWERUP: 'effect:powerup',
    EFFECT_MUZZLE_FLASH: 'effect:muzzle_flash',
    
    // Audio events
    AUDIO_PLAY: 'audio:play',
    AUDIO_STOP: 'audio:stop',
    AUDIO_VOLUME_CHANGE: 'audio:volume_change',
    
    // UI events
    UI_SCORE_UPDATE: 'ui:score_update',
    UI_HEALTH_UPDATE: 'ui:health_update',
    UI_MESSAGE_ADD: 'ui:message_add',
    UI_MESSAGE_REMOVE: 'ui:message_remove',
    
    // Input events
    INPUT_KEYDOWN: 'input:keydown',
    INPUT_KEYUP: 'input:keyup',
    INPUT_MOUSE_CLICK: 'input:mouse_click',
    
    // Performance events
    PERFORMANCE_FPS_UPDATE: 'performance:fps_update',
    PERFORMANCE_FRAME_TIME: 'performance:frame_time',
    
    // Debug events
    DEBUG_LOG: 'debug:log',
    DEBUG_WARN: 'debug:warn',
    DEBUG_ERROR: 'debug:error'
};

// Event payload interfaces (for documentation and type safety)
export const EVENT_PAYLOADS = {
    [GAME_EVENTS.GAME_UPDATE]: {
        deltaTime: 'number',
        currentTime: 'number',
        frame: 'number'
    },
    
    [GAME_EVENTS.GAME_RENDER]: {
        ctx: 'CanvasRenderingContext2D',
        deltaTime: 'number'
    },
    
    [GAME_EVENTS.ENTITY_SPAWN]: {
        entityType: 'string',
        entity: 'object',
        x: 'number',
        y: 'number'
    },
    
    [GAME_EVENTS.PLAYER_MOVE]: {
        x: 'number',
        y: 'number',
        deltaX: 'number',
        deltaY: 'number'
    },
    
    [GAME_EVENTS.COLLISION_BULLET_ENEMY]: {
        bullet: 'object',
        enemy: 'object',
        damage: 'number'
    },
    
    [GAME_EVENTS.UI_SCORE_UPDATE]: {
        score: 'number',
        previousScore: 'number',
        delta: 'number'
    },
    
    [GAME_EVENTS.PERFORMANCE_FPS_UPDATE]: {
        fps: 'number',
        frameTime: 'number'
    }
};

// Event priority levels
export const EVENT_PRIORITY = {
    CRITICAL: 1000,  // System-critical events
    HIGH: 100,       // Important game events
    NORMAL: 0,       // Standard events
    LOW: -100        // Background/optional events
};

// Event namespace helpers
export const EVENT_NAMESPACES = {
    GAME: 'game',
    PLAYER: 'player',
    ENEMY: 'enemy',
    BOSS: 'boss',
    BULLET: 'bullet',
    POWERUP: 'powerup',
    COLLISION: 'collision',
    EFFECT: 'effect',
    AUDIO: 'audio',
    UI: 'ui',
    INPUT: 'input',
    PERFORMANCE: 'performance',
    DEBUG: 'debug'
};

/**
 * Helper function to create namespaced events
 * @param {string} namespace - Event namespace
 * @param {string} eventName - Event name
 * @returns {string} Namespaced event name
 */
export function createEventName(namespace, eventName) {
    return `${namespace}:${eventName}`;
}

/**
 * Helper function to validate event payload structure
 * @param {string} eventName - Event name
 * @param {object} payload - Event payload
 * @returns {boolean} True if payload is valid
 */
export function validateEventPayload(eventName, payload) {
    const expectedPayload = EVENT_PAYLOADS[eventName];
    if (!expectedPayload) return true; // No validation rules defined
    
    for (const [key, expectedType] of Object.entries(expectedPayload)) {
        if (!(key in payload)) {
            console.warn(`Missing required property '${key}' in event '${eventName}'`);
            return false;
        }
        
        const actualType = typeof payload[key];
        if (actualType !== expectedType && expectedType !== 'object') {
            console.warn(`Invalid type for property '${key}' in event '${eventName}'. Expected ${expectedType}, got ${actualType}`);
            return false;
        }
    }
    
    return true;
}
