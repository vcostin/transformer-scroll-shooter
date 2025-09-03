/**
 * EnemyStateWrapper - Provides clean interface between Entity-State architecture and legacy functions
 *
 * This wrapper creates compatible enemy objects that bridge the gap between:
 * - StateManager-based data storage (Entity-State architecture)
 * - Legacy object-based functions that expect properties and methods
 * - Event-driven architecture requirements
 */

import { Enemy } from './enemy.js'

/**
 * Creates a wrapped enemy object that provides all necessary properties and methods
 * for legacy enemy functions while maintaining StateManager as source of truth.
 *
 * @param {StateManager} stateManager - The state manager instance
 * @param {string} enemyId - The enemy ID in StateManager
 * @param {Object} gameContext - Game context containing references to game systems
 * @returns {Object} Wrapped enemy object with all necessary properties
 */
export function createEnemyStateWrapper(stateManager, enemyId, gameContext) {
  const { player, width, height, eventDispatcher, effectManager, enemies } = gameContext

  // Get base state from StateManager
  const baseState = Enemy.getEnemyState(stateManager, enemyId)
  if (!baseState) return null

  // Create wrapped enemy object
  const wrappedEnemy = {
    // Core identification
    id: enemyId,

    // State data (spread from StateManager)
    ...baseState,

    // Position data (flattened for legacy compatibility)
    x: baseState.position.x,
    y: baseState.position.y,

    // Direct references expected by legacy functions
    eventDispatcher,

    // Game context for legacy functions
    game: {
      player: player || null,
      width,
      height,
      stateManager,
      eventDispatcher,
      effectManager,
      enemies
    },

    // Synchronization methods to keep StateManager updated (optimized)
    syncToStateManager() {
      // Track what has changed to avoid unnecessary StateManager calls
      const currentState = Enemy.getEnemyState(stateManager, enemyId)
      if (!currentState) return

      // Only sync position if it changed
      if (this.x !== currentState.position.x || this.y !== currentState.position.y) {
        Enemy.setPosition(stateManager, enemyId, {
          x: this.x,
          y: this.y
        })
      }

      // Only sync health if it changed
      if (this.health !== undefined && this.health !== currentState.health) {
        Enemy.setHealth(stateManager, enemyId, this.health)
      }

      // Only sync timers if they exist and changed
      if (this.moveTimer !== undefined && this.moveTimer !== currentState.moveTimer) {
        Enemy.setMoveTimer(stateManager, enemyId, this.moveTimer)
      }

      if (this.shootTimer !== undefined && this.shootTimer !== currentState.shootTimer) {
        Enemy.setShootTimer(stateManager, enemyId, this.shootTimer)
      }

      // Sync other state changes only if they changed
      if (this.zigDirection !== undefined && this.zigDirection !== currentState.zigDirection) {
        Enemy.setZigDirection(stateManager, enemyId, this.zigDirection)
      }

      if (this.targetY !== undefined && this.targetY !== currentState.targetY) {
        Enemy.setTargetY(stateManager, enemyId, this.targetY)
      }
    },

    // Refresh state from StateManager (optimized)
    refreshFromStateManager() {
      const latestState = Enemy.getEnemyState(stateManager, enemyId)
      if (latestState) {
        // Only update essential properties to avoid expensive object operations
        this.x = latestState.position.x
        this.y = latestState.position.y
        this.health = latestState.health
        this.moveTimer = latestState.moveTimer
        this.shootTimer = latestState.shootTimer
        this.markedForDeletion = latestState.markedForDeletion

        // Update other frequently changing properties as needed
        if (latestState.zigDirection !== undefined) {
          this.zigDirection = latestState.zigDirection
        }

        if (latestState.targetY !== undefined) {
          this.targetY = latestState.targetY
        }
      }
      return this
    },

    // Clean removal
    remove() {
      Enemy.remove(stateManager, enemyId)
    }
  }

  return wrappedEnemy
}

/**
 * Game State Accessor - Provides clean access to game state for StateManager functions
 * This solves the issue where StateManager functions expect game state but it's not stored there
 */
export class GameStateAccessor {
  constructor(gameContext) {
    this.gameContext = gameContext
  }

  /**
   * Get game state in the format expected by StateManager functions
   */
  getGameState() {
    return (
      this.gameContext.game || {
        player: this.gameContext.player,
        width: this.gameContext.width,
        height: this.gameContext.height,
        eventDispatcher: this.gameContext.eventDispatcher,
        effectManager: this.gameContext.effectManager,
        enemies: this.gameContext.enemies
        // Add other game state as needed
      }
    )
  }

  /**
   * Check if player exists (common check in AI functions)
   */
  hasPlayer() {
    return this.gameContext.player != null
  }

  /**
   * Get player position if it exists
   */
  getPlayerPosition() {
    if (!this.gameContext.player) return null
    return {
      x: this.gameContext.player.x,
      y: this.gameContext.player.y
    }
  }
}

/**
 * Enhanced StateManager wrapper that provides game context
 * This extends StateManager functionality with game-specific accessors
 */
export function createEnhancedStateManager(stateManager, gameContext) {
  const gameStateAccessor = new GameStateAccessor(gameContext)

  return {
    // Delegate all StateManager methods
    ...stateManager,

    // Enhanced getState that includes game context
    getState(path) {
      // Handle special game state requests
      if (path === 'game') {
        return gameStateAccessor.getGameState()
      }

      // Delegate to original StateManager
      return stateManager.getState(path)
    },

    // Game-specific accessors
    hasPlayer: () => gameStateAccessor.hasPlayer(),
    getPlayerPosition: () => gameStateAccessor.getPlayerPosition(),
    getGameContext: () => gameContext
  }
}
