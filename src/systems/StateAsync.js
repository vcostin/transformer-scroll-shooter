/**
 * StateAsync - Asynchronous state management module for StateManager
 *
 * Handles:
 * - Async state updates with loading and error states
 * - Promise-based state management
 * - Loading state management and cleanup
 * - Error handling and error state management
 * - Async operation tracking and debugging
 * - Event emission for async operations
 */

import { generateIdentityId } from '../utils/IdGenerator.js'

export class StateAsync {
  constructor(options = {}, callbacks = {}) {
    // Configuration
    this.options = {
      enableEvents: options.enableEvents !== false,
      enableDebug: options.enableDebug || false,
      defaultTimeout: options.defaultTimeout || 30000, // 30 seconds
      retryAttempts: options.retryAttempts || 0,
      retryDelay: options.retryDelay || 1000,
      ...options
    }

    // Callbacks for external system integration
    this.onSetState = callbacks.onSetState || (() => false)
    this.onEmitEvent = callbacks.onEmitEvent || (() => {})

    // Active async operations tracking
    this.activeOperations = new Map()
    this.operationCounter = 0

    // Statistics
    this.stats = {
      totalAsyncOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageOperationTime: 0,
      timeouts: 0,
      retries: 0
    }
  }

  /**
   * Set state asynchronously with optional loading and error states
   * @param {string} path - Dot-notation path to state property
   * @param {Promise|*} valueOrPromise - Value or Promise that resolves to value
   * @param {Object} options - Update options
   * @returns {Promise} Promise that resolves when state is updated
   */
  async setStateAsync(path, valueOrPromise, options = {}) {
    // If it's not a promise, use direct state setting
    if (!valueOrPromise || typeof valueOrPromise.then !== 'function') {
      return this.onSetState(path, valueOrPromise, options)
    }

    const operationId = this.generateOperationId()
    const startTime = performance.now()

    // Track operation
    this.trackOperation(operationId, path, options)
    this.stats.totalAsyncOperations++

    try {
      // Set loading state if requested
      if (options.loadingPath) {
        this.onSetState(options.loadingPath, true, {
          skipHistory: true,
          ...options.loadingOptions
        })
      }

      // Apply timeout if specified
      const promise = options.timeout
        ? this.withTimeout(valueOrPromise, options.timeout)
        : valueOrPromise

      // Apply retry logic if specified
      const finalPromise =
        options.retryAttempts || this.options.retryAttempts
          ? this.withRetry(
              () => valueOrPromise,
              options.retryAttempts || this.options.retryAttempts,
              options.retryDelay || this.options.retryDelay
            )
          : promise

      const value = await finalPromise

      // Clear loading state
      if (options.loadingPath) {
        this.onSetState(options.loadingPath, false, {
          skipHistory: true,
          ...options.loadingOptions
        })
      }

      // Clear any existing error state
      if (options.errorPath) {
        this.onSetState(options.errorPath, null, {
          skipHistory: true,
          ...options.errorOptions
        })
      }

      // Set the actual value
      const result = this.onSetState(path, value, options)

      // Update statistics
      const operationTime = performance.now() - startTime
      this.updateSuccessStats(operationTime)

      // Remove from active operations
      this.untrackOperation(operationId)

      // Emit success event
      if (this.options.enableEvents) {
        this.onEmitEvent('state:async-success', {
          path,
          value,
          operationId,
          duration: operationTime,
          timestamp: Date.now()
        })
      }

      if (this.options.enableDebug) {
        console.log(
          `✅ StateAsync: setStateAsync('${path}') completed in ${operationTime.toFixed(2)}ms`
        )
      }

      return result
    } catch (error) {
      // Clear loading state on error
      if (options.loadingPath) {
        this.onSetState(options.loadingPath, false, {
          skipHistory: true,
          ...options.loadingOptions
        })
      }

      // Set error state if requested
      if (options.errorPath) {
        const errorMessage = this.formatError(error)
        this.onSetState(options.errorPath, errorMessage, {
          skipHistory: true,
          ...options.errorOptions
        })
      }

      // Update statistics
      const operationTime = performance.now() - startTime
      this.updateFailureStats(operationTime, error)

      // Remove from active operations
      this.untrackOperation(operationId)

      // Emit error event
      if (this.options.enableEvents) {
        this.onEmitEvent('state:async-error', {
          path,
          error,
          operationId,
          duration: operationTime,
          timestamp: Date.now()
        })
      }

      if (this.options.enableDebug) {
        console.error(
          `❌ StateAsync: setStateAsync('${path}') failed after ${operationTime.toFixed(2)}ms:`,
          error
        )
      }

      throw error
    }
  }

