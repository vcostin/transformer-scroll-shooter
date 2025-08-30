/**
 * Enemy Entity - Stateless Implementation
 *
 * Entity-State Architecture: Stateless enemy entity operating on global state.
 * All enemy data is stored in StateManager, entity functions are pure.
 * State flows: StateManager → Entity Functions → StateManager → Rendering
 */

import { createBullet, Bullet } from '@/entities/bullet.js'
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
const PHASE2_POSITION_X_FACTOR = 0.75
const PHASE2_POSITION_Y_FACTOR = 0.25
const PHASE2_TARGET_Y_RANGE = 0.6
const PHASE2_TARGET_Y_OFFSET = 0.2

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

  takeDamage: (stateManager, enemyId, damage) => {
    const currentHealth = Enemy.getHealth(stateManager, enemyId)
    Enemy.setHealth(stateManager, enemyId, currentHealth - damage)
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

  // Add backward-compatible method wrappers for tests
  enemy.update = function (deltaTime) {
    Object.assign(this, updateEnemy(this, deltaTime))
    return this
  }

  enemy.shoot = function () {
    Object.assign(this, shootEnemy(this))
    return this
  }

  enemy.takeDamage = function (damage) {
    Object.assign(this, takeDamage(this, damage))
    return this
  }

  enemy.cleanup = function () {
    Object.assign(this, cleanupEnemy(this))
    return this
  }

  enemy.render = function (ctx) {
    return renderEnemy(this, ctx)
  }

  enemy.handleDamage = function (data) {
    Object.assign(this, handleDamage(this, data))
    return this
  }

  enemy.handleAIUpdate = function (data) {
    Object.assign(this, handleAIUpdate(this, data))
    return this
  }

  enemy.handleTargetAcquisition = function (data) {
    Object.assign(this, handleTargetAcquisition(this, data))
    return this
  }

  // Add wrapper methods for draw functions to support test spies
  enemy.drawFighter = function (ctx) {
    return drawFighter(this, ctx)
  }

  enemy.drawBomber = function (ctx) {
    return drawBomber(this, ctx)
  }

  enemy.drawScout = function (ctx) {
    return drawScout(this, ctx)
  }

  enemy.drawBoss = function (ctx) {
    return drawBoss(this, ctx)
  }

  enemy.drawHealthBar = function (ctx) {
    return drawHealthBar(this, ctx)
  }

  return enemy
}

/**
 * Update enemy state and behavior
 * @param {Object} enemy - Enemy POJO state
 * @param {number} deltaTime - Time elapsed since last update
 */
export function updateEnemy(enemy, deltaTime) {
  // Move towards player
  moveEnemy(enemy, deltaTime)

  // Update timers
  enemy.shootTimer += deltaTime
  enemy.moveTimer += deltaTime

  // Handle shooting
  if (enemy.shootTimer > enemy.shootRate) {
    // Use wrapper method if it exists (for test compatibility), otherwise functional approach
    if (typeof enemy.shoot === 'function') {
      enemy.shoot()
    } else {
      shootEnemy(enemy)
    }
    enemy.shootTimer = 0
  }

  // Event-driven update
  enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_UPDATE, {
    enemy: enemy,
    deltaTime: deltaTime
  })

  // Check for off-screen or death conditions
  if (enemy.x < OFF_SCREEN_BOUNDARY || enemy.health <= 0) {
    if (enemy.x < OFF_SCREEN_BOUNDARY) {
      enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_OFF_SCREEN, {
        enemy: enemy,
        x: enemy.x,
        y: enemy.y
      })
    }
    enemy.markedForDeletion = true
  }
}

/**
 * Move enemy based on type and behavior
 * @param {Object} enemy - Enemy POJO state
 * @param {number} deltaTime - Time elapsed since last update
 */
