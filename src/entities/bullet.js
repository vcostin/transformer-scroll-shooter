/**
 * Bullet Class - Phase 3 Game Object Module
 *
 * Represents projectiles fired by player and enemies.
 * Supports multiple bullet types with different properties.
 */

// Constants
const SEED_HOMING_RANGE = 400
const MIN_DISTANCE_EPSILON = 1e-6

export default class Bullet {
  constructor(game, x, y, velocityX, velocityY, type, friendly) {
    this.game = game
    this.x = x
    this.y = y
    this.velocityX = velocityX
    this.velocityY = velocityY
    this.type = type
    this.friendly = friendly
    this.owner = friendly ? 'player' : 'enemy' // Set owner based on friendly flag
    this.markedForDeletion = false

    // Set properties based on type
    this.setupType()
  }

  setupType() {
    switch (this.type) {
      case 'normal':
        this.width = 8
        this.height = 3
        this.damage = 10
        this.color = '#ffff00'
        break

      case 'torpedo':
        this.width = 12
        this.height = 4
        this.damage = 15
        this.color = '#00ffff'
        break

      case 'cannon':
        this.width = 6
        this.height = 6
        this.damage = 20
        this.color = '#ff8800'
        break

      case 'laser':
        this.width = 15
        this.height = 2
        this.damage = 8
        this.color = '#ff00ff'
        break

      case 'enemy':
        this.width = 6
        this.height = 3
        this.damage = 5
        this.color = '#ff4444'
        break

      case 'seed':
        // Slow homing seed from Seeder enemy
        this.width = 6
        this.height = 6
        this.damage = 6
        this.color = '#aaff66'
        this.turnRate = 0.003 // radians per ms approx
        this.speed = 110
        break
    }
  }

  update(deltaTime) {
    const t = deltaTime / 1000

    if (this.type === 'seed') {
      // Home slowly toward player, but only if within homing range
      const player = this.game.player
      if (player) {
        const dx = player.x - this.x
        const dy = player.y - this.y
        const dist = Math.hypot(dx, dy)
        // Only home if within reasonable range and not too close to avoid division issues
        if (dist < SEED_HOMING_RANGE && dist > MIN_DISTANCE_EPSILON) {
          // Desired velocity towards player at seed speed
          const desiredVX = (dx / dist) * this.speed
          const desiredVY = (dy / dist) * this.speed
          // Interpolate velocity slightly toward desired
          const alpha = Math.min(1, this.turnRate * deltaTime)
          this.velocityX = this.velocityX + (desiredVX - this.velocityX) * alpha
          this.velocityY = this.velocityY + (desiredVY - this.velocityY) * alpha
        }
      }
    }

    this.x += this.velocityX * t
    this.y += this.velocityY * t

    // Mark for deletion if off screen
    if (
      this.x < -50 ||
      this.x > this.game.width + 50 ||
      this.y < -50 ||
      this.y > this.game.height + 50
    ) {
      this.markedForDeletion = true
    }
  }

  render(ctx) {
    ctx.fillStyle = this.color

    switch (this.type) {
      case 'laser':
        // Draw laser beam
        ctx.fillRect(this.x, this.y, this.width, this.height)
        // Add glow effect
        ctx.shadowColor = this.color
        ctx.shadowBlur = 5
        ctx.fillRect(this.x, this.y, this.width, this.height)
        ctx.shadowBlur = 0
        break

      case 'seed':
        // Draw seed as a small orb with a faint glow
        ctx.beginPath()
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowColor = this.color
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        break

      case 'torpedo':
        // Draw torpedo with trail
        ctx.fillRect(this.x, this.y, this.width, this.height)
        ctx.fillStyle = '#006666'
        ctx.fillRect(this.x - 5, this.y + 1, 5, 2)
        break

      case 'cannon':
        // Draw cannon ball
        ctx.beginPath()
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2)
        ctx.fill()
        break

      default:
        // Standard bullet
        ctx.fillRect(this.x, this.y, this.width, this.height)
        break
    }
  }
}
