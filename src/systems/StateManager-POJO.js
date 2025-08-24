/**
 * StateManager POJO+Functional Implementation
 * This is a Phase 4 migration of StateManager to POJO+Functional pattern
 */

import { eventDispatcher } from '@/systems/EventDispatcher.js'
import { DEFAULT_STATE, getDefaultValue } from '@/constants/state-schema.js'
import {
  getValueByPath,
  setValueByPath,
  deepClone,
  deepEqual,
  isValidPath
} from '@/systems/StateUtils.js'
import { validateValue as validateValueUtil } from '@/systems/StateValidation.js'
import { StateHistory } from '@/systems/StateHistory.js'
import { StateSubscriptions } from '@/systems/StateSubscriptions.js'
import { StatePerformance } from '@/systems/StatePerformance.js'
import { StateAsync } from '@/systems/StateAsync.js'

// ===============================================
// POJO+Functional StateManager Implementation
// ===============================================

/**
 * Factory function to create a StateManager POJO
 * @param {Object} options - Configuration options
 * @returns {Object} StateManager POJO with immutable state
 */
export function createStateManager(options = {}) {
  // Configuration with defaults
  const config = {
    maxHistorySize: 100,
    enableHistory: true,
    enableValidation: true,
    enableEvents: true,
    enableDebug: false,
    immutable: true,
    ...options
  }

  // Current state (deep clone of default state)
  const currentState = deepClone(DEFAULT_STATE)

  // Initialize sub-systems
  const stateHistory = new StateHistory(
    {
      maxHistorySize: config.maxHistorySize,
      enableHistory: config.enableHistory,
      enableDebug: config.enableDebug,
      enableEvents: config.enableEvents
    },
    {
      onInvalidateCache: () => {}, // Will be set up after performance system
      onEmitEvent: (eventName, payload) => {
        if (config.enableEvents) {
          eventDispatcher.emit(eventName, payload)
        }
      },
      onUpdateStats: operation => {
        if (operation === 'historyOperations') {
          // Will be connected to performance system
        }
      }
    }
  )

  const stateSubscriptions = new StateSubscriptions(
    {
      enableDebug: config.enableDebug
    },
    {
      onGetState: path => getStateManagerState(stateManager, path)
    }
  )

  const statePerformance = new StatePerformance({
    enablePerformanceTracking: config.enablePerformanceTracking !== false,
    enableMemoryTracking: config.enableMemoryTracking !== false,
    enableDebug: config.enableDebug,
    memoryUpdateThreshold: config.memoryUpdateThreshold || 1000,
    onGetState: () => currentState,
    onGetHistoryMemoryUsage: () => stateHistory.getHistoryMemoryUsage()
  })

  const stateAsync = new StateAsync(
    {
      enableEvents: config.enableEvents,
      enableDebug: config.enableDebug,
      defaultTimeout: config.asyncTimeout || 30000,
      retryAttempts: config.asyncRetryAttempts || 0,
      retryDelay: config.asyncRetryDelay || 1000
    },
    {
      onSetState: (path, value, options) => {
        // Direct state update for async operations
        return setStateManagerState(stateManager, path, value, options)
      },
      onEmitEvent: (eventName, payload) => {
        if (config.enableEvents) {
          eventDispatcher.emit(eventName, payload)
        }
      }
    }
  )

  // Create StateManager POJO
  const stateManager = {
    // Configuration
    options: config,

    // Current state
    currentState,

    // Sub-systems
    stateHistory,
    stateSubscriptions,
    statePerformance,
    stateAsync,

    // Event dispatcher reference
    eventDispatcher,

    // Error tracking
    moduleErrors: {
      history: 0,
      subscriptions: 0,
      performance: 0,
      async: 0,
      validation: 0
    }
  }

  // Set up cross-references after all objects are created
  stateHistory.callbacks.onInvalidateCache = () => statePerformance.invalidateMemoryCache()
  stateHistory.callbacks.onUpdateStats = operation => {
    if (operation === 'historyOperations') {
      statePerformance.recordHistoryOperation()
    }
  }

  // Initialize history with current state
  stateHistory.initialize(currentState)

  // Debug mode setup
  if (config.enableDebug) {
    enableStateManagerDebugMode(stateManager)
  }

  return stateManager
}

