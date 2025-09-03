/**
 * Game POJO+Functional - Core Engine Module
 * Core game engine handling game loop, state management, and coordination
 * Migrated to POJO+Functional pattern for better testability and composition.
 */

import { GAME_CONSTANTS } from '@/constants/game-constants.js'
import { GAME_EVENTS } from '@/constants/game-events.js'
import { BOSS_TYPES, BOSS_MESSAGES } from '@/constants/boss-constants.js'
import { createAudioManager, playSound } from '@/systems/audio.js'
import { OptionsMenu } from '@/ui/options.js'
import { Background } from '@/rendering/background.js'
import ParallaxRenderer from '@/rendering/ParallaxRenderer.js'
import LEVEL1_PARALLAX from '../../docs/creative/specs/LEVEL1_PARALLAX.json'
import { Explosion, PowerupEffect } from '@/rendering/effects.js'
import { Powerup, PowerupSpawner } from '@/systems/powerups.js'
import {
  createPlayer,
  updatePlayer,
  renderPlayer,
  takeDamagePlayer,
  shootPlayer,
  transformPlayer
} from '@/entities/player.js'
import {
  createEnemy,
  Enemy,
  renderEnemy,
  updateEnemyMovement,
  updateEnemyAI
} from '@/entities/enemies/enemy.js'
import { createBullet, Bullet, renderBullet, updateBullet } from '@/entities/bullet.js'
import { createEventDispatcher } from '@/systems/EventDispatcher.js'
import { createStateManager } from '@/systems/StateManager.js'
import { EffectManager } from '@/systems/EffectManager.js'

// Import story system
import {
  createStoryState,
  updateStoryProgress,
  getStoryContent,
  getBossNarrative
} from '@/systems/story.js'

// Import UI components
import createChapterTransition from '@/ui/ChapterTransition.js'
import createBossDialogue from '@/ui/BossDialogue.js'
import createStoryJournal from '@/ui/StoryJournal.js'

/**
 * Create a new game state object
 * @returns {Object} Game state object
 */
export function createGame() {
  /** @type {HTMLCanvasElement} */
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'))
  const ctx = canvas.getContext('2d')

  const game = {
    canvas,
    ctx,
    width: canvas.width,
    height: canvas.height,

    // Game objects
    player: null,
    enemies: [],
    bullets: [],
    powerups: [],
    effects: [],
    background: null,
    messages: [],

    // Timing
    lastTime: 0,
    deltaTime: 0,
    enemySpawnTimer: 0,
    powerupSpawnTimer: 0,
    fps: 60,
    frameCount: 0,
    fpsTimer: 0,
    animationFrameId: null,

    // Animation frame aliases for easier testing
    requestAnimationFrame: requestAnimationFrame.bind(window),
    cancelAnimationFrame: cancelAnimationFrame.bind(window),

    // Additional properties
    enemiesPerLevel: GAME_CONSTANTS.ENEMIES_PER_LEVEL,
    currentBossType: null, // Track current boss type for narratives
    lastShownTransition: null, // Track last shown transition to prevent duplicates
    frameNumber: 0,

    // Input handling
    keys: {}
  }

  // Initialize systems
  return initializeGameSystems(game)
}

/**
 * Initialize game systems and event-driven architecture
 * @param {Object} game - Game state object
 * @returns {Object} Game state with initialized systems
 */
function initializeGameSystems(game) {
  const systems = {
    eventDispatcher: createEventDispatcher(),
    stateManager: createStateManager(),
    audio: createAudioManager(),
    effectManager: null, // Will be initialized after eventDispatcher
    options: null // Will be initialized after other systems
  }

  // Initialize effect manager with event dispatcher
  systems.effectManager = new EffectManager(systems.eventDispatcher)

  // Create a temporary game object with systems for OptionsMenu
  const gameWithSystems = { ...game, ...systems }

  // Initialize options with dependencies
  systems.options = new OptionsMenu(gameWithSystems, systems.eventDispatcher, systems.stateManager)

  // Initialize UI systems with error handling
  let chapterTransition = null
  let bossDialogue = null
  let storyJournal = null

  try {
    chapterTransition = createChapterTransition(game.canvas, systems.eventDispatcher)
    bossDialogue = createBossDialogue(game.canvas, systems.eventDispatcher)
    storyJournal = createStoryJournal(systems.eventDispatcher, systems.stateManager)
  } catch (err) {
    console.error('UI system initialization failed:', err)
  }

  // Initialize state values
  const initialState = {
    game: {
      paused: false,
      userPaused: false,
      gameOver: false,
      score: 0,
      level: 1,
      enemiesKilled: 0,
      bossActive: false,
      bossSpawnedThisLevel: false,
      bossesDefeated: 0,
      powerupsCollected: 0,
      showFPS: false,
      difficulty: 'normal'
    },
    story: createStoryState()
  }

  // Set initial state
  systems.stateManager.setState('', initialState)

  const finalGameObject = {
    ...game,
    ...systems,
    chapterTransition,
    bossDialogue,
    storyJournal
  }

  // Add game methods with proper context binding
  const gameMethods = {
    // Pause functionality
    pauseGame() {
      finalGameObject.paused = true
      finalGameObject.userPaused = true

      // IMPORTANT: Also update StateManager for consistency with class-based getters
      finalGameObject.stateManager.setState('game.paused', true)
      finalGameObject.stateManager.setState('game.userPaused', true)

      finalGameObject.eventDispatcher.emit(GAME_EVENTS.GAME_PAUSE, {
        timestamp: Date.now()
      })
    },

    resumeGame() {
      // CRITICAL: Check if options menu is open - it takes priority!
      if (finalGameObject.options && finalGameObject.options.isOpen) {
        console.log('Cannot resume game: Options menu is open (priority override)')
        return // Options menu has priority - refuse to resume
      }

      finalGameObject.paused = false
      finalGameObject.userPaused = false

      // IMPORTANT: Also update StateManager for consistency with class-based getters
      finalGameObject.stateManager.setState('game.paused', false)
      finalGameObject.stateManager.setState('game.userPaused', false)

      finalGameObject.eventDispatcher.emit(GAME_EVENTS.GAME_RESUME, {
        timestamp: Date.now()
      })
    },

    // Key handling
    handleKeyDown(e) {
      // Handle options menu input first (with null check)
      if (
        finalGameObject.options &&
        finalGameObject.options.handleInput &&
        finalGameObject.options.handleInput(e.code)
      ) {
        e.preventDefault()
        return
      }

      finalGameObject.keys[e.code] = true

      // Handle special keys
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (!finalGameObject.paused && finalGameObject.player) {
            finalGameObject.player = shootPlayer(finalGameObject.player)
            // Resume audio context on first interaction
            finalGameObject.audio.resume()
          }
          break
        case 'KeyQ':
          if (!finalGameObject.paused && finalGameObject.player) {
            finalGameObject.player = transformPlayer(finalGameObject.player)
          }
          break
        case 'KeyR':
          if (finalGameObject.gameOver) {
            finalGameObject.restart()
          }
          break
        case 'KeyP':
          // Simple pause/unpause toggle
          if (finalGameObject.paused) {
            finalGameObject.resumeGame()
          } else {
            finalGameObject.pauseGame()
          }
          break
        case 'KeyJ':
          // Toggle story journal
          if (finalGameObject.storyJournal.isVisible) {
            finalGameObject.storyJournal.close()
          } else {
            finalGameObject.storyJournal.open()
          }
          break
        case 'Escape':
          // Toggle options menu (pause/unpause game)
          if (finalGameObject.options && finalGameObject.options.isOpen) {
            finalGameObject.options.close()
          } else if (finalGameObject.options) {
            finalGameObject.options.open()
          }
          break
      }
    },

    // State getters/setters with proper getter/setter syntax
    get paused() {
      return finalGameObject.stateManager.getState('game.paused')
    },

    set paused(value) {
      finalGameObject.stateManager.setState('game.paused', value)
    },

    get userPaused() {
      const stateValue = finalGameObject.stateManager.getState('game.userPaused')
      return stateValue !== undefined ? stateValue : false
    },

    set userPaused(value) {
      finalGameObject.stateManager.setState('game.userPaused', value)
    },

    get gameOver() {
      return finalGameObject.stateManager.getState('game.gameOver')
    },

    set gameOver(value) {
      finalGameObject.stateManager.setState('game.gameOver', value)
    }
  }

  // Add methods to final object
  Object.assign(finalGameObject, gameMethods)

  return finalGameObject
}

