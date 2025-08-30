/**
 * Player POJO+Functional - Pure Functional Implementation
 *
 * Complete POJO+Functional implementation of player system.
 * Eliminates legacy class wrapper for better performance and testability.
 */

import { createBullet } from '@/entities/bullet.js'
import { TransformEffect } from '@/rendering/effects.js'
import { PLAYER_EVENTS, PLAYER_STATES, MOVE_DIRECTIONS } from '@/constants/player-events.js'
import { GAME_EVENTS } from '@/constants/game-events.js'
import * as MathUtils from '@/utils/math.js'

/**
 * Extract payload from event data with fallback
 * @param {Object} data - Event data object
 * @returns {Object} Extracted payload
 */
function extractEventPayload(data) {
  return data.payload || data
}

/**
 * Create a new player state object
 * @param {Object} game - Game instance reference
 * @param {number} x - Initial x position
 * @param {number} y - Initial y position
 * @returns {Object} Player state object
 */
export function createPlayer(game, x, y) {
  // Validate required event-driven systems
  if (!game.eventDispatcher) {
    throw new Error('Player requires game.eventDispatcher for event-driven architecture')
  }

  if (!game.stateManager) {
    throw new Error('Player requires game.stateManager for state management')
  }

  const player = {
    game,
    x,
    y,
    width: 40,
    height: 30,

    // Stats
    maxHealth: 100,
    health: 100,
    speed: 200,

    // Transformer modes
    modes: ['car', 'scuba', 'boat', 'plane'],
    currentModeIndex: 0,
    mode: 'car',
    transformCooldown: 0,

    // Shooting
    shootCooldown: 0,
    baseShootRate: 300, // milliseconds
    currentShootRate: 300,

    // Power-ups
    activePowerups: [],
    shield: 0,

    // Mode-specific properties
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
    },

    // Event-driven architecture references
    eventDispatcher: game.eventDispatcher,
    stateManager: game.stateManager,
    effectManager: game.effectManager
  }

  // Set properties based on current mode and return initialized player
  return updatePlayerModeProperties(player)
}

/**
 * Update player mode properties based on current mode
 * @param {Object} player - Player state object
 * @returns {Object} Updated player state with mode properties applied
 */
function updatePlayerModeProperties(player) {
  const currentModeProps = player.modeProperties[player.mode]

  return {
    ...player,
    speed: currentModeProps.speed,
    currentShootRate: currentModeProps.shootRate,
    currentBulletType: currentModeProps.bulletType,
    currentColor: currentModeProps.color,
    width: currentModeProps.width,
    height: currentModeProps.height
  }
}

/**
 * Update player state and handle input
 * @param {Object} player - Player state object
 * @param {number} deltaTime - Time since last update
 * @param {Object} input - Input state object
 * @returns {Object} Updated player state
 */
export function updatePlayer(player, deltaTime, input) {
  let updatedPlayer = { ...player }

  // Update cooldowns
  updatedPlayer.shootCooldown = Math.max(0, updatedPlayer.shootCooldown - deltaTime)
  updatedPlayer.transformCooldown = Math.max(0, updatedPlayer.transformCooldown - deltaTime)

  // Handle movement
  if (input) {
    updatedPlayer = movePlayer(updatedPlayer, deltaTime, input)
  }

  // Handle transformation
  if (input && input.transform && updatedPlayer.transformCooldown <= 0) {
    updatedPlayer = transformPlayer(updatedPlayer)
  }

  // Handle shooting
  if (input && input.shoot && updatedPlayer.shootCooldown <= 0) {
    updatedPlayer = shootPlayer(updatedPlayer)
  }

  // Update power-ups
  updatedPlayer = updatePowerups(updatedPlayer, deltaTime)

  // Emit update event
  if (updatedPlayer.eventDispatcher) {
    updatedPlayer.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_UPDATED, {
      payload: { player: updatedPlayer, deltaTime }
    })
  }

  return updatedPlayer
}

/**
 * Move player based on input
 * @param {Object} player - Player state object
 * @param {number} deltaTime - Time since last update
 * @param {Object} input - Input state object
 * @returns {Object} Updated player state
 */
export function movePlayer(player, deltaTime, input) {
  const moveSpeed = (player.speed * deltaTime) / 1000
  let newX = player.x
  let newY = player.y
  let hasMoved = false

  // Horizontal movement
  if (input.left && newX > 0) {
    newX = Math.max(0, newX - moveSpeed)
    hasMoved = true
  }

  if (input.right && newX < player.game.canvas.width - player.width) {
    newX = Math.min(player.game.canvas.width - player.width, newX + moveSpeed)
    hasMoved = true
  }

  // Vertical movement
  if (input.up && newY > 0) {
    newY = Math.max(0, newY - moveSpeed)
    hasMoved = true
  }

  if (input.down && newY < player.game.canvas.height - player.height) {
    newY = Math.min(player.game.canvas.height - player.height, newY + moveSpeed)
    hasMoved = true
  }

  const updatedPlayer = { ...player, x: newX, y: newY }

  // Emit movement events if moved
  if (hasMoved && player.eventDispatcher) {
    player.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_MOVED, {
      payload: { player: updatedPlayer, deltaTime }
    })

    // Update state manager
    if (player.stateManager) {
      player.stateManager.setState('player.position', { x: newX, y: newY })
    }
  }

  return updatedPlayer
}