/**
 * Get state value by path from StateManager POJO
 * @param {Object} stateManager - StateManager POJO
 * @param {string} path - Dot-notation path to state property
 * @param {Object} options - Options for getting state
 * @returns {*} State value or undefined if not found
 */
export function getStateManagerState(stateManager, path = '', options = {}) {
  stateManager.statePerformance.recordGet(options.skipStats)

  try {
    if (!path) {
      return stateManager.options.immutable
        ? deepClone(stateManager.currentState)
        : stateManager.currentState
    }

    const value = getValueByPath(stateManager.currentState, path)
    return stateManager.options.immutable ? deepClone(value) : value
  } catch (error) {
    stateManager.moduleErrors.general = (stateManager.moduleErrors.general || 0) + 1
    if (stateManager.options.enableDebug) {
      console.error('StateManager: Error getting state:', error)
    }
    return undefined
  }
}

/**
 * Set state value by path in StateManager POJO
 * @param {Object} stateManager - StateManager POJO
 * @param {string} path - Dot-notation path to state property
 * @param {*} value - New value to set
 * @param {Object} options - Update options
 * @returns {boolean} True if state was updated, false otherwise
 */
export function setStateManagerState(stateManager, path, value, options = {}) {
  const startTime = performance.now()
  const updateOptions = {
    skipValidation: false,
    skipEvents: false,
    skipHistory: false,
    merge: false,
    ...options
  }

  try {
    // Validate path
    if (!isValidPath(path)) {
      throw new Error('State path must be a non-empty string')
    }

    // Validate value if validation is enabled
    if (stateManager.options.enableValidation && !updateOptions.skipValidation) {
      const validationError = validateValueUtil(path, value, stateManager.currentState)
      if (validationError) {
        stateManager.statePerformance.recordValidationError()
        throw new Error(`Validation error for '${path}': ${validationError}`)
      }
    }

    // Get current value for comparison
    const currentValue = getValueByPath(stateManager.currentState, path)

    // Check if value has actually changed
    if (deepEqual(currentValue, value)) {
      stateManager.statePerformance.recordSet(startTime, false)
      return false // No change needed
    }

    // Update the state
    setValueByPath(stateManager.currentState, path, value, updateOptions.merge)

    // Add to history if enabled
    if (stateManager.options.enableHistory && !updateOptions.skipHistory) {
      stateManager.stateHistory.addState(stateManager.currentState, {
        operation: 'setState',
        path,
        value,
        previousValue: currentValue,
        timestamp: Date.now()
      })
    }

    // Emit state change event
    if (stateManager.options.enableEvents && !updateOptions.skipEvents) {
      stateManager.eventDispatcher.emit('state:changed', {
        path,
        value,
        previousValue: currentValue,
        timestamp: Date.now()
      })
    }

    // Notify subscriptions
    stateManager.stateSubscriptions.notifySubscribers(path, value, currentValue)

    // Record performance metrics
    stateManager.statePerformance.recordSet(startTime, true)

    return true
  } catch (error) {
    stateManager.moduleErrors.general = (stateManager.moduleErrors.general || 0) + 1
    stateManager.statePerformance.recordError()

    if (stateManager.options.enableDebug) {
      console.error('StateManager: Error setting state:', error)
    }

    throw error
  }
}

/**
 * Subscribe to state changes on StateManager POJO
 * @param {Object} stateManager - StateManager POJO
 * @param {string} path - State path to watch
 * @param {Function} callback - Callback function
 * @param {Object} options - Subscription options
 * @returns {string} Subscription ID
 */
export function subscribeToStateManager(stateManager, path, callback, options = {}) {
  return stateManager.stateSubscriptions.subscribe(path, callback, options)
}

/**
 * Unsubscribe from state changes on StateManager POJO
 * @param {Object} stateManager - StateManager POJO
 * @param {string} subscriptionId - Subscription ID to remove
 * @returns {boolean} True if unsubscribed successfully
 */