// Legacy class wrapper for backward compatibility during migration
export class Game {
  // Declare properties that are assigned from createGame() for TypeScript

  /** @type {HTMLCanvasElement} */
  canvas

  /** @type {CanvasRenderingContext2D} */
  ctx

  /** @type {number} */
  width

  /** @type {number} */
  height

  // Game objects

  /** @type {Object|null} */
  player

  /** @type {Array} */
  enemies

  /** @type {Array} */
  bullets

  /** @type {Array} */
  powerups

  /** @type {Array} */
  effects

  /** @type {Background|ParallaxRenderer|null} */
  background

  /** @type {Array} */
  messages

  // Timing

  /** @type {number} */
  lastTime

  /** @type {number} */
  deltaTime

  /** @type {number} */
  enemySpawnTimer

  /** @type {number} */
  powerupSpawnTimer

  /** @type {number} */
  fps

  /** @type {number} */
  frameCount

  /** @type {number} */
  fpsTimer

  /** @type {number|null} */
  animationFrameId

  // Animation frame aliases

  /** @type {Function} */
  requestAnimationFrame

  /** @type {Function} */
  cancelAnimationFrame

  // Additional properties

  /** @type {number} */
  enemiesPerLevel

  /** @type {string|null} */
  currentBossType

  /** @type {string|null} */
  lastShownTransition

  /** @type {number} */
  frameNumber

  // Input handling

  /** @type {Object} */
  keys

  // Systems - assigned from createGame()

  /** @type {EventDispatcher} */
  eventDispatcher

  /** @type {import('@/systems/StateManager.js').StateManager} */
  stateManager

  /** @type {Object} */
  audio

  /** @type {EffectManager} */
  effectManager

  /** @type {OptionsMenu} */
  options

  // UI systems

  /** @type {Object|null} */
  chapterTransition

  /** @type {Object|null} */
  bossDialogue

  /** @type {Object|null} */
  storyJournal

  // Cleanup tracking

  /** @type {Set|undefined} */
  stateSubscriptions

  /** @type {Array|undefined} */
  domEventCleanup

  constructor() {
    // Create the POJO state and assign properties to this
    Object.assign(this, createGame())

    // Complete initialization with class-based methods
    this.setupInput()
    this.initializeGameState()
    this.setupEffects()
    this.init()
  }

  initializeGameState() {
    // Initialize all game state through StateManager
    this.stateManager.setState('game.score', 0)
    this.stateManager.setState('game.gameOver', false)
    this.stateManager.setState('game.paused', false)
    this.stateManager.setState('game.userPaused', false)
    this.stateManager.setState('game.showFPS', false)
    this.stateManager.setState('game.difficulty', 'Normal')
    this.stateManager.setState('game.level', 1)
    this.stateManager.setState('game.enemiesKilled', 0)
    this.stateManager.setState('game.enemiesPerLevel', GAME_CONSTANTS.ENEMIES_PER_LEVEL)
    this.stateManager.setState('game.bossActive', false)
    this.stateManager.setState('game.bossSpawnedThisLevel', false)

    // Store game systems for Entity-State architecture
    this.stateManager.setState('game.eventDispatcher', this.eventDispatcher)
    this.stateManager.setState('game.width', this.width)
    this.stateManager.setState('game.height', this.height)
    this.stateManager.setState('game.player', this.player)

    // Initialize story state
    this.stateManager.setState('story', createStoryState())
    this.stateManager.setState('game.powerupsCollected', 0)
    this.stateManager.setState('game.bossesDefeated', 0)

    // Setup UI event listeners
    this.storyJournal.setupEventListeners()
  }

  // Game state accessors
  // Note: Always fetch from StateManager to ensure consistency and reactive behavior
  // StateManager is internally optimized, caching here would break event-driven patterns
  get score() {
    return this.stateManager.getState('game.score')
  }
  set score(value) {
    this.stateManager.setState('game.score', value)
  }

  get gameOver() {
    return this.stateManager.getState('game.gameOver')
  }
  set gameOver(value) {
    this.stateManager.setState('game.gameOver', value)
  }

  get paused() {
    return this.stateManager.getState('game.paused')
  }
  set paused(value) {
    this.stateManager.setState('game.paused', value)
  }

  get userPaused() {
    const stateValue = this.stateManager.getState('game.userPaused')
    return stateValue !== undefined ? stateValue : false
  }
  set userPaused(value) {
    this.stateManager.setState('game.userPaused', value)
  }

  get level() {
    return this.stateManager.getState('game.level')
  }
  set level(value) {
    this.stateManager.setState('game.level', value)
  }

  get enemiesKilled() {
    return this.stateManager.getState('game.enemiesKilled')
  }
  set enemiesKilled(value) {
    this.stateManager.setState('game.enemiesKilled', value)
  }

  get showFPS() {
    return this.stateManager.getState('game.showFPS')
  }
  set showFPS(value) {
    this.stateManager.setState('game.showFPS', value)
  }

  get difficulty() {
    return this.stateManager.getState('game.difficulty')
  }
  set difficulty(value) {
    this.stateManager.setState('game.difficulty', value)
  }