/**
 * Transform player to next mode
 * @param {Object} player - Player state object
 * @returns {Object} Updated player state
 */
export function transformPlayer(player) {
  const oldMode = player.mode
  const newModeIndex = (player.currentModeIndex + 1) % player.modes.length
  const newMode = player.modes[newModeIndex]

  let updatedPlayer = {
    ...player,
    currentModeIndex: newModeIndex,
    mode: newMode,
    transformCooldown: 1000 // 1 second cooldown
  }

  // Apply new mode properties
  updatedPlayer = updatePlayerModeProperties(updatedPlayer)

  // Create transform effect
  if (player.game) {
    const effect = new TransformEffect(
      player.game,
      player.x + player.width / 2,
      player.y + player.height / 2
    )
    player.game.addEffect(effect)
  }

  // Emit transformation events
  if (player.eventDispatcher) {
    player.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_TRANSFORMED, {
      payload: {
        player: updatedPlayer,
        oldMode,
        newMode,
        modeIndex: newModeIndex
      }
    })

    // Update state manager
    if (player.stateManager) {
      player.stateManager.setState('player.mode', newMode)
      player.stateManager.setState('player.modeIndex', newModeIndex)
    }
  }

  return updatedPlayer
}

/**
 * Make player shoot a bullet
 * @param {Object} player - Player state object
 * @returns {Object} Updated player state
 */
export function shootPlayer(player) {
  const bulletX = player.x + player.width
  const bulletY = player.y + player.height / 2

  // Create bullet using functional approach
  const bullet = createBullet(
    player.game,
    bulletX,
    bulletY,
    200, // velocityX
    0, // velocityY
    player.currentBulletType || 'normal',
    true // friendly (player bullet)
  )

  // Add bullet to game
  if (player.game && player.game.bullets) {
    player.game.bullets.push(bullet)
  }

  const updatedPlayer = {
    ...player,
    shootCooldown: player.currentShootRate
  }

  // Emit shoot event
  if (player.eventDispatcher) {
    player.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_SHOT, {
      payload: { player: updatedPlayer, bullet }
    })

    // Update state manager
    if (player.stateManager) {
      player.stateManager.setState('player.bullets', (player.game.bullets || []).length)
    }
  }

  return updatedPlayer
}

/**
 * Apply damage to player
 * @param {Object} player - Player state object
 * @param {number} damage - Damage amount
 * @returns {Object} Updated player state
 */
export function takeDamagePlayer(player, damage) {
  // Apply shield if available
  let actualDamage = damage
  const updatedPlayer = { ...player }

  if (updatedPlayer.shield > 0) {
    const shieldAbsorbed = Math.min(actualDamage, updatedPlayer.shield)
    actualDamage -= shieldAbsorbed
    updatedPlayer.shield -= shieldAbsorbed
  }

  // Apply remaining damage to health
  updatedPlayer.health = Math.max(0, updatedPlayer.health - actualDamage)

  // Emit damage event
  if (player.eventDispatcher) {
    player.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_DAMAGED, {
      payload: {
        player: updatedPlayer,
        damage: actualDamage,
        originalDamage: damage,
        shieldDamage: damage - actualDamage
      }
    })

    // Check for death
    if (updatedPlayer.health <= 0) {
      player.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_DIED, {
        payload: { player: updatedPlayer }
      })
    }

    // Update state manager
    if (player.stateManager) {
      player.stateManager.setState('player.health', updatedPlayer.health)
      player.stateManager.setState('player.shield', updatedPlayer.shield)
    }
  }

  return updatedPlayer
}

/**
 * Update active power-ups
 * @param {Object} player - Player state object
 * @param {number} deltaTime - Time since last update
 * @returns {Object} Updated player state
 */
export function updatePowerups(player, deltaTime) {
  // Ensure activePowerups is always an array
  const currentPowerups = player.activePowerups || []

  const updatedPowerups = currentPowerups
    .map(powerup => ({
      ...powerup,
      duration: powerup.duration - deltaTime
    }))
    .filter(powerup => powerup.duration > 0)

  const updatedPlayer = {
    ...player,
    activePowerups: updatedPowerups
  }

  // Emit powerup events if any expired
  if (updatedPowerups.length !== currentPowerups.length && player.eventDispatcher) {
    const expiredPowerups = currentPowerups.filter(
      old => !updatedPowerups.find(current => current.id === old.id)
    )

    expiredPowerups.forEach(powerup => {
      player.eventDispatcher.emit(PLAYER_EVENTS.POWERUP_EXPIRED, {
        payload: { player: updatedPlayer, powerup }
      })
    })
  }

  return updatedPlayer
}