  /**
   * Set multiple async state values with coordinated loading states
   * @param {Array} operations - Array of {path, valueOrPromise, options} objects
   * @param {Object} batchOptions - Batch operation options
   * @returns {Promise<Array>} Array of results
   */
  async batchSetStateAsync(operations, batchOptions = {}) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return []
    }

    const operationId = this.generateOperationId()
    const startTime = performance.now()

    // Set global loading state if requested
    if (batchOptions.loadingPath) {
      this.onSetState(batchOptions.loadingPath, true, {
        skipHistory: true,
        ...batchOptions.loadingOptions
      })
    }

    try {
      // Execute all operations concurrently or sequentially
      const results = batchOptions.sequential
        ? await this.executeSequentially(operations)
        : await this.executeConcurrently(operations)

      // Clear global loading state
      if (batchOptions.loadingPath) {
        this.onSetState(batchOptions.loadingPath, false, {
          skipHistory: true,
          ...batchOptions.loadingOptions
        })
      }

      // Emit batch success event
      if (this.options.enableEvents) {
        this.onEmitEvent('state:async-batch-success', {
          operations: operations.map(op => op.path),
          results,
          operationId,
          duration: performance.now() - startTime,
          timestamp: Date.now()
        })
      }

      return results
    } catch (error) {
      // Clear global loading state on error
      if (batchOptions.loadingPath) {
        this.onSetState(batchOptions.loadingPath, false, {
          skipHistory: true,
          ...batchOptions.loadingOptions
        })
      }

      // Set global error state if requested
      if (batchOptions.errorPath) {
        const errorMessage = this.formatError(error)
        this.onSetState(batchOptions.errorPath, errorMessage, {
          skipHistory: true,
          ...batchOptions.errorOptions
        })
      }

      // Emit batch error event
      if (this.options.enableEvents) {
        this.onEmitEvent('state:async-batch-error', {
          operations: operations.map(op => op.path),
          error,
          operationId,
          duration: performance.now() - startTime,
          timestamp: Date.now()
        })
      }

      throw error
    }
  }

  /**
   * Cancel an active async operation
   * @param {string} operationId - ID of operation to cancel
   * @returns {boolean} True if operation was cancelled
   */
  cancelOperation(operationId) {
    const operation = this.activeOperations.get(operationId)
    if (!operation) {
      return false
    }

    // Cancel the operation if it supports cancellation
    if (operation.controller) {
      operation.controller.abort()
    }

    // Clean up loading states
    if (operation.options.loadingPath) {
      this.onSetState(operation.options.loadingPath, false, { skipHistory: true })
    }

    this.untrackOperation(operationId)

    if (this.options.enableEvents) {
      this.onEmitEvent('state:async-cancelled', {
        path: operation.path,
        operationId,
        timestamp: Date.now()
      })
    }

    return true
  }

  /**
   * Cancel all active async operations
   * @returns {number} Number of operations cancelled
   */
  cancelAllOperations() {
    const operationIds = Array.from(this.activeOperations.keys())
    let cancelledCount = 0

    for (const operationId of operationIds) {
      if (this.cancelOperation(operationId)) {
        cancelledCount++
      }
    }

    return cancelledCount
  }

  /**
   * Get information about active async operations
   * @returns {Array} Array of active operation information
   */
  getActiveOperations() {
    return Array.from(this.activeOperations.entries()).map(([id, operation]) => ({
      id,
      path: operation.path,
      startTime: operation.startTime,
      duration: performance.now() - operation.startTime,
      options: { ...operation.options }
    }))
  }

  /**
   * Get async operation statistics
   * @returns {Object} Statistics object
   */
  getAsyncStats() {
    return {
      ...this.stats,
      activeOperations: this.activeOperations.size,
      longestRunningOperation: this.getLongestRunningOperation()
    }
  }

  /**
   * Reset async statistics
   */
  resetStats() {
    this.stats = {
      totalAsyncOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageOperationTime: 0,
      timeouts: 0,
      retries: 0
    }
  }

  /**
   * Configure async options
   * @param {Object} newOptions - New configuration options
   */
  configure(newOptions) {
    this.options = { ...this.options, ...newOptions }
  }

  // Private methods

  /**
   * Generate unique operation ID
   * @private
   */
  generateOperationId() {
    return generateIdentityId(`async_${++this.operationCounter}`)
  }

  /**
   * Track an active operation
   * @private
   */
  trackOperation(operationId, path, options) {
    this.activeOperations.set(operationId, {
      path,
      options,
      startTime: performance.now(),
      controller: options.abortController || null
    })
  }

  /**
   * Remove operation from tracking
   * @private
   */
  untrackOperation(operationId) {
    this.activeOperations.delete(operationId)
  }

  /**
   * Add timeout to a promise
   * @private
   */
  withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          this.stats.timeouts++
          reject(new Error(`Operation timed out after ${timeout}ms`))
        }, timeout)
      })
    ])
  }

  /**
   * Add retry logic to a promise-generating function
   * @param {Function} promiseFactory - Function that returns a new promise
   * @param {number} retryAttempts - Number of retry attempts
   * @param {number} retryDelay - Delay between retries in ms
   * @private
   */
  async withRetry(promiseFactory, retryAttempts, retryDelay) {
    let lastError

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Create a fresh promise for each attempt
        const promise = typeof promiseFactory === 'function' ? promiseFactory() : promiseFactory
        return await promise
      } catch (error) {
        lastError = error

        if (attempt < retryAttempts) {
          this.stats.retries++
          await this.delay(retryDelay)

          if (this.options.enableDebug) {
            console.log(
              `🔄 StateAsync: Retrying operation (attempt ${attempt + 2}/${retryAttempts + 1})`
            )
          }
        }
      }
    }

    throw lastError
  }

  /**
   * Execute operations sequentially
   * @private
   */
  async executeSequentially(operations) {
    const results = []
    for (const operation of operations) {
      const result = await this.setStateAsync(
        operation.path,
        operation.valueOrPromise,
        operation.options
      )
      results.push(result)
    }
    return results
  }

  /**
   * Execute operations concurrently
   * @private
   */
  async executeConcurrently(operations) {
    const promises = operations.map(operation =>
      this.setStateAsync(operation.path, operation.valueOrPromise, operation.options)
    )
    return Promise.all(promises)
  }

  /**
   * Format error for display
   * @private
   */
  formatError(error) {
    if (error && error.message) {
      return error.message
    }
    return typeof error === 'string' ? error : 'Unknown error'
  }

  /**
   * Update success statistics
   * @private
   */
  updateSuccessStats(operationTime) {
    this.stats.successfulOperations++
    this.updateAverageTime(operationTime)
  }

  /**
   * Update failure statistics
   * @private
   */
  updateFailureStats(operationTime, _error) {
    this.stats.failedOperations++
    this.updateAverageTime(operationTime)
  }

  /**
   * Update average operation time
   * @private
   */
  updateAverageTime(time) {
    const totalOps = this.stats.successfulOperations + this.stats.failedOperations
    if (totalOps === 1) {
      this.stats.averageOperationTime = time
    } else {
      this.stats.averageOperationTime =
        (this.stats.averageOperationTime * (totalOps - 1) + time) / totalOps
    }
  }

  /**
   * Get longest running operation info
   * @private
   */
  getLongestRunningOperation() {
    if (this.activeOperations.size === 0) {
      return null
    }

    let longest = null
    let maxDuration = 0

    for (const [id, operation] of this.activeOperations) {
      const duration = performance.now() - operation.startTime
      if (duration > maxDuration) {
        maxDuration = duration
        longest = { id, path: operation.path, duration }
      }
    }

    return longest
  }

  /**
   * Create a delay promise
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default StateAsync
