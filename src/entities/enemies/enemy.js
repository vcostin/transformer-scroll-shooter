/**
 * Enemy Entity - Stateless Implementation
 *
 * Entity-State Architecture: Stateless enemy entity operating on global state.
 * All enemy data is stored in StateManager, entity functions are pure.
 * State flows: StateManager → Entity Functions → StateManager → Rendering
 */

import { createBullet } from '@/entities/bullet.js'
import { BOSS_CONFIGS } from '@/constants/boss-constants.js'
import { ENEMY_EVENTS, ENEMY_STATES, ENEMY_BEHAVIORS, AI_STATES } from '@/constants/enemy-events.js'

// Constants
const OFF_SCREEN_BOUNDARY = -100
const CRITICAL_HEALTH_THRESHOLD = 0.25
const BOB_PERIOD_MS = 1000
const BOB_WAVE_CYCLE = Math.PI * 2
const BOB_AMPLITUDE_FACTOR = 0.2
const MOVEMENT_SPEED_MULTIPLIER = 0.8

// Relay Warden specific constants
const DRONE_SPAWN_PROBABILITY = 0.2
const CONNECTION_BEAM_LENGTH = 100
const CONNECTION_BEAM_OFFSET_Y = -50
// Legacy constants removed - now handled in Entity-State updateRelayWardenMovement()

/**
 * Enemy State Schema - Defines the structure in StateManager
 */
const ENEMY_STATE_SCHEMA = {
  // Position and physics
  x: 0,
  y: 0,
  width: 30,
  height: 20,

  // Core stats
  type: 'fighter',
  maxHealth: 20,
  health: 20,
  speed: 100,
  damage: 15,
  points: 10,
  color: '#ff4444',

  // Combat properties
  shootRate: 2000,
  bulletSpeed: 200,
  shootTimer: 0,

  // AI and behavior
  moveTimer: 0,
  targetY: 0,
  target: null,
  aiState: AI_STATES.SPAWNING,
  behavior: ENEMY_BEHAVIORS.AGGRESSIVE,
  zigDirection: 1,

  // Lifecycle
  markedForDeletion: false,

  // Boss-specific properties (optional, only set for bosses)
  phase: 1,
  sweepAngle: 0,
  sweepDirection: 1,
  vulnerabilityTimer: 0,
  ringBeamActive: false,
  nodeMode: false,
  phaseTransitionTriggered: false
}

/**
 * Generate unique enemy ID
 * @returns {string} Unique enemy identifier
 */
let enemyIdCounter = 0

function generateEnemyId() {
  return `enemy_${Date.now()}_${++enemyIdCounter}`
}

/**
 * Stateless Enemy Entity - Pure functions operating on StateManager
 */