/**
 * Render player to canvas
 * @param {Object} player - Player state object
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function renderPlayer(player, ctx) {
  if (!player || !ctx) {
    return
  }

  ctx.save()
  ctx.fillStyle = player.currentColor || player.modeProperties[player.mode].color

  // Draw player based on current mode
  switch (player.mode) {
    case 'car':
      drawCar(player, ctx)
      break
    case 'scuba':
      drawScuba(player, ctx)
      break
    case 'boat':
      drawBoat(player, ctx)
      break
    case 'plane':
      drawPlane(player, ctx)
      break
    default:
      drawCar(player, ctx)
  }

  // Draw health bar if damaged
  if (player.health < player.maxHealth) {
    drawHealthBar(player, ctx)
  }

  ctx.restore()
}

/**
 * Draw car mode
 * @param {Object} player - Player state object
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function drawCar(player, ctx) {
  // Body
  ctx.fillRect(player.x, player.y + 5, player.width - 5, player.height - 10)

  // Front
  ctx.fillRect(player.x + player.width - 5, player.y + 8, 5, player.height - 16)

  // Wheels
  ctx.fillStyle = '#333'
  ctx.fillRect(player.x + 5, player.y, 8, 5)
  ctx.fillRect(player.x + 5, player.y + player.height - 5, 8, 5)
  ctx.fillRect(player.x + player.width - 15, player.y, 8, 5)
  ctx.fillRect(player.x + player.width - 15, player.y + player.height - 5, 8, 5)
}

/**
 * Draw scuba mode
 * @param {Object} player - Player state object
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function drawScuba(player, ctx) {
  // Body
  ctx.fillRect(player.x + 5, player.y + 5, player.width - 10, player.height - 10)

  // Fins
  ctx.fillRect(player.x, player.y + 8, 5, player.height - 16)

  // Tank
  ctx.fillStyle = '#ccc'
  ctx.fillRect(player.x + player.width - 8, player.y + 2, 8, player.height - 4)

  // Bubbles effect (simple)
  ctx.fillStyle = '#87CEEB'
  ctx.beginPath()
  ctx.arc(player.x + player.width + 5, player.y + player.height / 2, 2, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Draw boat mode
 * @param {Object} player - Player state object
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function drawBoat(player, ctx) {
  // Hull
  ctx.beginPath()
  ctx.moveTo(player.x, player.y + player.height / 2)
  ctx.lineTo(player.x + player.width - 10, player.y + player.height / 2 - 5)
  ctx.lineTo(player.x + player.width, player.y + player.height / 2)
  ctx.lineTo(player.x + player.width - 5, player.y + player.height)
  ctx.lineTo(player.x + 5, player.y + player.height)
  ctx.closePath()
  ctx.fill()

  // Mast
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(player.x + player.width / 2, player.y, 3, player.height / 2)

  // Sail
  ctx.fillStyle = '#fff'
  ctx.fillRect(player.x + player.width / 2 + 3, player.y + 2, 15, 12)
}

/**
 * Draw plane mode
 * @param {Object} player - Player state object
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function drawPlane(player, ctx) {
  // Fuselage
  ctx.fillRect(player.x + 10, player.y + player.height / 2 - 3, player.width - 15, 6)

  // Wings
  ctx.fillRect(player.x + 15, player.y + 2, 20, 4)
  ctx.fillRect(player.x + 15, player.y + player.height - 6, 20, 4)

  // Tail
  ctx.fillRect(player.x, player.y + player.height / 2 - 8, 15, 4)
  ctx.fillRect(player.x, player.y + player.height / 2 + 4, 15, 4)

  // Nose
  ctx.beginPath()
  ctx.moveTo(player.x + player.width - 5, player.y + player.height / 2)
  ctx.lineTo(player.x + player.width, player.y + player.height / 2 - 5)
  ctx.lineTo(player.x + player.width, player.y + player.height / 2 + 5)
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw health bar
 * @param {Object} player - Player state object
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 */
export function drawHealthBar(player, ctx) {
  const barWidth = 40
  const barHeight = 4
  const x = player.x + (player.width - barWidth) / 2
  const y = player.y - 10

  // Background
  ctx.fillStyle = '#333'
  ctx.fillRect(x, y, barWidth, barHeight)

  // Health
  const healthPercent = player.health / player.maxHealth
  ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'
  ctx.fillRect(x, y, barWidth * healthPercent, barHeight)
}
