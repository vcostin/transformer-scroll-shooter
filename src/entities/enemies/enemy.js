/**
 * Enemy POJO+Functional - Event-Driven Architecture
 *
 * Base entity for all enemy types in the game.
 * Provides common functionality for movement, shooting, and rendering.
 * Uses event-driven architecture for AI updates, state management, and communication.
 * Migrated to POJO+Functional pattern for better testability and composition.
 */

import Bullet from '@/entities/bullet.js'
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
 * Create a new enemy state object
 * @param {Object} game - Game instance reference
 * @param {number} x - Initial x position
 * @param {number} y - Initial y position
 * @param {string} type - Enemy type
 * @returns {Object} Enemy state object
 */
export function createEnemy(game, x, y, type) {
  const enemy = {
    game,
    x,
    y,
    type,
    markedForDeletion: false,

    // AI and behavior
    shootTimer: 0,
    moveTimer: 0,
    targetY: y,
    aiState: AI_STATES.SPAWNING,
    behavior: ENEMY_BEHAVIORS.AGGRESSIVE,

    // Initialize enemy-specific properties
    zigDirection: 1, // Used by drone for zig-zag movement

    // Event-driven architecture references
    eventDispatcher: game.eventDispatcher,
    stateManager: game.stateManager,
    effectManager: game.effectManager
  }

  // Set properties based on type
  return setupEnemyType(enemy)
}

/**
 * Set up enemy properties based on type
 * @param {Object} enemy - Enemy state object
 * @returns {Object} Updated enemy state with type-specific properties
 */
