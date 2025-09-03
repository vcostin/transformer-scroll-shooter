/**
 * Bullet Entity - Stateless Implementation
 *
 * Entity-State Architecture: Stateless bullet entity operating on global state.
 * All bullet data is stored in StateManager, entity functions are pure.
 * State flows: StateManager → Entity Functions → StateManager → Rendering
 */

// Constants for bullet behavior
const SEED_HOMING_RANGE = 400
const MIN_DISTANCE_EPSILON = 1e-6
const SEED_BULLET_TTL = 8000 // 8 seconds time-to-live for homing bullets

/**
 * Bullet State Schema - Defines the structure in StateManager
 */
const BULLET_STATE_SCHEMA = {
  // Position and physics
  x: 0,
  y: 0,
  velocityX: 0,
  velocityY: 0,

  // Visual properties
  width: 8,
  height: 3,
  color: '#ffff00',

  // Bullet properties
  type: 'normal',
  owner: 'player',
  friendly: true,
  damage: 10,

  // Lifecycle properties
  age: 0,
  timeToLive: null,
  markedForDeletion: false,

  // Type-specific properties
  speed: 0, // For homing bullets
  turnRate: 0 // For homing bullets
}

/**
 * Generate unique bullet ID
 * @returns {string} Unique bullet identifier
 */
let bulletIdCounter = 0

function generateBulletId() {
  return `bullet_${Date.now()}_${++bulletIdCounter}`
}

/**
 * Stateless Bullet Entity - Pure functions operating on StateManager
 */
export const Bullet = {
  // === STATE ACCESSORS (READ) ===

  getPosition: (stateManager, bulletId) => ({
    x: stateManager.getState(`bullets.${bulletId}.x`),
    y: stateManager.getState(`bullets.${bulletId}.y`)
  }),

  getVelocity: (stateManager, bulletId) => ({
    x: stateManager.getState(`bullets.${bulletId}.velocityX`),
    y: stateManager.getState(`bullets.${bulletId}.velocityY`)
  }),

  getDimensions: (stateManager, bulletId) => ({
    width: stateManager.getState(`bullets.${bulletId}.width`),
    height: stateManager.getState(`bullets.${bulletId}.height`)
  }),

  getType: (stateManager, bulletId) => stateManager.getState(`bullets.${bulletId}.type`),
  getOwner: (stateManager, bulletId) => stateManager.getState(`bullets.${bulletId}.owner`),
  getDamage: (stateManager, bulletId) => stateManager.getState(`bullets.${bulletId}.damage`),
  getAge: (stateManager, bulletId) => stateManager.getState(`bullets.${bulletId}.age`),
  isMarkedForDeletion: (stateManager, bulletId) =>
    stateManager.getState(`bullets.${bulletId}.markedForDeletion`),

  // === STATE MUTATIONS (WRITE) ===

  setPosition: (stateManager, bulletId, position) => {
    stateManager.setState(`bullets.${bulletId}.x`, position.x)
    stateManager.setState(`bullets.${bulletId}.y`, position.y)
  },

  setVelocity: (stateManager, bulletId, velocity) => {
    stateManager.setState(`bullets.${bulletId}.velocityX`, velocity.x)
    stateManager.setState(`bullets.${bulletId}.velocityY`, velocity.y)
  },

  markForDeletion: (stateManager, bulletId) => {
    stateManager.setState(`bullets.${bulletId}.markedForDeletion`, true)
  },

  updateAge: (stateManager, bulletId, deltaTime) => {
    const currentAge = Bullet.getAge(stateManager, bulletId)
    stateManager.setState(`bullets.${bulletId}.age`, currentAge + deltaTime)
  },

  // === BULLET MANAGEMENT ===

  exists: (stateManager, bulletId) => {
    return stateManager.getState(`bullets.${bulletId}`) !== undefined
  },

  remove: (stateManager, bulletId) => {
    stateManager.setState(`bullets.${bulletId}`, undefined)
  },

  getAllBulletIds: stateManager => {
    const bulletsState = stateManager.getState('bullets') || {}
    return Object.keys(bulletsState).filter(id => bulletsState[id] !== undefined)
  },

  // Get complete bullet state as object
  getBulletState: (stateManager, bulletId) => {
    const position = Bullet.getPosition(stateManager, bulletId)
    const velocity = Bullet.getVelocity(stateManager, bulletId)
    const dimensions = Bullet.getDimensions(stateManager, bulletId)

    return {
      position,
      velocity,
      ...dimensions,
      type: Bullet.getType(stateManager, bulletId),
      owner: Bullet.getOwner(stateManager, bulletId),
      damage: Bullet.getDamage(stateManager, bulletId),
      age: Bullet.getAge(stateManager, bulletId),
      friendly: stateManager.getState(`bullets.${bulletId}.friendly`),
      color: stateManager.getState(`bullets.${bulletId}.color`),
      markedForDeletion: Bullet.isMarkedForDeletion(stateManager, bulletId),
      // Legacy compatibility properties
      x: position.x,
      y: position.y,
      velocityX: velocity.x,
      velocityY: velocity.y
    }
  }
}

/**
 * Initialize Bullet State in StateManager and return bullet ID
 * @param {Object} stateManager - StateManager instance
 * @param {Object} config - Bullet configuration
 * @returns {string} The bullet ID
 */
