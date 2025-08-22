/**
 * Main Game Class - ES Module Version
 * Core game engine handling game loop, state management, and coordination
 */

import { GAME_CONSTANTS } from '@/constants/game-constants.js'
import { GAME_EVENTS } from '@/constants/game-events.js'
import { BOSS_TYPES, BOSS_MESSAGES } from '@/constants/boss-constants.js'
import { AudioManager } from '@/systems/audio.js'
import { OptionsMenu } from '@/ui/options.js'
import { Background } from '@/rendering/background.js'
import ParallaxRenderer from '@/rendering/ParallaxRenderer.js'
import LEVEL1_PARALLAX from '../../docs/creative/specs/LEVEL1_PARALLAX.json'
import { Explosion, PowerupEffect } from '@/rendering/effects.js'
import { Powerup, PowerupSpawner } from '@/systems/powerups.js'
import Player from '@/entities/player.js'
import Enemy from '@/entities/enemies/enemy.js'
import { EventDispatcher } from '@/systems/EventDispatcher.js'
import { stateManager } from '@/systems/StateManager.js'
import { EffectManager } from '@/systems/EffectManager.js'

// Import story system
import {
  createStoryState,
  updateStoryProgress,
  getStoryContent,
  getBossNarrative
} from '@/systems/story.js'

// Import UI components
import ChapterTransition from '@/ui/ChapterTransition.js'
import BossDialogue from '@/ui/BossDialogue.js'
import StoryJournal from '@/ui/StoryJournal.js'

export class Game {
  constructor() {
    /** @type {HTMLCanvasElement} */
    this.canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'))
    this.ctx = this.canvas.getContext('2d')
    this.width = this.canvas.width
    this.height = this.canvas.height

    // Game objects
    this.player = null
    this.enemies = []
    this.bullets = []
    this.powerups = []
    this.effects = []
    this.background = null
    this.messages = []

    // Timing
    this.lastTime = 0
    this.deltaTime = 0
    this.enemySpawnTimer = 0
    this.powerupSpawnTimer = 0
    this.fps = 60
    this.frameCount = 0
    this.fpsTimer = 0
    this.animationFrameId = null

    // Animation frame aliases for easier testing
    this.requestAnimationFrame = requestAnimationFrame.bind(window)
    this.cancelAnimationFrame = cancelAnimationFrame.bind(window)

    // Systems
    this.eventDispatcher = new EventDispatcher()
    this.stateManager = stateManager
    this.audio = new AudioManager()
    this.effectManager = new EffectManager(this.eventDispatcher)
    this.options = new OptionsMenu(this, this.eventDispatcher, this.stateManager)

    // Initialize UI systems
    this.chapterTransition = new ChapterTransition(this.canvas, this.eventDispatcher)
    this.bossDialogue = new BossDialogue(this.canvas, this.eventDispatcher)
    this.storyJournal = new StoryJournal(stateManager)

    // Additional properties that need to be available
    this.enemiesPerLevel = GAME_CONSTANTS.ENEMIES_PER_LEVEL
    this.currentBossType = null // Track current boss type for narratives

    // Frame counter for events
    this.frameNumber = 0

    // Input handling
    this.keys = {}
    this.setupInput()

    // Initialize pure event-driven architecture after StateManager is ready
    this.initializeGameState()

    // Setup effects-based event handling
    this.setupEffects()

    this.init()
  }

