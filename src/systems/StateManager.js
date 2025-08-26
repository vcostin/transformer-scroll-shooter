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

  // Internal setState function
  const setState = (path, value) => {
    const oldValue = getStateAtPath(currentState, path)
    const newState = setStateAtPath(currentState, path, value)

    currentState = newState

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
  }

  // Internal getState function
  const getState = (path = '') => {
    return getStateAtPath(currentState, path)
  }

  // Simple ID generator for entities
  const generateId = () => {
    // Use native UUID if available (modern browsers and Node.js)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }

    // Fallback for older environments
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Initialize entity state (for entity-state architecture)
  const initializeEntity = (entityPath, initialState) => {
    if (getState(entityPath)) {
      console.warn(`Entity state at ${entityPath} already exists`)
      return false
    }

    setState(entityPath, initialState)
    return true
  }

  return {
    // Simple state getter
    getState,

    // Simple state setter with events
    setState,

    // Initialize entity state (for entity-state architecture)
    initializeEntity,

    // Batch state initialization for multiple entities
    initializeEntities(entitiesConfig) {
      Object.entries(entitiesConfig).forEach(([path, initialState]) => {
        initializeEntity(path, initialState)
      })
    },

    // ===== ENTITY COLLECTION MANAGEMENT =====

    // Initialize an entity collection (enemies, bullets, etc.)
    initializeCollection(collectionPath, initialArray = []) {
      if (getState(collectionPath)) {
        console.warn(`Collection at ${collectionPath} already exists`)
        return false
      }

      setState(collectionPath, initialArray)
      return true
    },

    // Add entity to collection with auto-generated ID
    addToCollection(collectionPath, entityData) {
      const collection = getState(collectionPath) || []
      const id = entityData.id || generateId()
      const newEntity = { ...entityData, id }

      setState(collectionPath, [...collection, newEntity])
      return id
    },

    // Remove entity from collection by ID
    removeFromCollection(collectionPath, entityId) {
      const collection = getState(collectionPath) || []
      const filtered = collection.filter(entity => entity.id !== entityId)
      setState(collectionPath, filtered)
      return filtered.length < collection.length // Returns true if removed
    },

    // Update entity in collection by ID
    updateInCollection(collectionPath, entityId, updates) {
      const collection = getState(collectionPath) || []
      const updated = collection.map(entity =>
        entity.id === entityId ? { ...entity, ...updates } : entity
      )
      setState(collectionPath, updated)
      return updated.find(e => e.id === entityId) // Returns updated entity
    },

    // Get entity from collection by ID
    getFromCollection(collectionPath, entityId) {
      const collection = getState(collectionPath) || []
      return collection.find(entity => entity.id === entityId)
    },

    // Simple ID generator for entities
    generateId,

    // Get full state snapshot
    getFullState(deepClone = false) {
      if (deepClone) {
        // Deep clone for complete safety (expensive)
        return JSON.parse(JSON.stringify(currentState))
      }

      // Shallow clone for performance (entities should use setState anyway)
      return { ...currentState }
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
