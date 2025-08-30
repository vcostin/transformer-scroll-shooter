/**
 * Player Entity - Stateless Implementation
 *
 * Entity-State Architecture: Stateless player entity operating on global state.
 * All player data is stored in StateManager, entity functions are pure.
 * State flows: StateManager → Entity Functions → StateManager → Rendering
 */

import { createBullet } from '@/entities/bullet.js'
import { PLAYER_EVENTS } from '@/constants/player-events.js'

/**
 * Player State Schema - Defines the structure in StateManager
 */
const PLAYER_STATE_SCHEMA = {
  // Position and physics
  x: 0,
  y: 0,
  width: 40,
  height: 30,

  // Core stats
  maxHealth: 100,
  health: 100,
  speed: 200,

  // Transformation system
  modes: ['car', 'scuba', 'boat', 'plane'],
  currentModeIndex: 0,
  mode: 'car',
  transformCooldown: 0,

  // Combat system
  shootCooldown: 0,
  baseShootRate: 300,
  currentShootRate: 300,
  currentBulletType: 'normal',
  currentColor: '#ff6600',

  // Enhancement system
  activePowerups: [],
  shield: 0,

  // Mode properties cache (derived state)
  modeProperties: {
    car: {
      speed: 250,
      shootRate: 300,
      bulletType: 'normal',
      color: '#ff6600',
      width: 40,
      height: 25
    },
    scuba: {
      speed: 150,
      shootRate: 200,
      bulletType: 'torpedo',
      color: '#0066ff',
      width: 35,
      height: 30
    },
    boat: {
      speed: 180,
      shootRate: 400,
      bulletType: 'cannon',
      color: '#006600',
      width: 45,
      height: 28
    },
    plane: {
      speed: 300,
      shootRate: 150,
      bulletType: 'laser',
      color: '#6600ff',
      width: 50,
      height: 20
    }
  }
}

/**
 * Initialize Player State in StateManager
 * @param {Object} stateManager - StateManager instance
 * @param {number} x - Initial x position
 * @param {number} y - Initial y position
 */
export function initializePlayerState(stateManager, x = 400, y = 300) {
  const initialState = {
    ...PLAYER_STATE_SCHEMA,
    x,
    y
  }

  // Initialize all player state paths
  Object.keys(initialState).forEach(key => {
    stateManager.setState(`player.${key}`, initialState[key])
  })

  // Apply initial mode properties
  updatePlayerModeProperties(stateManager)
}

/**
 * Stateless Player Entity - Pure functions operating on StateManager
 */