  get bossActive() {
    return this.stateManager.getState('game.bossActive')
  }
  set bossActive(value) {
    this.stateManager.setState('game.bossActive', value)
  }

  get bossSpawnedThisLevel() {
    return this.stateManager.getState('game.bossSpawnedThisLevel')
  }
  set bossSpawnedThisLevel(value) {
    this.stateManager.setState('game.bossSpawnedThisLevel', value)
  }

  get bossesDefeated() {
    return this.stateManager.getState('game.bossesDefeated')
  }
  set bossesDefeated(value) {
    this.stateManager.setState('game.bossesDefeated', value)
  }

  get powerupsCollected() {
    return this.stateManager.getState('game.powerupsCollected')
  }
  set powerupsCollected(value) {
    this.stateManager.setState('game.powerupsCollected', value)
  }

  setupEffects() {
    // Core game state effects
    this.effectManager.effect(GAME_EVENTS.GAME_START, () => {
      this.stateManager.setState('game.state', 'running')
    })

    this.effectManager.effect(GAME_EVENTS.GAME_PAUSE, () => {
      this.stateManager.setState('game.state', 'paused')
    })

    this.effectManager.effect(GAME_EVENTS.GAME_RESUME, () => {
      this.stateManager.setState('game.state', 'running')
    })

    this.effectManager.effect(GAME_EVENTS.GAME_OVER, data => {
      this.stateManager.setState('game.state', 'gameOver')
      this.stateManager.setState('game.finalScore', data.score)
    })

    // Removed circular UI_SCORE_UPDATE effect that was causing state corruption
    // Score is already managed directly through the score setter

    // Set up state change listeners to emit UI events
    const unsubscribeScore = this.stateManager.subscribe('game.score', (newScore, oldScore) => {
      if (oldScore !== undefined) {
        this.eventDispatcher.emit(GAME_EVENTS.UI_SCORE_UPDATE, {
          score: newScore,
          previousScore: oldScore || 0,
          delta: newScore - (oldScore || 0)
        })
      }
    })

    // Store subscription for cleanup (StateManager subscriptions still need manual cleanup)
    this.stateSubscriptions = new Set()
    this.stateSubscriptions.add(unsubscribeScore)
  }

  init() {
    // Load settings
    this.options.loadSettings()

    // Start EffectManager
    this.effectManager.start()

    // Initialize game objects
    this.player = createPlayer(this, { x: 100, y: this.height / 2 })
    this.background = new Background(this)

    // Optionally swap to spec-driven Level 1 parallax when requested
    if (this.shouldUseLevelParallax()) {
      const dir = this.getParallaxDirection() // 'left' | 'right' | undefined
      const options = {
        baseSpeedPxPerSec: 120,
        viewport: { width: this.width, height: this.height }
      }
      if (dir) options.direction = dir
      this.background = new ParallaxRenderer(LEVEL1_PARALLAX, options)
    }

    // Store global reference for debugging and development tools
    // Expose for debugging (use bracket access for checkJs)
    window['game'] = this

    // Emit game start event
    this.startGame()

    // Start game loop
    this.gameLoop()
  }

  /**
   * Feature toggle to enable spec-driven Level 1 parallax in the game.
   * Enable by adding ?parallax=level1 to the URL.
   */
  shouldUseLevelParallax() {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') return false
    try {
      const params = new URLSearchParams(window.location.search)
      const p = params.get('parallax')
      // Also auto-enable Level 1 parallax when testing Level 1 enemies
      // so that http://localhost:8080/?enemies=level1 shows the spec background
      const enemies = params.get('enemies')
      return p === 'level1' || enemies === 'level1'
    } catch {
      return false
    }
  }

  /**
   * Optionally override scroll direction via URL (?dir=left|right)
   * When absent or invalid, return undefined to allow the spec default to apply.
   */
  getParallaxDirection() {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') return undefined
    try {
      const params = new URLSearchParams(window.location.search)
      const d = params.get('dir')
      if (d === 'left' || d === 'right') return d
      return undefined
    } catch {
      return undefined
    }
  }

  // Event-driven game state methods
  startGame() {
    this.eventDispatcher.emit(GAME_EVENTS.GAME_START, {
      timestamp: Date.now()
    })

    // Display initial story content
    this.displayInitialStory()
  }

  displayInitialStory() {
    const storyState = this.stateManager.getState('story')
    const gameState = {
      level: this.level,
      bossesDefeated: this.bossesDefeated,
      powerupsCollected: this.powerupsCollected
    }

    const content = getStoryContent(gameState, storyState, 'levelStart')
    if (content && content.title) {
      this.initializeStoryTransition(content)

      // Also show fallback message
      this.addMessage('Signal of the Last City', '#ffcc00', 5000)
    }
  }

  /**
   * Handles the delayed chapter transition with error handling.
   * @param {Object} content - Story content for the transition.
   */
  initializeStoryTransition(content) {
    setTimeout(() => {
      try {
        this.showChapterTransition(content)
      } catch (error) {
        console.error('Error showing chapter transition:', error)
        // Ensure game doesn't stay paused if transition fails
        this.resumeGame() // Use safe resume method that respects options menu
      }
    }, 1000) // Small delay for game to initialize
  }

  pauseGame() {
    // Use setter which should call StateManager
    this.paused = true
    this.userPaused = true

    this.eventDispatcher.emit(GAME_EVENTS.GAME_PAUSE, {
      timestamp: Date.now()
    })

    // Also check if options menu should be informed
    if (this.options && this.options.isOpen) {
      // Options menu is already handling the pause state
    }
  }

  resumeGame() {
    // CRITICAL: Check if options menu is open - it takes priority!
    if (this.options && this.options.isOpen) {
      console.log('Cannot resume game: Options menu is open (priority override)')
      return // Options menu has priority - refuse to resume
    }

    // Use setter which should call StateManager
    this.paused = false
    this.userPaused = false

    this.eventDispatcher.emit(GAME_EVENTS.GAME_RESUME, {
      timestamp: Date.now()
    })
  }

  endGame() {
    this.gameOver = true
    this.eventDispatcher.emit(GAME_EVENTS.GAME_OVER, {
      timestamp: Date.now(),
      score: this.score,
      level: this.level
    })
  }