export function unsubscribeFromStateManager(stateManager, subscriptionId) {
  return stateManager.stateSubscriptions.unsubscribe(subscriptionId)
}

/**
 * Reset state to default values in StateManager POJO
 * @param {Object} stateManager - StateManager POJO
 * @param {string} path - Path to reset (empty string for full reset)
 * @returns {boolean} True if reset was successful
 */
export function resetStateManagerState(stateManager, path = '') {
  try {
    const defaultValue = path ? getValueByPath(DEFAULT_STATE, path) : DEFAULT_STATE

    if (path) {
      return setStateManagerState(stateManager, path, defaultValue, { skipHistory: false })
    } else {
      // Full reset
      Object.keys(stateManager.currentState).forEach(key => {
        delete stateManager.currentState[key]
      })
      Object.assign(stateManager.currentState, deepClone(DEFAULT_STATE))

      // Clear history and reset systems
      stateManager.stateHistory.clear()
      stateManager.stateHistory.initialize(stateManager.currentState)
      stateManager.stateSubscriptions.clear()
      stateManager.statePerformance.reset()

      if (stateManager.options.enableEvents) {
        stateManager.eventDispatcher.emit('state:reset', {
          timestamp: Date.now()
        })
      }

      return true
    }
  } catch (error) {
    stateManager.moduleErrors.general = (stateManager.moduleErrors.general || 0) + 1
    if (stateManager.options.enableDebug) {
      console.error('StateManager: Error resetting state:', error)
    }
    return false
  }
}

/**
 * Enable debug mode for StateManager POJO
 * @param {Object} stateManager - StateManager POJO
 */
export function enableStateManagerDebugMode(stateManager) {
  if (typeof window !== 'undefined') {
    // @ts-ignore - Adding debug property to window
    window.gameStateManager = stateManager
    console.log('🐛 StateManager: Debug mode enabled')
  }
}

/**
 * Get statistics from StateManager POJO
 * @param {Object} stateManager - StateManager POJO
 * @returns {Object} Performance and usage statistics
 */
export function getStateManagerStats(stateManager) {
  return {
    performance: stateManager.statePerformance.getStats(),
    subscriptions: stateManager.stateSubscriptions.getStats(),
    history: stateManager.stateHistory.getStats(),
    async: stateManager.stateAsync.getStats(),
    moduleErrors: { ...stateManager.moduleErrors }
  }
}

// ===============================================
// Legacy Class Wrapper (Backward Compatibility)
// ===============================================
export class StateManager {
  /**
   * Create a new StateManager instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Create the POJO state and assign properties to this
    const stateManagerPOJO = createStateManager(options)
    Object.assign(this, stateManagerPOJO)
  }

  /**
   * Get state value by path
   * @param {string} path - Dot-notation path to state property
   * @param {Object} options - Options for getting state
   * @returns {*} State value or undefined if not found
   */
  getState(path = '', options = {}) {
    return getStateManagerState(this, path, options)
  }

  /**
   * Set state value by path with immutable updates
   * @param {string} path - Dot-notation path to state property
   * @param {*} value - New value to set
   * @param {Object} options - Update options
   * @returns {boolean} True if state was updated, false otherwise
   */
  setState(path, value, options = {}) {
    return setStateManagerState(this, path, value, options)
  }

  /**
   * Subscribe to state changes
   * @param {string} path - State path to watch
   * @param {Function} callback - Callback function
   * @param {Object} options - Subscription options
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback, options = {}) {
    const subscriptionId = subscribeToStateManager(this, path, callback, options)
    return () => unsubscribeFromStateManager(this, subscriptionId)
  }

  /**
   * Unsubscribe from state changes
   * @param {string} subscriptionId - Subscription ID to remove
   * @returns {boolean} True if unsubscribed successfully
   */
  unsubscribe(subscriptionId) {
    return unsubscribeFromStateManager(this, subscriptionId)
  }

