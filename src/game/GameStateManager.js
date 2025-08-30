/**
 * Game-Specific State Manager
 *
 * Wraps the generic StateManager with game-specific functionality
 * and initial state setup.
 */

import { createStateManager } from '@/systems/StateManager.js'

/**
 * Game-specific state actions
 * @param {Object} stateManager - Generic state manager instance
 * @returns {Object} Game-specific actions
 */
export const createGameActions = stateManager => ({
  // Player actions
  setPlayerHealth: health => stateManager.setState('game.player.health', health),
  setPlayerPosition: (x, y) =>
    stateManager.batchUpdate([
      { path: 'game.player.x', value: x },
      { path: 'game.player.y', value: y }
    ]),
  setPlayerPowerLevel: level => stateManager.setState('game.player.powerLevel', level),

  // Game state actions
  pauseGame: (reason = 'system') => {
    stateManager.setState('game.paused', true)
    stateManager.setState('game.pauseSource', reason)
  },

  resumeGame: (source = 'system') => {
    const pauseSource = stateManager.getState('game.pauseSource')()

    if (pauseSource === 'menu' && source !== 'menu') {
      console.log('Cannot resume: menu has priority')
      return
    }

    stateManager.setState('game.paused', false)
    stateManager.setState('game.pauseSource', null)
  },

  // UI state actions
  openOptionsMenu: () => {
    stateManager.setState('ui.options.open', true)
    stateManager.setState('game.paused', true)
    stateManager.setState('game.pauseSource', 'menu')
  },

  closeOptionsMenu: () => {
    stateManager.setState('ui.options.open', false)

    const pauseSource = stateManager.getState('game.pauseSource')()
    if (pauseSource === 'menu') {
      stateManager.setState('game.paused', false)
      stateManager.setState('game.pauseSource', null)
    }
  },

  // Score actions
  addScore: points => {
    const currentScore = stateManager.getState('game.score')() || 0
    stateManager.setState('game.score', currentScore + points)
  },

  // Enemy actions
  addEnemy: enemyData => {
    const enemies = stateManager.getState('game.entities.enemies')() || []
    stateManager.setState('game.entities.enemies', [...enemies, enemyData])
  },

  removeEnemy: enemyId => {
    const enemies = stateManager.getState('game.entities.enemies')() || []
    const filteredEnemies = enemies.filter(enemy => enemy.id !== enemyId)
    stateManager.setState('game.entities.enemies', filteredEnemies)
  }
})

/**
 * Create a game-specific state manager with initial game state
 * @param {Object} options - Configuration options
 * @returns {Object} Game state manager with game actions
 */
export const createGameStateManager = (options = {}) => {
  // Default game state
  const gameInitialState = {
    game: {
      paused: false,
      userPaused: false,
      pauseSource: null,
      score: 0,
      level: 1,
      gameOver: false,
      showFPS: false,
      difficulty: 'Normal',
      enemiesKilled: 0,
      enemiesPerLevel: 10,
      bossActive: false,
      bossSpawnedThisLevel: false,
      bossesDefeated: 0,
      powerupsCollected: 0,
      player: {
        health: 100,
        x: 400,
        y: 500,
        powerLevel: 1
      },
      entities: {
        enemies: [],
        bullets: [],
        powerups: []
      }
    },
    ui: {
      options: {
        open: false,
        selectedOption: 0
      }
    },
    audio: {
      enabled: true,
      masterVolume: 1.0,
      sfxVolume: 0.7,
      musicVolume: 0.5
    },
    story: {},
    ...options.initialState
  }

  const stateManager = createStateManager({
    initialState: gameInitialState
  })

  const gameActions = createGameActions(stateManager)

  return {
    // All generic state manager functions
    ...stateManager,

    // Game-specific actions
    ...gameActions
  }
}

// Export a singleton game state manager for backward compatibility
export const gameStateManager = createGameStateManager()