function setupEnemyType(enemy) {
  switch (enemy.type) {
    case 'drone': {
      // Flanker zig-zag: fast, low HP, vertical zigzag
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
      // Stationary-on-platform: slow horizontal drift, telegraphed slow shots
      return {
        ...enemy,
        width: 26,
        height: 22,
        maxHealth: 30,
        health: 30,
        speed: 40, // platform drift left
        damage: 12,
        points: 12,
        color: '#88aaff',
        shootRate: 3000,
        bulletSpeed: 140
      }
    }

    case 'seeder': {
      // Seeder: medium slow, drops homing seeds
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
      // Use centralized boss configuration
      const config = BOSS_CONFIGS[enemy.type]
      const bossEnemy = { ...enemy, ...config, health: config.maxHealth }

      // Special initialization for Relay Warden
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
      // Default to fighter type
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

// Legacy class wrapper for backward compatibility during migration
export default class Enemy {
  constructor(game, x, y, type) {
    // Create the POJO state and assign properties to this
    Object.assign(this, createEnemy(game, x, y, type))

    // Complete initialization with class-based methods
    this.setupEffects()
    this.initializeState()

    // Emit creation event
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_CREATED, {
      enemy: this,
      type: this.type,
      x: this.x,
      y: this.y,
      health: this.health,
      maxHealth: this.maxHealth
    })
  }

  update(deltaTime) {
    // Move towards player
    this.move(deltaTime)

    // Update timers
    this.shootTimer += deltaTime
    this.moveTimer += deltaTime

    // Handle shooting
    if (this.shootTimer > this.shootRate) {
      this.shoot()
      this.shootTimer = 0
    }

    // Event-driven update
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_UPDATE, {
      enemy: this,
      deltaTime: deltaTime
    })

    // Check for off-screen or death conditions
    if (this.x < OFF_SCREEN_BOUNDARY || this.health <= 0) {
      if (this.x < OFF_SCREEN_BOUNDARY) {
        this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_OFF_SCREEN, {
          enemy: this,
          x: this.x,
          y: this.y
        })
      }
      this.markedForDeletion = true
    }
  }

  /**
   * Legacy update method - to be removed in future cleanup
   */
  legacyUpdate(deltaTime) {
    // Move towards player
    this.move(deltaTime)

    // Shooting AI
    this.shootTimer += deltaTime
    if (this.shootTimer > this.shootRate) {
      this.shoot()
      this.shootTimer = 0
    }
  }

  move(deltaTime) {
    const player = this.game.player
    const moveSpeed = this.speed * (deltaTime / 1000)
    const previousX = this.x
    const previousY = this.y

    switch (this.type) {
      case 'drone': {
        // Fast approach with vertical zig-zag
        this.x -= moveSpeed
        this.moveTimer += deltaTime
        if (this.moveTimer > 300) {
          this.moveTimer = 0
          this.zigDirection = this.zigDirection === 1 ? -1 : 1
        }
        this.y += this.zigDirection * moveSpeed * MOVEMENT_SPEED_MULTIPLIER
        break
      }

      case 'turret': {
        // Slow drift left, minimal vertical movement
        this.x -= moveSpeed
        // No vertical movement; acts like a platform-mounted gun
        break
      }

      case 'seeder': {
        // Slow, steady left movement; slight bob to feel alive
        this.x -= moveSpeed
        this.moveTimer += deltaTime
        const bob =
          Math.sin((this.moveTimer / BOB_PERIOD_MS) * BOB_WAVE_CYCLE) *
          BOB_AMPLITUDE_FACTOR *
          moveSpeed
        this.y += bob
        break
      }

      case 'fighter': {
        // Move straight towards player
        this.x -= moveSpeed

        // Slight vertical movement towards player
        if (player) {
          const dy = player.y - this.y
          if (Math.abs(dy) > 5) {
            this.y += Math.sign(dy) * moveSpeed * 0.3
          }
        }
        break
      }

      case 'bomber': {
        // Slow, steady movement
        this.x -= moveSpeed
        break
      }

      case 'scout': {
        // Erratic movement pattern
        this.x -= moveSpeed

        this.moveTimer += deltaTime
        if (this.moveTimer > 1000) {
          this.targetY = Math.random() * (this.game.height - this.height)
          this.moveTimer = 0
        }

        const scoutTargetDy = this.targetY - this.y
        if (Math.abs(scoutTargetDy) > 5) {
          this.y += Math.sign(scoutTargetDy) * moveSpeed * MOVEMENT_SPEED_MULTIPLIER
        }
        break
      }

      case 'boss': {
        // Boss movement - slower horizontal movement with vertical tracking
        this.x -= moveSpeed * 0.5 // Move slower than other enemies

        // Track player vertically but with limits
        if (player) {
          const bossTargetY = player.y - this.height / 2
          const maxY = this.game.height - this.height
          const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY))

          const bossDy = clampedTargetY - this.y
          if (Math.abs(bossDy) > 5) {
            this.y += Math.sign(bossDy) * moveSpeed * 0.4
          }
        }
        break
      }

      case 'boss_heavy': {
        // Heavy boss - very slow but steady movement
        this.x -= moveSpeed * 0.3 // Even slower than regular boss

        // Minimal vertical movement - stays more in center
        if (player) {
          const centerY = this.game.height / 2 - this.height / 2
          const dy = centerY - this.y
          if (Math.abs(dy) > 20) {
            this.y += Math.sign(dy) * moveSpeed * 0.2
          }
        }
        break
      }

      case 'boss_fast': {
        // Fast boss - quick horizontal movement with aggressive tracking
        this.x -= moveSpeed * MOVEMENT_SPEED_MULTIPLIER // Faster than regular boss

        // Aggressive vertical tracking
        if (player) {
          const bossTargetY = player.y - this.height / 2
          const maxY = this.game.height - this.height
          const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY))

          const bossDy = clampedTargetY - this.y
          if (Math.abs(bossDy) > 2) {
            this.y += Math.sign(bossDy) * moveSpeed * 0.7
          }
        }
        break
      }

      case 'boss_sniper': {
        // Sniper boss - maintains distance, minimal horizontal movement
        this.x -= moveSpeed * 0.2 // Very slow horizontal movement

        // Erratic vertical movement to avoid being predictable
        this.moveTimer += deltaTime
        if (this.moveTimer > 2000) {
          this.targetY = Math.random() * (this.game.height - this.height)
          this.moveTimer = 0
        }

        const sniperTargetDy = this.targetY - this.y
        if (Math.abs(sniperTargetDy) > 5) {
          this.y += Math.sign(sniperTargetDy) * moveSpeed * 0.3
        }
        break
      }

      case 'relay_warden': {
        // Relay Warden boss - phase-based behavior
        this.updateRelayWardenBehavior(deltaTime, moveSpeed, player)
        break
      }
    }

    // Emit movement events if position changed
    if (this.x !== previousX || this.y !== previousY) {
      this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_POSITION_CHANGED, {
        enemy: this,
        x: this.x,
        y: this.y,
        previousX,
        previousY,
        type: this.type
      })
      this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_MOVED, {
        enemy: this,
        x: this.x,
        y: this.y,
        previousX,
        previousY,
        type: this.type
      })
    }
  }

  shoot() {
    const player = this.game.player

    // Only shoot if player exists
    if (!player) return

    // Special shooting behavior for Relay Warden
    if (this.type === 'relay_warden') {
      this.relayWardenShoot(player)
      return
    }

    // Calculate direction to player
    const dx = player.x - this.x
    const dy = player.y - this.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 0) {
      const velocityX = (dx / distance) * this.bulletSpeed
      const velocityY = (dy / distance) * this.bulletSpeed

      // Seeder fires homing seeds
      const bulletType = this.type === 'seeder' ? 'seed' : 'enemy'

      const bullet = new Bullet(
        this.game,
        this.x,
        this.y + this.height / 2,
        velocityX,
        velocityY,
        bulletType,
        false // not friendly
      )

      this.game.addBullet(bullet)

      // Emit shooting event
      this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_SHOT, {
        enemy: this,
        bullet: bullet,
        x: this.x,
        y: this.y + this.height / 2,
        velocityX,
        velocityY,
        target: player,
        type: this.type
      })

      // Update state manager
      this.stateManager.setState(ENEMY_STATES.SHOOT_TIMER, this.shootTimer)
    }
  }

  relayWardenShoot(player) {
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2

    if (this.phase === 1) {
      // Phase 1: Fan bullets + occasional drone adds
      this.firePhase1Pattern(centerX, centerY, player)
    } else {
      // Phase 2: Alternating sweep patterns during vulnerability windows
      this.firePhase2Pattern(centerX, centerY, player)
    }
  }

  firePhase1Pattern(centerX, centerY, player) {
    // Fan bullet pattern - 5 bullets in a spread
    const fanCount = 5
    const fanSpread = Math.PI / 3 // 60 degree spread

    // Calculate angle to player
    const dx = player.x - centerX
    const dy = player.y - centerY
    const playerAngle = Math.atan2(dy, dx)

    for (let i = 0; i < fanCount; i++) {
      const angleOffset = (i - 2) * (fanSpread / (fanCount - 1))
      const bulletAngle = playerAngle + angleOffset

      const velocityX = Math.cos(bulletAngle) * this.bulletSpeed
      const velocityY = Math.sin(bulletAngle) * this.bulletSpeed

      const bullet = new Bullet(this.game, centerX, centerY, velocityX, velocityY, 'enemy', false)

      this.game.addBullet(bullet)
    }

    // Occasionally spawn drone adds (20% chance)
    if (Math.random() < DRONE_SPAWN_PROBABILITY) {
      this.spawnDroneAdd()
    }
  }

  firePhase2Pattern(centerX, centerY, player) {
    // Only fire during vulnerability windows
    if (this.vulnerabilityTimer > 2000 && this.vulnerabilityTimer < 3000) {
      // Alternating sweep pattern - 3 bullets in a line
      const sweepCount = 3
      const baseAngle = Math.atan2(player.y - centerY, player.x - centerX)

      for (let i = 0; i < sweepCount; i++) {
        const angleOffset = (i - 1) * 0.2 // Small spread
        const bulletAngle = baseAngle + angleOffset

        const velocityX = Math.cos(bulletAngle) * this.bulletSpeed * 0.8
        const velocityY = Math.sin(bulletAngle) * this.bulletSpeed * 0.8

        const bullet = new Bullet(this.game, centerX, centerY, velocityX, velocityY, 'enemy', false)

        this.game.addBullet(bullet)
      }
    }
  }

  spawnDroneAdd() {
    // Spawn a drone enemy as reinforcement
    const spawnX = this.game.width + 50
    const spawnY = Math.random() * (this.game.height - 50) + 25

    // Create and add a drone directly to the game
    const droneAdd = new Enemy(this.game, spawnX, spawnY, 'drone')
    this.game.enemies.push(droneAdd)

    // Emit event for the spawn
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_SPAWNED, {
      enemy: droneAdd,
      spawner: this,
      type: 'drone_add'
    })
  }

  takeDamage(damage) {
    const oldHealth = this.health

    // Apply damage directly
    this.health -= damage

    // Emit damage event
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
      enemy: this,
      damage: damage
    })

    // Emit health changed event - state synchronization handled by effects
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, {
      enemy: this,
      health: this.health,
      maxHealth: this.maxHealth,
      previousHealth: oldHealth,
      damage: damage
    })

    // Check for critical health
    if (this.health <= this.maxHealth * CRITICAL_HEALTH_THRESHOLD && this.health > 0) {
      this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CRITICAL, {
        enemy: this,
        health: this.health,
        maxHealth: this.maxHealth
      })
    }

    // Check for death
    if (this.health <= 0) {
      this.die()
    }
  }

  /**
   * Setup effects-based event handling using EffectManager
   */
  setupEffects() {
    // Register effects with instance-specific filtering
    this.effectManager.effect(ENEMY_EVENTS.ENEMY_AI_UPDATE, data => {
      if (data.enemy === this) {
        this.handleAIUpdate(data)
      }
    })

    this.effectManager.effect(ENEMY_EVENTS.ENEMY_DAMAGED, data => {
      if (data.enemy === this) {
        this.handleDamage(data)
      }
    })

    this.effectManager.effect(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, data => {
      if (data.enemy === this) {
        this.handleTargetAcquisition(data)
      }
    })

    this.effectManager.effect(ENEMY_EVENTS.ENEMY_COLLISION_BULLET, data => {
      if (data.enemy === this) {
        this.handleBulletCollision(data)
      }
    })

    this.effectManager.effect(ENEMY_EVENTS.ENEMY_COLLISION_PLAYER, data => {
      if (data.enemy === this) {
        this.handlePlayerCollision(data)
      }
    })

    // State synchronization effects - automatic state management
    this.effectManager.effect(ENEMY_EVENTS.ENEMY_SHOT, data => {
      if (data.enemy === this) {
        this.stateManager.setState(ENEMY_STATES.SHOOT_TIMER, this.shootTimer)
      }
    })

    this.effectManager.effect(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, data => {
      if (data.enemy === this) {
        this.stateManager.setState(ENEMY_STATES.HEALTH, data.health)
      }
    })

    this.effectManager.effect(ENEMY_EVENTS.ENEMY_AI_BEHAVIOR_CHANGE, data => {
      if (data.enemy === this) {
        this.stateManager.setState(ENEMY_STATES.AI_STATE, data.behavior)
      }
    })

    this.effectManager.effect(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, data => {
      if (data.enemy === this) {
        this.stateManager.setState(ENEMY_STATES.TARGET, data.target)
      }
    })
  }

  /**
   * Initialize state in state manager
   */
  initializeState() {
    this.stateManager.setState(ENEMY_STATES.HEALTH, this.health)
    this.stateManager.setState(ENEMY_STATES.POSITION, { x: this.x, y: this.y })
    this.stateManager.setState(ENEMY_STATES.VELOCITY, { x: 0, y: 0 })
    this.stateManager.setState(ENEMY_STATES.TARGET, null)
    this.stateManager.setState(ENEMY_STATES.BEHAVIOR, this.behavior)
    this.stateManager.setState(ENEMY_STATES.SHOOT_TIMER, this.shootTimer)
    this.stateManager.setState(ENEMY_STATES.MOVE_TIMER, this.moveTimer)
    this.stateManager.setState(ENEMY_STATES.AI_STATE, this.aiState)
  }

  /**
   * Handle AI update events
   */
  handleAIUpdate(data) {
    const { deltaTime } = data
    const oldAiState = this.aiState

    // Update AI behavior based on current state
    switch (this.aiState) {
      case AI_STATES.SPAWNING: {
        this.aiState = AI_STATES.MOVING
        break
      }

      case AI_STATES.MOVING: {
        // Check if we should switch to attacking
        if (this.game.player) {
          this.aiState = AI_STATES.ATTACKING
        }
        break
      }

      case AI_STATES.ATTACKING: {
        // Handle shooting while moving
        this.shootTimer += deltaTime
        if (this.shootTimer > this.shootRate) {
          this.shoot()
          this.shootTimer = 0
        }
        break
      }

      case AI_STATES.SEARCHING: {
        // Look for targets
        const player = this.game.player
        if (player && this.eventDispatcher) {
          this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, {
            enemy: this,
            target: player
          })
        }
        break
      }

      case AI_STATES.FLEEING: {
        // Special fleeing behavior could go here
        break
      }
    }

    // All AI states except SPAWNING and DYING should move
    if (this.aiState !== AI_STATES.SPAWNING && this.aiState !== AI_STATES.DYING) {
      this.move(deltaTime)
    }

    // Emit AI state change event if state changed - state synchronization handled by effects
    if (this.aiState !== oldAiState) {
      this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_BEHAVIOR_CHANGE, {
        enemy: this,
        behavior: this.aiState,
        previousBehavior: oldAiState
      })
    }
  }

  /**
   * Handle damage events
   */
  handleDamage(data) {
    const { damage } = data
    const oldHealth = this.health

    this.health -= damage

    // Emit health changed event - state synchronization handled by effects
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, {
      enemy: this,
      health: this.health,
      maxHealth: this.maxHealth,
      previousHealth: oldHealth,
      damage: damage
    })

    // Check for critical health
    if (this.health <= this.maxHealth * CRITICAL_HEALTH_THRESHOLD && this.health > 0) {
      this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CRITICAL, {
        enemy: this,
        health: this.health,
        maxHealth: this.maxHealth
      })
    }

    // Check for death
    if (this.health <= 0) {
      this.die()
    }
  }

  /**
   * Handle target acquisition
   */
  handleTargetAcquisition(data) {
    const { target } = data

    // Change AI state to attacking if we have a target
    if (target) {
      this.aiState = AI_STATES.ATTACKING

      // Emit target acquisition event - state synchronization handled by effects
      this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, {
        enemy: this,
        target: target
      })
    }

    // State synchronization handled by effects in setupEffects method
  }

  /**
   * Handle bullet collision events
   */
  handleBulletCollision(data) {
    const { bullet } = data

    // Apply damage from bullet
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
      enemy: this,
      damage: bullet.damage || 10
    })
  }

  /**
   * Handle player collision events
   */
  handlePlayerCollision(_data) {
    // Deal damage to player and self-destruct
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
      enemy: this,
      damage: this.maxHealth // Self-destruct
    })
  }

  /**
   * Enemy death handling
   */
  die() {
    this.aiState = AI_STATES.DYING

    // Emit death event
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DIED, {
      enemy: this,
      type: this.type,
      x: this.x,
      y: this.y,
      points: this.points
    })

    // Mark for deletion
    this.markedForDeletion = true

    // Clean up
    this.cleanup()
  }

  /**
   * Cleanup resources and emit destroy event
   */
  cleanup() {
    // EffectManager handles cleanup automatically when effects are unregistered
    // No manual cleanup needed for effect-based event handling

    // Emit destruction event
    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DESTROYED, {
      enemy: this,
      type: this.type,
      x: this.x,
      y: this.y
    })
  }

  render(ctx) {
    // Draw enemy based on type
    ctx.fillStyle = this.color

    switch (this.type) {
      case 'drone':
        this.drawDrone(ctx)
        break
      case 'turret':
        this.drawTurret(ctx)
        break
      case 'seeder':
        this.drawSeeder(ctx)
        break
      case 'fighter':
        this.drawFighter(ctx)
        break
      case 'bomber':
        this.drawBomber(ctx)
        break
      case 'scout':
        this.drawScout(ctx)
        break
      case 'boss':
        this.drawBoss(ctx)
        break
      case 'boss_heavy':
        this.drawBossHeavy(ctx)
        break
      case 'boss_fast':
        this.drawBossFast(ctx)
        break
      case 'boss_sniper':
        this.drawBossSniper(ctx)
        break
      case 'relay_warden':
        this.drawRelayWarden(ctx)
        break
    }

    // Draw health bar for damaged enemies
    if (this.health < this.maxHealth) {
      this.drawHealthBar(ctx)
    }
  }

  drawDrone(ctx) {
    // Small agile flanker — reuse scout-like silhouette
    // Body
    ctx.fillRect(this.x, this.y + 4, this.width - 4, 6)
    // Wings
    ctx.fillRect(this.x + 4, this.y + 1, 10, 3)
    ctx.fillRect(this.x + 4, this.y + this.height - 4, 10, 3)
    // Nose
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 6, this.y + this.height / 2 - 3)
    ctx.lineTo(this.x - 6, this.y + this.height / 2 + 3)
    ctx.closePath()
    ctx.fill()
  }

  drawTurret(ctx) {
    // Platform turret — heavier body akin to bomber but smaller
    // Base/platform
    ctx.fillStyle = '#556'
    ctx.fillRect(this.x + 2, this.y + this.height - 4, this.width - 6, 4)
    // Restore main color
    ctx.fillStyle = this.color
    // Body
    ctx.fillRect(this.x + 2, this.y + 6, this.width - 8, this.height - 12)
    // Barrel
    ctx.fillRect(this.x - 10, this.y + this.height / 2 - 2, 12, 4)
  }

  drawSeeder(ctx) {
    // Seeder — pod that drops seeds; mid-size body with a belly
    // Main pod
    ctx.fillRect(this.x, this.y + 5, this.width - 6, this.height - 10)
    // Belly (lighter tint)
    ctx.fillStyle = '#caff8a'
    ctx.fillRect(this.x + 3, this.y + this.height / 2 - 3, this.width - 12, 6)
    // Restore color and add nose
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 8, this.y + this.height / 2 - 4)
    ctx.lineTo(this.x - 8, this.y + this.height / 2 + 4)
    ctx.closePath()
    ctx.fill()
  }

  drawFighter(ctx) {
    // Main body
    ctx.fillRect(this.x, this.y + 6, this.width - 5, 8)

    // Wings
    ctx.fillRect(this.x + 8, this.y, 15, 4)
    ctx.fillRect(this.x + 8, this.y + 16, 15, 4)

    // Nose
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 8, this.y + this.height / 2 - 4)
    ctx.lineTo(this.x - 8, this.y + this.height / 2 + 4)
    ctx.closePath()
    ctx.fill()
  }

  drawBomber(ctx) {
    // Main body - larger and bulkier
    ctx.fillRect(this.x, this.y + 8, this.width - 10, 20)

    // Wings
    ctx.fillRect(this.x + 10, this.y, 25, 6)
    ctx.fillRect(this.x + 10, this.y + 29, 25, 6)

    // Engines
    ctx.fillStyle = '#666'
    ctx.fillRect(this.x + 15, this.y + 2, 4, 4)
    ctx.fillRect(this.x + 15, this.y + 29, 4, 4)

    // Nose
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 12, this.y + this.height / 2 - 6)
    ctx.lineTo(this.x - 12, this.y + this.height / 2 + 6)
    ctx.closePath()
    ctx.fill()
  }

  drawScout(ctx) {
    // Small, agile ship
    ctx.fillRect(this.x, this.y + 4, this.width - 3, 7)

    // Small wings
    ctx.fillRect(this.x + 5, this.y, 10, 3)
    ctx.fillRect(this.x + 5, this.y + 12, 10, 3)

    // Pointed nose
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 6, this.y + this.height / 2 - 3)
    ctx.lineTo(this.x - 6, this.y + this.height / 2 + 3)
    ctx.closePath()
    ctx.fill()
  }

  /**
   * Relay Warden boss behavior - implements two-phase mechanics
   * Phase 1: Ring-beam sweeps with rotating gaps + fan bullets + occasional adds
   * Phase 2: Split into two nodes with alternating sweep patterns
   */
  updateRelayWardenBehavior(deltaTime, moveSpeed, player) {
    // Check for phase transition at 50% health
    if (this.health <= this.maxHealth * 0.5 && !this.phaseTransitionTriggered) {
      this.phase = 2
      this.phaseTransitionTriggered = true
      this.nodeMode = true
      // Position this boss as the primary node in Phase 2
      this.x = this.game.width * PHASE2_POSITION_X_FACTOR
      this.y = this.game.height * PHASE2_POSITION_Y_FACTOR
      // Note: Future enhancement could spawn a second synchronized node
    }

    if (this.phase === 1) {
      this.updatePhase1Behavior(deltaTime, moveSpeed, player)
    } else {
      this.updatePhase2Behavior(deltaTime, moveSpeed, player)
    }
  }

  updatePhase1Behavior(deltaTime, moveSpeed, player) {
    // Slow horizontal movement - stays in back portion of screen
    this.x -= moveSpeed * 0.15

    // Gentle vertical movement - stays roughly centered
    if (player) {
      const centerY = this.game.height / 2 - this.height / 2
      const dy = centerY - this.y
      if (Math.abs(dy) > 30) {
        this.y += Math.sign(dy) * moveSpeed * 0.2
      }
    }

    // Update ring beam sweep
    this.sweepAngle += this.sweepDirection * deltaTime * 0.001 // Slow sweep
    if (this.sweepAngle > Math.PI * 2) {
      this.sweepAngle = 0
    }

    // Ring beam active periods
    this.moveTimer += deltaTime
    if (this.moveTimer > 3000) {
      // Every 3 seconds
      this.ringBeamActive = !this.ringBeamActive
      this.moveTimer = 0
    }
  }

  updatePhase2Behavior(deltaTime, moveSpeed, _player) {
    // Node behavior - more erratic movement
    this.moveTimer += deltaTime

    // Change target position every 2 seconds
    if (this.moveTimer > 2000) {
      this.targetY =
        Math.random() * (this.game.height * PHASE2_TARGET_Y_RANGE) +
        this.game.height * PHASE2_TARGET_Y_OFFSET
      this.moveTimer = 0
    }

    // Move toward target
    if (this.targetY) {
      const dy = this.targetY - this.y
      if (Math.abs(dy) > 5) {
        this.y += Math.sign(dy) * moveSpeed * 0.3
      }
    }

    // Slower horizontal movement in phase 2
    this.x -= moveSpeed * 0.1

    // Vulnerability windows
    this.vulnerabilityTimer += deltaTime
    if (this.vulnerabilityTimer > 4000) {
      // 4 second cycles
      this.vulnerabilityTimer = 0
    }
  }

  drawBoss(ctx) {
    // Main body - large and imposing
    ctx.fillRect(this.x, this.y + 15, this.width - 15, 30)

    // Upper and lower sections
    ctx.fillRect(this.x + 5, this.y + 5, this.width - 25, 15)
    ctx.fillRect(this.x + 5, this.y + 40, this.width - 25, 15)

    // Central core
    ctx.fillStyle = '#ff6666'
    ctx.fillRect(this.x + 10, this.y + 20, this.width - 35, 20)

    // Weapon pods
    ctx.fillStyle = this.color
    ctx.fillRect(this.x + this.width - 20, this.y + 10, 8, 12)
    ctx.fillRect(this.x + this.width - 20, this.y + 38, 8, 12)

    // Nose/front section
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 15, this.y + this.height / 2 - 8)
    ctx.lineTo(this.x - 15, this.y + this.height / 2 + 8)
    ctx.closePath()
    ctx.fill()
  }

  drawBossHeavy(ctx) {
    // Main body - very large and bulky
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y + 20, this.width - 20, 40)

    // Upper and lower armor sections
    ctx.fillRect(this.x + 5, this.y + 5, this.width - 30, 20)
    ctx.fillRect(this.x + 5, this.y + 55, this.width - 30, 20)

    // Central core - darker
    ctx.fillStyle = '#4B0000'
    ctx.fillRect(this.x + 15, this.y + 25, this.width - 45, 30)

    // Heavy weapon pods
    ctx.fillStyle = this.color
    ctx.fillRect(this.x + this.width - 25, this.y + 15, 12, 20)
    ctx.fillRect(this.x + this.width - 25, this.y + 45, 12, 20)

    // Massive nose section
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 20, this.y + this.height / 2 - 12)
    ctx.lineTo(this.x - 20, this.y + this.height / 2 + 12)
    ctx.closePath()
    ctx.fill()
  }

  drawBossFast(ctx) {
    // Main body - sleek and angular
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y + 12, this.width - 10, 26)

    // Angular wings
    ctx.beginPath()
    ctx.moveTo(this.x + 10, this.y)
    ctx.lineTo(this.x + 30, this.y + 8)
    ctx.lineTo(this.x + 15, this.y + 15)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(this.x + 10, this.y + 50)
    ctx.lineTo(this.x + 30, this.y + 42)
    ctx.lineTo(this.x + 15, this.y + 35)
    ctx.closePath()
    ctx.fill()

    // Engine cores
    ctx.fillStyle = '#FF9900'
    ctx.fillRect(this.x + 5, this.y + 18, this.width - 25, 8)
    ctx.fillRect(this.x + 5, this.y + 28, this.width - 25, 8)

    // Sharp nose
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 12, this.y + this.height / 2 - 6)
    ctx.lineTo(this.x - 12, this.y + this.height / 2 + 6)
    ctx.closePath()
    ctx.fill()
  }

  drawBossSniper(ctx) {
    // Main body - long and streamlined
    ctx.fillStyle = this.color
    ctx.fillRect(this.x, this.y + 18, this.width - 12, 34)

    // Sniper barrel/cannon
    ctx.fillStyle = '#6A0DAD'
    ctx.fillRect(this.x - 30, this.y + 28, 35, 14)

    // Targeting systems
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(this.x + 10, this.y + 8, 8, 8)
    ctx.fillRect(this.x + 10, this.y + 54, 8, 8)

    // Main body sections
    ctx.fillStyle = this.color
    ctx.fillRect(this.x + 5, this.y + 5, this.width - 25, 15)
    ctx.fillRect(this.x + 5, this.y + 50, this.width - 25, 15)

    // Scope/targeting array
    ctx.fillStyle = '#00FF00'
    ctx.fillRect(this.x + 20, this.y + 30, 6, 10)

    // Pointed nose
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height / 2)
    ctx.lineTo(this.x - 10, this.y + this.height / 2 - 5)
    ctx.lineTo(this.x - 10, this.y + this.height / 2 + 5)
    ctx.closePath()
    ctx.fill()
  }

  drawHealthBar(ctx) {
    const barWidth = this.width
    const barHeight = 3
    const x = this.x
    const y = this.y - 8

    // Background
    ctx.fillStyle = '#333'
    ctx.fillRect(x, y, barWidth, barHeight)

    // Health
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight)
  }

  drawRelayWarden(ctx) {
    if (this.phase === 1) {
      this.drawRelayWardenPhase1(ctx)
    } else {
      this.drawRelayWardenPhase2(ctx)
    }
  }

  drawRelayWardenPhase1(ctx) {
    // Phase 1: Large central core with ring structure
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2

    // Outer ring structure
    ctx.strokeStyle = this.color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(centerX, centerY, this.width * 0.4, 0, Math.PI * 2)
    ctx.stroke()

    // Inner core
    ctx.fillStyle = this.color
    ctx.fillRect(
      this.x + this.width * 0.3,
      this.y + this.height * 0.3,
      this.width * 0.4,
      this.height * 0.4
    )

    // Central energy core
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(
      this.x + this.width * 0.4,
      this.y + this.height * 0.4,
      this.width * 0.2,
      this.height * 0.2
    )

    // Ring beam sweep visualization (when active)
    if (this.ringBeamActive) {
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(this.sweepAngle) * this.width * 0.6,
        centerY + Math.sin(this.sweepAngle) * this.width * 0.6
      )
      ctx.stroke()

      // Rotating safe gap indicator
      const gapAngle = this.sweepAngle + Math.PI
      ctx.strokeStyle = '#00ff00'
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(gapAngle) * this.width * 0.6,
        centerY + Math.sin(gapAngle) * this.width * 0.6
      )
      ctx.stroke()
    }

    // External relay nodes
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const nodeX = centerX + Math.cos(angle) * this.width * 0.35
      const nodeY = centerY + Math.sin(angle) * this.width * 0.35

      ctx.fillStyle = '#00cccc'
      ctx.fillRect(nodeX - 3, nodeY - 3, 6, 6)
    }
  }

  drawRelayWardenPhase2(ctx) {
    // Phase 2: Smaller node form
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2

    // Node body - smaller and more angular
    ctx.fillStyle = this.color
    ctx.fillRect(
      this.x + this.width * 0.2,
      this.y + this.height * 0.2,
      this.width * 0.6,
      this.height * 0.6
    )

    // Energy core - pulsing effect based on vulnerability timer
    const pulseIntensity = Math.sin((this.vulnerabilityTimer / 1000) * Math.PI * 2) * 0.3 + 0.7
    ctx.fillStyle = `rgba(255, 255, 255, ${pulseIntensity})`
    ctx.fillRect(
      this.x + this.width * 0.35,
      this.y + this.height * 0.35,
      this.width * 0.3,
      this.height * 0.3
    )

    // Vulnerable window indicator
    if (this.vulnerabilityTimer > 2000 && this.vulnerabilityTimer < 3000) {
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 3
      ctx.strokeRect(this.x, this.y, this.width, this.height)
    }

    // Connection beam (visual effect)
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(centerX + CONNECTION_BEAM_LENGTH, centerY + CONNECTION_BEAM_OFFSET_Y) // Pointing toward where node 2 would be
    ctx.stroke()
    ctx.setLineDash([])
  }
}