export function moveEnemy(enemy, deltaTime) {
  const player = enemy.game.player
  const moveSpeed = enemy.speed * (deltaTime / 1000)
  const previousX = enemy.x
  const previousY = enemy.y

  switch (enemy.type) {
    case 'drone': {
      enemy.x -= moveSpeed
      enemy.moveTimer += deltaTime
      if (enemy.moveTimer > 300) {
        enemy.moveTimer = 0
        enemy.zigDirection = enemy.zigDirection === 1 ? -1 : 1
      }
      enemy.y += enemy.zigDirection * moveSpeed * MOVEMENT_SPEED_MULTIPLIER
      break
    }

    case 'turret': {
      enemy.x -= moveSpeed
      break
    }

    case 'seeder': {
      enemy.x -= moveSpeed
      enemy.moveTimer += deltaTime
      const bob =
        Math.sin((enemy.moveTimer / BOB_PERIOD_MS) * BOB_WAVE_CYCLE) *
        BOB_AMPLITUDE_FACTOR *
        moveSpeed
      enemy.y += bob
      break
    }

    case 'fighter': {
      enemy.x -= moveSpeed
      if (player) {
        const dy = player.y - enemy.y
        if (Math.abs(dy) > 5) {
          enemy.y += Math.sign(dy) * moveSpeed * 0.3
        }
      }
      break
    }

    case 'bomber': {
      enemy.x -= moveSpeed
      break
    }

    case 'scout': {
      enemy.x -= moveSpeed
      enemy.moveTimer += deltaTime
      if (enemy.moveTimer > 1000) {
        enemy.targetY = Math.random() * (enemy.game.height - enemy.height)
        enemy.moveTimer = 0
      }
      const scoutTargetDy = enemy.targetY - enemy.y
      if (Math.abs(scoutTargetDy) > 5) {
        enemy.y += Math.sign(scoutTargetDy) * moveSpeed * MOVEMENT_SPEED_MULTIPLIER
      }
      break
    }

    case 'boss': {
      enemy.x -= moveSpeed * 0.5
      if (player) {
        const bossTargetY = player.y - enemy.height / 2
        const maxY = enemy.game.height - enemy.height
        const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY))
        const bossDy = clampedTargetY - enemy.y
        if (Math.abs(bossDy) > 5) {
          enemy.y += Math.sign(bossDy) * moveSpeed * 0.4
        }
      }
      break
    }

    case 'boss_heavy': {
      enemy.x -= moveSpeed * 0.3
      if (player) {
        const centerY = enemy.game.height / 2 - enemy.height / 2
        const dy = centerY - enemy.y
        if (Math.abs(dy) > 20) {
          enemy.y += Math.sign(dy) * moveSpeed * 0.2
        }
      }
      break
    }

    case 'boss_fast': {
      enemy.x -= moveSpeed * MOVEMENT_SPEED_MULTIPLIER
      if (player) {
        const bossTargetY = player.y - enemy.height / 2
        const maxY = enemy.game.height - enemy.height
        const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY))
        const bossDy = clampedTargetY - enemy.y
        if (Math.abs(bossDy) > 2) {
          enemy.y += Math.sign(bossDy) * moveSpeed * 0.7
        }
      }
      break
    }

    case 'boss_sniper': {
      enemy.x -= moveSpeed * 0.2
      enemy.moveTimer += deltaTime
      if (enemy.moveTimer > 2000) {
        enemy.targetY = Math.random() * (enemy.game.height - enemy.height)
        enemy.moveTimer = 0
      }
      const sniperTargetDy = enemy.targetY - enemy.y
      if (Math.abs(sniperTargetDy) > 5) {
        enemy.y += Math.sign(sniperTargetDy) * moveSpeed * 0.3
      }
      break
    }

    case 'relay_warden': {
      updateRelayWardenBehavior(enemy, deltaTime, moveSpeed, player)
      break
    }
  }

  // Emit movement events if position changed
  if (enemy.x !== previousX || enemy.y !== previousY) {
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_POSITION_CHANGED, {
      enemy: enemy,
      x: enemy.x,
      y: enemy.y,
      previousX,
      previousY,
      type: enemy.type
    })
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_MOVED, {
      enemy: enemy,
      x: enemy.x,
      y: enemy.y,
      previousX,
      previousY,
      type: enemy.type
    })
  }
}

/**
 * Enemy shooting behavior
 * @param {Object} enemy - Enemy POJO state
 */
