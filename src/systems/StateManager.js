/**
 * StateManager - Clean Centralized State Management
 *
 * Simple, powerful state management for game entities.
 * Entities are stateless components that operate on global state.
 */

import { createEventDispatcher } from '@/systems/EventDispatcher.js'

// ===== PURE STATE FUNCTIONS =====

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

// ===== SIMPLE STATE MANAGER =====

export const createStateManager = (options = {}) => {
  const eventDispatcher = createEventDispatcher()
  let currentState = options.initialState || {}
  const subscribers = new Map()
  let subscriptionCounter = 0

  return {
    // Simple state getter
    getState(path = '') {
      return getStateAtPath(currentState, path)
    },

    // Simple state setter with events
    setState(path, value) {
      const oldValue = getStateAtPath(currentState, path)
      const newState = setStateAtPath(currentState, path, value)

      currentState = newState

      // Call subscriber callbacks
      subscribers.forEach(({ pattern, callback }) => {
        if (pattern === path || path.startsWith(pattern + '.') || pattern === '*') {
          try {
            callback(value, oldValue)
          } catch (error) {
            console.error('Error in state subscription callback:', error)
          }
        }
      })

      // Emit events for entity coordination
      eventDispatcher.emit('state:changed', {
        path,
        newValue: value,
        oldValue,
        state: currentState
      })

      if (path) {
        eventDispatcher.emit(`state:${path}`, {
          value,
          oldValue,
          state: currentState
        })
      }

      return value
    },

    // Get full state snapshot
    getFullState() {
      return JSON.parse(JSON.stringify(currentState))
    },

    // Subscribe to state changes
    subscribe(pathPattern, callback) {
      const subscriptionId = ++subscriptionCounter
      subscribers.set(subscriptionId, { pattern: pathPattern, callback })

      return () => subscribers.delete(subscriptionId)
    },

    // Event dispatcher for entity communication
    eventDispatcher,

    // Reset for testing
    resetState(initialState = {}) {
      currentState = { ...initialState }
      return currentState
    }
  }
}

// ===== SINGLETON INSTANCE =====

// Create default singleton for backward compatibility
export const stateManager = createStateManager()
