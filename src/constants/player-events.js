/**
 * Player Events Constants - Event-Driven Architecture
 *
 * Defines all events related to player entity operations
 */

export const PLAYER_EVENTS = {
  // Input events
  INPUT_MOVE: 'input.move',
  INPUT_SHOOT: 'input.shoot',
  INPUT_TRANSFORM: 'input.transform',

  // Player state events
  PLAYER_UPDATED: 'player.updated',
  PLAYER_MOVED: 'player.moved',
  PLAYER_SHOT: 'player.shot',
  PLAYER_TRANSFORMED: 'player.transformed',
  PLAYER_DAMAGED: 'player.damaged',
  PLAYER_HEALED: 'player.healed',
  PLAYER_DIED: 'player.died',
  PLAYER_RESPAWNED: 'player.respawned',

  // Power-up events
  PLAYER_POWERUP_ACTIVATED: 'player.powerup.activated',
  PLAYER_POWERUP_EXPIRED: 'player.powerup.expired',
  PLAYER_SHIELD_ACTIVATED: 'player.shield.activated',
  PLAYER_SHIELD_EXPIRED: 'player.shield.expired',

  // Mode-specific events
  PLAYER_MODE_CHANGED: 'player.mode.changed',
  PLAYER_MODE_COOLDOWN_READY: 'player.mode.cooldown.ready',
  PLAYER_SHOOT_COOLDOWN_CHANGED: 'player.shoot.cooldown.changed',
  PLAYER_TRANSFORM_COOLDOWN_CHANGED: 'player.transform.cooldown.changed',

  // Health events
  PLAYER_HEALTH_CHANGED: 'player.health.changed',
  PLAYER_HEALTH_CRITICAL: 'player.health.critical',
  PLAYER_HEALTH_FULL: 'player.health.full',

  // Position events
  PLAYER_BOUNDARY_HIT: 'player.boundary.hit',

  // Collision events
  PLAYER_COLLISION_ENEMY: 'player.collision.enemy',
  PLAYER_COLLISION_POWERUP: 'player.collision.powerup',
  PLAYER_COLLISION_BULLET: 'player.collision.bullet',

  // Animation events
  PLAYER_ANIMATION_COMPLETE: 'player.animation.complete',
  PLAYER_EFFECT_SPAWN: 'player.effect.spawn'
}

export const PLAYER_STATES = {
  HEALTH: 'player.health',
  POSITION: 'player.position',
  MODE: 'player.mode',
  SPEED: 'player.speed',
  SHOOT_RATE: 'player.shootRate',
  POWERUPS: 'player.powerups',
  SHIELD: 'player.shield',
  TRANSFORM_COOLDOWN: 'player.transformCooldown',
  SHOOT_COOLDOWN: 'player.shootCooldown'
}

export const INPUT_TYPES = {
  MOVE: 'move',
  SHOOT: 'shoot',
  TRANSFORM: 'transform'
}

export const MOVE_DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
}