  calculateFPS(deltaTime) {
    this.frameCount++
    this.fpsTimer += deltaTime

    if (this.fpsTimer >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTimer)
      this.frameCount = 0
      this.fpsTimer = 0

      // Emit FPS update event
      this.eventDispatcher.emit(GAME_EVENTS.PERFORMANCE_FPS_UPDATE, {
        fps: this.fps,
        frameTime: deltaTime
      })
    }
  }

  destroy() {
    // Clean up animation frame
    if (this.animationFrameId) {
      this.cancelAnimationFrame(this.animationFrameId)
    }

    // Stop EffectManager
    if (this.effectManager && /** @type {any} */ (this.effectManager).isRunning) {
      this.effectManager.stop()
    }

    // Clean up DOM event listeners
    if (this.domEventCleanup) {
      this.domEventCleanup.forEach(cleanup => cleanup())
    }

    // Clean up state manager subscriptions (EffectManager handles event cleanup)
    if (this.stateSubscriptions) {
      this.stateSubscriptions.forEach(unsubscribe => unsubscribe())
      this.stateSubscriptions.clear()
    }

    // Clean up global reference
    if (window['game'] === this) {
      delete window['game']
    }
  }

  setupInput() {
    // Define event handlers as bound methods for proper cleanup
    this.handleKeyDown = e => {
      // Handle options menu input first (with null check)
      if (this.options && this.options.handleInput && this.options.handleInput(e.code)) {
        e.preventDefault()
        return
      }

      this.keys[e.code] = true

      // Handle special keys
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (!this.paused && this.player) {
            this.player = shootPlayer(this.player)
            // Resume audio context on first interaction
            this.audio.resume()
          }
          break
        case 'KeyQ':
          if (!this.paused && this.player) {
            this.player = transformPlayer(this.player)
          }
          break
        case 'KeyR':
          if (this.gameOver) {
            this.restart()
          }
          break
        case 'KeyP':
          // Simple pause/unpause toggle
          if (this.paused) {
            this.resumeGame()
          } else {
            this.pauseGame()
          }
          break
        case 'KeyJ':
          // Toggle story journal
          if (this.storyJournal.isVisible) {
            this.storyJournal.close()
          } else {
            this.storyJournal.open()
          }
          break
        case 'Escape':
          // Toggle options menu (pause/unpause game)
          if (this.options && this.options.isOpen) {
            this.options.close()
          } else if (this.options) {
            this.options.open()
          }
          break
      }
    }

    this.handleKeyUp = e => {
      this.keys[e.code] = false
    }

    this.handleClick = () => {
      this.audio.resume()
    }

    // Add event listeners and track them for cleanup
    document.addEventListener('keydown', this.handleKeyDown)
    document.addEventListener('keyup', this.handleKeyUp)
    document.addEventListener('click', this.handleClick, { once: true })

    // Store cleanup references for DOM events
    this.domEventCleanup = [
      () =>
        document.removeEventListener && document.removeEventListener('keydown', this.handleKeyDown),
      () => document.removeEventListener && document.removeEventListener('keyup', this.handleKeyUp),
      () => document.removeEventListener && document.removeEventListener('click', this.handleClick)
    ]
  }

  /**
   * Map raw key codes to input object expected by player functions
   * @param {Object} keys - Raw keys object with key codes as properties
   * @returns {Object} Mapped input object
   */
  mapKeysToInput(keys) {
    return {
      left: keys['ArrowLeft'] || keys['KeyA'],
      right: keys['ArrowRight'] || keys['KeyD'],
      up: keys['ArrowUp'] || keys['KeyW'],
      down: keys['ArrowDown'] || keys['KeyS'],
      shoot: keys['Space'],
      transform: keys['KeyQ']
    }
  }

  /**
   * Check if we're running in a test environment
   * Extracted for clarity and to avoid complex conditions in gameLoop
   */
  isTestEnvironment() {
    // Running in Node.js (SSR/headless) without window
    if (typeof window === 'undefined') {
      return true
    }

    // Running in Vitest test environment
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'test' &&
      // Detect vitest safely without type checking complaints
      typeof globalThis !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(globalThis, 'vitest')
    ) {
      return true
    }

    return false
  }

  gameLoop(currentTime = 0) {
    // Don't run game loop if in test environment
    if (this.isTestEnvironment()) {
      return
    }

    this.deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    this.frameNumber++

    // Emit frame event
    this.eventDispatcher.emit(GAME_EVENTS.GAME_FRAME, {
      deltaTime: this.deltaTime,
      currentTime,
      frame: this.frameNumber
    })

    // Emit performance frame time event
    this.eventDispatcher.emit(GAME_EVENTS.PERFORMANCE_FRAME_TIME, {
      deltaTime: this.deltaTime,
      timestamp: currentTime
    })

    // Calculate FPS using the new method
    this.calculateFPS(this.deltaTime)

    // Update UI systems that should work even when paused
    if (this.chapterTransition) {
      this.chapterTransition.update(this.deltaTime)
    }

    if (this.bossDialogue) {
      this.bossDialogue.update(this.deltaTime)
    }

    if (!this.paused && !this.gameOver) {
      this.update(this.deltaTime)
    }

    this.render()
    this.animationFrameId = this.requestAnimationFrame(time => this.gameLoop(time))
  }

  update(deltaTime) {
    // Emit game update event
    this.eventDispatcher.emit(GAME_EVENTS.GAME_UPDATE, {
      deltaTime,
      currentTime: this.lastTime,
      frame: this.frameNumber
    })

    // Update background
    if (this.background && typeof this.background.update === 'function') {
      this.background.update(deltaTime)
    }

    // Update player
    if (this.player) {
      const mappedInput = this.mapKeysToInput(this.keys)
      this.player = updatePlayer(this.player, deltaTime, mappedInput)
    }

    // Spawn enemies and check for level progression
    this.enemySpawnTimer += deltaTime
    const difficultyMultiplier = this.getDifficultyMultiplier()
    const spawnRate = (500 + Math.random() * 1000) / difficultyMultiplier // Reduced from 1000-3000 to 500-1500

    // Check for boss spawn (every BOSS_LEVEL_INTERVAL levels)
    if (
      this.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 &&
      !this.bossActive &&
      this.enemiesKilled === 0 &&
      !this.bossSpawnedThisLevel
    ) {
      this.spawnBoss()
    }
    // Regular enemy spawning
    else if (!this.bossActive && this.enemySpawnTimer > spawnRate) {
      this.spawnEnemy()
      this.enemySpawnTimer = 0
    }

    // Spawn powerups
    this.powerupSpawnTimer += deltaTime
    if (this.powerupSpawnTimer > 5000 + Math.random() * 10000) {
      this.spawnPowerup()
      this.powerupSpawnTimer = 0
    }

    // Update game objects (only if player is initialized)
    if (this.player) {
      // CRITICAL: Check collisions FIRST before Entity-State updates can overwrite manual test data
      this.checkCollisions()

      // Sync bullets from StateManager to game.bullets array (throttled for performance)
      this._bulletSyncTimer = (this._bulletSyncTimer || 0) + deltaTime
      if (this._bulletSyncTimer >= 50) {
        // Sync every 50ms instead of every frame
        this.syncBulletsFromStateManager()
        this._bulletSyncTimer = 0
      }

      this.updateEntities('enemies', this.enemies, deltaTime)
      this.updateEntities('bullets', this.bullets, deltaTime)
      this.updateEntities('powerups', this.powerups, deltaTime)
      this.updateEntities('effects', this.effects, deltaTime)
    }

    if (this.storyJournal) {
      // StoryJournal doesn't need delta time updates but we keep consistency
      // Future animation features might need deltaTime
    }

    // Update messages
    this.updateMessages()

    // Clean up off-screen objects (after collision detection and entity updates)
    this.cleanup()

    // Check for game over condition
    if (this.player && this.player.health <= 0) {
      this.gameOver = true
    }

    // Update UI
    this.updateUI()
  }

  updateArray(array, deltaTime) {
    for (let i = array.length - 1; i >= 0; i--) {
      if (array[i] && typeof array[i].update === 'function') {
        array[i].update(deltaTime)
      }

      if (array[i] && array[i].markedForDeletion) {
        array.splice(i, 1)
      }
    }
  }

  updateEntities(entityType, entities, deltaTime) {
    // Emit entity update event
    this.eventDispatcher.emit(GAME_EVENTS.ENTITY_UPDATE, {
      entityType,
      deltaTime,
      count: entities.length
    })

    // Update entities based on type
    if (entityType === 'bullets') {
      // Update bullets using Entity-State architecture
      for (let i = entities.length - 1; i >= 0; i--) {
        const bullet = entities[i]
        if (bullet && bullet.id) {
          updateBullet(this.stateManager, bullet.id, deltaTime, {
            canvasWidth: this.width,
            canvasHeight: this.height
          })

          // Update the bullet object in the array with latest state
          const updatedState = Bullet.getBulletState(this.stateManager, bullet.id)
          if (updatedState) {
            entities[i] = { id: bullet.id, ...updatedState }
          }

          // Remove if marked for deletion
          if (entities[i].markedForDeletion) {
            // CRITICAL: Remove from StateManager to prevent memory leak
            Bullet.remove(this.stateManager, entities[i].id)
            entities.splice(i, 1)
          }
        }
      }
    } else if (entityType === 'enemies') {
      // Update enemies using pure Entity-State architecture
      const gameContext = {
        player: this.player,
        width: this.width,
        height: this.height,
        eventDispatcher: this.eventDispatcher,
        effectManager: this.effectManager
      }

      for (let i = entities.length - 1; i >= 0; i--) {
        const enemy = entities[i]

        // CRITICAL: Only process enemies with valid IDs through Entity-State system
        // Test enemies without IDs should be left alone to maintain their manual properties
        if (enemy && enemy.id && typeof enemy.id === 'string' && enemy.id.length > 0) {
          // Update enemy movement and AI using Entity-State functions
          updateEnemyMovement(this.stateManager, enemy.id, deltaTime, gameContext)
          updateEnemyAI(this.stateManager, enemy.id, deltaTime, gameContext)

          // Refresh enemy state from StateManager only if enemy exists
          if (Enemy.exists(this.stateManager, enemy.id)) {
            const enemyState = Enemy.getEnemyState(this.stateManager, enemy.id)
            if (enemyState) {
              Object.assign(enemy, enemyState)
            }
          }

          // Remove if marked for deletion
          if (enemy.markedForDeletion) {
            Enemy.remove(this.stateManager, enemy.id)
            entities.splice(i, 1)
          }
        } else if (enemy && enemy.markedForDeletion) {
          // Handle test enemies and enemies without IDs - just remove if marked
          entities.splice(i, 1)
        }
      }
    } else {
      // Use the existing method for powerups and effects
      this.updateArray(entities, deltaTime)
    }
  }

  render() {
    // Emit render event (no deltaTime needed for rendering)
    this.eventDispatcher.emit(GAME_EVENTS.GAME_RENDER, {
      ctx: this.ctx
    })

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Render background
    this.background.render(this.ctx)

    // Render game objects
    if (this.player) {
      renderPlayer(this.player, this.ctx)
    }
    this.enemies.forEach(enemy => renderEnemy(enemy, this.ctx))
    this.bullets.forEach(bullet => renderBullet(this.stateManager, bullet.id, this.ctx))
    this.powerups.forEach(powerup => powerup.render(this.ctx))
    this.effects.forEach(effect => effect.render(this.ctx))

    // Render UI
    this.renderUI()

    // Render messages
    this.renderMessages()

    // Render chapter transition (should be on top)
    if (this.chapterTransition) {
      this.chapterTransition.render()
    }

    // Render boss dialogue (should be on top of everything)
    if (this.bossDialogue) {
      this.bossDialogue.render()
    }

    // Render game over screen
    if (this.gameOver) {
      this.renderGameOver()
    }
  }

  renderUI() {
    // FPS display
    if (this.showFPS) {
      this.ctx.fillStyle = '#ffff00'
      this.ctx.font = '14px Arial'
      this.ctx.fillText(`FPS: ${this.fps}`, 10, 20)
    }

    // Pause overlay for P key pause (not options menu)
    if (this.userPaused && (!this.options || !this.options.isOpen)) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      this.ctx.fillRect(0, 0, this.width, this.height)

      this.ctx.fillStyle = '#ffffff'
      this.ctx.font = '48px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 40)

      this.ctx.font = '24px Arial'
      this.ctx.fillText('Press P to Resume', this.width / 2, this.height / 2 + 20)
      this.ctx.fillText('Press ESC for Options', this.width / 2, this.height / 2 + 50)

      this.ctx.textAlign = 'left'
    }
  }

  renderMessages() {
    this.messages.forEach((message, index) => {
      const y = 100 + index * 30
      this.ctx.fillStyle = message.color || '#ffffff'
      this.ctx.font = '20px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(message.text, this.width / 2, y)
    })
    this.ctx.textAlign = 'left'
  }

  renderGameOver() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.ctx.fillStyle = '#ff0000'
    this.ctx.font = '48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50)

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = '24px Arial'
    this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2)
    this.ctx.fillText('Press R to Restart', this.width / 2, this.height / 2 + 50)

    this.ctx.textAlign = 'left'
  }

  spawnEnemy() {
    // Default enemy set to preserve existing gameplay and tests
    let enemyTypes = ['fighter', 'bomber', 'scout']
    // Optional Level 1 set toggle via URL ?enemies=level1
    if (this.shouldUseLevel1EnemySet()) {
      enemyTypes = [
        'fighter',
        'bomber',
        'scout',
        'drone',
        'drone', // slightly more common
        'turret',
        'seeder'
      ]
    }
    const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)]
    const enemyId = createEnemy(
      this.stateManager,
      this.eventDispatcher,
      this.effectManager,
      this.width + 50,
      Math.random() * (this.height - 100) + 50,
      randomType
    )
    // Convert to compatibility object for Game code
    const enemy = Enemy.getEnemyState(this.stateManager, enemyId)
    if (enemy) {
      enemy['id'] = enemyId // Store ID for StateManager operations
      this.enemies.push(enemy)
    }
  }

  /**
   * Feature toggle to enable Level 1 enemy set.
   * Enable by adding ?enemies=level1 to the URL.
   */
  shouldUseLevel1EnemySet() {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') return false
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('enemies') === 'level1'
    } catch {
      return false
    }
  }

  spawnBoss() {
    // Select boss type based on enemy set configuration
    let selectedBossType

    if (this.shouldUseLevel1EnemySet()) {
      // In Level 1 mode, prefer Relay Warden with fallback to other bosses
      selectedBossType =
        Math.random() < 0.7
          ? 'relay_warden'
          : BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)]
    } else {
      // Default behavior - random boss from all types
      selectedBossType = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)]
    }

    const bossId = createEnemy(
      this.stateManager,
      this.eventDispatcher,
      this.effectManager,
      this.width - 100,
      this.height / 2 - 30,
      selectedBossType
    )
    // Convert to compatibility object for Game code
    const boss = Enemy.getEnemyState(this.stateManager, bossId)
    if (boss) {
      boss['id'] = bossId // Store ID for StateManager operations
      this.enemies.push(boss)
    }
    this.bossActive = true
    this.bossSpawnedThisLevel = true
    this.currentBossType = selectedBossType // Track current boss type

    // Show boss introduction narrative
    this.showBossNarrative(selectedBossType, 'intro')

    this.addMessage(
      BOSS_MESSAGES[selectedBossType],
      '#ff0000',
      GAME_CONSTANTS.MESSAGE_DURATION.BOSS
    )
  }

  spawnPowerup() {
    const type = PowerupSpawner.getWeightedType()
    const powerup = new Powerup(
      this,
      this.width + 50,
      Math.random() * (this.height - 100) + 50,
      type
    )
    this.powerups.push(powerup)
  }

  addMessage(text, color = '#ffffff', duration = GAME_CONSTANTS.MESSAGE_DURATION.INFO) {
    this.messages.push({
      text,
      color,
      duration,
      age: 0
    })

    // Keep only the most recent messages
    if (this.messages.length > GAME_CONSTANTS.MAX_MESSAGES) {
      this.messages.splice(0, this.messages.length - GAME_CONSTANTS.MAX_MESSAGES)
    }
  }

  /**
   * Update story progress based on game events
   */
  updateStoryProgress(progressData) {
    const storyState = this.stateManager.getState('story')
    if (storyState && updateStoryProgress) {
      const oldStoryState = { ...storyState }
      const updatedStoryState = updateStoryProgress(storyState, progressData)
      this.stateManager.setState('story', updatedStoryState)

      // Only show story notifications for significant milestones (not powerups)
      const isSignificantMilestone =
        progressData.level !== undefined || progressData.bossesDefeated !== undefined

      if (isSignificantMilestone) {
        // Check if we actually unlocked new story content
        const oldChapter = oldStoryState.currentChapter
        const newChapter = updatedStoryState.currentChapter

        if (oldChapter !== newChapter) {
          // New chapter unlocked - show notification
          const gameState = {
            level: this.level,
            bossesDefeated: this.bossesDefeated,
            powerupsCollected: this.powerupsCollected
          }

          const content = getStoryContent(gameState, updatedStoryState, 'levelStart')
          if (content && content.title) {
            // Show cinematic chapter transition
            this.showChapterTransition(content)

            // Also emit UI notification as backup
            this.eventDispatcher.emit('UI_STORY_NOTIFICATION', {
              message: content.title,
              description: content.description,
              type: 'story',
              duration: 5000
            })
          }
        }
      }
    }
  }

  /**
   * Get total enemies killed (including across levels)
   * Cached for performance - only recalculates when enemies or level change
   */
  getTotalEnemiesKilled() {
    // Use cached value if available and still valid
    const currentKey = `${this.enemiesKilled}-${this.level}`
    if (this._totalEnemiesCache && this._totalEnemiesCacheKey === currentKey) {
      return this._totalEnemiesCache
    }

    // Calculate and cache result
    const total = this.enemiesKilled + (this.level - 1) * this.enemiesPerLevel
    this._totalEnemiesCache = total
    this._totalEnemiesCacheKey = currentKey

    return total
  }

  /**
   * Show cinematic chapter transition
   * @param {Object} content - Story content with title and description
   */
  showChapterTransition(content) {
    if (this.chapterTransition && !this.chapterTransition.active) {
      // Prevent showing the same transition multiple times
      const contentKey = `${content.title}-${content.description}`
      if (this.lastShownTransition === contentKey) {
        console.log('Skipping duplicate transition:', content.title)
        return
      }

      // Pause game during transition
      const wasPaused = this.paused
      this.paused = true

      try {
        this.lastShownTransition = contentKey
        this.chapterTransition.showTransition(content, () => {
          try {
            // Mark cutscene as viewed when transition completes
            if (content.cutsceneKey) {
              const storyState = this.stateManager.getState('story')
              if (storyState) {
                // Ensure viewedCutscenes is always a Set (handle serialization issues)
                const currentViewed =
                  storyState.viewedCutscenes instanceof Set
                    ? storyState.viewedCutscenes
                    : new Set(
                        Array.isArray(storyState.viewedCutscenes) ? storyState.viewedCutscenes : []
                      )

                const updatedStoryState = {
                  ...storyState,
                  viewedCutscenes: new Set([...currentViewed, content.cutsceneKey])
                }
                this.stateManager.setState('story', updatedStoryState)
              }
            }

            // Resume game after transition if it wasn't paused before
            if (!wasPaused) {
              this.resumeGame() // Use safe resume method that respects options menu
            }
          } catch (error) {
            console.error('Error in chapter transition callback:', error)
            this.resumeGame() // Use safe resume method that respects options menu
          }
        })
      } catch (error) {
        console.error('Error starting chapter transition:', error)
        this.paused = wasPaused // Restore original pause state
        this.lastShownTransition = null // Reset on error
      }
    }
  }

  /**
   * Show boss narrative dialogue
   * @param {string} bossType - Type of boss (e.g., 'relay_warden', 'terraformer')
   * @param {string} event - Narrative event ('intro', 'defeat', 'phaseTransition')
   */
  showBossNarrative(bossType, event) {
    const narrativeText = getBossNarrative(bossType, event)

    if (narrativeText && this.bossDialogue && !this.bossDialogue.active) {
      // Pause game during dialogue for dramatic effect
      const wasPaused = this.paused
      this.paused = true

      const speakerName = this.getBossDisplayName(bossType)

      this.bossDialogue.showDialogue(
        {
          speaker: speakerName,
          text: narrativeText,
          style: this.getBossDialogueStyle(event)
        },
        () => {
          // Resume game after dialogue if it wasn't paused before
          if (!wasPaused) {
            this.resumeGame() // Use safe resume method that respects options menu
          }
        }
      )
    }
  }

  /**
   * Get display name for boss type
   * @param {string} bossType - Boss type identifier
   * @returns {string} - Display name for the boss
   */
  getBossDisplayName(bossType) {
    const bossNames = {
      relay_warden: 'Relay Warden',
      terraformer_prime: 'Terraformer Prime',
      default: 'Unknown Entity'
    }
    return bossNames[bossType] || bossNames.default
  }

  /**
   * Map boss narrative events to dialogue styles
   * @param {string} event - Boss narrative event
   * @returns {string} - Dialogue style
   */
  getBossDialogueStyle(event) {
    const styleMap = {
      preIntro: 'introduction',
      intro: 'introduction',
      phaseTransition: 'taunt',
      defeat: 'victory',
      postDefeat: 'victory'
    }
    return styleMap[event] || 'introduction'
  }

  updateMessages() {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].age += 16 // Approximate deltaTime
      if (this.messages[i].age >= this.messages[i].duration) {
        this.messages.splice(i, 1)
      }
    }
  }

  checkCollisions() {
    // Player bullets vs enemies
    this.bullets.forEach(bullet => {
      if (bullet.owner === 'player') {
        this.enemies.forEach(enemy => {
          // Skip enemies already marked for deletion to prevent double scoring
          if (enemy.markedForDeletion) return

          if (this.checkCollision(bullet, enemy)) {
            bullet.markedForDeletion = true

            // CRITICAL: Ensure enemy has proper health before damage calculation
            if (typeof enemy.health !== 'number') {
              enemy.health = enemy.maxHealth || 20 // Fallback to prevent NaN
            }

            // Apply damage directly to enemy object for immediate test compatibility
            const bulletDamage = bullet.damage || 25 // Use bullet's damage value
            enemy.health = Math.max(0, enemy.health - bulletDamage)

            // Also update Entity-State if enemy has ID
            if (enemy.id) {
              Enemy.setHealth(this.stateManager, enemy.id, enemy.health)
            }

            this.effects.push(new Explosion(this, enemy.x, enemy.y, 'small'))
            playSound(this.audio, 'enemyHit')

            if (enemy.health <= 0) {
              // Mark enemy for deletion IMMEDIATELY to prevent double scoring
              enemy.markedForDeletion = true

              // Get points from enemy object (with fallback)
              const points = enemy.points || Enemy.getPoints(this.stateManager, enemy.id) || 100

              // Update game state properties directly for test compatibility
              this.score += points
              this.enemiesKilled++

              // Also sync to StateManager for Entity-State consistency
              this.stateManager.setState('game.score', this.score)
              this.stateManager.setState('game.enemiesKilled', this.enemiesKilled)

              // Check for level progression
              if (this.enemiesKilled % this.enemiesPerLevel === 0) {
                this.level++
                this.enemiesKilled = 0 // Reset counter for next level
                this.bossSpawnedThisLevel = false // Reset boss spawn flag for new level

                // Sync level progression to StateManager
                this.stateManager.setState('game.level', this.level)
                this.stateManager.setState('game.enemiesKilled', this.enemiesKilled)

                this.addMessage(
                  `LEVEL ${this.level}!`,
                  '#00ff00',
                  GAME_CONSTANTS.MESSAGE_DURATION.LEVEL_UP
                )

                // Update story progress for level progression
                this.updateStoryProgress({
                  level: this.level,
                  enemiesKilled: this.enemiesKilled
                })
              }

              if (this.isBoss(enemy)) {
                this.bossActive = false
                this.bossesDefeated++
                this.score += GAME_CONSTANTS.BOSS_BONUS_SCORE

                // Sync boss state to StateManager
                this.stateManager.setState('game.bossActive', false)
                this.stateManager.setState('game.bossesDefeated', this.bossesDefeated)
                this.stateManager.setState('game.score', this.score)

                // TODO: Implement functional health restoration
                // this.player.health = Math.min(
                //   /** @type {any} */ (this.player).maxHealth,
                //   this.player.health + GAME_CONSTANTS.BOSS_HEALTH_RESTORE
                // )

                // Show boss defeat narrative
                const bossType = this.currentBossType || 'relay_warden' // Fallback
                this.showBossNarrative(bossType, 'defeat')
                this.currentBossType = null // Clear boss type

                // Update story progress for boss defeat
                this.updateStoryProgress({
                  bossesDefeated: this.bossesDefeated,
                  level: this.level
                })
              }

              this.effects.push(new Explosion(this, enemy.x, enemy.y, 'medium'))
              playSound(this.audio, 'explosion')
            }
          }
        })
      }
    })

    // Enemy bullets vs player
    this.bullets.forEach(bullet => {
      if (bullet.owner === 'enemy') {
        if (this.checkCollision(bullet, this.player)) {
          bullet.markedForDeletion = true
          this.player = takeDamagePlayer(this.player, bullet.damage || 25)
          this.effects.push(new Explosion(this, this.player.x, this.player.y, 'small'))
          playSound(this.audio, 'playerHit')
        }
      }
    })

    // Player vs powerups
    this.powerups.forEach(powerup => {
      if (this.checkCollision(this.player, powerup)) {
        // this.player.collectPowerup(powerup) // TODO: Implement functional powerup collection
        this.powerupsCollected++
        this.effects.push(new PowerupEffect(this, powerup.x, powerup.y, powerup.color))
        playSound(this.audio, 'powerup')
        powerup.markedForDeletion = true

        // Update story progress for powerup collection
        this.updateStoryProgress({
          powerupsCollected: this.powerupsCollected
        })
      }
    })

    // Player vs enemies
    this.enemies.forEach(enemy => {
      if (this.checkCollision(this.player, enemy)) {
        this.player = takeDamagePlayer(this.player, 50)

        // CRITICAL: Apply damage to enemy object directly for test compatibility
        if (typeof enemy.health !== 'number' || isNaN(enemy.health)) {
          enemy.health = enemy.maxHealth || 20 // Fallback to prevent NaN
        }

        // Damage the enemy in collision (test expects enemy to take 50 damage, dies at 50 health)
        const collisionDamage = 50 // Collision damage from test expectation
        enemy.health = Math.max(0, enemy.health - collisionDamage)

        // Also update Entity-State if enemy has ID
        if (enemy.id) {
          Enemy.setHealth(this.stateManager, enemy.id, enemy.health)
          // Only apply Entity-State damage for enemies with valid IDs
          // (Manual damage already applied above for test compatibility)
        }

        this.effects.push(
          new Explosion(
            this,
            (this.player.x + enemy.x) / 2,
            (this.player.y + enemy.y) / 2,
            'medium'
          )
        )
        playSound(this.audio, 'explosion')
      }
    })
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }

  /**
   * Synchronize bullets from StateManager to game.bullets array
   * This ensures bullets created by enemies via StateManager appear in the game
   * Optimized to minimize per-frame overhead
   */
  syncBulletsFromStateManager() {
    const bulletsState = this.stateManager.getState('bullets')
    if (!bulletsState) return

    const stateManagerBulletIds = Object.keys(bulletsState)

    // Quick check: if counts match, likely no changes needed
    const currentBulletCount = this.bullets.filter(b => b.id).length
    if (currentBulletCount === stateManagerBulletIds.length) {
      return // Skip expensive sync if counts match
    }

    // Get current bullets array IDs for comparison
    const currentBulletIds = new Set(this.bullets.map(bullet => bullet.id).filter(id => id))

    // Add new bullets from StateManager that aren't in bullets array
    for (const bulletId of stateManagerBulletIds) {
      if (!currentBulletIds.has(bulletId)) {
        const bulletState = Bullet.getBulletState(this.stateManager, bulletId)
        if (bulletState) {
          // Add compatible bullet object to array
          this.bullets.push({
            id: bulletId,
            ...bulletState
          })
        }
      }
    }

    // Remove bullets from array that no longer exist in StateManager
    const stateManagerBulletIdSet = new Set(stateManagerBulletIds)
    this.bullets = this.bullets.filter(bullet => {
      return !bullet.id || stateManagerBulletIdSet.has(bullet.id)
    })
  }

  cleanup() {
    // CRITICAL: Clean up arrays by removing marked entities first
    // This ensures test compatibility with markedForDeletion pattern

    // Remove marked bullets
    this.bullets = this.bullets.filter(bullet => !bullet.markedForDeletion)

    // Remove marked enemies
    this.enemies = this.enemies.filter(enemy => !enemy.markedForDeletion)

    // Remove off-screen enemies (additional cleanup)
    this.enemies = this.enemies.filter(enemy => enemy.x > -100)

    // Clean up StateManager for entities that may have been orphaned
    // This ensures consistency between arrays and StateManager

    // Clean up orphaned bullets in StateManager
    const bulletIds = Bullet.getAllBulletIds(this.stateManager)
    const validBulletIds = new Set(this.bullets.map(b => b.id).filter(id => id))

    bulletIds.forEach(bulletId => {
      if (!validBulletIds.has(bulletId)) {
        // Remove orphaned bullet from StateManager
        Bullet.remove(this.stateManager, bulletId)
      }
    })

    // Clean up orphaned enemies in StateManager
    const enemyIds = Enemy.getAllEnemyIds(this.stateManager)
    const validEnemyIds = new Set(this.enemies.map(e => e.id).filter(id => id))

    enemyIds.forEach(enemyId => {
      if (!validEnemyIds.has(enemyId)) {
        // Remove orphaned enemy from StateManager
        Enemy.remove(this.stateManager, enemyId)
      }
    })

    // Clean up arrays (keep existing powerup cleanup for compatibility)
    this.powerups = this.powerups.filter(
      powerup => !powerup.markedForDeletion && powerup.x > -100 && powerup.x < this.width + 100
    )
  }

  /**
   * Debug method to monitor StateManager memory usage
   * Call this from console: game.debugStateManager()
   */
  debugStateManager() {
    const bullets = this.stateManager.getState('bullets') || {}
    const enemies = this.stateManager.getState('enemies') || {}

    console.log('=== StateManager Memory Debug ===')
    console.log(`Bullets in StateManager: ${Object.keys(bullets).length}`)
    console.log(`Bullets in array: ${this.bullets.length}`)
    console.log(`Enemies in StateManager: ${Object.keys(enemies).length}`)
    console.log(`Enemies in array: ${this.enemies.length}`)

    // Show any orphaned entities
    const bulletIds = Object.keys(bullets)
    const validBulletIds = this.bullets.map(b => b.id).filter(id => id)
    const orphanedBullets = bulletIds.filter(id => !validBulletIds.includes(id))

    const enemyIds = Object.keys(enemies)
    const validEnemyIds = this.enemies.map(e => e.id).filter(id => id)
    const orphanedEnemies = enemyIds.filter(id => !validEnemyIds.includes(id))

    if (orphanedBullets.length > 0) {
      console.warn('Orphaned bullets in StateManager:', orphanedBullets)
    }

    if (orphanedEnemies.length > 0) {
      console.warn('Orphaned enemies in StateManager:', orphanedEnemies)
    }

    return {
      bullets: { stateManager: bulletIds.length, array: this.bullets.length },
      enemies: { stateManager: enemyIds.length, array: this.enemies.length },
      orphanedBullets: orphanedBullets.length,
      orphanedEnemies: orphanedEnemies.length
    }
  }

  updateUI() {
    // Update HTML UI elements safely
    const scoreEl = document.getElementById('score')
    if (scoreEl) scoreEl.textContent = this.score

    /** @type {HTMLElement|null} */
    const healthEl = document.getElementById('health')
    if (healthEl) healthEl.textContent = String(this.player ? this.player.health : 100)

    const modeEl = document.getElementById('mode')
    if (modeEl)
      modeEl.textContent =
        this.player && this.player.mode ? this.player.mode.toUpperCase() : 'UNKNOWN'

    const levelEl = document.getElementById('level')
    if (levelEl) levelEl.textContent = this.level
  }

  getDifficultyMultiplier() {
    switch (this.difficulty) {
      case 'Easy':
        return 0.5
      case 'Normal':
        return 1.0
      case 'Hard':
        return 1.5
      case 'Extreme':
        return 2.0
      default:
        return 1.0
    }
  }

  restart() {
    // Emit restart event
    this.eventDispatcher.emit(GAME_EVENTS.GAME_RESTART, {
      timestamp: Date.now()
    })

    // Reset game state
    this._bulletSyncTimer = 0

    this.score = 0
    this.gameOver = false
    this.level = 1
    this.enemiesKilled = 0
    this.bossActive = false
    this.bossSpawnedThisLevel = false

    this.enemies = []
    this.bullets = []
    this.powerups = []
    this.effects = []
    this.messages = []

    // Reset spawn timers to prevent immediate spawns after restart
    this.enemySpawnTimer = 0
    this.powerupSpawnTimer = 0
    this.lastTime = 0

    // Reset FPS counter variables but keep current fps value
    this.fpsTimer = 0
    this.frameCount = 0

    this.player = createPlayer(this, { x: 100, y: this.height / 2 })
  }

  addBullet(bullet) {
    this.bullets.push(bullet)
  }

  addEffect(effect) {
    this.effects.push(effect)
  }

  stop() {
    if (this.animationFrameId) {
      this.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  isBoss(enemy) {
    return BOSS_TYPES.includes(enemy.type)
  }
}

// Default export
export default Game
