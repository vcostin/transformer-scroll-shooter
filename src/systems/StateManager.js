/**
 * StateManager - Pure Functional Implementation
 * NO CLASSES, NO `this`, NO COMPATIBILITY LAYERS
 *
 * This is a clean functional rewrite with:
 * - Curried action creators for dependency injection
 * - Pure functions for state transformations
 * - Event-driven side effects
 * - Immutable state updates
 */

import { createEventDispatcher } from '@/systems/EventDispatcher.js'

// ===== PURE STATE FUNCTIONS =====

/**
 * Set a value at a path in state (pure function)
 * @param {Object} state - Current state object
 * @param {string} path - Dot-notation path (e.g., 'game.player.health')
 * @param {*} value - Value to set
 * @returns {Object} New state object
 */
const setStateAtPath = (state, path, value) => {
  if (!path) return { ...state, ...value }

  const keys = path.split('.')
  const newState = JSON.parse(JSON.stringify(state)) // Deep clone for immutability

  let current = newState
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
  return newState
}

/**
 * Get a value at a path in state (pure function)
 * @param {Object} state - Current state object
 * @param {string} path - Dot-notation path
 * @returns {*} Value at path or undefined
 */
const getStateAtPath = (state, path) => {
  if (!path) return state

  const keys = path.split('.')
  let current = state

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined
    }
    current = current[key]
  }

  return current
}

/**
 * Validate state changes (pure function)
 * @param {Object} oldState - Previous state
 * @param {Object} newState - New state
 * @param {string} path - Path that changed
 * @returns {boolean} True if valid
 */
const validateStateChange = (oldState, newState, path) => {
  // Basic validation rules
  if (path.includes('health')) {
    const health = getStateAtPath(newState, path)
    return typeof health === 'number' && health >= 0
  }

  if (path.includes('score')) {
    const score = getStateAtPath(newState, path)
    return typeof score === 'number' && score >= 0
  }

  return true // Default: allow change
}

// ===== CURRIED ACTION CREATORS =====

/**
 * Creates state management functions with dependency injection
 * @param {Object} eventDispatcher - Event dispatcher for side effects
 * @returns {Object} Curried state management functions
 */
export const createStateActions = eventDispatcher => {
  // Private state (closure)
  let currentState = {}
  let stateHistory = []
  const subscribers = new Map()
  let subscriptionCounter = 0

  // Pure helper to emit state change events
  const emitStateChange = (path, newValue, oldValue, fullState) => {
    eventDispatcher.emit('state:changed', {
      path,
      newValue,
      oldValue,
      state: fullState
    })

    // Emit specific path events
    if (path) {
      eventDispatcher.emit(`state:${path}`, {
        value: newValue,
        oldValue,
        state: fullState
      })
    }
  }

  // Pure helper to notify subscribers
  const notifySubscribers = (path, newValue, oldValue, fullState) => {
    for (const [subscriptionId, { pattern, callback }] of subscribers.entries()) {
      if (!pattern || path.startsWith(pattern)) {
        try {
          callback(newValue, oldValue, fullState, path)
        } catch (error) {
          console.error(`Subscriber ${subscriptionId} error:`, error)
        }
      }
    }
  }

  return {
    // Curried state setter
    setState:
      path =>
      value =>
      (inputState = currentState) => {
        const oldValue = getStateAtPath(inputState, path)
        const newState = setStateAtPath(inputState, path, value)

        // Validate change
        if (!validateStateChange(inputState, newState, path)) {
          console.warn(`Invalid state change at ${path}:`, value)
          return inputState
        }

        // Update current state if we're using the internal state
        if (inputState === currentState) {
          stateHistory.push({
            state: JSON.parse(JSON.stringify(inputState)),
            timestamp: Date.now(),
            action: `setState(${path})`
          })

          // Limit history size
          if (stateHistory.length > 100) {
            stateHistory.shift()
          }

          currentState = newState

          // Side effects
          emitStateChange(path, value, oldValue, newState)
          notifySubscribers(path, value, oldValue, newState)
        }

        return newState
      },

    // Curried state getter
    getState:
      (path = '') =>
      (inputState = currentState) => {
        return getStateAtPath(inputState, path)
      },

    // Curried state subscription
    subscribe: pathPattern => callback => {
      const subscriptionId = ++subscriptionCounter
      subscribers.set(subscriptionId, { pattern: pathPattern, callback })

      // Return unsubscribe function
      return () => {
        subscribers.delete(subscriptionId)
      }
    },

    // State history access
    getHistory: () => [...stateHistory],

    // Reset state (for testing)
    resetState: (initialState = {}) => {
      currentState = { ...initialState }
      stateHistory = []
      subscribers.clear()
      subscriptionCounter = 0
      return currentState
    },

    // Get current state snapshot
    getCurrentState: () => JSON.parse(JSON.stringify(currentState)),

    // Batch state updates (optimization)
    batchUpdate:
      updates =>
      (inputState = currentState) => {
        let newState = inputState

        for (const { path, value } of updates) {
          newState = setStateAtPath(newState, path, value)
        }

        // Validate all changes
        for (const { path } of updates) {
          if (!validateStateChange(inputState, newState, path)) {
            console.warn(`Batch update failed validation at ${path}`)
            return inputState
          }
        }

        // Update internal state if using it
        if (inputState === currentState) {
          stateHistory.push({
            state: JSON.parse(JSON.stringify(inputState)),
            timestamp: Date.now(),
            action: `batchUpdate(${updates.length} changes)`
          })

          currentState = newState

          // Emit events for all changes
          for (const { path, value } of updates) {
            const oldValue = getStateAtPath(inputState, path)
            emitStateChange(path, value, oldValue, newState)
            notifySubscribers(path, value, oldValue, newState)
          }
        }

        return newState
      }
  }
}

// ===== FACTORY FUNCTION =====

/**
 * Create a complete functional state manager
 * @param {Object} options - Configuration options
 * @returns {Object} State manager with curried actions
 */
export const createStateManager = (options = {}) => {
  const eventDispatcher = createEventDispatcher()
  const stateActions = createStateActions(eventDispatcher)

  // Initialize with default state or empty state
  const initialState = options.initialState || {}

  stateActions.resetState(initialState)

  return {
    // Base state functions
    ...stateActions,

    // Event dispatcher access
    eventDispatcher,

    // For testing - get raw state
    _getRawState: () => stateActions.getCurrentState()
  }
}

// ===== TESTING UTILITIES =====

/**
 * Create a mock state manager for testing
 * @param {Object} initialState - Initial state for testing
 * @returns {Object} Mock state manager
 */
export const createMockStateManager = (initialState = {}) => {
  return createStateManager({ initialState })
}

// ===== SINGLETON INSTANCE =====

// Create default singleton instance for backward compatibility
export const stateManager = createStateManager()
