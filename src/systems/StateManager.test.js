/**
 * StateManager Functional Tests - COMPLETE REWRITE
 * Tests for the new functional StateManager implementation
 * NO CLASSES, NO `this`, CURRIED FUNCTIONS ONLY
 */

import { createStateManager, createMockStateManager, stateManager } from '@/systems/StateManager.js'

describe('Functional StateManager', () => {
  let testStateManager

  beforeEach(() => {
    // Create fresh functional instance for each test
    testStateManager = createMockStateManager({
      game: {
        score: 0,
        level: 1,
        player: { health: 100, x: 400, y: 500 }
      },
      ui: { menu: { open: false } }
    })
  })

  describe('Factory Function', () => {
    test('should create state manager with curried functions', () => {
      expect(typeof testStateManager.setState).toBe('function')
      expect(typeof testStateManager.getState).toBe('function')
      expect(typeof testStateManager.subscribe).toBe('function')
      expect(typeof testStateManager.pauseGame).toBe('function')
      expect(typeof testStateManager.openOptionsMenu).toBe('function')
    })

    test('should create with initial state', () => {
      const initialData = { test: { value: 42 } }
      const manager = createMockStateManager(initialData)

      expect(manager.getState('test.value')()).toBe(42)
    })

    test('should have event dispatcher', () => {
      expect(testStateManager.eventDispatcher).toBeDefined()
      expect(typeof testStateManager.eventDispatcher.emit).toBe('function')
      expect(typeof testStateManager.eventDispatcher.on).toBe('function')
    })
  })

  describe('Curried State Operations', () => {
    test('should handle curried setState', () => {
      const currentState = testStateManager.getCurrentState()

      // Test currying: setState(path)(value)(state)
      const newState = testStateManager.setState('game.score')(100)(currentState)

      expect(testStateManager.getState('game.score')(newState)).toBe(100)
      // Original state unchanged (immutability)
      expect(testStateManager.getState('game.score')(currentState)).toBe(0)
    })

    test('should handle curried getState', () => {
      const currentState = testStateManager.getCurrentState()

      // Test currying: getState(path)(state)
      const getScore = testStateManager.getState('game.score')
      expect(getScore(currentState)).toBe(0)
    })

    test('should handle nested paths', () => {
      const currentState = testStateManager.getCurrentState()

      const newState = testStateManager.setState('game.player.health')(75)(currentState)
      expect(testStateManager.getState('game.player.health')(newState)).toBe(75)
    })

    test("should create paths that don't exist", () => {
      const currentState = testStateManager.getCurrentState()

      const newState = testStateManager.setState('new.nested.path')(42)(currentState)
      expect(testStateManager.getState('new.nested.path')(newState)).toBe(42)
    })
  })

  describe('Game-Specific Actions', () => {
    test('should handle pause game with priority logic', () => {
      let currentState = testStateManager.getCurrentState()

      // System pauses game
      currentState = testStateManager.pauseGame('system')(currentState)
      expect(testStateManager.getState('game.paused')(currentState)).toBe(true)
      expect(testStateManager.getState('game.pauseSource')(currentState)).toBe('system')

      // Menu opens (takes priority)
      currentState = testStateManager.openOptionsMenu()(currentState)
      expect(testStateManager.getState('game.pauseSource')(currentState)).toBe('menu')

      // System tries to resume - should fail
      const attemptResume = testStateManager.resumeGame('system')(currentState)
      expect(testStateManager.getState('game.paused')(attemptResume)).toBe(true)

      // Menu closes - should resume
      currentState = testStateManager.closeOptionsMenu()(currentState)
      expect(testStateManager.getState('game.paused')(currentState)).toBe(false)
    })

    test('should handle player actions', () => {
      let currentState = testStateManager.getCurrentState()

      currentState = testStateManager.setPlayerHealth(50)(currentState)
      expect(testStateManager.getState('game.player.health')(currentState)).toBe(50)

      currentState = testStateManager.setPlayerPosition(100, 200)(currentState)
      expect(testStateManager.getState('game.player.x')(currentState)).toBe(100)
      expect(testStateManager.getState('game.player.y')(currentState)).toBe(200)
    })

    test('should handle score operations', () => {
      let currentState = testStateManager.getCurrentState()

      currentState = testStateManager.addScore(50)(currentState)
      expect(testStateManager.getState('game.score')(currentState)).toBe(50)

      currentState = testStateManager.addScore(25)(currentState)
      expect(testStateManager.getState('game.score')(currentState)).toBe(75)
    })
  })

  describe('Batch Operations', () => {
    test('should handle batch updates', () => {
      const currentState = testStateManager.getCurrentState()

      const updates = [
        { path: 'game.score', value: 100 },
        { path: 'game.level', value: 2 },
        { path: 'game.player.health', value: 75 }
      ]

      const newState = testStateManager.batchUpdate(updates)(currentState)

      expect(testStateManager.getState('game.score')(newState)).toBe(100)
      expect(testStateManager.getState('game.level')(newState)).toBe(2)
      expect(testStateManager.getState('game.player.health')(newState)).toBe(75)
    })
  })

  describe('State Validation', () => {
    test('should validate health values', () => {
      const currentState = testStateManager.getCurrentState()

      // Valid health
      const validState = testStateManager.setPlayerHealth(50)(currentState)
      expect(testStateManager.getState('game.player.health')(validState)).toBe(50)

      // Invalid health (negative) - should reject
      const invalidState = testStateManager.setPlayerHealth(-10)(currentState)
      expect(testStateManager.getState('game.player.health')(invalidState)).toBe(100) // unchanged
    })

    test('should validate score values', () => {
      const currentState = testStateManager.getCurrentState()

      // Valid score
      const validState = testStateManager.setState('game.score')(100)(currentState)
      expect(testStateManager.getState('game.score')(validState)).toBe(100)

      // Invalid score (negative) - should reject
      const invalidState = testStateManager.setState('game.score')(-50)(currentState)
      expect(testStateManager.getState('game.score')(invalidState)).toBe(0) // unchanged
    })
  })

  describe('Subscriptions with Currying', () => {
    test('should handle curried subscriptions', () => {
      const changes = []

      // Subscribe with currying: subscribe(path)(callback)
      const unsubscribe = testStateManager.subscribe('game.score')((
        newValue,
        oldValue,
        fullState,
        path
      ) => {
        changes.push({ newValue, oldValue, path })
      })

      // Trigger change using internal state
      testStateManager.setState('game.score')(100)()

      expect(changes).toHaveLength(1)
      expect(changes[0].newValue).toBe(100)
      expect(changes[0].oldValue).toBe(0)
      expect(changes[0].path).toBe('game.score')

      unsubscribe()
    })

    test('should handle pattern-based subscriptions', () => {
      const playerChanges = []

      // Subscribe to all player events
      const unsubscribe = testStateManager.subscribe('game.player')((
        newValue,
        oldValue,
        fullState,
        path
      ) => {
        playerChanges.push({ path, newValue })
      })

      // Change different player properties
      testStateManager.setState('game.player.health')(50)()
      testStateManager.setState('game.player.x')(200)()

      expect(playerChanges).toHaveLength(2)
      expect(playerChanges[0].path).toBe('game.player.health')
      expect(playerChanges[1].path).toBe('game.player.x')

      unsubscribe()
    })
  })

  describe('Function Composition', () => {
    test('should compose with pure functional patterns', () => {
      // Create a composed function using curried actions
      const powerUpPlayer = currentState => {
        const healthBoosted = testStateManager.setPlayerHealth(100)(currentState)
        const powerLevelIncreased = testStateManager.setPlayerPowerLevel(2)(healthBoosted)
        return testStateManager.addScore(50)(powerLevelIncreased)
      }

      const initialState = testStateManager.getCurrentState()
      const finalState = powerUpPlayer(initialState)

      expect(testStateManager.getState('game.player.health')(finalState)).toBe(100)
      expect(testStateManager.getState('game.player.powerLevel')(finalState)).toBe(2)
      expect(testStateManager.getState('game.score')(finalState)).toBe(50)
    })

    test('should work with detached functions (no this context)', () => {
      // Extract functions and use without object context
      const { setState, getState } = testStateManager

      const currentState = testStateManager.getCurrentState()
      const newState = setState('detached.test')(true)(currentState)

      expect(getState('detached.test')(newState)).toBe(true)
    })
  })

  describe('State History', () => {
    test('should track state history', () => {
      // Make some changes
      testStateManager.setState('game.score')(10)()
      testStateManager.setState('game.score')(20)()
      testStateManager.setState('game.level')(2)()

      const history = testStateManager.getHistory()
      expect(history.length).toBeGreaterThan(0)

      // Each history entry should have state, timestamp, and action
      history.forEach(entry => {
        expect(entry).toHaveProperty('state')
        expect(entry).toHaveProperty('timestamp')
        expect(entry).toHaveProperty('action')
      })
    })
  })

  describe('Immutability', () => {
    test('should never mutate original state', () => {
      const originalState = testStateManager.getCurrentState()
      const originalScore = originalState.game.score

      // Create new state
      const newState = testStateManager.setState('game.score')(100)(originalState)

      // Original should be unchanged
      expect(originalState.game.score).toBe(originalScore)
      expect(newState.game.score).toBe(100)

      // Should be different objects
      expect(originalState).not.toBe(newState)
      expect(originalState.game).not.toBe(newState.game)
    })
  })

  describe('Event Integration', () => {
    test('should emit state change events', () => {
      const events = []

      testStateManager.eventDispatcher.on('state:changed')(data => {
        events.push(data)
      })

      testStateManager.setState('game.score')(100)()

      expect(events).toHaveLength(1)
      expect(events[0].path).toBe('game.score')
      expect(events[0].newValue).toBe(100)
      expect(events[0].oldValue).toBe(0)
    })

    test('should emit specific path events', () => {
      const scoreEvents = []

      testStateManager.eventDispatcher.on('state:game.score')(data => {
        scoreEvents.push(data)
      })

      testStateManager.setState('game.score')(200)()

      expect(scoreEvents).toHaveLength(1)
      expect(scoreEvents[0].value).toBe(200)
      expect(scoreEvents[0].oldValue).toBe(0)
    })
  })

  describe('Singleton Instance', () => {
    test('should provide working singleton', () => {
      expect(stateManager).toBeDefined()
      expect(typeof stateManager.setState).toBe('function')
      expect(typeof stateManager.getState).toBe('function')
    })

    test('should maintain singleton state', () => {
      // Use singleton instance
      const initialState = stateManager.getCurrentState()
      stateManager.setState('test.singleton')(true)()

      // State should persist
      expect(stateManager.getState('test.singleton')()).toBe(true)
    })
  })

  describe('Testing Utilities', () => {
    test('should reset state for testing', () => {
      // Make changes
      testStateManager.setState('game.score')(500)()
      expect(testStateManager.getState('game.score')()).toBe(500)

      // Reset to new state
      const newInitialState = { game: { score: 0, level: 1 } }
      testStateManager.resetState(newInitialState)

      expect(testStateManager.getState('game.score')()).toBe(0)
      expect(testStateManager.getHistory()).toHaveLength(0)
    })

    test('should work with mock state managers', () => {
      const mockManager = createMockStateManager({
        test: { value: 123 }
      })

      expect(mockManager.getState('test.value')()).toBe(123)
    })
  })
})
