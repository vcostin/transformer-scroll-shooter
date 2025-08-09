/**
 * EffectContext - Provides controlled operations for side effects
 * Inspired by Redux-Saga's effect context
 */
export class EffectContext {
  constructor(effectManager, eventDispatcher) {
    this.effectManager = effectManager
    this.eventDispatcher = eventDispatcher
    this.cancelToken = { cancelled: false }
  }

  /**
   * Call an async function and wait for its completion
   * @param {Function} fn - Function to call
   * @param {...*} args - Arguments to pass to the function
   * @returns {Promise} Promise that resolves with the function result
   */
  async call(fn, ...args) {
    if (this.cancelToken.cancelled) {
      throw new Error('Effect was cancelled')
    }

    if (typeof fn !== 'function') {
      throw new Error('call() requires a function as first argument')
    }

    try {
      return await fn(...args)
    } catch (error) {
      // Emit error event for centralized error handling
      this.eventDispatcher.emit('effect:error', {
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
  fork(fn, ...args) {
    if (this.cancelToken.cancelled) {
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
        this.eventDispatcher.emit('effect:error', {
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
    this.effectManager.trackForkedEffect(forkedPromise)

    return forkedPromise
  }

  /**
   * Dispatch a new event
   * @param {string} eventName - Event name to dispatch
   * @param {*} data - Data to pass with the event
   * @param {Object} options - Dispatch options
   * @returns {boolean} True if event had listeners
   */
  put(eventName, data = null, options = {}) {
    if (this.cancelToken.cancelled) {
      return false
    }

    if (typeof eventName !== 'string' || !eventName.trim()) {
      throw new Error('put() requires a non-empty string as event name')
    }

    return this.eventDispatcher.emit(eventName, data, options)
  }

  /**
   * Wait for an event to be emitted (basic implementation)
   * @param {string} eventName - Event name to wait for
   * @param {number} timeout - Timeout in milliseconds (optional)
   * @returns {Promise} Promise that resolves with event data
   */
  take(eventName, timeout = null) {
    if (this.cancelToken.cancelled) {
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
      const unsubscribe = this.eventDispatcher.once(eventName, data => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        resolve(data)
      })

      // Handle cancellation
      if (this.cancelToken.cancelled) {
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
  select(path = null) {
    if (this.cancelToken.cancelled) {
      return null
    }

    // This will be implemented when we integrate with StateManager
    // For now, emit an event to request state
    this.eventDispatcher.emit('state:request', { path })
    return null
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after the delay
   */
  delay(ms) {
    if (this.cancelToken.cancelled) {
      return Promise.resolve()
    }

    if (typeof ms !== 'number' || ms < 0) {
      throw new Error('delay() requires a non-negative number')
    }

    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        // Check cancellation during timeout callback
        if (!this.cancelToken.cancelled) {
          resolve()
        }
      }, ms)

      // Store timeout ID for potential cancellation
      this.effectManager.trackTimeout(timeoutId)
    })
  }

  /**
   * Race multiple effects - returns result of the first effect to complete
   * @param {Object} effects - Object with effect names as keys and promises as values
   * @returns {Promise} Promise that resolves with {winner, result} of the first completed effect
   */
  async race(effects) {
    if (this.cancelToken.cancelled) {
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
      this.eventDispatcher.emit('effect:error', {
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
  async all(effects) {
    if (this.cancelToken.cancelled) {
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
      this.eventDispatcher.emit('effect:error', {
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
  cancel() {
    this.cancelToken.cancelled = true
  }

  /**
   * Check if this effect context is cancelled
   * @returns {boolean} True if cancelled
   */
  isCancelled() {
    return this.cancelToken.cancelled
  }
}
