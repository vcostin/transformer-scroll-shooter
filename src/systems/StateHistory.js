/**
 * StateHistory - History management module for StateManager
 *
 * Handles undo/redo functionality, history tracking, and state versioning.
 * Provides efficient history management with configurable size limits and branching support.
 *
 * Features:
 * - Undo/redo operations with state restoration
 * - Configurable history size limits
 * - Branching history support (new changes clear future history)
 * - Deep state cloning for history isolation
 * - Event emission for history operations
 * - Debug logging for history operations
 *
 * @module StateHistory
 */

import { deepClone } from '@/systems/StateUtils.js'

/**
 * StateHistory class for managing state history and undo/redo functionality
 */
export class StateHistory {
  /**
   * Create a StateHistory instance
   * @param {Object} options - Configuration options
   * @param {number} options.maxHistorySize - Maximum number of states to keep in history
   * @param {boolean} options.enableHistory - Whether history tracking is enabled
   * @param {boolean} options.enableDebug - Whether debug logging is enabled
   * @param {boolean} options.enableEvents - Whether event emission is enabled
   * @param {Object} callbacks - Callback functions for external operations
   * @param {Function} callbacks.onInvalidateCache - Called when cache should be invalidated
   * @param {Function} callbacks.onEmitEvent - Called to emit events (eventName, payload)
   * @param {Function} callbacks.onUpdateStats - Called to update statistics (operation)
   */
  constructor(options = {}, callbacks = {}) {
    this.options = {
      maxHistorySize: 100,
      enableHistory: true,
      enableDebug: false,
      enableEvents: true,
      ...options
    }

    this.callbacks = {
      onInvalidateCache: () => {},
      onEmitEvent: () => {},
      onUpdateStats: () => {},
      ...callbacks
    }

    // State history tracking
    this.history = []
    this.historyIndex = -1
  }

  /**
   * Initialize history with current state
   * @param {*} currentState - The current state to add to history
   */
  initialize(currentState) {
    if (this.options.enableHistory) {
      this.addStateToHistory(currentState)
    }
  }

  /**
   * Add a state to history
   * @param {*} state - The state to add to history
   */
  addStateToHistory(state) {
    if (!this.options.enableHistory) {
      return
    }

    // Remove any history after current index (when we're in the middle of history)
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1)
    }

    // Add current state
    this.history.push(deepClone(state))
    this.historyIndex = this.history.length - 1

    // Trim history if it exceeds max size
    if (this.history.length > this.options.maxHistorySize) {
      const removeCount = this.history.length - this.options.maxHistorySize
      this.history.splice(0, removeCount)
      this.historyIndex -= removeCount
    }

    // Invalidate memory cache since history changed
    this.callbacks.onInvalidateCache()
  }

  /**
   * Undo to previous state
   * @returns {Object|null} The previous state if undo was successful, null otherwise
   */
  undo() {
    if (!this.options.enableHistory) {
      throw new Error('History is disabled')
    }

    if (this.historyIndex <= 0) {
      return null
    }

    this.historyIndex--
    const previousState = deepClone(this.history[this.historyIndex])

    // Update statistics
    this.callbacks.onUpdateStats('historyOperations')

    // Invalidate memory cache since state changed
    this.callbacks.onInvalidateCache()

    // Emit undo event
    if (this.options.enableEvents) {
      this.callbacks.onEmitEvent('state:undo', {
        state: previousState,
        historyIndex: this.historyIndex
      })
    }

    if (this.options.enableDebug) {
      console.log(`↶ StateHistory: Undo to history index ${this.historyIndex}`)
    }

    return previousState
  }

  /**
   * Redo to next state
   * @returns {Object|null} The next state if redo was successful, null otherwise
   */
  redo() {
    if (!this.options.enableHistory) {
      throw new Error('History is disabled')
    }

    if (this.historyIndex >= this.history.length - 1) {
      return null
    }

    this.historyIndex++
    const nextState = deepClone(this.history[this.historyIndex])

    // Update statistics
    this.callbacks.onUpdateStats('historyOperations')

    // Invalidate memory cache since state changed
    this.callbacks.onInvalidateCache()

    // Emit redo event
    if (this.options.enableEvents) {
      this.callbacks.onEmitEvent('state:redo', {
        state: nextState,
        historyIndex: this.historyIndex
      })
    }

    if (this.options.enableDebug) {
      console.log(`↷ StateHistory: Redo to history index ${this.historyIndex}`)
    }

    return nextState
  }

  /**
   * Clear all state history
   */
  clearHistory() {
    this.history = []
    this.historyIndex = -1

    // Invalidate memory cache since history changed
    this.callbacks.onInvalidateCache()

    if (this.options.enableDebug) {
      console.log('🗑️ StateHistory: History cleared')
    }
  }

  /**
   * Check if undo operation is possible
   * @returns {boolean} True if undo is possible
   */
  canUndo() {
    return this.options.enableHistory && this.historyIndex > 0
  }

  /**
   * Check if redo operation is possible
   * @returns {boolean} True if redo is possible
   */
  canRedo() {
    return this.options.enableHistory && this.historyIndex < this.history.length - 1
  }

  /**
   * Get history statistics
   * @returns {Object} History statistics
   */
  getHistoryStats() {
    return {
      historySize: this.history.length,
      historyIndex: this.historyIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      maxHistorySize: this.options.maxHistorySize,
      enableHistory: this.options.enableHistory
    }
  }

  /**
   * Get memory usage of history (for debugging/monitoring)
   * @returns {number} Approximate memory usage in bytes
   */
  getHistoryMemoryUsage() {
    return JSON.stringify(this.history).length
  }

  /**
   * Update history options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions }

    // If maxHistorySize changed, trim history if needed
    if (newOptions.maxHistorySize && this.history.length > newOptions.maxHistorySize) {
      const removeCount = this.history.length - newOptions.maxHistorySize
      this.history.splice(0, removeCount)
      this.historyIndex -= removeCount
      this.callbacks.onInvalidateCache()
    }
  }
}

export default StateHistory