export function createBullet(stateManager, config) {
  const bulletId = generateBulletId()

  const {
    position = { x: 0, y: 0 },
    velocity = { x: 0, y: 0 },
    type = 'normal',
    friendly = true
  } = config

  // Create base bullet state
  const bulletState = {
    ...BULLET_STATE_SCHEMA,
    x: position.x,
    y: position.y,
    velocityX: velocity.x,
    velocityY: velocity.y,
    type,
    owner: friendly ? 'player' : 'enemy',
    friendly
  }

  // Apply type-specific properties
  const configuredBullet = setupBulletType(bulletState)

  // Initialize all bullet state paths in StateManager
  Object.keys(configuredBullet).forEach(key => {
    stateManager.setState(`bullets.${bulletId}.${key}`, configuredBullet[key])
  })

  return bulletId
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
 * Update bullet state for one frame - Pure function operating on StateManager
 * @param {Object} stateManager - StateManager instance
 * @param {string} bulletId - Bullet identifier
 * @param {number} deltaTime - Time elapsed since last frame in milliseconds
 * @param {Object} gameConfig - Game configuration (width, height)
 */
export function updateBullet(stateManager, bulletId, deltaTime, gameConfig) {
  if (!Bullet.exists(stateManager, bulletId)) {
    return
  }

  const t = deltaTime / 1000

  // Update age and check for TTL expiration
  Bullet.updateAge(stateManager, bulletId, deltaTime)
  const newAge = Bullet.getAge(stateManager, bulletId)
  const timeToLive = stateManager.getState(`bullets.${bulletId}.timeToLive`)

  if (timeToLive !== null && newAge >= timeToLive) {
    Bullet.markForDeletion(stateManager, bulletId)
    return
  }

  const position = Bullet.getPosition(stateManager, bulletId)
  const velocity = Bullet.getVelocity(stateManager, bulletId)
  const type = Bullet.getType(stateManager, bulletId)

  let newVelocityX = velocity.x
  let newVelocityY = velocity.y

  if (type === 'seed') {
    // Home slowly toward player, but only if within homing range
    const playerPosition =
      stateManager.getState('player.x') !== undefined
        ? {
            x: stateManager.getState('player.x'),
            y: stateManager.getState('player.y')
          }
        : null

    if (playerPosition) {
      const dx = playerPosition.x - position.x
      const dy = playerPosition.y - position.y
      const dist = Math.hypot(dx, dy)

      // Only home if within reasonable range and not too close to avoid division issues
      if (dist < SEED_HOMING_RANGE && dist > MIN_DISTANCE_EPSILON) {
        const speed = stateManager.getState(`bullets.${bulletId}.speed`)
        const turnRate = stateManager.getState(`bullets.${bulletId}.turnRate`)

        // Desired velocity towards player at seed speed
        const desiredVX = (dx / dist) * speed
        const desiredVY = (dy / dist) * speed

        // Interpolate velocity slightly toward desired
        const alpha = Math.min(1, turnRate * deltaTime)
        newVelocityX = velocity.x + (desiredVX - velocity.x) * alpha
        newVelocityY = velocity.y + (desiredVY - velocity.y) * alpha
      }
    }
  }

  const newX = position.x + newVelocityX * t
  const newY = position.y + newVelocityY * t

  // Mark for deletion if off screen
  const offScreen =
    newX < -50 || newX > gameConfig.width + 50 || newY < -50 || newY > gameConfig.height + 50

  if (offScreen) {
    Bullet.markForDeletion(stateManager, bulletId)
  }

  // Update position and velocity
  Bullet.setPosition(stateManager, bulletId, { x: newX, y: newY })
  Bullet.setVelocity(stateManager, bulletId, { x: newVelocityX, y: newVelocityY })
}

/**
 * Render bullet to the canvas - Pure function operating on StateManager
 * @param {Object} stateManager - StateManager instance
 * @param {string} bulletId - Bullet identifier
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 */
export function renderBullet(stateManager, bulletId, ctx) {
  if (!Bullet.exists(stateManager, bulletId)) {
    return
  }

  const position = Bullet.getPosition(stateManager, bulletId)
  const dimensions = Bullet.getDimensions(stateManager, bulletId)
  const type = Bullet.getType(stateManager, bulletId)
  const color = stateManager.getState(`bullets.${bulletId}.color`)

  ctx.fillStyle = color

  switch (type) {
    case 'laser':
      // Draw laser beam
      ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)
      // Add glow effect
      ctx.shadowColor = color
      ctx.shadowBlur = 5
      ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)
      ctx.shadowBlur = 0
      break

    case 'seed':
      // Draw seed as a small orb with a faint glow
      ctx.beginPath()
      ctx.arc(
        position.x + dimensions.width / 2,
        position.y + dimensions.height / 2,
        dimensions.width / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.shadowColor = color
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(
        position.x + dimensions.width / 2,
        position.y + dimensions.height / 2,
        dimensions.width / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.shadowBlur = 0
      break

    case 'torpedo':
      // Draw torpedo with trail
      ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)
      ctx.fillStyle = '#006666'
      ctx.fillRect(position.x - 5, position.y + 1, 5, 2)
      break

    case 'cannon':
      // Draw cannon ball
      ctx.beginPath()
      ctx.arc(
        position.x + dimensions.width / 2,
        position.y + dimensions.height / 2,
        dimensions.width / 2,
        0,
        Math.PI * 2
      )
      ctx.fill()
      break

    default:
      // Standard bullet
      ctx.fillRect(position.x, position.y, dimensions.width, dimensions.height)
      break
  }
}
