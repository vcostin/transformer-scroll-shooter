/**
 * Bullet POJO+Functional - Phase 3 Game Object Module
 *
 * Represents projectiles fired by player and enemies.
 * Supports multiple bullet types with different properties.
 * Uses POJO+Functional architecture for better testability and composition.
 */

// Constants
const SEED_HOMING_RANGE = 400
const MIN_DISTANCE_EPSILON = 1e-6
const SEED_BULLET_TTL = 8000 // 8 seconds time-to-live for homing bullets

/**
 * Create a new bullet state object
 * @param {Object} game - Game instance reference
 * @param {number} x - Initial x position
 * @param {number} y - Initial y position
 * @param {number} velocityX - Horizontal velocity
 * @param {number} velocityY - Vertical velocity
 * @param {string} type - Bullet type
 * @param {boolean} friendly - Whether bullet is friendly (player-owned)
 * @returns {Object} Bullet state object
 */
export function createBullet(game, x, y, velocityX, velocityY, type, friendly) {
  const bullet = {
    game,
    x,
    y,
    velocityX,
    velocityY,
    type,
    friendly,
    owner: friendly ? 'player' : 'enemy',
    markedForDeletion: false,
    age: 0,
    timeToLive: null
  }

  // Set properties based on type
  return setupBulletType(bullet)
}

/**
 * Set up bullet properties based on type
 * @param {Object} bullet - Bullet state object
 * @returns {Object} Updated bullet state with type-specific properties
 */
function setupBulletType(bullet) {
  switch (bullet.type) {
    case 'normal':
      return {
        ...bullet,
        width: 8,
        height: 3,
        damage: 10,
        color: '#ffff00'
      }

    case 'torpedo':
      return {
        ...bullet,
        width: 12,
        height: 4,
        damage: 15,
        color: '#00ffff'
      }

    case 'cannon':
      return {
        ...bullet,
        width: 6,
        height: 6,
        damage: 20,
        color: '#ff8800'
      }

    case 'laser':
      return {
        ...bullet,
        width: 15,
        height: 2,
        damage: 8,
        color: '#ff00ff'
      }

    case 'enemy':
      return {
        ...bullet,
        width: 6,
        height: 3,
        damage: 5,
        color: '#ff4444'
      }

    case 'seed':
      // Slow homing seed from Seeder enemy
      return {
        ...bullet,
        width: 6,
        height: 6,
        damage: 6,
        color: '#aaff66',
        turnRate: 0.003, // radians per ms approx
        speed: 110,
        timeToLive: SEED_BULLET_TTL // 8 seconds TTL for homing bullets
      }

    default:
      return bullet
  }
}

/**
 * Update bullet state for one frame
 * @param {Object} bullet - Current bullet state
 * @param {number} deltaTime - Time elapsed since last frame in milliseconds
 * @returns {Object} Updated bullet state
 */
export function updateBullet(bullet, deltaTime) {
  const t = deltaTime / 1000

  // Update age and check for TTL expiration
  const newAge = bullet.age + deltaTime
  if (bullet.timeToLive !== null && newAge >= bullet.timeToLive) {
    return { ...bullet, age: newAge, markedForDeletion: true }
  }

  let newVelocityX = bullet.velocityX
  let newVelocityY = bullet.velocityY

  if (bullet.type === 'seed') {
    // Home slowly toward player, but only if within homing range
    const player = bullet.game.player
    if (player) {
      const dx = player.x - bullet.x
      const dy = player.y - bullet.y
      const dist = Math.hypot(dx, dy)
      // Only home if within reasonable range and not too close to avoid division issues
      if (dist < SEED_HOMING_RANGE && dist > MIN_DISTANCE_EPSILON) {
        // Desired velocity towards player at seed speed
        const desiredVX = (dx / dist) * bullet.speed
        const desiredVY = (dy / dist) * bullet.speed
        // Interpolate velocity slightly toward desired
        const alpha = Math.min(1, bullet.turnRate * deltaTime)
        newVelocityX = bullet.velocityX + (desiredVX - bullet.velocityX) * alpha
        newVelocityY = bullet.velocityY + (desiredVY - bullet.velocityY) * alpha
      }
    }
  }

  const newX = bullet.x + newVelocityX * t
  const newY = bullet.y + newVelocityY * t

  // Mark for deletion if off screen
  const offScreen =
    newX < -50 || newX > bullet.game.width + 50 || newY < -50 || newY > bullet.game.height + 50

  return {
    ...bullet,
    x: newX,
    y: newY,
    velocityX: newVelocityX,
    velocityY: newVelocityY,
    age: newAge,
    markedForDeletion: bullet.markedForDeletion || offScreen
  }
}

/**
 * Render bullet to the canvas
 * @param {Object} bullet - Bullet state to render
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 */
export function renderBullet(bullet, ctx) {
  ctx.fillStyle = bullet.color

  switch (bullet.type) {
    case 'laser':
      // Draw laser beam
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      // Add glow effect
      ctx.shadowColor = bullet.color
      ctx.shadowBlur = 5
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      ctx.shadowBlur = 0
      break

    case 'seed':
      // Draw seed as a small orb with a faint glow
      ctx.beginPath()
      ctx.arc(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        bullet.width / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.shadowColor = bullet.color
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        bullet.width / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.shadowBlur = 0
      break

    case 'torpedo':
      // Draw torpedo with trail
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      ctx.fillStyle = '#006666'
      ctx.fillRect(bullet.x - 5, bullet.y + 1, 5, 2)
      break

    case 'cannon':
      // Draw cannon ball
      ctx.beginPath()
      ctx.arc(
        bullet.x + bullet.width / 2,
        bullet.y + bullet.height / 2,
        bullet.width / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      break

    default:
      // Standard bullet
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      break
  }
}

// Legacy class wrapper for backward compatibility during migration
export default class Bullet {
  constructor(game, x, y, velocityX, velocityY, type, friendly) {
    Object.assign(this, createBullet(game, x, y, velocityX, velocityY, type, friendly))
  }

  update(deltaTime) {
    Object.assign(this, updateBullet(this, deltaTime))
  }

  render(ctx) {
    renderBullet(this, ctx)
  }
}