  initializeGameState() {
    // Initialize all game state through StateManager
    this.stateManager.setState('game.score', 0)
    this.stateManager.setState('game.gameOver', false)
    this.stateManager.setState('game.paused', false)
    this.stateManager.setState('game.showFPS', false)
    this.stateManager.setState('game.difficulty', 'Normal')
    this.stateManager.setState('game.level', 1)
    this.stateManager.setState('game.enemiesKilled', 0)
    this.stateManager.setState('game.enemiesPerLevel', GAME_CONSTANTS.ENEMIES_PER_LEVEL)
    this.stateManager.setState('game.bossActive', false)
    this.stateManager.setState('game.bossSpawnedThisLevel', false)

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

    this.effectManager.effect(GAME_EVENTS.UI_SCORE_UPDATE, data => {
      this.stateManager.setState('game.score', data.score)
    })

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
    this.player = new Player(this, 100, this.height / 2)
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
      // Show cinematic prologue transition with delay
      setTimeout(() => {
        this.showChapterTransition(content)
      }, 1000) // Small delay for game to initialize

      // Also show fallback message
      this.addMessage('Signal of the Last City', '#ffcc00', 5000)
    }
  }

  pauseGame() {
    this.paused = true
    this.eventDispatcher.emit(GAME_EVENTS.GAME_PAUSE, {
      timestamp: Date.now()
    })
  }

  resumeGame() {
    this.paused = false
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
    if (this.effectManager && this.effectManager.isRunning) {
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
      // Handle options menu input first
      if (this.options.handleInput(e.code)) {
        e.preventDefault()
        return
      }

      this.keys[e.code] = true

      // Handle special keys
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (!this.paused && this.player) {
            this.player.shoot()
            // Resume audio context on first interaction
            this.audio.resume()
          }
          break
        case 'KeyQ':
          if (!this.paused && this.player) {
            this.player.transform()
          }
          break
        case 'KeyR':
          if (this.gameOver) {
            this.restart()
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
          if (!this.options.isOpen) {
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

    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    this.frameNumber++

    // Emit frame event
    this.eventDispatcher.emit(GAME_EVENTS.GAME_FRAME, {
      deltaTime,
      currentTime,
      frame: this.frameNumber
    })

    // Emit performance frame time event
    this.eventDispatcher.emit(GAME_EVENTS.PERFORMANCE_FRAME_TIME, {
      deltaTime,
      timestamp: currentTime
    })

    // Calculate FPS using the new method
    this.calculateFPS(deltaTime)

    if (!this.paused && !this.gameOver) {
      this.update(deltaTime)
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
    if (this.player && typeof this.player.update === 'function') {
      this.player.update(deltaTime, this.keys)
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

    // Update game objects
    this.updateEntities('enemies', this.enemies, deltaTime)
    this.updateEntities('bullets', this.bullets, deltaTime)
    this.updateEntities('powerups', this.powerups, deltaTime)
    this.updateEntities('effects', this.effects, deltaTime)

    // Update UI systems
    if (this.chapterTransition) {
      this.chapterTransition.update(deltaTime)
    }

    if (this.bossDialogue) {
      this.bossDialogue.update(deltaTime)
    }

    if (this.storyJournal) {
      // StoryJournal doesn't need delta time updates but we keep consistency
      // Future animation features might need deltaTime
    }

    // Update messages
    this.updateMessages()

    // Check collisions
    this.checkCollisions()

    // Clean up off-screen objects
    this.cleanup()

    // Check for game over condition
    if (this.player.health <= 0) {
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

    // Update entities using the existing method
    this.updateArray(entities, deltaTime)
  }

  render() {
    // Emit render event
    this.eventDispatcher.emit(GAME_EVENTS.GAME_RENDER, {
      ctx: this.ctx,
      deltaTime: this.lastTime
    })

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Render background
    this.background.render(this.ctx)

    // Render game objects
    this.player.render(this.ctx)
    this.enemies.forEach(enemy => enemy.render(this.ctx))
    this.bullets.forEach(bullet => bullet.render(this.ctx))
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
    const enemy = new Enemy(
      this,
      this.width + 50,
      Math.random() * (this.height - 100) + 50,
      randomType
    )
    this.enemies.push(enemy)
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

    const boss = new Enemy(this, this.width - 100, this.height / 2 - 30, selectedBossType)
    this.enemies.push(boss)
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
   */
  getTotalEnemiesKilled() {
    // For now, return current enemies killed
    // In future, this could track cumulative across all levels
    return this.enemiesKilled + (this.level - 1) * this.enemiesPerLevel
  }

  /**
   * Show cinematic chapter transition
   * @param {Object} content - Story content with title and description
   */
  showChapterTransition(content) {
    if (this.chapterTransition && !this.chapterTransition.active) {
      // Pause game during transition
      const wasPaused = this.paused
      this.paused = true

      this.chapterTransition.showTransition(content, () => {
        // Resume game after transition if it wasn't paused before
        if (!wasPaused) {
          this.paused = false
        }
      })
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
            this.paused = false
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
          if (this.checkCollision(bullet, enemy)) {
            bullet.markedForDeletion = true
            enemy.takeDamage(bullet.damage || 25)
            this.effects.push(new Explosion(this, enemy.x, enemy.y, 'small'))
            this.audio.playSound('enemyHit')

            if (enemy.health <= 0) {
              this.score += enemy.points || 100
              this.enemiesKilled++

              // Check for level progression
              if (this.enemiesKilled % this.enemiesPerLevel === 0) {
                this.level++
                this.enemiesKilled = 0 // Reset counter for next level
                this.bossSpawnedThisLevel = false // Reset boss spawn flag for new level
                this.addMessage(
                  `LEVEL ${this.level}!`,
                  '#00ff00',
                  GAME_CONSTANTS.MESSAGE_DURATION.LEVEL_UP
                )

                // Update story progress for level progression
                this.updateStoryProgress({
                  level: this.level,
                  enemiesKilled: this.getTotalEnemiesKilled()
                })
              }

              if (this.isBoss(enemy)) {
                this.bossActive = false
                this.bossesDefeated++
                this.score += GAME_CONSTANTS.BOSS_BONUS_SCORE
                this.player.health = Math.min(
                  this.player.maxHealth,
                  this.player.health + GAME_CONSTANTS.BOSS_HEALTH_RESTORE
                )

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
              this.audio.playSound('explosion')
              enemy.markedForDeletion = true
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
          this.player.takeDamage(bullet.damage || 25)
          this.effects.push(new Explosion(this, this.player.x, this.player.y, 'small'))
          this.audio.playSound('playerHit')
        }
      }
    })

    // Player vs powerups
    this.powerups.forEach(powerup => {
      if (this.checkCollision(this.player, powerup)) {
        this.player.collectPowerup(powerup)
        this.powerupsCollected++
        this.effects.push(new PowerupEffect(this, powerup.x, powerup.y, powerup.color))
        this.audio.playSound('powerup')
        powerup.markedForDeletion = true

        // Update story progress for powerup collection
        this.updateStoryProgress({
          powerupsCollected: this.powerupsCollected,
          level: this.level
        })
      }
    })

    // Player vs enemies
    this.enemies.forEach(enemy => {
      if (this.checkCollision(this.player, enemy)) {
        this.player.takeDamage(50)
        enemy.takeDamage(50)
        this.effects.push(
          new Explosion(
            this,
            (this.player.x + enemy.x) / 2,
            (this.player.y + enemy.y) / 2,
            'medium'
          )
        )
        this.audio.playSound('explosion')
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

  cleanup() {
    // Remove off-screen objects and marked for deletion
    this.bullets = this.bullets.filter(
      bullet =>
        !bullet.markedForDeletion &&
        bullet.x > -50 &&
        bullet.x < this.width + 50 &&
        bullet.y > -50 &&
        bullet.y < this.height + 50
    )

    this.enemies = this.enemies.filter(
      enemy => !enemy.markedForDeletion && enemy.x > -100 && enemy.x < this.width + 100
    )

    this.powerups = this.powerups.filter(
      powerup => !powerup.markedForDeletion && powerup.x > -100 && powerup.x < this.width + 100
    )
  }

  updateUI() {
    // Update HTML UI elements
    document.getElementById('score').textContent = this.score

    /** @type {HTMLElement|null} */
    const healthEl = document.getElementById('health')
    if (healthEl) healthEl.textContent = String(this.player.health)
    document.getElementById('mode').textContent = this.player.mode
      ? this.player.mode.toUpperCase()
      : 'UNKNOWN'
    document.getElementById('level').textContent = this.level
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

    this.player = new Player(this, 100, this.height / 2)
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