  /**
   * Reset state to default values
   * @param {string} path - Path to reset (empty string for full reset)
   * @returns {boolean} True if reset was successful
   */
  resetState(path = '') {
    return resetStateManagerState(this, path)
  }

  /**
   * Get performance and usage statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return getStateManagerStats(this)
  }

  /**
   * Enable debug mode
   */
  enableDebugMode() {
    enableStateManagerDebugMode(this)
  }

  /**
   * Disable debug mode
   */
  disableDebugMode() {
    this.options.enableDebug = false
    if (typeof window !== 'undefined') {
      delete window.gameStateManager
    }
  }

  /**
   * Get memory usage information
   * @returns {Object} Memory usage statistics
   */
  getMemoryUsage() {
    return this.statePerformance ? this.statePerformance.getMemoryUsage() : {}
  }

  /**
   * Undo last state change
   * @returns {boolean} True if undo was successful
   */
  undo() {
    return this.stateHistory ? this.stateHistory.undo() : false
  }

  /**
   * Redo last undone state change
   * @returns {boolean} True if redo was successful
   */
  redo() {
    return this.stateHistory ? this.stateHistory.redo() : false
  }

  /**
   * Clear all state data and reset
   */
  clearAll() {
    if (this.stateHistory) this.stateHistory.clearHistory()
    if (this.stateSubscriptions) this.stateSubscriptions.clearAll()
    if (this.stateAsync) this.stateAsync.cancelAllOperations()
    if (this.statePerformance) this.statePerformance.reset()

    Object.assign(this.currentState, deepClone(DEFAULT_STATE))

    if (this.stateHistory) {
      this.stateHistory.addStateToHistory(this.currentState)
    }
  }

  /**
   * Get active async operations
   * @returns {Array} Array of active operation information
   */
  getActiveAsyncOperations() {
    return this.stateAsync ? this.stateAsync.getActiveOperations() : []
  }

  /**
   * Cancel an active async operation
   * @param {string} operationId - ID of operation to cancel
   * @returns {boolean} True if operation was cancelled
   */
  cancelAsyncOperation(operationId) {
    return this.stateAsync ? this.stateAsync.cancelOperation(operationId) : false
  }

  /**
   * Cancel all active async operations
   * @returns {number} Number of operations cancelled
   */
  cancelAllAsyncOperations() {
    return this.stateAsync ? this.stateAsync.cancelAllOperations() : 0
  }

  /**
   * Get module error statistics
   * @returns {Object} Error statistics by module
   */
  getModuleErrors() {
    return { ...this.moduleErrors }
  }

  /**
   * Set state value asynchronously with Promise support
   * @param {string} path - Dot-notation path to state property
   * @param {*|Promise} valueOrPromise - Value or Promise that resolves to value
   * @param {Object} options - Update options
   * @returns {Promise} Promise that resolves when state is updated
   */
  async setStateAsync(path, valueOrPromise, options = {}) {
    if (this.stateAsync) {
      return this.stateAsync.setStateAsync(path, valueOrPromise, options)
    }
    throw new Error('StateAsync module not available')
  }

  /**
   * Batch multiple state updates for better performance
   * @param {Array} updates - Array of {path, value, options} objects
   * @param {Object} batchOptions - Batch-specific options
   * @returns {Array} Array of update results (boolean values)
   */
  batchUpdate(updates, batchOptions = {}) {
    const results = []
    for (const update of updates) {
      results.push(this.setState(update.path, update.value, update.options))
    }
    return results
  }

  /**
   * Execute a transaction with automatic rollback on error
   * @param {Function} transactionFn - Function to execute in transaction
   * @returns {*} Result of transaction function
   */
  transaction(transactionFn) {
    const snapshot = deepClone(this.currentState)
    try {
      return transactionFn(this)
    } catch (error) {
      Object.assign(this.currentState, snapshot)
      throw error
    }
  }
}

// ===============================================
// Default Instance Export
// ===============================================
export const stateManager = new StateManager({
  enableDebug: false,
  enableHistory: true,
  enableValidation: true,
  enableEvents: true,
  maxHistorySize: 50
})
