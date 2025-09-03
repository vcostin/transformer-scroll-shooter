/**
 * StateAsync - Factory Function for Asynchronous State Management
 *
 * Handles:
 * - Async state updates with loading and error states
 * - Promise-based state management
 * - Loading state management and cleanup
 * - Error handling and error state management
 * - Async operation tracking and debugging
 * - Event emission for async operations
 * Converted from ES6 class to factory function following Entity-State architecture
 */

/**
 * Creates a new StateAsync instance with closure-based state management
 * @param {Object} options - Configuration options
 * @param {Object} callbacks - External system integration callbacks
 * @returns {Object} StateAsync instance with all methods
 */
export function createStateAsync(options = {}, callbacks = {}) {
  // Private state using closure variables (replaces 'this' properties)
  const configuration = {
    enableEvents: options.enableEvents !== false,
    enableDebug: options.enableDebug || false,
    defaultTimeout: options.defaultTimeout || 30000, // 30 seconds
    retryAttempts: options.retryAttempts || 0,
    retryDelay: options.retryDelay || 1000,
    ...options
  }

  // Callbacks for external system integration
  const onSetState = callbacks.onSetState || (() => false)
  const onEmitEvent = callbacks.onEmitEvent || (() => {})

  // Active async operations tracking
  const activeOperations = new Map()
  let operationCounter = 0

  // Statistics
  const stats = {
    totalAsyncOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageOperationTime: 0,
    timeouts: 0,
    retries: 0
  }

  /**
   * Set state asynchronously with optional loading and error states
   * @param {string} path - Dot-notation path to state property
   * @param {Promise|*} valueOrPromise - Value or Promise that resolves to value
   * @param {Object} options - Update options
   * @returns {Promise} Promise that resolves when state is updated
   */
  async function setStateAsync(path, valueOrPromise, options = {}) {
    // If it's not a promise, use direct state setting
    if (!valueOrPromise || typeof valueOrPromise.then !== 'function') {
      return onSetState(path, valueOrPromise, options)
    }

    const operationId = generateOperationId()
    const startTime = performance.now()

    // Track operation
    trackOperation(operationId, path, options)
    stats.totalAsyncOperations++

    try {
      // Set loading state if requested
      if (options.loadingPath) {
        onSetState(options.loadingPath, true, {
          skipHistory: true,
          ...options.loadingOptions
        })
      }

      // Apply timeout if specified
      const promise = options.timeout
        ? withTimeout(valueOrPromise, options.timeout)
        : valueOrPromise

      // Apply retry logic if specified
      const finalPromise =
        options.retryAttempts || configuration.retryAttempts
          ? withRetry(
              () => valueOrPromise,
              options.retryAttempts || configuration.retryAttempts,
              options.retryDelay || configuration.retryDelay
            )
          : promise

      const value = await finalPromise

      // Clear loading state
      if (options.loadingPath) {
        onSetState(options.loadingPath, false, {
          skipHistory: true,
          ...options.loadingOptions
        })
      }

      // Clear any existing error state
      if (options.errorPath) {
        onSetState(options.errorPath, null, {
          skipHistory: true,
          ...options.errorOptions
        })
      }

      // Set the actual value
      const result = onSetState(path, value, options)

      // Update statistics
      const operationTime = performance.now() - startTime
      updateSuccessStats(operationTime)

      // Remove from active operations
      untrackOperation(operationId)

      // Emit success event
      if (configuration.enableEvents) {
        onEmitEvent('state:async-success', {
          path,
          value,
          operationId,
          duration: operationTime,
          timestamp: Date.now()
        })
      }

      if (configuration.enableDebug) {
        console.log(
          `✅ StateAsync: setStateAsync('${path}') completed in ${operationTime.toFixed(2)}ms`
        )
      }

      return result
    } catch (error) {
      // Clear loading state
      if (options.loadingPath) {
        onSetState(options.loadingPath, false, {
          skipHistory: true,
          ...options.loadingOptions
        })
      }

      // Set error state if requested
      if (options.errorPath) {
        const errorMessage = formatError(error)
        onSetState(options.errorPath, errorMessage, {
          skipHistory: true,
          ...options.errorOptions
        })
      }

      // Update statistics
      const operationTime = performance.now() - startTime
      updateFailureStats(operationTime, error)

      // Remove from active operations
      untrackOperation(operationId)

      // Emit error event
      if (configuration.enableEvents) {
        onEmitEvent('state:async-error', {
          path,
          error,
          operationId,
          duration: operationTime,
          timestamp: Date.now()
        })
      }

      if (configuration.enableDebug) {
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
  async function batchSetStateAsync(operations, batchOptions = {}) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return []
    }

    const operationId = generateOperationId()
    const startTime = performance.now()

    // Set global loading state if requested
    if (batchOptions.loadingPath) {
      onSetState(batchOptions.loadingPath, true, {
        skipHistory: true,
        ...batchOptions.loadingOptions
      })
    }

    try {
      let results
      if (batchOptions.sequential) {
        results = await executeSequentially(operations)
      } else {
        results = await executeConcurrently(operations)
      }

      // Clear global loading state
      if (batchOptions.loadingPath) {
        onSetState(batchOptions.loadingPath, false, {
          skipHistory: true,
          ...batchOptions.loadingOptions
        })
      }

      // Update statistics
      const operationTime = performance.now() - startTime
      updateSuccessStats(operationTime)

      // Emit batch success event
      if (configuration.enableEvents) {
        onEmitEvent('state:async-batch-success', {
          operations: operations.map(op => op.path),
          results: results,
          operationId,
          duration: operationTime,
          timestamp: Date.now()
        })
      }

      return results
    } catch (error) {
      // Clear global loading state
      if (batchOptions.loadingPath) {
        onSetState(batchOptions.loadingPath, false, {
          skipHistory: true,
          ...batchOptions.loadingOptions
        })
      }

      // Set error state if requested
      if (batchOptions.errorPath) {
        onSetState(batchOptions.errorPath, formatError(error), {
          skipHistory: true,
          ...batchOptions.errorOptions
        })
      }

      // Update statistics
      const operationTime = performance.now() - startTime
      updateFailureStats(operationTime, error)

      // Emit batch error event
      if (configuration.enableEvents) {
        onEmitEvent('state:batch-error', {
          operations: operations.length,
          error,
          operationId,
          duration: operationTime,
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
  function cancelOperation(operationId) {
    if (activeOperations.has(operationId)) {
      const operation = activeOperations.get(operationId)
      operation.cancelled = true

      // Clear loading state if operation has loadingPath
      if (operation.options.loadingPath) {
        onSetState(operation.options.loadingPath, false, {
          skipHistory: true
        })
      }

      untrackOperation(operationId)

      if (configuration.enableEvents) {
        onEmitEvent('state:operation-cancelled', {
          operationId,
          path: operation.path,
          timestamp: Date.now()
        })
      }

      return true
    }
    return false
  }

  /**
   * Cancel all active async operations
   * @returns {number} Number of operations cancelled
   */
  function cancelAllOperations() {
    const count = activeOperations.size
    const operations = Array.from(activeOperations.keys())

    operations.forEach(operationId => {
      cancelOperation(operationId)
    })

    if (configuration.enableEvents && count > 0) {
      onEmitEvent('state:all-operations-cancelled', {
        count,
        timestamp: Date.now()
      })
    }

    return count
  }

  /**
   * Get current active operations
   * @returns {Array} Array of active operation info
   */
  function getActiveOperations() {
    return Array.from(activeOperations.entries()).map(([id, operation]) => ({
      id,
      path: operation.path,
      startTime: operation.startTime,
      duration: performance.now() - operation.startTime
    }))
  }

  /**
   * Get async operation statistics
   * @returns {Object} Statistics object
   */
  function getAsyncStats() {
    const longestRunningOperation = getLongestRunningOperation()
    return {
      ...stats,
      activeOperations: activeOperations.size,
      longestRunningOperation
    }
  }

  /**
   * Reset statistics
   */
  function resetStats() {
    stats.totalAsyncOperations = 0
    stats.successfulOperations = 0
    stats.failedOperations = 0
    stats.averageOperationTime = 0
    stats.timeouts = 0
    stats.retries = 0
  }

  /**
   * Update configuration options
   * @param {Object} newOptions - New configuration options
   */
  function configure(newOptions) {
    Object.assign(configuration, newOptions)
  }

  // Private helper functions

  /**
   * Generate unique operation ID
   * @returns {string} Unique operation ID
   */
  function generateOperationId() {
    return `async_${++operationCounter}_${Date.now()}`
  }

  /**
   * Track async operation
   * @param {string} operationId - Operation ID
   * @param {string} path - State path
   * @param {Object} options - Operation options
   */
  function trackOperation(operationId, path, options) {
    activeOperations.set(operationId, {
      path,
      startTime: performance.now(),
      options,
      cancelled: false
    })
  }

  /**
   * Remove operation from tracking
   * @param {string} operationId - Operation ID
   */
  function untrackOperation(operationId) {
    activeOperations.delete(operationId)
  }

  /**
   * Add timeout wrapper to promise
   * @param {Promise} promise - Promise to wrap
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Promise with timeout
   */
  function withTimeout(promise, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        stats.timeouts++
        reject(new Error(`Operation timed out after ${timeout}ms`))
      }, timeout)

      promise
        .then(value => {
          clearTimeout(timeoutId)
          resolve(value)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  /**
   * Add retry logic to promise factory
   * @param {Function} promiseFactory - Function that returns a promise
   * @param {number} retryAttempts - Number of retry attempts
   * @param {number} retryDelay - Delay between retries in milliseconds
   * @returns {Promise} Promise with retry logic
   */
  async function withRetry(promiseFactory, retryAttempts, retryDelay) {
    let lastError
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        return await promiseFactory()
      } catch (error) {
        lastError = error
        if (attempt < retryAttempts) {
          stats.retries++
          await delay(retryDelay)
        }
      }
    }
    throw lastError
  }

  /**
   * Execute operations sequentially
   * @param {Array} operations - Array of operations
   * @returns {Promise<Array>} Array of results
   */
  async function executeSequentially(operations) {
    const results = []
    for (const operation of operations) {
      const result = await setStateAsync(
        operation.path,
        operation.valueOrPromise,
        operation.options || {}
      )
      results.push(result)
    }
    return results
  }

  /**
   * Execute operations concurrently
   * @param {Array} operations - Array of operations
   * @returns {Promise<Array>} Array of results
   */
  async function executeConcurrently(operations) {
    const promises = operations.map(operation =>
      setStateAsync(operation.path, operation.valueOrPromise, operation.options || {})
    )
    return Promise.all(promises)
  }

  /**
   * Update success statistics
   * @param {number} operationTime - Operation duration
   */
  function updateSuccessStats(operationTime) {
    stats.successfulOperations++
    stats.averageOperationTime =
      (stats.averageOperationTime * (stats.successfulOperations - 1) + operationTime) /
      stats.successfulOperations
  }

  /**
   * Update failure statistics
   * @param {number} _operationTime - Operation duration
   * @param {Error} _error - Error that occurred
   */
  function updateFailureStats(_operationTime, _error) {
    stats.failedOperations++
    // Note: timeout stats are already incremented in withTimeout
  }

  /**
   * Get longest running operation info
   * @returns {Object|null} Longest running operation or null
   */
  function getLongestRunningOperation() {
    if (activeOperations.size === 0) return null

    let longest = null
    let maxDuration = 0

    for (const [id, operation] of activeOperations) {
      const duration = performance.now() - operation.startTime
      if (duration > maxDuration) {
        maxDuration = duration
        longest = { id, path: operation.path, duration }
      }
    }

    return longest
  }

  /**
   * Format error for consistent error handling
   * @param {*} error - Error to format
   * @returns {string} Formatted error message
   */
  function formatError(error) {
    if (typeof error === 'string') return error
    if (error && typeof error === 'object' && error.message) return error.message
    return 'Unknown error'
  }

  /**
   * Create a delay promise
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Return the public interface - all functions bound to closure variables
  return {
    setStateAsync,
    batchSetStateAsync,
    cancelOperation,
    cancelAllOperations,
    getActiveOperations,
    getAsyncStats,
    resetStats,
    configure,
    // Add configuration access for compatibility
    get options() {
      return configuration
    },

    // Expose stats for test compatibility
    get stats() {
      return stats
    },

    // Expose activeOperations for test compatibility (should behave like a Map)
    get activeOperations() {
      return {
        size: activeOperations.size,
        has: key => activeOperations.has(key),
        get: key => activeOperations.get(key),
        keys: () => activeOperations.keys(),
        values: () => activeOperations.values(),
        entries: () => activeOperations.entries(),
        [Symbol.iterator]: () => activeOperations[Symbol.iterator]()
      }
    },

    // Expose generateOperationId method for test compatibility
    generateOperationId
  }
}
