/**
 * Game Test Utilities
 *
 * This module provides reusable test utilities for testing game components.
 * It centralizes common mocking functionality to eliminate code duplication
 * across test files, particularly for Canvas API and DOM element mocking.
 */

import { vi } from 'vitest'
import { Game } from '@/game/game.js'
import { EventDispatcher } from '@/systems/EventDispatcher.js'
import { createStateManager } from '@/systems/StateManager.js'
import { EffectManager } from '@/systems/EffectManager.js'
import { createMockCanvas, createMockCanvasContext } from '@test/mocks/canvas-mock.js'

// Re-export canvas utilities for convenience
export { createMockCanvas, createMockCanvasContext }

/**
 * Create a mock game instance with minimal dependencies
 * @param {Object} options - Optional configuration
 * @returns {Game} Mock game instance
 */
export function createMockGame(options = {}) {
  // Mock document.getElementById to return a mock canvas
  const mockCanvas = createMockCanvas()

  // Store original globals to restore later
  const originalDocument = global.document
  const originalWindow = global.window
  const originalProcess = global.process

  // Create mock elements for OptionsMenu
  const mockElement = {
    style: {},
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn()
    },
    innerHTML: ''
  }

  global.document = {
    getElementById: vi.fn(id => {
      if (id === 'gameCanvas') {
        return mockCanvas
      }
      // Return mock element for any other ID
      return mockElement
    }),
    createElement: vi.fn(() => ({
      style: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn()
      },
      innerHTML: ''
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  }

  // Mock window for requestAnimationFrame
  global.window = {
    requestAnimationFrame: vi.fn(cb => setTimeout(cb, 16)),
    cancelAnimationFrame: vi.fn()
  }

  // Mock process.env for test detection
  global.process = {
    ...originalProcess,
    env: {
      ...originalProcess?.env,
      NODE_ENV: 'test'
    }
  }

  // Create game instance
  const game = new Game(options)

  // Return cleanup function along with game
  const cleanup = () => {
    if (game.destroy) {
      game.destroy()
    }
    // Restore original globals to prevent test pollution
    global.document = originalDocument
    global.window = originalWindow
    global.process = originalProcess
    vi.clearAllMocks()
  }

  return { game, cleanup }
}

/**
 * Create a standardized mock game object for entity testing
 *
 * @param {Object} options - Configuration options
 * @param {Object} [options.eventDispatcher] - Custom event dispatcher to use
 * @param {Object} [options.stateManager] - Custom state manager to use
 * @param {boolean} [options.includeEffectManager=true] - Whether to include an EffectManager
 * @param {boolean} [options.startEffectManager=true] - Whether to start the EffectManager
 * @param {EffectManager} [options.effectManager] - Custom EffectManager to use
 * @returns {Object} Standardized mock game object
 *
 * @example
 * // Create a basic mock game object with default settings
 * const mockGame = createMockGameObject();
 *
 * @example
 * // Create a mock game object with a custom event dispatcher
 * const customEventDispatcher = {
 *   emit: vi.fn(),
 *   on: vi.fn(),
 *   off: vi.fn(),
 *   getEventNames: vi.fn(() => ['event1', 'event2']),
 *   getTotalListenerCount: vi.fn(() => 2)
 * };
 * const mockGame = createMockGameObject({ eventDispatcher: customEventDispatcher });
 *
 * @example
 * // Create a mock game object without an EffectManager
 * const mockGame = createMockGameObject({ includeEffectManager: false });
 */
export function createMockGameObject(options = {}) {
  const mockEventDispatcher = options.eventDispatcher || {
    emit: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    off: vi.fn(),
    getEventNames: vi.fn(() => []),
    getTotalListenerCount: vi.fn(() => 0)
  }

  const mockStateManager = options.stateManager || createStateManager()

  const mockGame = {
    width: options.width || 800,
    height: options.height || 600,
    ctx: options.ctx || createMockCanvasContext(),
    canvas: options.canvas || createMockCanvas(),
    keys: options.keys || {},
    bullets: options.bullets || [],
    effects: options.effects || [],
    enemies: options.enemies || [],
    powerups: options.powerups || [],
    audio: options.audio || {
      playSound: vi.fn(),
      setMasterVolume: vi.fn(),
      setSfxVolume: vi.fn(),
      setMusicVolume: vi.fn(),
      setEnabled: vi.fn(),
      masterVolume: 0.8,
      sfxVolume: 0.7,
      musicVolume: 0.6,
      enabled: true
    },
    delta: options.delta || 16,
    addBullet: options.addBullet || vi.fn(),
    addEffect: options.addEffect || vi.fn(),
    addEnemy: options.addEnemy || vi.fn(),
    addPowerup: options.addPowerup || vi.fn(),
    eventDispatcher: mockEventDispatcher,
    stateManager: mockStateManager,
    ...options.customProperties
  }

  // Add EffectManager if requested or not explicitly disabled
  if (options.includeEffectManager !== false) {
    mockGame.effectManager = options.effectManager || new EffectManager(mockEventDispatcher)
    if (options.startEffectManager !== false) {
      mockGame.effectManager.start()
    }
  }

  return mockGame
}

/**
 * Create lightweight mock event systems for testing
 * @param {Object} options - Configuration options
 * @returns {Object} Event system mocks
 */
export function createMockEventSystems(options = {}) {
  const mockEventDispatcher = {
    emit: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    off: vi.fn(),
    getEventNames: vi.fn(() => []),
    getTotalListenerCount: vi.fn(() => 0),
    ...options.eventDispatcherOverrides
  }

  const mockStateManager = createStateManager()

  const mockEffectManager =
    options.includeEffectManager !== false
      ? {
          isRunning: false,
          effects: new Map(),
          start: vi.fn(),
          stop: vi.fn(),
          register: vi.fn(),
          effect: vi.fn((pattern, handler) => {
            // Make functional mock - store the handler and wire it to the event dispatcher
            if (!mockEventDispatcher._effectHandlers) {
              mockEventDispatcher._effectHandlers = new Map()

              // Override emit only once to avoid infinite recursion
              const originalEmit = mockEventDispatcher.emit
              mockEventDispatcher.emit = vi.fn((eventName, data) => {
                // Call original emit spy
                if (originalEmit) {
                  originalEmit.call(mockEventDispatcher, eventName, data)
                }

                // Trigger matching effects synchronously and safely
                const handlers = mockEventDispatcher._effectHandlers.get(eventName) || []
                handlers.forEach(effectHandler => {
                  try {
                    effectHandler(data)
                  } catch (error) {
                    // Silently handle effect errors to prevent test pollution
                  }
                })
              })
            }

            // For simple string patterns, wire directly to event dispatcher
            if (typeof pattern === 'string') {
              const currentHandlers = mockEventDispatcher._effectHandlers.get(pattern) || []
              currentHandlers.push(handler)
              mockEventDispatcher._effectHandlers.set(pattern, currentHandlers)
            }
          }),
          initializeEntityState: vi.fn(config => {
            // Mock the functionality to call setState for testing
            const { stateManager, initialState } = config
            if (stateManager && initialState) {
              Object.entries(initialState).forEach(([key, value]) => {
                stateManager.setState(key, value)
              })
            }
          }),
          ...options.effectManagerOverrides
        }
      : null

  return {
    eventDispatcher: mockEventDispatcher,
    stateManager: mockStateManager,
    effectManager: mockEffectManager
  }
}

/**
 * Create a spy on event dispatcher emissions
 * @param {Object} eventDispatcher - Event dispatcher instance
 * @returns {Object} Spy object
 */
export function createEventSpy(eventDispatcher) {
  return vi.spyOn(eventDispatcher, 'emit')
}

/**
 * Create a mock entity for testing
 * @param {Object} options - Entity options
 * @returns {Object} Mock entity
 */
export function createMockEntity(options = {}) {
  return {
    x: options.x || 0,
    y: options.y || 0,
    width: options.width || 32,
    height: options.height || 32,
    update: vi.fn(),
    render: vi.fn(),
    markedForDeletion: options.markedForDeletion || false,
    ...options
  }
}

/**
 * Wait for next animation frame in tests
 * @returns {Promise} Promise that resolves after next frame
 */
export function waitForNextFrame() {
  return new Promise(resolve => {
    global.requestAnimationFrame(resolve)
  })
}

/**
 * Set up test environment for specific game feature
 * @param {string} feature - Feature name
 * @param {Object} options - Configuration options
 * @returns {Object} Test setup object
 */
export function setupGameTest(feature, options = {}) {
  const setup = {
    feature,
    mocks: new Map(),
    cleanup: []
  }

  // Create standardized mock systems if requested
  if (options.mockGame) {
    const mockGame = createMockGameObject(options.mockGame)
    setup.mocks.set('game', mockGame)

    // Add EffectManager cleanup if present
    if (mockGame.effectManager && mockGame.effectManager.stop) {
      setup.cleanup.push(() => {
        if (mockGame.effectManager.isRunning) {
          mockGame.effectManager.stop()
        }
      })
    }
  }

  if (options.mockEventSystems) {
    const eventSystems = createMockEventSystems(options.mockEventSystems)
    setup.mocks.set('eventSystems', eventSystems)
  }

  // Add common cleanup
  setup.cleanup.push(() => {
    vi.clearAllMocks()
  })

  return setup
}

/**
 * Create standardized beforeEach/afterEach setup for entity tests
 * @param {Object} options - Configuration options
 * @returns {Object} Setup functions and references
 */
export function createEntityTestSetup(options = {}) {
  let mockGame
  let entity
  let cleanup = []

  const beforeEach = () => {
    mockGame = createMockGameObject({
      includeEffectManager: options.includeEffectManager !== false,
      startEffectManager: options.startEffectManager !== false,
      ...options.mockGameOptions
    })

    if (options.createEntity) {
      entity = options.createEntity(mockGame)
    }

    // Store cleanup for EffectManager
    if (mockGame.effectManager && typeof mockGame.effectManager.stop === 'function') {
      cleanup.push(() => {
        if (mockGame.effectManager.isRunning) {
          mockGame.effectManager.stop()
        }
      })
    }
  }

  const afterEach = () => {
    // Run all cleanup functions
    cleanup.forEach(cleanupFn => {
      try {
        cleanupFn()
      } catch (error) {
        console.warn('Cleanup error:', error)
      }
    })
    cleanup = []
    vi.clearAllMocks()
  }

  const getters = {
    get mockGame() {
      return mockGame
    },
    get entity() {
      return entity
    },
    set entity(value) {
      entity = value
    }
  }

  return {
    beforeEach,
    afterEach,
    ...getters
  }
}

/**
 * Create standardized test utilities for OptionsMenu testing
 * @param {Object} options - Configuration options
 * @returns {Object} OptionsMenu test utilities
 */
export function createOptionsMenuTestSetup(options = {}) {
  let optionsMenu
  let mockGame
  let mockEventSystems

  const beforeEach = () => {
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    }

    // Create event systems with lightweight mocks
    mockEventSystems = createMockEventSystems({
      includeEffectManager: false, // Use lightweight mock for options menu
      eventDispatcherOverrides: options.eventDispatcherOverrides,
      stateManagerOverrides: options.stateManagerOverrides
    })

    // Create mock game with minimal EffectManager mock
    mockGame = {
      audio: {
        masterVolume: 0.8,
        sfxVolume: 0.7,
        musicVolume: 0.6,
        enabled: true,
        setMasterVolume: vi.fn(),
        setSfxVolume: vi.fn(),
        setMusicVolume: vi.fn(),
        setEnabled: vi.fn()
      },
      showFPS: false,
      particles: true,
      difficulty: 'Normal',
      paused: false,
      controls: {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        shoot: 'Space',
        transform: 'Shift'
      },
      // Mock EffectManager instead of creating real one
      effectManager: {
        isRunning: false,
        start: vi.fn(),
        stop: vi.fn(),
        register: vi.fn(),
        effect: vi.fn() // Add the missing effect method
      },
      ...options.gameOverrides
    }

    // Mock DOM elements (minimal setup)
    if (!document.getElementById('gameContainer')) {
      document.body.innerHTML = '<div id="gameContainer"></div>'
    }
  }

  const afterEach = () => {
    // Clean up DOM only if needed
    // Document cleanup is expensive, minimize it
    vi.clearAllMocks()
  }

  const getters = {
    get mockGame() {
      return mockGame
    },
    get mockEventSystems() {
      return mockEventSystems
    },
    get optionsMenu() {
      return optionsMenu
    },
    set optionsMenu(value) {
      optionsMenu = value
    }
  }

  return {
    beforeEach,
    afterEach,
    ...getters
  }
}

/**
 * Mock the game loop for testing without NODE_ENV check
 * @param {Game} game - Game instance
 * @returns {Function} Cleanup function
 */
export function mockGameLoop(game) {
  const originalEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'development'

  return () => {
    process.env.NODE_ENV = originalEnv
  }
}
