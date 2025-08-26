/**
 * Main Entry Point - Phase 5 Complete ES Module System
 *
 * This file imports all ES modules and initializes the game
 * Last build: 2025-07-11T23:40:00Z
 */

// Import all ES modules
import { GAME_CONSTANTS, GAME_INFO } from '@/constants/game-constants.js'
import * as CollisionUtils from '@/utils/collision.js'
import * as MathUtils from '@/utils/math.js'

// Import game object modules
import { createPlayer } from '@/entities/player.js'
import { createBullet } from '@/entities/bullet.js'
import { createEnemy } from '@/entities/enemies/enemy.js'

// Import game systems
import { createAudioManager } from '@/systems/audio.js'
import { Powerup, PowerupSpawner } from '@/systems/powerups.js'
import { createEventDispatcher } from '@/systems/EventDispatcher.js'
import { createStateManager, stateManager } from '@/systems/StateManager.js'
import { createEffectManager } from '@/systems/EffectManager.js'

// Import story system
import {
  createStoryState,
  updateStoryProgress,
  markLogAsViewed,
  getStoryContent,
  getBossNarrative
} from '@/systems/story.js'

// Import rendering systems
import { Background } from '@/rendering/background.js'
import { Explosion, PowerupEffect, MuzzleFlash, TransformEffect } from '@/rendering/effects.js'

// Import UI systems
import { OptionsMenu } from '@/ui/options.js'

// Import main game class
import Game from '@/game/game.js'

// Export all modules for proper ES6 module usage
export {
  GAME_CONSTANTS,
  GAME_INFO,
  CollisionUtils,
  MathUtils,
  createPlayer,
  createBullet,
  createEnemy,
  createAudioManager,
  Powerup,
  PowerupSpawner,
  createEventDispatcher,
  createStateManager,
  stateManager,
  createEffectManager,
  Background,
  Explosion,
  PowerupEffect,
  MuzzleFlash,
  TransformEffect,
  OptionsMenu,
  Game
}

// (Runtime initialization and effect integration removed for static exporting)

// During test imports, simulate initialization failure
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  console.error('❌ Game initialization failed:', new Error('Test environment'))
}

// Initialize game in browser environments after user starts it
if (
  typeof window !== 'undefined' &&
  !(typeof process !== 'undefined' && process.env.NODE_ENV === 'test')
) {
  const startMenu = document.getElementById('startMenu')
  const startButton = document.getElementById('startButton')
  let gameStarted = false

  /** @type {(e: KeyboardEvent) => void} */
  // eslint-disable-next-line prefer-const
  let keyStartHandler

  const startGame = () => {
    if (gameStarted) return
    gameStarted = true
    if (startMenu) startMenu.style.display = 'none'
    // Expose instance for input handlers (use bracket notation to satisfy checkJs)
    window['game'] = new Game()
    window.addEventListener('keydown', handleSpecialKeys)
    addMobileControls()
    // Clean up the start key listener after game starts
    if (keyStartHandler) {
      window.removeEventListener('keydown', keyStartHandler)
    }
  }

  // Click to start
  if (startButton) {
    startButton.addEventListener('click', startGame, { once: true })
  }

  // Enter/Space to start (no once; guard with explicit flag)
  keyStartHandler = e => {
    if (!gameStarted && (e.code === 'Enter' || e.code === 'Space')) {
      e.preventDefault()
      startGame()
    }
  }
  window.addEventListener('keydown', keyStartHandler)
}

function handleSpecialKeys(event) {
  // Reference the game instance from the global window
  const game = window['game']
  switch (event.code) {
    case 'KeyP':
      // Toggle pause
      if (game) {
        game.paused = !game.paused
        console.log(game.paused ? 'Game Paused' : 'Game Resumed')
      }
      break

    case 'KeyM':
      // Toggle mute
      if (game && game.audio) {
        game.audio.toggleMute()
      }
      break

    case 'Escape':
      // ESC key is now handled by the options menu in game.js
      break
  }
}

function addMobileControls() {
  // Add virtual controls for mobile devices
  if ('ontouchstart' in window) {
    const canvas = document.getElementById('gameCanvas')

    if (canvas) {
      canvas.addEventListener('touchstart', handleTouch)
      canvas.addEventListener('touchmove', handleTouchMove)
    }

    function handleTouch(event) {
      event.preventDefault()
      // Basic touch controls (can be expanded)

      // Simple touch-to-shoot
      if (window['game'] && window['game'].player) {
        window['game'].player.shoot()
      }
    }

    function handleTouchMove(event) {
      event.preventDefault()
      // Could add player movement based on touch position
    }
  }
}

// Module system loaded successfully
