/**
 * Bullet Manager - Bridge between stateless bullets and game.bullets array
 *
 * This manager provides a transition layer during the Entity-State Architecture migration.
 * It maintains the existing game.bullets array interface while using StateManager internally.
 */

import { createBullet, updateBullet, renderBullet, Bullet } from '@/entities/bullet.js'

/**
 * Initialize bullet management for a game instance
 * @param {Object} game - Game instance with stateManager
 */
export function initializeBulletManager(game) {
  // Ensure StateManager has bullets state
  if (!game.stateManager.getState('bullets')) {
    game.stateManager.setState('bullets', {})
  }

  return {
    /**
     * Create a bullet and add to game.bullets array with compatibility wrapper
     * @param {Object} config - Bullet configuration
     * @returns {Object} Compatibility wrapper object
     */
    createBullet: config => {
      const bulletId = createBullet(game.stateManager, config)

      // Create compatibility wrapper that looks like old bullet objects
      const compatibilityWrapper = {
        __bulletId: bulletId,

        // Getters for compatibility
        get x() {
          return Bullet.getPosition(game.stateManager, bulletId).x
        },
        get y() {
          return Bullet.getPosition(game.stateManager, bulletId).y
        },
        get velocityX() {
          return Bullet.getVelocity(game.stateManager, bulletId).x
        },
        get velocityY() {
          return Bullet.getVelocity(game.stateManager, bulletId).y
        },
        get width() {
          return Bullet.getDimensions(game.stateManager, bulletId).width
        },
        get height() {
          return Bullet.getDimensions(game.stateManager, bulletId).height
        },
        get type() {
          return Bullet.getType(game.stateManager, bulletId)
        },
        get owner() {
          return Bullet.getOwner(game.stateManager, bulletId)
        },
        get damage() {
          return Bullet.getDamage(game.stateManager, bulletId)
        },
        get markedForDeletion() {
          return Bullet.isMarkedForDeletion(game.stateManager, bulletId)
        },
        get friendly() {
          return game.stateManager.getState(`bullets.${bulletId}.friendly`)
        },

        // Setters for compatibility (if needed)
        set markedForDeletion(value) {
          if (value) Bullet.markForDeletion(game.stateManager, bulletId)
        },

        // Methods for compatibility
        update: deltaTime => {
          updateBullet(game.stateManager, bulletId, deltaTime, {
            width: game.width,
            height: game.height
          })
        },

        render: ctx => {
          renderBullet(game.stateManager, bulletId, ctx)
        }
      }

      return compatibilityWrapper
    },

    /**
     * Update all bullets
     * @param {number} deltaTime - Time elapsed since last frame
     */
    updateBullets: deltaTime => {
      const bulletIds = Bullet.getAllBulletIds(game.stateManager)
      bulletIds.forEach(bulletId => {
        updateBullet(game.stateManager, bulletId, deltaTime, {
          width: game.width,
          height: game.height
        })
      })
    },

    /**
     * Render all bullets
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    renderBullets: ctx => {
      const bulletIds = Bullet.getAllBulletIds(game.stateManager)
      bulletIds.forEach(bulletId => {
        renderBullet(game.stateManager, bulletId, ctx)
      })
    },

    /**
     * Clean up marked bullets
     */
    cleanupBullets: () => {
      const bulletIds = Bullet.getAllBulletIds(game.stateManager)
      bulletIds.forEach(bulletId => {
        if (Bullet.isMarkedForDeletion(game.stateManager, bulletId)) {
          Bullet.remove(game.stateManager, bulletId)
        }
      })

      // Also clean up game.bullets array
      game.bullets = game.bullets.filter(bullet => !bullet.markedForDeletion)
    },

    /**
     * Get all bullet IDs for advanced operations
     */
    getAllBulletIds: () => Bullet.getAllBulletIds(game.stateManager)
  }
}

/**
 * End of bullet-manager.js
 */