export function shootEnemy(enemy) {
  const player = enemy.game.player
  if (!player) return

  if (enemy.type === 'relay_warden') {
    relayWardenShoot(enemy, player)
    return
  }

  const dx = player.x - enemy.x
  const dy = player.y - enemy.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > 0) {
    const velocityX = (dx / distance) * enemy.bulletSpeed
    const velocityY = (dy / distance) * enemy.bulletSpeed
    const bulletType = enemy.type === 'seeder' ? 'seed' : 'enemy'

    const bulletId = createBullet(enemy.game.stateManager, {
      position: {
        x: enemy.x,
        y: enemy.y + enemy.height / 2
      },
      velocity: {
        x: velocityX,
        y: velocityY
      },
      type: bulletType,
      friendly: false
    })

    const bulletState = Bullet.getBulletState(enemy.game.stateManager, bulletId)
    enemy.game.addBullet({
      id: bulletId,
      ...bulletState
    })

    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_SHOT, {
      enemy: enemy,
      bulletId: bulletId,
      x: enemy.x,
      y: enemy.y + enemy.height / 2,
      velocityX,
      velocityY,
      target: player,
      type: enemy.type
    })

    enemy.stateManager.setState(ENEMY_STATES.SHOOT_TIMER, enemy.shootTimer)
  }
}

/**
 * Relay Warden specific shooting behavior
 * @param {Object} enemy - Enemy POJO state
 * @param {Object} player - Player reference
 */
export function relayWardenShoot(enemy, player) {
  const centerX = enemy.x + enemy.width / 2
  const centerY = enemy.y + enemy.height / 2

  if (enemy.phase === 1) {
    firePhase1Pattern(enemy, centerX, centerY, player)
  } else {
    firePhase2Pattern(enemy, centerX, centerY, player)
  }
}

/**
 * Fire Phase 1 pattern for Relay Warden
 * @param {Object} enemy - Enemy POJO state
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {Object} player - Player reference
 */
export function firePhase1Pattern(enemy, centerX, centerY, player) {
  const fanCount = 5
  const fanSpread = Math.PI / 3
  const dx = player.x - centerX
  const dy = player.y - centerY
  const playerAngle = Math.atan2(dy, dx)

  for (let i = 0; i < fanCount; i++) {
    const angleOffset = (i - 2) * (fanSpread / (fanCount - 1))
    const bulletAngle = playerAngle + angleOffset
    const velocityX = Math.cos(bulletAngle) * enemy.bulletSpeed
    const velocityY = Math.sin(bulletAngle) * enemy.bulletSpeed

    const bulletId = createBullet(enemy.game.stateManager, {
      position: { x: centerX, y: centerY },
      velocity: { x: velocityX, y: velocityY },
      type: 'enemy',
      friendly: false
    })
    const bulletState = Bullet.getBulletState(enemy.game.stateManager, bulletId)
    enemy.game.addBullet({
      id: bulletId,
      ...bulletState
    })
  }

  if (Math.random() < DRONE_SPAWN_PROBABILITY) {
    spawnDroneAdd(enemy)
  }
}

/**
 * Fire Phase 2 pattern for Relay Warden
 * @param {Object} enemy - Enemy POJO state
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {Object} player - Player reference
 */