export const Player = {
  // === STATE ACCESSORS (READ) ===

  getPosition: stateManager => ({
    x: stateManager.getState('player.x'),
    y: stateManager.getState('player.y')
  }),

  getHealth: stateManager => stateManager.getState('player.health'),
  getMaxHealth: stateManager => stateManager.getState('player.maxHealth'),
  getMode: stateManager => stateManager.getState('player.mode'),
  getSpeed: stateManager => stateManager.getState('player.speed'),

  getDimensions: stateManager => ({
    width: stateManager.getState('player.width'),
    height: stateManager.getState('player.height')
  }),

  getCooldowns: stateManager => ({
    shoot: stateManager.getState('player.shootCooldown'),
    transform: stateManager.getState('player.transformCooldown')
  }),

  // === STATE MUTATIONS (WRITE) ===

  setPosition: (stateManager, x, y) => {
    stateManager.setState('player.x', x)
    stateManager.setState('player.y', y)
  },

  move: (stateManager, dx, dy) => {
    const current = Player.getPosition(stateManager)
    Player.setPosition(stateManager, current.x + dx, current.y + dy)
  },

  setHealth: (stateManager, health) => {
    const maxHealth = Player.getMaxHealth(stateManager)
    stateManager.setState('player.health', Math.max(0, Math.min(health, maxHealth)))
  },

  takeDamage: (stateManager, damage) => {
    const currentHealth = Player.getHealth(stateManager)
    Player.setHealth(stateManager, currentHealth - damage)
  },

  heal: (stateManager, amount) => {
    const currentHealth = Player.getHealth(stateManager)
    Player.setHealth(stateManager, currentHealth + amount)
  },

  // === CORE BEHAVIORS ===

  /**
   * Update player based on input and time
   * @param {Object} stateManager - StateManager instance
   * @param {Object} eventDispatcher - EventDispatcher instance
   * @param {number} deltaTime - Time since last update
   * @param {Object} input - Input state object
   */
  update: (stateManager, eventDispatcher, deltaTime, input) => {
    // Update cooldowns
    const cooldowns = Player.getCooldowns(stateManager)
    stateManager.setState('player.shootCooldown', Math.max(0, cooldowns.shoot - deltaTime))
    stateManager.setState('player.transformCooldown', Math.max(0, cooldowns.transform - deltaTime))

    // Handle movement
    if (input) {
      Player.handleMovement(stateManager, deltaTime, input)
    }

    // Update powerups
    Player.updatePowerups(stateManager, deltaTime)

    // Emit update event
    eventDispatcher.emit(PLAYER_EVENTS.PLAYER_UPDATED, {
      position: Player.getPosition(stateManager),
      health: Player.getHealth(stateManager),
      mode: Player.getMode(stateManager)
    })
  },

  /**
   * Handle player movement based on input
   * @param {Object} stateManager - StateManager instance
   * @param {number} deltaTime - Time since last update
   * @param {Object} input - Input state object
   */
  handleMovement: (stateManager, deltaTime, input) => {
    const speed = Player.getSpeed(stateManager)
    const moveDistance = speed * (deltaTime / 1000)

    let dx = 0
    let dy = 0

    if (input.left) dx -= moveDistance
    if (input.right) dx += moveDistance
    if (input.up) dy -= moveDistance
    if (input.down) dy += moveDistance

    if (dx !== 0 || dy !== 0) {
      Player.move(stateManager, dx, dy)

      // Keep player in bounds (assuming game bounds)
      const position = Player.getPosition(stateManager)
      const dimensions = Player.getDimensions(stateManager)

      const clampedX = Math.max(0, Math.min(800 - dimensions.width, position.x))
      const clampedY = Math.max(0, Math.min(600 - dimensions.height, position.y))

      Player.setPosition(stateManager, clampedX, clampedY)
    }
  },

  /**
   * Transform to next mode
   * @param {Object} stateManager - StateManager instance
   * @param {Object} eventDispatcher - EventDispatcher instance
   */
  transform: (stateManager, eventDispatcher) => {
    const cooldowns = Player.getCooldowns(stateManager)
    if (cooldowns.transform > 0) return false

    const modes = stateManager.getState('player.modes')
    const currentIndex = stateManager.getState('player.currentModeIndex')
    const nextIndex = (currentIndex + 1) % modes.length
    const nextMode = modes[nextIndex]

    // Update mode state
    stateManager.setState('player.currentModeIndex', nextIndex)
    stateManager.setState('player.mode', nextMode)
    stateManager.setState('player.transformCooldown', 1000) // 1 second cooldown

    // Apply new mode properties
    updatePlayerModeProperties(stateManager)

    // Emit transformation event
    eventDispatcher.emit(PLAYER_EVENTS.PLAYER_TRANSFORMED, {
      from: modes[currentIndex],
      to: nextMode,
      modeIndex: nextIndex
    })

    return true
  },

  /**
   * Attempt to shoot
   * @param {Object} stateManager - StateManager instance
   * @param {Object} eventDispatcher - EventDispatcher instance
   * @param {Object} game - Game instance for bullet creation
   */
  shoot: (stateManager, eventDispatcher, game) => {
    const cooldowns = Player.getCooldowns(stateManager)
    if (cooldowns.shoot > 0) return false

    const position = Player.getPosition(stateManager)
    const dimensions = Player.getDimensions(stateManager)
    const bulletType = stateManager.getState('player.currentBulletType')
    const shootRate = stateManager.getState('player.currentShootRate')

    // Create bullet
    const bullet = createBullet(
      game,
      position.x + dimensions.width / 2,
      position.y,
      -400, // upward velocity
      0,
      bulletType,
      true // friendly (player bullet)
    )

    // Add to game bullets array (assuming bullets are managed globally)
    if (game.bullets) {
      game.bullets.push(bullet)
    }

    // Set cooldown
    stateManager.setState('player.shootCooldown', shootRate)

    // Emit shoot event
    eventDispatcher.emit(PLAYER_EVENTS.PLAYER_SHOT, {
      position: { x: position.x + dimensions.width / 2, y: position.y },
      bulletType,
      mode: Player.getMode(stateManager)
    })

    return true
  },

  /**
   * Update active powerups
   * @param {Object} stateManager - StateManager instance
   * @param {number} deltaTime - Time since last update
   */
  updatePowerups: (stateManager, deltaTime) => {
    const powerups = stateManager.getState('player.activePowerups') || []

    const updatedPowerups = powerups
      .map(powerup => ({
        ...powerup,
        duration: powerup.duration - deltaTime
      }))
      .filter(powerup => powerup.duration > 0)

    stateManager.setState('player.activePowerups', updatedPowerups)

    // Update shield
    const shield = stateManager.getState('player.shield')
    if (shield > 0) {
      stateManager.setState('player.shield', Math.max(0, shield - deltaTime))
    }
  },

  // === RENDERING (PURE) ===

  /**
   * Render player based on current state
   * @param {Object} stateManager - StateManager instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render: (stateManager, ctx) => {
    const mode = Player.getMode(stateManager)

    // Render based on current mode
    switch (mode) {
      case 'car':
        Player.drawCar(stateManager, ctx)
        break
      case 'scuba':
        Player.drawScuba(stateManager, ctx)
        break
      case 'boat':
        Player.drawBoat(stateManager, ctx)
        break
      case 'plane':
        Player.drawPlane(stateManager, ctx)
        break
    }

    // Render health bar
    Player.drawHealthBar(stateManager, ctx)

    // Render shield if active
    const shield = stateManager.getState('player.shield')
    if (shield > 0) {
      Player.drawShield(stateManager, ctx)
    }
  },

  /**
   * Draw car mode
   * @param {Object} stateManager - StateManager instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  drawCar: (stateManager, ctx) => {
    const position = Player.getPosition(stateManager)
    const dimensions = Player.getDimensions(stateManager)
    const color = stateManager.getState('player.currentColor')

    ctx.fillStyle = color
    ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)

    // Add car details
    ctx.fillStyle = '#333'
    ctx.fillRect(position.x + 5, position.y + 5, dimensions.width - 10, 5)
    ctx.fillRect(position.x + 5, position.y + dimensions.height - 10, dimensions.width - 10, 5)
  },

  /**
   * Draw scuba mode
   * @param {Object} stateManager - StateManager instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  drawScuba: (stateManager, ctx) => {
    const position = Player.getPosition(stateManager)
    const dimensions = Player.getDimensions(stateManager)
    const color = stateManager.getState('player.currentColor')

    ctx.fillStyle = color
    ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)

    // Add bubble effects
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.beginPath()
    ctx.arc(position.x - 5, position.y + 10, 3, 0, Math.PI * 2)
    ctx.arc(position.x - 8, position.y + 5, 2, 0, Math.PI * 2)
    ctx.fill()
  },

  /**
   * Draw boat mode
   * @param {Object} stateManager - StateManager instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  drawBoat: (stateManager, ctx) => {
    const position = Player.getPosition(stateManager)
    const dimensions = Player.getDimensions(stateManager)
    const color = stateManager.getState('player.currentColor')

    ctx.fillStyle = color
    ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)

    // Add sail
    ctx.fillStyle = '#fff'
    ctx.fillRect(position.x + dimensions.width / 2 - 2, position.y - 10, 4, 15)
  },

  /**
   * Draw plane mode
   * @param {Object} stateManager - StateManager instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  drawPlane: (stateManager, ctx) => {
    const position = Player.getPosition(stateManager)
    const dimensions = Player.getDimensions(stateManager)
    const color = stateManager.getState('player.currentColor')

    ctx.fillStyle = color
    ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)

    // Add wings
    ctx.fillStyle = '#ccc'
    ctx.fillRect(position.x - 5, position.y + dimensions.height / 2 - 2, dimensions.width + 10, 4)
  },

  /**
   * Draw health bar
   * @param {Object} stateManager - StateManager instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  drawHealthBar: (stateManager, ctx) => {
    const position = Player.getPosition(stateManager)
    const health = Player.getHealth(stateManager)
    const maxHealth = Player.getMaxHealth(stateManager)
    const healthPercent = health / maxHealth

    const barWidth = 40
    const barHeight = 4
    const barX = position.x
    const barY = position.y - 10

    // Background
    ctx.fillStyle = '#333'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // Health
    ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00'
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight)
  },

  /**
   * Draw shield effect
   * @param {Object} stateManager - StateManager instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  drawShield: (stateManager, ctx) => {
    const position = Player.getPosition(stateManager)
    const dimensions = Player.getDimensions(stateManager)

    ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(
      position.x + dimensions.width / 2,
      position.y + dimensions.height / 2,
      Math.max(dimensions.width, dimensions.height) / 2 + 5,
      0,
      Math.PI * 2
    )
    ctx.stroke()
  }
}

/**
 * Update player mode properties in StateManager
 * @param {Object} stateManager - StateManager instance
 */
function updatePlayerModeProperties(stateManager) {
  const mode = stateManager.getState('player.mode')
  const modeProperties = stateManager.getState('player.modeProperties')
  const currentModeProps = modeProperties[mode]

  if (currentModeProps) {
    stateManager.setState('player.speed', currentModeProps.speed)
    stateManager.setState('player.currentShootRate', currentModeProps.shootRate)
    stateManager.setState('player.currentBulletType', currentModeProps.bulletType)
    stateManager.setState('player.currentColor', currentModeProps.color)
    stateManager.setState('player.width', currentModeProps.width)
    stateManager.setState('player.height', currentModeProps.height)
  }
}

/**
 * Backward compatibility: Create player using stateless architecture
 * @param {Object} game - Game instance
 * @param {number} x - Initial x position
 * @param {number} y - Initial y position
 * @returns {Object} Player API object
 */
export function createPlayer(game, x, y) {
  // Initialize state in StateManager
  initializePlayerState(game.stateManager, x, y)

  // Return API object that uses the stateless entity
  return {
    // Expose stateless entity methods bound to game systems
    update: (deltaTime, input) =>
      Player.update(game.stateManager, game.eventDispatcher, deltaTime, input),
    render: ctx => Player.render(game.stateManager, ctx),
    transform: () => Player.transform(game.stateManager, game.eventDispatcher),
    shoot: () => Player.shoot(game.stateManager, game.eventDispatcher, game),
    takeDamage: damage => Player.takeDamage(game.stateManager, damage),
    heal: amount => Player.heal(game.stateManager, amount),

    // Expose getters for backward compatibility
    get x() {
      return Player.getPosition(game.stateManager).x
    },
    get y() {
      return Player.getPosition(game.stateManager).y
    },
    get health() {
      return Player.getHealth(game.stateManager)
    },
    get mode() {
      return Player.getMode(game.stateManager)
    },
    get width() {
      return Player.getDimensions(game.stateManager).width
    },
    get height() {
      return Player.getDimensions(game.stateManager).height
    },

    // Expose direct state access for advanced use
    stateManager: game.stateManager,
    eventDispatcher: game.eventDispatcher
  }
}

// Legacy function exports for backward compatibility
export function updatePlayer(playerApi, deltaTime, input) {
  return playerApi.update(deltaTime, input)
}

export function renderPlayer(playerApi, ctx) {
  return playerApi.render(ctx)
}

export function transformPlayer(playerApi) {
  return playerApi.transform()
}

export function shootPlayer(playerApi) {
  return playerApi.shoot()
}

export function takeDamagePlayer(playerApi, damage) {
  return playerApi.takeDamage(damage)
}
