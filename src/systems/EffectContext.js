/**
 * EffectContext - Factory Function for Side Effect Management
 * Inspired by Redux-Saga's effect context
 * Converted from ES6 class to factory function following Entity-State architecture
 */

/**
 * Creates a new EffectContext instance with closure-based state management
 * @param {Object} effectManager - The effect manager instance
 * @param {Object} eventDispatcher - The event dispatcher instance
 * @returns {Object} EffectContext instance with all methods
 */
export function createEffectContext(effectManager, eventDispatcher) {
  // Private state using closure variables (replaces 'this' properties)
  const cancelToken = { cancelled: false }
  const children = new Set()

  /**
   * Call an async function and wait for its completion
   * @param {Function} fn - Function to call
   * @param {...*} args - Arguments to pass to the function
   * @returns {Promise} Promise that resolves with the function result
   */
  async function call(fn, ...args) {
    if (cancelToken.cancelled) {
      throw new Error('Effect was cancelled')
    }

    if (typeof fn !== 'function') {
      throw new Error('call() requires a function as first argument')
    }

    try {
      return await fn(...args)
    } catch (error) {
      // Emit error event for centralized error handling
      eventDispatcher.emit('effect:error', {
        type: 'call',
        function: fn.name || 'anonymous',
        args,
        error,
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Fork an async function (fire and forget)
   * @param {Function} fn - Function to fork
   * @param {...*} args - Arguments to pass to the function
   * @returns {Promise} Promise that resolves immediately (non-blocking)
   */
  function fork(fn, ...args) {
    if (cancelToken.cancelled) {
      return Promise.resolve()
    }

    if (typeof fn !== 'function') {
      throw new Error('fork() requires a function as first argument')
    }

    // Execute asynchronously without waiting
    const forkedPromise = (async () => {
      try {
        return await fn(...args)
      } catch (error) {
        // Emit error event for forked operations
        eventDispatcher.emit('effect:error', {
          type: 'fork',
          function: fn.name || 'anonymous',
          args,
          error,
          timestamp: Date.now()
        })
        // Don't re-throw in forked operations
        return null
      }
    })()

    // Track the forked promise for potential cancellation
    effectManager.trackForkedEffect(forkedPromise)

    return forkedPromise
  }

  /**
   * Dispatch a new event
   * @param {string} eventName - Event name to dispatch
   * @param {*} data - Data to pass with the event
   * @param {Object} options - Dispatch options
   * @returns {boolean} True if event had listeners
   */
  function put(eventName, data = null, options = {}) {
    if (cancelToken.cancelled) {
      return false
    }

    if (typeof eventName !== 'string' || !eventName.trim()) {
      throw new Error('put() requires a non-empty string as event name')
    }

    return eventDispatcher.emit(eventName, data, options)
  }

  /**
   * Wait for an event to be emitted (basic implementation)
   * @param {string} eventName - Event name to wait for
   * @param {number} timeout - Timeout in milliseconds (optional)
   * @returns {Promise} Promise that resolves with event data
   */
  function take(eventName, timeout = null) {
    if (cancelToken.cancelled) {
      return Promise.reject(new Error('Effect was cancelled'))
    }

    if (typeof eventName !== 'string' || !eventName.trim()) {
      throw new Error('take() requires a non-empty string as event name')
    }

    return new Promise((resolve, reject) => {
      let timeoutId = null

      // Set up timeout if specified
      if (timeout !== null && timeout > 0) {
        timeoutId = setTimeout(() => {
          unsubscribe()
          reject(new Error(`take() timeout after ${timeout}ms waiting for '${eventName}'`))
        }, timeout)
      }

      // Subscribe to the event
      const unsubscribe = eventDispatcher.once(eventName, data => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        resolve(data)
      })

      // Handle cancellation
      if (cancelToken.cancelled) {
        unsubscribe()
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        reject(new Error('Effect was cancelled'))
      }
    })
  }

  /**
   * Get current state from state manager (if available)
   * @param {string} path - Path to state property (optional)
   * @returns {*} Current state or state property
   */
  function select(path = null) {
    if (cancelToken.cancelled) {
      return null
    }

    // This will be implemented when we integrate with StateManager
    // For now, emit an event to request state
    eventDispatcher.emit('state:request', { path })
    return null
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   */
  function delay(ms) {
    if (cancelToken.cancelled) {
      return Promise.resolve()
    }

    if (typeof ms !== 'number' || ms < 0) {
      throw new Error('delay() requires a non-negative number')
    }

    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        // Check cancellation during timeout callback
        if (!cancelToken.cancelled) {
          resolve()
        }
      }, ms)

      // Store timeout ID for potential cancellation - but don't auto-cleanup during tests
      if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
        effectManager.trackTimeout(timeoutId)
      }
    })
  }

  /**
   * Race multiple effects - returns result of the first effect to complete
   * @param {Object} effects - Object with effect names as keys and promises as values
   * @returns {Promise} Promise that resolves with {winner, result} of the first completed effect
   */
  async function race(effects) {
    if (cancelToken.cancelled) {
      return Promise.resolve()
    }

    if (typeof effects !== 'object' || effects === null) {
      throw new Error('race() requires an object with effects')
    }

    const effectNames = Object.keys(effects)
    if (effectNames.length === 0) {
      throw new Error('race() requires at least one effect')
    }

    // Create promises with their names attached
    const racePromises = effectNames.map(name =>
      Promise.resolve(effects[name]).then(result => ({ winner: name, result }))
    )

    try {
      const winner = await Promise.race(racePromises)
      return winner
    } catch (error) {
      // Emit error event for race operations
      eventDispatcher.emit('effect:error', {
        type: 'race',
        effects: effectNames,
        error,
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Wait for all effects to complete
   * @param {Object|Array} effects - Object with effect names as keys or array of effects
   * @returns {Promise} Promise that resolves with results of all effects
   */
  async function all(effects) {
    if (cancelToken.cancelled) {
      return Promise.resolve()
    }

    if (typeof effects !== 'object' || effects === null) {
      throw new Error('all() requires an object or array with effects')
    }

    const isArray = Array.isArray(effects)
    const effectKeys = isArray ? effects.map((_, index) => index) : Object.keys(effects)
    const effectValues = isArray ? effects : Object.values(effects)

    if (effectKeys.length === 0) {
      return isArray ? [] : {}
    }

    try {
      // Wait for all effects to complete
      const results = await Promise.all(effectValues)

      // Return results in the same structure as input
      if (isArray) {
        return results
      } else {
        const resultObj = {}
        effectKeys.forEach((key, index) => {
          resultObj[key] = results[index]
        })
        return resultObj
      }
    } catch (error) {
      // Emit error event for all operations
      eventDispatcher.emit('effect:error', {
        type: 'all',
        effects: effectKeys,
        error,
        timestamp: Date.now()
      })
      throw error
    }
  }

  /**
   * Cancel this effect context
   */
  function cancel() {
    cancelToken.cancelled = true
    // Cancel all child tasks
    children.forEach(child => {
      child.cancelled = true
    })
  }

  /**
   * Check if this effect context is cancelled
   * @returns {boolean} True if cancelled
   */
  function isCancelled() {
    return cancelToken.cancelled
  }

  // Return the public interface - all functions bound to closure variables
  return {
    call,
    fork,
    put,
    take,
    select,
    delay,
    race,
    all,
    cancel,
    isCancelled,
    // Add effectManager and eventDispatcher for compatibility
    effectManager,
    eventDispatcher,
    // Add cancelToken for external access if needed
    get cancelToken() {
      return cancelToken
    }
  }
}
