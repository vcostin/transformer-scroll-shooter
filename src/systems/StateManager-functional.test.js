/**
 * Functional State Manager Test
 * Tests the new functional approach - NO CLASSES!
 */

import { createStateManager, createMockStateManager } from '@/systems/StateManager.js'

describe('Functional StateManager', () => {
  let stateManager

  beforeEach(() => {
    stateManager = createMockStateManager({
      game: {
        score: 0,
        paused: false,
        player: { health: 100 }
      }
    })
  })

  test('should create state manager with curried functions', () => {
    expect(typeof stateManager.setState).toBe('function')
    expect(typeof stateManager.getState).toBe('function')
    expect(typeof stateManager.pauseGame).toBe('function')
  })

  test('should handle curried state updates', () => {
    // Test currying: setState(path)(value)(state)
    const newState = stateManager.setState('game.player.health')(50)(stateManager.getCurrentState())

    expect(stateManager.getState('game.player.health')(newState)).toBe(50)
  })

  test('should handle game pause priority logic', () => {
    let currentState = stateManager.getCurrentState()

    // System pauses game
    currentState = stateManager.pauseGame('system')(currentState)
    expect(stateManager.getState('game.paused')(currentState)).toBe(true)
    expect(stateManager.getState('game.pauseSource')(currentState)).toBe('system')

    // Menu opens (takes priority)
    currentState = stateManager.openOptionsMenu()(currentState)
    expect(stateManager.getState('game.pauseSource')(currentState)).toBe('menu')

    // System tries to resume - should fail because menu has priority
    const attemptResume = stateManager.resumeGame('system')(currentState)
    expect(stateManager.getState('game.paused')(attemptResume)).toBe(true) // Still paused!

    // Menu closes - should resume
    currentState = stateManager.closeOptionsMenu()(currentState)
    expect(stateManager.getState('game.paused')(currentState)).toBe(false)
  })

  test('should handle immutable state updates', () => {
    const originalState = stateManager.getCurrentState()
    const newState = stateManager.setState('game.score')(100)(originalState)

    // Original state should be unchanged
    expect(stateManager.getState('game.score')(originalState)).toBe(0)

    // New state should have the update
    expect(stateManager.getState('game.score')(newState)).toBe(100)
  })

  test('should handle batch updates', () => {
    const currentState = stateManager.getCurrentState()

    const updates = [
      { path: 'player.health', value: 75 },
      { path: 'game.score', value: 500 }
    ]

    const newState = stateManager.batchUpdate(updates)(currentState)

    expect(stateManager.getState('player.health')(newState)).toBe(75)
    expect(stateManager.getState('game.score')(newState)).toBe(500)
  })

  test('should handle subscriptions with currying', () => {
    const healthChanges = []

    // Subscribe with currying: subscribe(path)(callback)
    const unsubscribe = stateManager.subscribe('game.player.health')((newValue, oldValue) => {
      healthChanges.push({ newValue, oldValue })
    })

    // Update health using internal state (triggers subscriptions)
    stateManager.setState('game.player.health')(25)()

    expect(healthChanges).toHaveLength(1)
    expect(healthChanges[0].newValue).toBe(25)
    expect(healthChanges[0].oldValue).toBe(100)

    unsubscribe()
  })

  test('should compose with pure functional patterns', () => {
    // Test function composition with curried actions
    const powerUpPlayer = currentState => {
      const healthBoosted = stateManager.setState('player.health')(100)(currentState)
      const scoreAdded = stateManager.addScore(50)(healthBoosted)
      return stateManager.setPlayerPowerLevel(2)(scoreAdded)
    }

    const initialState = stateManager.getCurrentState()
    const finalState = powerUpPlayer(initialState)

    expect(stateManager.getState('player.health')(finalState)).toBe(100)
    expect(stateManager.getState('game.score')(finalState)).toBe(50)
    expect(stateManager.getState('game.player.powerLevel')(finalState)).toBe(2)
  })

  test('should validate state changes', () => {
    const currentState = stateManager.getCurrentState()

    // Valid health update
    const validState = stateManager.setPlayerHealth(50)(currentState)
    expect(stateManager.getState('game.player.health')(validState)).toBe(50)

    // Invalid health update (negative) - should be rejected
    const invalidState = stateManager.setPlayerHealth(-10)(currentState)
    expect(stateManager.getState('game.player.health')(invalidState)).toBe(100) // Unchanged
  })

  test('should work without classes or this keyword', () => {
    // Verify we can create and use state manager without any class instantiation
    const functionalManager = createStateManager()

    // All functions should be curried and composable
    const updateChain = state => {
      return functionalManager.setState('test.value')(42)(state)
    }

    const initialState = functionalManager.getCurrentState()
    const result = updateChain(initialState)

    expect(functionalManager.getState('test.value')(result)).toBe(42)

    // Verify no 'this' context needed
    const { setState, getState } = functionalManager
    const detachedUpdate = setState('detached.test')(true)
    const detachedResult = detachedUpdate(initialState)

    expect(getState('detached.test')(detachedResult)).toBe(true)
  })
})