export function firePhase2Pattern(enemy, centerX, centerY, player) {
  if (enemy.vulnerabilityTimer > 2000 && enemy.vulnerabilityTimer < 3000) {
    const sweepCount = 3
    const baseAngle = Math.atan2(player.y - centerY, player.x - centerX)

    for (let i = 0; i < sweepCount; i++) {
      const angleOffset = (i - 1) * 0.2
      const bulletAngle = baseAngle + angleOffset
      const velocityX = Math.cos(bulletAngle) * enemy.bulletSpeed * 0.8
      const velocityY = Math.sin(bulletAngle) * enemy.bulletSpeed * 0.8

      const bulletId = createBullet(enemy.game.stateManager, {
        position: { x: centerX, y: centerY },
        velocity: { x: velocityX, y: velocityY },
        type: 'enemy',
        friendly: false
      })
      const bulletState = Bullet.getBulletState(enemy.game.stateManager, bulletId)
      enemy.game.addBullet({
        id: bulletId,
        ...bulletState
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

  const droneAdd = createEnemy(enemy.game, spawnX, spawnY, 'drone')
  enemy.game.enemies.push(droneAdd)

  enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_SPAWNED, {
    enemy: droneAdd,
    spawner: enemy,
    type: 'drone_add'
  })
}

/**
 * Relay Warden boss behavior - implements two-phase mechanics
 * @param {Object} enemy - Enemy POJO state
 * @param {number} deltaTime - Time elapsed since last update
 * @param {number} moveSpeed - Calculated move speed
 * @param {Object} player - Player reference
 */
export function updateRelayWardenBehavior(enemy, deltaTime, moveSpeed, player) {
  if (enemy.health <= enemy.maxHealth * 0.5 && !enemy.phaseTransitionTriggered) {
    enemy.phase = 2
    enemy.phaseTransitionTriggered = true
    enemy.nodeMode = true
    enemy.x = enemy.game.width * PHASE2_POSITION_X_FACTOR
    enemy.y = enemy.game.height * PHASE2_POSITION_Y_FACTOR
  }

  if (enemy.phase === 1) {
    updatePhase1Behavior(enemy, deltaTime, moveSpeed, player)
  } else {
    updatePhase2Behavior(enemy, deltaTime, moveSpeed, player)
  }
}

/**
 * Update Phase 1 behavior for Relay Warden
 * @param {Object} enemy - Enemy POJO state
 * @param {number} deltaTime - Time elapsed since last update
 * @param {number} moveSpeed - Calculated move speed
 * @param {Object} player - Player reference
 */
export function updatePhase1Behavior(enemy, deltaTime, moveSpeed, player) {
  enemy.x -= moveSpeed * 0.15

  if (player) {
    const centerY = enemy.game.height / 2 - enemy.height / 2
    const dy = centerY - enemy.y
    if (Math.abs(dy) > 30) {
      enemy.y += Math.sign(dy) * moveSpeed * 0.2
    }
  }

  enemy.sweepAngle += enemy.sweepDirection * deltaTime * 0.001
  if (enemy.sweepAngle > Math.PI * 2) {
    enemy.sweepAngle = 0
  }

  enemy.moveTimer += deltaTime
  if (enemy.moveTimer > 3000) {
    enemy.ringBeamActive = !enemy.ringBeamActive
    enemy.moveTimer = 0
  }
}

/**
 * Update Phase 2 behavior for Relay Warden
 * @param {Object} enemy - Enemy POJO state
 * @param {number} deltaTime - Time elapsed since last update
 * @param {number} moveSpeed - Calculated move speed
 * @param {Object} _player - Player reference (unused)
 */
export function updatePhase2Behavior(enemy, deltaTime, moveSpeed, _player) {
  enemy.moveTimer += deltaTime

  if (enemy.moveTimer > 2000) {
    enemy.targetY =
      Math.random() * (enemy.game.height * PHASE2_TARGET_Y_RANGE) +
      enemy.game.height * PHASE2_TARGET_Y_OFFSET
    enemy.moveTimer = 0
  }

  if (enemy.targetY) {
    const dy = enemy.targetY - enemy.y
    if (Math.abs(dy) > 5) {
      enemy.y += Math.sign(dy) * moveSpeed * 0.3
    }
  }

  enemy.x -= moveSpeed * 0.1
  enemy.vulnerabilityTimer += deltaTime
  if (enemy.vulnerabilityTimer > 4000) {
    enemy.vulnerabilityTimer = 0
  }
}

/**
 * Apply damage to enemy
 * @param {Object} enemy - Enemy POJO state
 * @param {number} damage - Damage amount
 */
export function takeDamage(enemy, damage) {
  const oldHealth = enemy.health
  enemy.health -= damage

  if (enemy.eventDispatcher) {
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
      enemy: enemy,
      damage: damage
    })

    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, {
      enemy: enemy,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      previousHealth: oldHealth,
      damage: damage
    })
  }

  if (
    enemy.eventDispatcher &&
    enemy.health <= enemy.maxHealth * CRITICAL_HEALTH_THRESHOLD &&
    enemy.health > 0
  ) {
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CRITICAL, {
      enemy: enemy,
      health: enemy.health,
      maxHealth: enemy.maxHealth
    })
  }

  if (enemy.health <= 0) {
    dieEnemy(enemy)
  }

  return enemy
}

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
 * Handle AI update events
 * @param {Object} enemy - Enemy POJO state
 * @param {Object} data - Event data
 */