export const Enemy = {
  // === STATE ACCESSORS (READ) ===

  getPosition: (stateManager, enemyId) => ({
    x: stateManager.getState(`enemies.${enemyId}.x`),
    y: stateManager.getState(`enemies.${enemyId}.y`)
  }),

  getDimensions: (stateManager, enemyId) => ({
    width: stateManager.getState(`enemies.${enemyId}.width`),
    height: stateManager.getState(`enemies.${enemyId}.height`)
  }),

  getHealth: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.health`),
  getMaxHealth: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.maxHealth`),
  getType: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.type`),
  getSpeed: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.speed`),
  getDamage: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.damage`),
  getPoints: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.points`),
  getColor: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.color`),

  getShootRate: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.shootRate`),
  getBulletSpeed: (stateManager, enemyId) =>
    stateManager.getState(`enemies.${enemyId}.bulletSpeed`),
  getShootTimer: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.shootTimer`),

  getAIState: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.aiState`),
  getBehavior: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.behavior`),
  getTarget: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.target`),
  getTargetY: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.targetY`),
  getMoveTimer: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.moveTimer`),
  getZigDirection: (stateManager, enemyId) =>
    stateManager.getState(`enemies.${enemyId}.zigDirection`),

  // Boss-specific getters
  getPhase: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.phase`),
  getSweepAngle: (stateManager, enemyId) => stateManager.getState(`enemies.${enemyId}.sweepAngle`),
  getSweepDirection: (stateManager, enemyId) =>
    stateManager.getState(`enemies.${enemyId}.sweepDirection`),
  getVulnerabilityTimer: (stateManager, enemyId) =>
    stateManager.getState(`enemies.${enemyId}.vulnerabilityTimer`),

  isMarkedForDeletion: (stateManager, enemyId) =>
    stateManager.getState(`enemies.${enemyId}.markedForDeletion`),

  // === STATE MUTATIONS (WRITE) ===

  setPosition: (stateManager, enemyId, position) => {
    stateManager.setState(`enemies.${enemyId}.x`, position.x)
    stateManager.setState(`enemies.${enemyId}.y`, position.y)
  },

  move: (stateManager, enemyId, dx, dy) => {
    const current = Enemy.getPosition(stateManager, enemyId)
    Enemy.setPosition(stateManager, enemyId, { x: current.x + dx, y: current.y + dy })
  },

  setHealth: (stateManager, enemyId, health) => {
    const maxHealth = Enemy.getMaxHealth(stateManager, enemyId)
    stateManager.setState(`enemies.${enemyId}.health`, Math.max(0, Math.min(health, maxHealth)))
  },

  takeDamage: (stateManager, enemyId, damage, eventDispatcher, gameInstance) => {
    // Apply damage directly for immediate effect
    const oldHealth = Enemy.getHealth(stateManager, enemyId)
    const newHealth = Math.max(0, oldHealth - damage)
    Enemy.setHealth(stateManager, enemyId, newHealth)

    // Update the compatibility object in game.enemies array
    if (gameInstance && gameInstance.enemies) {
      const enemyObj = gameInstance.enemies.find(e => e.id === enemyId)
      if (enemyObj) {
        enemyObj.health = newHealth
      }
    }

    // Also emit damage event for effects system (if available)
    if (eventDispatcher && typeof eventDispatcher.emit === 'function') {
      eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
        enemyId: enemyId,
        damage: damage
      })
    }

    // Handle death directly
    if (newHealth <= 0) {
      const enemyState = Enemy.getEnemyState(stateManager, enemyId)
      if (enemyState) {
        dieEnemy(enemyState)
      }
    }
  },

  setShootTimer: (stateManager, enemyId, timer) => {
    stateManager.setState(`enemies.${enemyId}.shootTimer`, timer)
  },

  updateShootTimer: (stateManager, enemyId, deltaTime) => {
    const currentTimer = Enemy.getShootTimer(stateManager, enemyId)
    Enemy.setShootTimer(stateManager, enemyId, currentTimer + deltaTime)
  },

  setMoveTimer: (stateManager, enemyId, timer) => {
    stateManager.setState(`enemies.${enemyId}.moveTimer`, timer)
  },

  updateMoveTimer: (stateManager, enemyId, deltaTime) => {
    const currentTimer = Enemy.getMoveTimer(stateManager, enemyId)
    Enemy.setMoveTimer(stateManager, enemyId, currentTimer + deltaTime)
  },

  setTargetY: (stateManager, enemyId, targetY) => {
    stateManager.setState(`enemies.${enemyId}.targetY`, targetY)
  },

  setAIState: (stateManager, enemyId, aiState) => {
    stateManager.setState(`enemies.${enemyId}.aiState`, aiState)
  },

  setTarget: (stateManager, enemyId, target) => {
    stateManager.setState(`enemies.${enemyId}.target`, target)
  },

  setZigDirection: (stateManager, enemyId, direction) => {
    stateManager.setState(`enemies.${enemyId}.zigDirection`, direction)
  },

  // Boss-specific setters
  setPhase: (stateManager, enemyId, phase) => {
    stateManager.setState(`enemies.${enemyId}.phase`, phase)
  },

  setSweepAngle: (stateManager, enemyId, angle) => {
    stateManager.setState(`enemies.${enemyId}.sweepAngle`, angle)
  },

  setSweepDirection: (stateManager, enemyId, direction) => {
    stateManager.setState(`enemies.${enemyId}.sweepDirection`, direction)
  },

  setVulnerabilityTimer: (stateManager, enemyId, timer) => {
    stateManager.setState(`enemies.${enemyId}.vulnerabilityTimer`, timer)
  },

  updateVulnerabilityTimer: (stateManager, enemyId, deltaTime) => {
    const currentTimer = Enemy.getVulnerabilityTimer(stateManager, enemyId)
    Enemy.setVulnerabilityTimer(stateManager, enemyId, currentTimer + deltaTime)
  },

  markForDeletion: (stateManager, enemyId) => {
    stateManager.setState(`enemies.${enemyId}.markedForDeletion`, true)
  },

  // === ENEMY MANAGEMENT ===

  exists: (stateManager, enemyId) => {
    return stateManager.getState(`enemies.${enemyId}`) !== undefined
  },

  remove: (stateManager, enemyId) => {
    stateManager.setState(`enemies.${enemyId}`, undefined)
  },

  getAllEnemyIds: stateManager => {
    const enemiesState = stateManager.getState('enemies') || {}
    return Object.keys(enemiesState).filter(id => enemiesState[id] !== undefined)
  },

  // Get complete enemy state as object for compatibility
  getEnemyState: (stateManager, enemyId) => {
    if (!Enemy.exists(stateManager, enemyId)) return null

    const position = Enemy.getPosition(stateManager, enemyId)
    const dimensions = Enemy.getDimensions(stateManager, enemyId)

    return {
      position,
      ...dimensions,
      type: Enemy.getType(stateManager, enemyId),
      health: Enemy.getHealth(stateManager, enemyId),
      maxHealth: Enemy.getMaxHealth(stateManager, enemyId),
      speed: Enemy.getSpeed(stateManager, enemyId),
      damage: Enemy.getDamage(stateManager, enemyId),
      points: Enemy.getPoints(stateManager, enemyId),
      color: Enemy.getColor(stateManager, enemyId),
      shootRate: Enemy.getShootRate(stateManager, enemyId),
      bulletSpeed: Enemy.getBulletSpeed(stateManager, enemyId),
      shootTimer: Enemy.getShootTimer(stateManager, enemyId),
      aiState: Enemy.getAIState(stateManager, enemyId),
      behavior: Enemy.getBehavior(stateManager, enemyId),
      targetY: Enemy.getTargetY(stateManager, enemyId),
      moveTimer: Enemy.getMoveTimer(stateManager, enemyId),
      zigDirection: Enemy.getZigDirection(stateManager, enemyId),
      markedForDeletion: Enemy.isMarkedForDeletion(stateManager, enemyId),
      // Legacy compatibility properties
      x: position.x,
      y: position.y,
      friendly: false // enemies are never friendly
    }
  }
}

/**
 * Initialize Enemy State in StateManager and return enemy ID
 * @param {Object} stateManager - StateManager instance
 * @param {Object} eventDispatcher - EventDispatcher instance
 * @param {Object} effectManager - EffectManager instance
 * @param {number} x - Initial x position
 * @param {number} y - Initial y position
 * @param {string} type - Enemy type
 * @returns {string} The enemy ID
 */
export function createEnemy(stateManager, eventDispatcher, effectManager, x, y, type) {
  const enemyId = generateEnemyId()

  // Create base enemy state
  const enemyState = {
    ...ENEMY_STATE_SCHEMA,
    x,
    y,
    type,
    targetY: y
  }

  // Apply type-specific properties
  const configuredEnemy = setupEnemyType(enemyState)

  // Initialize all enemy state paths in StateManager
  Object.keys(configuredEnemy).forEach(key => {
    stateManager.setState(`enemies.${enemyId}.${key}`, configuredEnemy[key])
  })

  // Setup event-driven effects
  setupEnemyEffects(stateManager, eventDispatcher, effectManager, enemyId)

  // Emit creation event
  eventDispatcher.emit(ENEMY_EVENTS.ENEMY_CREATED, {
    enemyId: enemyId,
    type: type,
    x: x,
    y: y,
    health: configuredEnemy.health,
    maxHealth: configuredEnemy.maxHealth
  })

  return enemyId
}

/**
 * Set up enemy properties based on type
 * @param {Object} enemy - Enemy state object
 * @returns {Object} Updated enemy state with type-specific properties
 */
function setupEnemyType(enemy) {
  switch (enemy.type) {
    case 'drone': {
      return {
        ...enemy,
        width: 18,
        height: 14,
        maxHealth: 8,
        health: 8,
        speed: 140,
        damage: 8,
        points: 6,
        color: '#66ffcc',
        shootRate: 2500,
        bulletSpeed: 180
      }
    }

    case 'turret': {
      return {
        ...enemy,
        width: 26,
        height: 22,
        maxHealth: 30,
        health: 30,
        speed: 40,
        damage: 12,
        points: 12,
        color: '#88aaff',
        shootRate: 3000,
        bulletSpeed: 140
      }
    }

    case 'seeder': {
      return {
        ...enemy,
        width: 22,
        height: 18,
        maxHealth: 16,
        health: 16,
        speed: 80,
        damage: 10,
        points: 14,
        color: '#aaff66',
        shootRate: 2800,
        bulletSpeed: 100
      }
    }

    case 'fighter': {
      return {
        ...enemy,
        width: 30,
        height: 20,
        maxHealth: 20,
        health: 20,
        speed: 100,
        damage: 15,
        points: 10,
        color: '#ff4444',
        shootRate: 2000,
        bulletSpeed: 200
      }
    }

    case 'bomber': {
      return {
        ...enemy,
        width: 45,
        height: 35,
        maxHealth: 40,
        health: 40,
        speed: 60,
        damage: 25,
        points: 25,
        color: '#ff8844',
        shootRate: 3000,
        bulletSpeed: 150
      }
    }

    case 'scout': {
      return {
        ...enemy,
        width: 20,
        height: 15,
        maxHealth: 10,
        health: 10,
        speed: 180,
        damage: 10,
        points: 5,
        color: '#44ff44',
        shootRate: 1500,
        bulletSpeed: 250
      }
    }

    case 'boss':
    case 'boss_heavy':
    case 'boss_fast':
    case 'boss_sniper':
    case 'relay_warden': {
      const config = BOSS_CONFIGS[enemy.type]
      const bossEnemy = { ...enemy, ...config, health: config.maxHealth }

      if (enemy.type === 'relay_warden') {
        return {
          ...bossEnemy,
          phase: 1,
          sweepAngle: 0,
          sweepDirection: 1,
          vulnerabilityTimer: 0,
          ringBeamActive: false,
          nodeMode: false,
          phaseTransitionTriggered: false
        }
      }
      return bossEnemy
    }

    default: {
      return {
        ...enemy,
        width: 30,
        height: 20,
        maxHealth: 20,
        health: 20,
        speed: 100,
        damage: 15,
        points: 10,
        color: '#ff4444',
        shootRate: 2000,
        bulletSpeed: 200,
        type: 'fighter'
      }
    }
  }
}

/**
 * Initialize a created enemy with effects and state
 * @param {Object} enemy - Enemy POJO state
 * @returns {Object} Initialized enemy
 * @deprecated - Use createEnemy instead which handles setup automatically
 */
export function initializeEnemy(enemy) {
  // TODO: This function may be legacy - createEnemy handles setup now
  // setupEnemyEffects(enemy)
  // initializeEnemyState(enemy)

  // Emit creation event
  enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_CREATED, {
    enemy: enemy,
    type: enemy.type,
    x: enemy.x,
    y: enemy.y,
    health: enemy.health,
    maxHealth: enemy.maxHealth
  })

  return enemy
}

/**
 * Update enemy state and behavior
 * @param {Object} enemy - Enemy POJO state
 * @param {number} deltaTime - Time elapsed since last update
 */
export function updateEnemy(enemy, deltaTime) {
  // DEPRECATED - This function is kept for backwards compatibility only
  console.warn('updateEnemy is deprecated - use updateEnemyMovement and updateEnemyAI instead')

  // Create minimal compatibility by calling Entity-State functions
  const gameContext = {
    player: enemy.game?.player,
    width: enemy.game?.width || 800,
    height: enemy.game?.height || 600,
    eventDispatcher: enemy.eventDispatcher
  }

  if (enemy.id && enemy.game?.stateManager) {
    updateEnemyMovement(enemy.game.stateManager, enemy.id, deltaTime, gameContext)
    updateEnemyAI(enemy.game.stateManager, enemy.id, deltaTime, gameContext)
  }
}

/**
 * Update enemy movement - Pure Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {string} enemyId - Enemy ID
 * @param {number} deltaTime - Time elapsed since last update
 * @param {Object} gameContext - Game context (player, dimensions)
 */
export function updateEnemyMovement(stateManager, enemyId, deltaTime, gameContext) {
  if (!Enemy.exists(stateManager, enemyId)) return

  const { player, width: gameWidth, height: gameHeight } = gameContext
  if (!player) return

  const position = Enemy.getPosition(stateManager, enemyId)
  const speed = Enemy.getSpeed(stateManager, enemyId)
  const type = Enemy.getType(stateManager, enemyId)
  const dimensions = Enemy.getDimensions(stateManager, enemyId)

  const moveSpeed = speed * (deltaTime / 1000)
  const previousX = position.x
  const previousY = position.y
  let newX = position.x
  let newY = position.y

  switch (type) {
    case 'drone': {
      newX -= moveSpeed
      Enemy.updateMoveTimer(stateManager, enemyId, deltaTime)
      const moveTimer = Enemy.getMoveTimer(stateManager, enemyId)

      if (moveTimer > 300) {
        Enemy.setMoveTimer(stateManager, enemyId, 0)
        const currentDir = Enemy.getZigDirection(stateManager, enemyId)
        Enemy.setZigDirection(stateManager, enemyId, currentDir === 1 ? -1 : 1)
      }

      const zigDirection = Enemy.getZigDirection(stateManager, enemyId)
      newY += zigDirection * moveSpeed * MOVEMENT_SPEED_MULTIPLIER
      break
    }

    case 'turret': {
      newX -= moveSpeed
      break
    }

    case 'seeder': {
      newX -= moveSpeed
      Enemy.updateMoveTimer(stateManager, enemyId, deltaTime)
      const moveTimer = Enemy.getMoveTimer(stateManager, enemyId)
      const bob =
        Math.sin((moveTimer / BOB_PERIOD_MS) * BOB_WAVE_CYCLE) * BOB_AMPLITUDE_FACTOR * moveSpeed
      newY += bob
      break
    }

    case 'fighter': {
      newX -= moveSpeed
      const dy = player.y - position.y
      if (Math.abs(dy) > 5) {
        newY += Math.sign(dy) * moveSpeed * 0.3
      }
      break
    }

    case 'bomber': {
      newX -= moveSpeed
      break
    }

    case 'scout': {
      newX -= moveSpeed
      Enemy.updateMoveTimer(stateManager, enemyId, deltaTime)
      const moveTimer = Enemy.getMoveTimer(stateManager, enemyId)

      if (moveTimer > 1000) {
        const targetY = Math.random() * (gameHeight - dimensions.height)
        Enemy.setTargetY(stateManager, enemyId, targetY)
        Enemy.setMoveTimer(stateManager, enemyId, 0)
      }

      const targetY = Enemy.getTargetY(stateManager, enemyId)
      const scoutTargetDy = targetY - position.y
      if (Math.abs(scoutTargetDy) > 5) {
        newY += Math.sign(scoutTargetDy) * moveSpeed * MOVEMENT_SPEED_MULTIPLIER
      }
      break
    }

    case 'boss': {
      newX -= moveSpeed * 0.5
      const bossTargetY = player.y - dimensions.height / 2
      const maxY = gameHeight - dimensions.height
      const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY))
      const bossDy = clampedTargetY - position.y
      if (Math.abs(bossDy) > 5) {
        newY += Math.sign(bossDy) * moveSpeed * 0.4
      }
      break
    }

    case 'boss_heavy': {
      newX -= moveSpeed * 0.3
      const centerY = gameHeight / 2 - dimensions.height / 2
      const dy = centerY - position.y
      if (Math.abs(dy) > 20) {
        newY += Math.sign(dy) * moveSpeed * 0.2
      }
      break
    }

    case 'boss_fast': {
      newX -= moveSpeed * MOVEMENT_SPEED_MULTIPLIER
      const bossTargetY = player.y - dimensions.height / 2
      const maxY = gameHeight - dimensions.height
      const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY))
      const bossDy = clampedTargetY - position.y
      if (Math.abs(bossDy) > 2) {
        newY += Math.sign(bossDy) * moveSpeed * 0.7
      }
      break
    }

    case 'boss_sniper': {
      newX -= moveSpeed * 0.2
      Enemy.updateMoveTimer(stateManager, enemyId, deltaTime)
      const moveTimer = Enemy.getMoveTimer(stateManager, enemyId)

      if (moveTimer > 2000) {
        const targetY = Math.random() * (gameHeight - dimensions.height)
        Enemy.setTargetY(stateManager, enemyId, targetY)
        Enemy.setMoveTimer(stateManager, enemyId, 0)
      }

      const targetY = Enemy.getTargetY(stateManager, enemyId)
      const sniperTargetDy = targetY - position.y
      if (Math.abs(sniperTargetDy) > 5) {
        newY += Math.sign(sniperTargetDy) * moveSpeed * 0.3
      }
      break
    }

    case 'relay_warden': {
      updateRelayWardenMovement(stateManager, enemyId, deltaTime, moveSpeed, player, gameContext)
      return // Relay Warden handles its own position updates
    }
  }

  // Update position if it changed
  if (newX !== previousX || newY !== previousY) {
    Enemy.setPosition(stateManager, enemyId, { x: newX, y: newY })

    // Emit movement events through game context
    if (gameContext.eventDispatcher) {
      gameContext.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_POSITION_CHANGED, {
        enemyId,
        x: newX,
        y: newY,
        previousX,
        previousY,
        type
      })
    }
  }

  // Check for off-screen deletion
  if (newX < OFF_SCREEN_BOUNDARY) {
    Enemy.markForDeletion(stateManager, enemyId)
    if (gameContext.eventDispatcher) {
      gameContext.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_OFF_SCREEN, {
        enemyId,
        x: newX,
        y: newY
      })
    }
  }
}

/**
 * Update Relay Warden movement - Pure Entity-State Architecture
 */
export function updateRelayWardenMovement(
  stateManager,
  enemyId,
  deltaTime,
  moveSpeed,
  player,
  gameContext
) {
  const health = Enemy.getHealth(stateManager, enemyId)
  const maxHealth = Enemy.getMaxHealth(stateManager, enemyId)

  // Phase transition check
  if (health <= maxHealth * 0.5) {
    const phase = Enemy.getPhase(stateManager, enemyId) || 1
    if (phase === 1) {
      Enemy.setPhase(stateManager, enemyId, 2)
      const newX = gameContext.width * 0.75
      const newY = gameContext.height * 0.25
      Enemy.setPosition(stateManager, enemyId, { x: newX, y: newY })
      return
    }
  }

  const phase = Enemy.getPhase(stateManager, enemyId) || 1
  if (phase === 1) {
    const position = Enemy.getPosition(stateManager, enemyId)
    const dimensions = Enemy.getDimensions(stateManager, enemyId)

    const newX = position.x - moveSpeed * 0.15
    let newY = position.y

    if (player) {
      const centerY = gameContext.height / 2 - dimensions.height / 2
      const dy = centerY - position.y
      if (Math.abs(dy) > 30) {
        newY += Math.sign(dy) * moveSpeed * 0.2
      }
    }

    Enemy.setPosition(stateManager, enemyId, { x: newX, y: newY })
  } else {
    const position = Enemy.getPosition(stateManager, enemyId)

    Enemy.updateMoveTimer(stateManager, enemyId, deltaTime)
    const moveTimer = Enemy.getMoveTimer(stateManager, enemyId)

    if (moveTimer > 2000) {
      const targetY = Math.random() * (gameContext.height * 0.6) + gameContext.height * 0.2
      Enemy.setTargetY(stateManager, enemyId, targetY)
      Enemy.setMoveTimer(stateManager, enemyId, 0)
    }

    const targetY = Enemy.getTargetY(stateManager, enemyId)
    const newX = position.x - moveSpeed * 0.1
    let newY = position.y

    if (targetY) {
      const dy = targetY - position.y
      if (Math.abs(dy) > 5) {
        newY += Math.sign(dy) * moveSpeed * 0.3
      }
    }

    Enemy.setPosition(stateManager, enemyId, { x: newX, y: newY })
  }
}

/**
 * Update enemy AI and behavior - Pure Entity-State Architecture
 */
export function updateEnemyAI(stateManager, enemyId, deltaTime, gameContext) {
  if (!Enemy.exists(stateManager, enemyId)) return

  // Update shoot timer
  Enemy.updateShootTimer(stateManager, enemyId, deltaTime)

  // Handle AI state and shooting
  const aiState = Enemy.getAIState(stateManager, enemyId)
  const shootTimer = Enemy.getShootTimer(stateManager, enemyId)
  const shootRate = Enemy.getShootRate(stateManager, enemyId)

  switch (aiState) {
    case AI_STATES.SPAWNING:
      Enemy.setAIState(stateManager, enemyId, AI_STATES.MOVING)
      break

    case AI_STATES.MOVING:
      if (gameContext.player) {
        Enemy.setAIState(stateManager, enemyId, AI_STATES.ATTACKING)
      }
      break

    case AI_STATES.ATTACKING:
      if (shootTimer > shootRate && gameContext.player) {
        shootEnemy(stateManager, gameContext.eventDispatcher, gameContext, enemyId)
        Enemy.setShootTimer(stateManager, enemyId, 0)
      }
      break

    case AI_STATES.SEARCHING:
      if (gameContext.player) {
        Enemy.setTarget(stateManager, enemyId, gameContext.player)
        Enemy.setAIState(stateManager, enemyId, AI_STATES.ATTACKING)
      }
      break
  }

  // Check health for death
  const health = Enemy.getHealth(stateManager, enemyId)
  if (health <= 0) {
    Enemy.markForDeletion(stateManager, enemyId)
    if (gameContext.eventDispatcher) {
      gameContext.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DIED, {
        enemyId,
        type: Enemy.getType(stateManager, enemyId),
        x: Enemy.getPosition(stateManager, enemyId).x,
        y: Enemy.getPosition(stateManager, enemyId).y,
        points: Enemy.getPoints(stateManager, enemyId)
      })
    }
  }
}

/**
 * Enemy shooting behavior - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {Object} eventDispatcher - EventDispatcher instance
 * @param {Object} game - Game instance for player access and bullet creation
 * @param {string} enemyId - Enemy ID
 */
export function shootEnemy(stateManager, eventDispatcher, game, enemyId) {
  const player = game.player
  if (!player) return

  const enemyType = Enemy.getType(stateManager, enemyId)
  if (enemyType === 'relay_warden') {
    relayWardenShoot(stateManager, eventDispatcher, game, enemyId)
    return
  }

  const position = Enemy.getPosition(stateManager, enemyId)
  const dimensions = Enemy.getDimensions(stateManager, enemyId)
  const bulletSpeed = Enemy.getBulletSpeed(stateManager, enemyId)

  const dx = player.x - position.x
  const dy = player.y - position.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > 0) {
    const velocityX = (dx / distance) * bulletSpeed
    const velocityY = (dy / distance) * bulletSpeed
    const bulletType = enemyType === 'seeder' ? 'seed' : 'enemy'

    const bulletId = createBullet(stateManager, {
      position: {
        x: position.x,
        y: position.y + dimensions.height / 2
      },
      velocity: {
        x: velocityX,
        y: velocityY
      },
      type: bulletType,
      friendly: false
    })

    // StateManager is the single source of truth - no need for game.addBullet
    // The bullet-manager.js handles synchronization with game.bullets array

    eventDispatcher.emit(ENEMY_EVENTS.ENEMY_SHOT, {
      enemyId: enemyId,
      bulletId: bulletId,
      x: position.x,
      y: position.y + dimensions.height / 2,
      velocityX,
      velocityY,
      target: player,
      type: enemyType
    })

    // Reset shoot timer
    Enemy.setShootTimer(stateManager, enemyId, 0)
  }
}

/**
 * Relay Warden specific shooting behavior - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {Object} eventDispatcher - EventDispatcher instance
 * @param {Object} game - Game context
 * @param {string} enemyId - Enemy ID
 */
export function relayWardenShoot(stateManager, eventDispatcher, game, enemyId) {
  const position = Enemy.getPosition(stateManager, enemyId)
  const dimensions = Enemy.getDimensions(stateManager, enemyId)
  const centerX = position.x + dimensions.width / 2
  const centerY = position.y + dimensions.height / 2

  const phase = Enemy.getPhase(stateManager, enemyId)

  if (phase === 1) {
    firePhase1Pattern(stateManager, eventDispatcher, game, enemyId, centerX, centerY)
  } else {
    firePhase2Pattern(stateManager, eventDispatcher, game, enemyId, centerX, centerY)
  }
}

/**
 * Fire Phase 1 pattern for Relay Warden - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {Object} eventDispatcher - EventDispatcher instance
 * @param {Object} game - Game context
 * @param {string} enemyId - Enemy ID
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 */
export function firePhase1Pattern(stateManager, eventDispatcher, game, enemyId, centerX, centerY) {
  const fanCount = 5
  const fanSpread = Math.PI / 3
  const bulletSpeed = Enemy.getBulletSpeed(stateManager, enemyId)
  const player = game.player

  if (!player) return

  const dx = player.x - centerX
  const dy = player.y - centerY
  const playerAngle = Math.atan2(dy, dx)

  for (let i = 0; i < fanCount; i++) {
    const angleOffset = (i - 2) * (fanSpread / (fanCount - 1))
    const bulletAngle = playerAngle + angleOffset
    const velocityX = Math.cos(bulletAngle) * bulletSpeed
    const velocityY = Math.sin(bulletAngle) * bulletSpeed

    createBullet(stateManager, {
      position: { x: centerX, y: centerY },
      velocity: { x: velocityX, y: velocityY },
      type: 'enemy',
      friendly: false
    })
  }

  if (Math.random() < DRONE_SPAWN_PROBABILITY) {
    // TODO: Convert spawnDroneAdd to Entity-State
    const enemyState = Enemy.getEnemyState(stateManager, enemyId)
    spawnDroneAdd(enemyState)
  }
}

/**
 * Fire Phase 2 pattern for Relay Warden - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {Object} eventDispatcher - EventDispatcher instance
 * @param {Object} game - Game context
 * @param {string} enemyId - Enemy ID
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 */
export function firePhase2Pattern(stateManager, eventDispatcher, game, enemyId, centerX, centerY) {
  const vulnerabilityTimer = Enemy.getVulnerabilityTimer(stateManager, enemyId)
  const bulletSpeed = Enemy.getBulletSpeed(stateManager, enemyId)
  const player = game.player

  if (!player) return

  if (vulnerabilityTimer > 2000 && vulnerabilityTimer < 3000) {
    const sweepCount = 3
    const baseAngle = Math.atan2(player.y - centerY, player.x - centerX)

    for (let i = 0; i < sweepCount; i++) {
      const angleOffset = (i - 1) * 0.2
      const bulletAngle = baseAngle + angleOffset
      const velocityX = Math.cos(bulletAngle) * bulletSpeed * 0.8
      const velocityY = Math.sin(bulletAngle) * bulletSpeed * 0.8

      createBullet(stateManager, {
        position: { x: centerX, y: centerY },
        velocity: { x: velocityX, y: velocityY },
        type: 'enemy',
        friendly: false
      })
    }
  }
}

/**
 * Spawn drone reinforcement
 * @param {Object} enemy - Enemy POJO state
 */
export function spawnDroneAdd(enemy) {
  const spawnX = enemy.game.width + 50
  const spawnY = Math.random() * (enemy.game.height - 50) + 25

  const droneId = createEnemy(
    enemy.game.stateManager,
    enemy.eventDispatcher,
    enemy.game.effectManager,
    spawnX,
    spawnY,
    'drone'
  )

  // Convert to compatibility object for Game code - maintains StateManager as source of truth
  const droneAdd = Enemy.getEnemyState(enemy.game.stateManager, droneId)
  if (droneAdd) {
    droneAdd['id'] = droneId // Store ID for StateManager operations
    enemy.game.enemies.push(droneAdd)
  }

  enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_SPAWNED, {
    enemy: droneAdd,
    spawner: enemy,
    type: 'drone_add'
  })
}

// Legacy POJO function removed - Entity-State architecture uses updateRelayWardenMovement() instead

// Legacy POJO function removed - Entity-State architecture handles phase behavior in updateRelayWardenMovement()

// Legacy POJO function removed - Entity-State architecture handles phase behavior in updateRelayWardenMovement()

// Legacy POJO function removed - Entity-State architecture uses Enemy.takeDamage() and handleDamage() instead

/**
 * Enemy death handling
 * @param {Object} enemy - Enemy POJO state
 */
export function dieEnemy(enemy) {
  enemy.aiState = AI_STATES.DYING

  if (enemy.eventDispatcher) {
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DIED, {
      enemy: enemy,
      type: enemy.type,
      x: enemy.x,
      y: enemy.y,
      points: enemy.points
    })
  }

  enemy.markedForDeletion = true

  // Call wrapper method if available for test compatibility
  if (typeof enemy.cleanup === 'function') {
    enemy.cleanup()
  } else {
    cleanupEnemy(enemy)
  }
}

/**
 * Cleanup resources and emit destroy event
 * @param {Object} enemy - Enemy POJO state
 */
export function cleanupEnemy(enemy) {
  if (enemy.eventDispatcher) {
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DESTROYED, {
      enemy: enemy,
      type: enemy.type,
      x: enemy.x,
      y: enemy.y
    })
  }
}

/**
 * Setup effects-based event handling using EffectManager
 * @param {Object} stateManager - StateManager instance
 * @param {Object} eventDispatcher - EventDispatcher instance
 * @param {Object} effectManager - EffectManager instance
 * @param {string} enemyId - Enemy ID
 */
export function setupEnemyEffects(stateManager, eventDispatcher, effectManager, enemyId) {
  effectManager.effect(ENEMY_EVENTS.ENEMY_AI_UPDATE, data => {
    if (data.enemyId === enemyId) {
      handleAIUpdate(stateManager, enemyId, data)
    }
  })

  effectManager.effect(ENEMY_EVENTS.ENEMY_DAMAGED, data => {
    if (data.enemyId === enemyId) {
      handleDamage(stateManager, enemyId, data)
    }
  })

  effectManager.effect(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, data => {
    if (data.enemyId === enemyId) {
      handleTargetAcquisition(stateManager, enemyId, data)
    }
  })

  effectManager.effect(ENEMY_EVENTS.ENEMY_COLLISION_BULLET, data => {
    if (data.enemyId === enemyId) {
      handleBulletCollision(stateManager, enemyId, data)
    }
  })

  effectManager.effect(ENEMY_EVENTS.ENEMY_COLLISION_PLAYER, data => {
    if (data.enemyId === enemyId) {
      handlePlayerCollision(stateManager, enemyId, data)
    }
  })

  // State synchronization effects
  effectManager.effect(ENEMY_EVENTS.ENEMY_SHOT, data => {
    if (data.enemyId === enemyId) {
      stateManager.setState(`enemies.${enemyId}.shootTimer`, data.shootTimer)
    }
  })

  effectManager.effect(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, data => {
    if (data.enemyId === enemyId) {
      stateManager.setState(`enemies.${enemyId}.health`, data.health)
    }
  })

  effectManager.effect(ENEMY_EVENTS.ENEMY_AI_BEHAVIOR_CHANGE, data => {
    if (data.enemyId === enemyId) {
      stateManager.setState(`enemies.${enemyId}.aiState`, data.behavior)
    }
  })

  effectManager.effect(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, data => {
    if (data.enemyId === enemyId) {
      stateManager.setState(`enemies.${enemyId}.target`, data.target)
    }
  })
}

/**
 * Initialize state in state manager
 * @param {Object} enemy - Enemy POJO state
 */
export function initializeEnemyState(enemy) {
  enemy.stateManager.setState(ENEMY_STATES.HEALTH, enemy.health)
  enemy.stateManager.setState(ENEMY_STATES.POSITION, { x: enemy.x, y: enemy.y })
  enemy.stateManager.setState(ENEMY_STATES.VELOCITY, { x: 0, y: 0 })
  enemy.stateManager.setState(ENEMY_STATES.TARGET, null)
  enemy.stateManager.setState(ENEMY_STATES.BEHAVIOR, enemy.behavior)
  enemy.stateManager.setState(ENEMY_STATES.SHOOT_TIMER, enemy.shootTimer)
  enemy.stateManager.setState(ENEMY_STATES.MOVE_TIMER, enemy.moveTimer)
  enemy.stateManager.setState(ENEMY_STATES.AI_STATE, enemy.aiState)
}

/**
 * Handle AI update events - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {string} enemyId - Enemy ID
 * @param {Object} data - Event data
 */
export function handleAIUpdate(stateManager, enemyId, data) {
  const { deltaTime } = data
  const oldAiState = Enemy.getAIState(stateManager, enemyId)

  switch (oldAiState) {
    case AI_STATES.SPAWNING: {
      Enemy.setAIState(stateManager, enemyId, AI_STATES.MOVING)
      break
    }

    case AI_STATES.MOVING: {
      // Check if player exists to transition to attacking
      const gameState = stateManager.getState('game')
      if (gameState && gameState.player) {
        Enemy.setAIState(stateManager, enemyId, AI_STATES.ATTACKING)
      }
      break
    }

    case AI_STATES.ATTACKING: {
      const shootTimer = Enemy.getShootTimer(stateManager, enemyId)
      const shootRate = Enemy.getShootRate(stateManager, enemyId)
      const newShootTimer = shootTimer + deltaTime
      Enemy.setShootTimer(stateManager, enemyId, newShootTimer)

      if (newShootTimer > shootRate) {
        // Get necessary game context for shooting
        const gameState = stateManager.getState('game')
        if (gameState && gameState.eventDispatcher) {
          shootEnemy(stateManager, gameState.eventDispatcher, gameState, enemyId)
        }
        Enemy.setShootTimer(stateManager, enemyId, 0)
      }
      break
    }

    case AI_STATES.SEARCHING: {
      const gameState = stateManager.getState('game')
      if (gameState && gameState.player && gameState.eventDispatcher) {
        gameState.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, {
          enemyId: enemyId,
          target: gameState.player
        })
      }
      break
    }

    case AI_STATES.FLEEING: {
      break
    }
  }

  const currentAiState = Enemy.getAIState(stateManager, enemyId)
  if (currentAiState !== AI_STATES.SPAWNING && currentAiState !== AI_STATES.DYING) {
    // Use Entity-State architecture for movement
    const gameState = stateManager.getState('game')
    const gameContext = {
      player: gameState?.player,
      width: gameState?.width || 800,
      height: gameState?.height || 600,
      eventDispatcher: gameState?.eventDispatcher
    }

    if (gameContext.player) {
      updateEnemyMovement(stateManager, enemyId, deltaTime, gameContext)
    }
  }

  const newAiState = Enemy.getAIState(stateManager, enemyId)
  if (newAiState !== oldAiState) {
    const gameState = stateManager.getState('game')
    if (gameState && gameState.eventDispatcher) {
      gameState.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_BEHAVIOR_CHANGE, {
        enemyId: enemyId,
        behavior: newAiState,
        previousBehavior: oldAiState
      })
    }
  }
} /**
 * Handle damage events - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {string} enemyId - Enemy ID
 * @param {Object} data - Event data
 */

export function handleDamage(stateManager, enemyId, data) {
  const { damage } = data
  const oldHealth = Enemy.getHealth(stateManager, enemyId)
  const maxHealth = Enemy.getMaxHealth(stateManager, enemyId)

  const newHealth = Math.max(0, oldHealth - damage)
  Enemy.setHealth(stateManager, enemyId, newHealth)

  const gameState = stateManager.getState('game')
  if (gameState && gameState.eventDispatcher) {
    gameState.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, {
      enemyId: enemyId,
      health: newHealth,
      maxHealth: maxHealth,
      previousHealth: oldHealth,
      damage: damage
    })

    if (newHealth <= maxHealth * CRITICAL_HEALTH_THRESHOLD && newHealth > 0) {
      gameState.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CRITICAL, {
        enemyId: enemyId,
        health: newHealth,
        maxHealth: maxHealth
      })
    }
  }

  if (newHealth <= 0) {
    const enemyState = Enemy.getEnemyState(stateManager, enemyId)
    dieEnemy(enemyState)
  }
}

/**
 * Handle target acquisition - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {string} enemyId - Enemy ID
 * @param {Object} data - Event data
 */
export function handleTargetAcquisition(stateManager, enemyId, data) {
  const { target } = data

  if (target) {
    Enemy.setTarget(stateManager, enemyId, target)
    Enemy.setAIState(stateManager, enemyId, AI_STATES.ATTACKING)

    const gameState = stateManager.getState('game')
    if (gameState && gameState.eventDispatcher) {
      gameState.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, {
        enemyId: enemyId,
        target: target
      })
    }
  }
}

/**
 * Handle bullet collision events - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {string} enemyId - Enemy ID
 * @param {Object} data - Event data
 */
export function handleBulletCollision(stateManager, enemyId, data) {
  const { bullet } = data

  const gameState = stateManager.getState('game')
  if (gameState && gameState.eventDispatcher) {
    gameState.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
      enemyId: enemyId,
      damage: bullet.damage || 10
    })
  }
}

/**
 * Handle player collision events - Entity-State Architecture
 * @param {Object} stateManager - StateManager instance
 * @param {string} enemyId - Enemy ID
 * @param {Object} _data - Event data (unused)
 */
export function handlePlayerCollision(stateManager, enemyId, _data) {
  const maxHealth = Enemy.getMaxHealth(stateManager, enemyId)

  const gameState = stateManager.getState('game')
  if (gameState && gameState.eventDispatcher) {
    gameState.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
      enemyId: enemyId,
      damage: maxHealth
    })
  }
}

/**
 * Render enemy
 * @param {Object} enemy - Enemy POJO state
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function renderEnemy(enemy, ctx) {
  ctx.fillStyle = enemy.color

  switch (enemy.type) {
    case 'drone':
      if (typeof enemy.drawDrone === 'function') {
        enemy.drawDrone(ctx)
      } else {
        drawDrone(enemy, ctx)
      }
      break
    case 'turret':
      if (typeof enemy.drawTurret === 'function') {
        enemy.drawTurret(ctx)
      } else {
        drawTurret(enemy, ctx)
      }
      break
    case 'seeder':
      if (typeof enemy.drawSeeder === 'function') {
        enemy.drawSeeder(ctx)
      } else {
        drawSeeder(enemy, ctx)
      }
      break
    case 'fighter':
      if (typeof enemy.drawFighter === 'function') {
        enemy.drawFighter(ctx)
      } else {
        drawFighter(enemy, ctx)
      }
      break
    case 'bomber':
      if (typeof enemy.drawBomber === 'function') {
        enemy.drawBomber(ctx)
      } else {
        drawBomber(enemy, ctx)
      }
      break
    case 'scout':
      if (typeof enemy.drawScout === 'function') {
        enemy.drawScout(ctx)
      } else {
        drawScout(enemy, ctx)
      }
      break
    case 'boss':
      if (typeof enemy.drawBoss === 'function') {
        enemy.drawBoss(ctx)
      } else {
        drawBoss(enemy, ctx)
      }
      break
    case 'boss_heavy':
      if (typeof enemy.drawBossHeavy === 'function') {
        enemy.drawBossHeavy(ctx)
      } else {
        drawBossHeavy(enemy, ctx)
      }
      break
    case 'boss_fast':
      if (typeof enemy.drawBossFast === 'function') {
        enemy.drawBossFast(ctx)
      } else {
        drawBossFast(enemy, ctx)
      }
      break
    case 'boss_sniper':
      if (typeof enemy.drawBossSniper === 'function') {
        enemy.drawBossSniper(ctx)
      } else {
        drawBossSniper(enemy, ctx)
      }
      break
    case 'relay_warden':
      if (typeof enemy.drawRelayWarden === 'function') {
        enemy.drawRelayWarden(ctx)
      } else {
        drawRelayWarden(enemy, ctx)
      }
      break
  }

  if (enemy.health < enemy.maxHealth) {
    if (typeof enemy.drawHealthBar === 'function') {
      enemy.drawHealthBar(ctx)
    } else {
      drawHealthBar(enemy, ctx)
    }
  }
}

// Drawing functions for each enemy type
export function drawDrone(enemy, ctx) {
  ctx.fillRect(enemy.x, enemy.y + 4, enemy.width - 4, 6)
  ctx.fillRect(enemy.x + 4, enemy.y + 1, 10, 3)
  ctx.fillRect(enemy.x + 4, enemy.y + enemy.height - 4, 10, 3)
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 6, enemy.y + enemy.height / 2 - 3)
  ctx.lineTo(enemy.x - 6, enemy.y + enemy.height / 2 + 3)
  ctx.closePath()
  ctx.fill()
}

export function drawTurret(enemy, ctx) {
  ctx.fillStyle = '#556'
  ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 4, enemy.width - 6, 4)
  ctx.fillStyle = enemy.color
  ctx.fillRect(enemy.x + 2, enemy.y + 6, enemy.width - 8, enemy.height - 12)
  ctx.fillRect(enemy.x - 10, enemy.y + enemy.height / 2 - 2, 12, 4)
}

export function drawSeeder(enemy, ctx) {
  ctx.fillRect(enemy.x, enemy.y + 5, enemy.width - 6, enemy.height - 10)
  ctx.fillStyle = '#caff8a'
  ctx.fillRect(enemy.x + 3, enemy.y + enemy.height / 2 - 3, enemy.width - 12, 6)
  ctx.fillStyle = enemy.color
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 8, enemy.y + enemy.height / 2 - 4)
  ctx.lineTo(enemy.x - 8, enemy.y + enemy.height / 2 + 4)
  ctx.closePath()
  ctx.fill()
}

export function drawFighter(enemy, ctx) {
  ctx.fillRect(enemy.x, enemy.y + 6, enemy.width - 5, 8)
  ctx.fillRect(enemy.x + 8, enemy.y, 15, 4)
  ctx.fillRect(enemy.x + 8, enemy.y + 16, 15, 4)
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 8, enemy.y + enemy.height / 2 - 4)
  ctx.lineTo(enemy.x - 8, enemy.y + enemy.height / 2 + 4)
  ctx.closePath()
  ctx.fill()
}

export function drawBomber(enemy, ctx) {
  ctx.fillRect(enemy.x, enemy.y + 8, enemy.width - 10, 20)
  ctx.fillRect(enemy.x + 10, enemy.y, 25, 6)
  ctx.fillRect(enemy.x + 10, enemy.y + 29, 25, 6)
  ctx.fillStyle = '#666'
  ctx.fillRect(enemy.x + 15, enemy.y + 2, 4, 4)
  ctx.fillRect(enemy.x + 15, enemy.y + 29, 4, 4)
  ctx.fillStyle = enemy.color
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 12, enemy.y + enemy.height / 2 - 6)
  ctx.lineTo(enemy.x - 12, enemy.y + enemy.height / 2 + 6)
  ctx.closePath()
  ctx.fill()
}

export function drawScout(enemy, ctx) {
  ctx.fillRect(enemy.x, enemy.y + 4, enemy.width - 3, 7)
  ctx.fillRect(enemy.x + 5, enemy.y, 10, 3)
  ctx.fillRect(enemy.x + 5, enemy.y + 12, 10, 3)
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 6, enemy.y + enemy.height / 2 - 3)
  ctx.lineTo(enemy.x - 6, enemy.y + enemy.height / 2 + 3)
  ctx.closePath()
  ctx.fill()
}

export function drawBoss(enemy, ctx) {
  ctx.fillRect(enemy.x, enemy.y + 15, enemy.width - 15, 30)
  ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.width - 25, 15)
  ctx.fillRect(enemy.x + 5, enemy.y + 40, enemy.width - 25, 15)
  ctx.fillStyle = '#ff6666'
  ctx.fillRect(enemy.x + 10, enemy.y + 20, enemy.width - 35, 20)
  ctx.fillStyle = enemy.color
  ctx.fillRect(enemy.x + enemy.width - 20, enemy.y + 10, 8, 12)
  ctx.fillRect(enemy.x + enemy.width - 20, enemy.y + 38, 8, 12)
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 15, enemy.y + enemy.height / 2 - 8)
  ctx.lineTo(enemy.x - 15, enemy.y + enemy.height / 2 + 8)
  ctx.closePath()
  ctx.fill()
}

export function drawBossHeavy(enemy, ctx) {
  ctx.fillStyle = enemy.color
  ctx.fillRect(enemy.x, enemy.y + 20, enemy.width - 20, 40)
  ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.width - 30, 20)
  ctx.fillRect(enemy.x + 5, enemy.y + 55, enemy.width - 30, 20)
  ctx.fillStyle = '#4B0000'
  ctx.fillRect(enemy.x + 15, enemy.y + 25, enemy.width - 45, 30)
  ctx.fillStyle = enemy.color
  ctx.fillRect(enemy.x + enemy.width - 25, enemy.y + 15, 12, 20)
  ctx.fillRect(enemy.x + enemy.width - 25, enemy.y + 45, 12, 20)
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 20, enemy.y + enemy.height / 2 - 12)
  ctx.lineTo(enemy.x - 20, enemy.y + enemy.height / 2 + 12)
  ctx.closePath()
  ctx.fill()
}

export function drawBossFast(enemy, ctx) {
  ctx.fillStyle = enemy.color
  ctx.fillRect(enemy.x, enemy.y + 12, enemy.width - 10, 26)
  ctx.beginPath()
  ctx.moveTo(enemy.x + 10, enemy.y)
  ctx.lineTo(enemy.x + 30, enemy.y + 8)
  ctx.lineTo(enemy.x + 15, enemy.y + 15)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(enemy.x + 10, enemy.y + 50)
  ctx.lineTo(enemy.x + 30, enemy.y + 42)
  ctx.lineTo(enemy.x + 15, enemy.y + 35)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#FF9900'
  ctx.fillRect(enemy.x + 5, enemy.y + 18, enemy.width - 25, 8)
  ctx.fillRect(enemy.x + 5, enemy.y + 28, enemy.width - 25, 8)
  ctx.fillStyle = enemy.color
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 12, enemy.y + enemy.height / 2 - 6)
  ctx.lineTo(enemy.x - 12, enemy.y + enemy.height / 2 + 6)
  ctx.closePath()
  ctx.fill()
}

export function drawBossSniper(enemy, ctx) {
  ctx.fillStyle = enemy.color
  ctx.fillRect(enemy.x, enemy.y + 18, enemy.width - 12, 34)
  ctx.fillStyle = '#6A0DAD'
  ctx.fillRect(enemy.x - 30, enemy.y + 28, 35, 14)
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(enemy.x + 10, enemy.y + 8, 8, 8)
  ctx.fillRect(enemy.x + 10, enemy.y + 54, 8, 8)
  ctx.fillStyle = enemy.color
  ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.width - 25, 15)
  ctx.fillRect(enemy.x + 5, enemy.y + 50, enemy.width - 25, 15)
  ctx.fillStyle = '#00FF00'
  ctx.fillRect(enemy.x + 20, enemy.y + 30, 6, 10)
  ctx.fillStyle = enemy.color
  ctx.beginPath()
  ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
  ctx.lineTo(enemy.x - 10, enemy.y + enemy.height / 2 - 5)
  ctx.lineTo(enemy.x - 10, enemy.y + enemy.height / 2 + 5)
  ctx.closePath()
  ctx.fill()
}

export function drawRelayWarden(enemy, ctx) {
  if (enemy.phase === 1) {
    drawRelayWardenPhase1(enemy, ctx)
  } else {
    drawRelayWardenPhase2(enemy, ctx)
  }
}

export function drawRelayWardenPhase1(enemy, ctx) {
  const centerX = enemy.x + enemy.width / 2
  const centerY = enemy.y + enemy.height / 2

  ctx.strokeStyle = enemy.color
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(centerX, centerY, enemy.width * 0.4, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = enemy.color
  ctx.fillRect(
    enemy.x + enemy.width * 0.3,
    enemy.y + enemy.height * 0.3,
    enemy.width * 0.4,
    enemy.height * 0.4
  )

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(
    enemy.x + enemy.width * 0.4,
    enemy.y + enemy.height * 0.4,
    enemy.width * 0.2,
    enemy.height * 0.2
  )

  if (enemy.ringBeamActive) {
    ctx.strokeStyle = '#ffff00'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(
      centerX + Math.cos(enemy.sweepAngle) * enemy.width * 0.6,
      centerY + Math.sin(enemy.sweepAngle) * enemy.width * 0.6
    )
    ctx.stroke()

    const gapAngle = enemy.sweepAngle + Math.PI
    ctx.strokeStyle = '#00ff00'
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(
      centerX + Math.cos(gapAngle) * enemy.width * 0.6,
      centerY + Math.sin(gapAngle) * enemy.width * 0.6
    )
    ctx.stroke()
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const nodeX = centerX + Math.cos(angle) * enemy.width * 0.35
    const nodeY = centerY + Math.sin(angle) * enemy.width * 0.35

    ctx.fillStyle = '#00cccc'
    ctx.fillRect(nodeX - 3, nodeY - 3, 6, 6)
  }
}

export function drawRelayWardenPhase2(enemy, ctx) {
  const centerX = enemy.x + enemy.width / 2
  const centerY = enemy.y + enemy.height / 2

  ctx.fillStyle = enemy.color
  ctx.fillRect(
    enemy.x + enemy.width * 0.2,
    enemy.y + enemy.height * 0.2,
    enemy.width * 0.6,
    enemy.height * 0.6
  )

  const pulseIntensity = Math.sin((enemy.vulnerabilityTimer / 1000) * Math.PI * 2) * 0.3 + 0.7
  ctx.fillStyle = `rgba(255, 255, 255, ${pulseIntensity})`
  ctx.fillRect(
    enemy.x + enemy.width * 0.35,
    enemy.y + enemy.height * 0.35,
    enemy.width * 0.3,
    enemy.height * 0.3
  )

  if (enemy.vulnerabilityTimer > 2000 && enemy.vulnerabilityTimer < 3000) {
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 3
    ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height)
  }

  ctx.strokeStyle = '#00ffff'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(centerX, centerY)
  ctx.lineTo(centerX + CONNECTION_BEAM_LENGTH, centerY + CONNECTION_BEAM_OFFSET_Y)
  ctx.stroke()
  ctx.setLineDash([])
}

export function drawHealthBar(enemy, ctx) {
  const barWidth = enemy.width
  const barHeight = 3
  const x = enemy.x
  const y = enemy.y - 8

  ctx.fillStyle = '#333'
  ctx.fillRect(x, y, barWidth, barHeight)

  const healthPercent = enemy.health / enemy.maxHealth
  ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'
  ctx.fillRect(x, y, barWidth * healthPercent, barHeight)
}

// Note: Legacy class wrapper removed - use functional API with Enemy.* accessors

// Note: Legacy compatibility layer removed - tests now use Entity-State architecture directly
