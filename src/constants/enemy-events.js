/**
 * Enemy Events Constants - Event-Driven Architecture
 * 
 * Defines all events related to enemy entity operations
 */

export const ENEMY_EVENTS = {
    // Spawning events
    ENEMY_SPAWN: 'enemy.spawn',
    ENEMY_SPAWN_REQUESTED: 'enemy.spawn.requested',
    ENEMY_SPAWNED: 'enemy.spawned',
    
    // Lifecycle events
    ENEMY_CREATED: 'enemy.created',
    ENEMY_DESTROYED: 'enemy.destroyed',
    ENEMY_DIED: 'enemy.died',
    ENEMY_CLEANUP: 'enemy.cleanup',
    
    // Movement events
    ENEMY_MOVED: 'enemy.moved',
    ENEMY_POSITION_CHANGED: 'enemy.position.changed',
    ENEMY_BOUNDARY_HIT: 'enemy.boundary.hit',
    ENEMY_OFF_SCREEN: 'enemy.off.screen',
    
    // Combat events
    ENEMY_SHOT: 'enemy.shot',
    ENEMY_DAMAGED: 'enemy.damaged',
    ENEMY_HEALTH_CHANGED: 'enemy.health.changed',
    ENEMY_HEALTH_CRITICAL: 'enemy.health.critical',
    ENEMY_ATTACK: 'enemy.attack',
    
    // AI events
    ENEMY_AI_UPDATE: 'enemy.ai.update',
    ENEMY_AI_TARGET_ACQUIRED: 'enemy.ai.target.acquired',
    ENEMY_AI_TARGET_LOST: 'enemy.ai.target.lost',
    ENEMY_AI_BEHAVIOR_CHANGE: 'enemy.ai.behavior.change',
    
    // Collision events
    ENEMY_COLLISION_PLAYER: 'enemy.collision.player',
    ENEMY_COLLISION_BULLET: 'enemy.collision.bullet',
    ENEMY_COLLISION_BOUNDARY: 'enemy.collision.boundary',
    
    // Boss-specific events
    BOSS_SPAWNED: 'boss.spawned',
    BOSS_PHASE_CHANGE: 'boss.phase.change',
    BOSS_SPECIAL_ATTACK: 'boss.special.attack',
    BOSS_DEFEATED: 'boss.defeated',
    
    // State events
    ENEMY_STATE_CHANGED: 'enemy.state.changed',
    ENEMY_TYPE_CHANGED: 'enemy.type.changed',
    ENEMY_BEHAVIOR_CHANGED: 'enemy.behavior.changed'
};

export const ENEMY_STATES = {
    HEALTH: 'enemy.health',
    POSITION: 'enemy.position',
    VELOCITY: 'enemy.velocity',
    TARGET: 'enemy.target',
    BEHAVIOR: 'enemy.behavior',
    SHOOT_TIMER: 'enemy.shootTimer',
    MOVE_TIMER: 'enemy.moveTimer',
    AI_STATE: 'enemy.aiState'
};

export const ENEMY_TYPES = {
    FIGHTER: 'fighter',
    BOMBER: 'bomber',
    SCOUT: 'scout',
    BOSS: 'boss',
    BOSS_HEAVY: 'boss_heavy',
    BOSS_FAST: 'boss_fast',
    BOSS_SNIPER: 'boss_sniper'
};

export const ENEMY_BEHAVIORS = {
    AGGRESSIVE: 'aggressive',
    DEFENSIVE: 'defensive',
    PATROL: 'patrol',
    CHASE: 'chase',
    FLEE: 'flee',
    IDLE: 'idle'
};

export const AI_STATES = {
    SPAWNING: 'spawning',
    MOVING: 'moving',
    ATTACKING: 'attacking',
    SEARCHING: 'searching',
    FLEEING: 'fleeing',
    DYING: 'dying'
};

export const MOVEMENT_PATTERNS = {
    STRAIGHT: 'straight',
    ZIGZAG: 'zigzag',
    CIRCLE: 'circle',
    RANDOM: 'random',
    FOLLOW_PLAYER: 'follow_player'
};