export function handleAIUpdate(enemy, data) {
  const { deltaTime } = data
  const oldAiState = enemy.aiState

  switch (enemy.aiState) {
    case AI_STATES.SPAWNING: {
      enemy.aiState = AI_STATES.MOVING
      // Update state manager when AI state changes
      if (enemy.stateManager && typeof enemy.stateManager.setState === 'function') {
        enemy.stateManager.setState('enemy.aiState', enemy.aiState)
      }
      break
    }

    case AI_STATES.MOVING: {
      if (enemy.game.player) {
        enemy.aiState = AI_STATES.ATTACKING
        // Update state manager when AI state changes
        if (enemy.stateManager && typeof enemy.stateManager.setState === 'function') {
          enemy.stateManager.setState('enemy.aiState', enemy.aiState)
        }
      }
      break
    }

    case AI_STATES.ATTACKING: {
      enemy.shootTimer += deltaTime
      if (enemy.shootTimer > enemy.shootRate) {
        shootEnemy(enemy)
        enemy.shootTimer = 0
      }
      break
    }

    case AI_STATES.SEARCHING: {
      const player = enemy.game.player
      if (player && enemy.eventDispatcher) {
        enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, {
          enemy: enemy,
          target: player
        })
      }
      break
    }

    case AI_STATES.FLEEING: {
      break
    }
  }

  if (enemy.aiState !== AI_STATES.SPAWNING && enemy.aiState !== AI_STATES.DYING) {
    moveEnemy(enemy, deltaTime)
  }

  if (enemy.aiState !== oldAiState) {
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_BEHAVIOR_CHANGE, {
      enemy: enemy,
      behavior: enemy.aiState,
      previousBehavior: oldAiState
    })
  }
}

/**
 * Handle damage events
 * @param {Object} enemy - Enemy POJO state
 * @param {Object} data - Event data
 */
export function handleDamage(enemy, data) {
  const { damage } = data
  const oldHealth = enemy.health

  enemy.health -= damage

  // Update state manager if available
  if (enemy.stateManager && typeof enemy.stateManager.setState === 'function') {
    enemy.stateManager.setState('enemy.health', enemy.health)
  }

  enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, {
    enemy: enemy,
    health: enemy.health,
    maxHealth: enemy.maxHealth,
    previousHealth: oldHealth,
    damage: damage
  })

  if (enemy.health <= enemy.maxHealth * CRITICAL_HEALTH_THRESHOLD && enemy.health > 0) {
    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CRITICAL, {
      enemy: enemy,
      health: enemy.health,
      maxHealth: enemy.maxHealth
    })
  }

  if (enemy.health <= 0) {
    dieEnemy(enemy)
  }
}

/**
 * Handle target acquisition
 * @param {Object} enemy - Enemy POJO state
 * @param {Object} data - Event data
 */
export function handleTargetAcquisition(enemy, data) {
  const { target } = data

  if (target) {
    enemy.target = target
    enemy.aiState = AI_STATES.ATTACKING

    // Update state manager when target and AI state change
    if (enemy.stateManager && typeof enemy.stateManager.setState === 'function') {
      enemy.stateManager.setState('enemy.target', target)
      enemy.stateManager.setState('enemy.aiState', enemy.aiState)
    }

    enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, {
      enemy: enemy,
      target: target
    })
  }
}

/**
 * Handle bullet collision events
 * @param {Object} enemy - Enemy POJO state
 * @param {Object} data - Event data
 */
export function handleBulletCollision(enemy, data) {
  const { bullet } = data

  enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
    enemy: enemy,
    damage: bullet.damage || 10
  })
}

/**
 * Handle player collision events
 * @param {Object} enemy - Enemy POJO state
 * @param {Object} _data - Event data (unused)
 */
export function handlePlayerCollision(enemy, _data) {
  enemy.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
    enemy: enemy,
    damage: enemy.maxHealth
  })
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
