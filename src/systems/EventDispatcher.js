/**
 * EventDispatcher - Pure Functional Implementation
 * NO CLASSES, NO `this`, NO COMPATIBILITY LAYERS
 */

// ===== PURE EVENT FUNCTIONS =====

const matchesPattern = (eventName, pattern) => {
  if (pattern === '*') return true
  if (pattern === eventName) return true

  if (pattern.includes('*')) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return regex.test(eventName)
  }

  return false
}

const createSubscriptionId = () => {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ===== CURRIED EVENT FUNCTIONS =====

export const createEventDispatcher = (options = {}) => {
  const config = {
    enableLogging: false,
    maxListeners: 100,
    enablePatterns: true,
    ...options
  }

  const listeners = new Map()
  const eventHistory = []
  let isEmitting = false
  const pendingEvents = []

  const logEvent = (eventName, data) => {
    if (config.enableLogging) {
      console.log(`🔥 Event: ${eventName}`, data)
    }
  }

  const addToHistory = (eventName, data) => {
    eventHistory.push({
      event: eventName,
      data,
      timestamp: Date.now()
    })

    if (eventHistory.length > 1000) {
      eventHistory.shift()
    }
  }

  return {
    // Curried API
    on: eventPattern => callback => {
      if (typeof callback !== 'function') {
        throw new Error('Event callback must be a function')
      }

      const subscriptionId = createSubscriptionId()

      if (!listeners.has(eventPattern)) {
        listeners.set(eventPattern, new Map())
      }

      listeners.get(eventPattern).set(subscriptionId, callback)

      let totalListeners = 0
      for (const patternMap of listeners.values()) {
        totalListeners += patternMap.size
      }

      if (totalListeners > config.maxListeners) {
        console.warn(
          `Event dispatcher has ${totalListeners} listeners (max: ${config.maxListeners})`
        )
      }

      logEvent('listener:added', { pattern: eventPattern, subscriptionId })

      return () => {
        const patternMap = listeners.get(eventPattern)
        if (patternMap) {
          patternMap.delete(subscriptionId)
          if (patternMap.size === 0) {
            listeners.delete(eventPattern)
          }
        }
        logEvent('listener:removed', { pattern: eventPattern, subscriptionId })
      }
    },

    // Non-curried API for compatibility
    addEventListener: (eventPattern, callback) => {
      return createEventDispatcher(config).on(eventPattern)(callback)
    },

    // Traditional off method for compatibility
    off: (eventPattern, callback) => {
      if (!eventPattern) {
        listeners.clear()
        return
      }

      const patternMap = listeners.get(eventPattern)
      if (!patternMap) return

      if (!callback) {
        listeners.delete(eventPattern)
        return
      }

      // Find and remove specific callback
      for (const [id, cb] of patternMap.entries()) {
        if (cb === callback) {
          patternMap.delete(id)
          if (patternMap.size === 0) {
            listeners.delete(eventPattern)
          }
          break
        }
      }
    },

    // Properties for test compatibility
    listeners,
    eventHistory,
    debugMode: config.enableLogging,

    once: eventPattern => callback => {
      const unsubscribe = createEventDispatcher(config).on(eventPattern)(data => {
        unsubscribe()
        callback(data)
      })
      return unsubscribe
    },

    emit: (eventName, data = {}) => {
      if (isEmitting) {
        pendingEvents.push({ eventName, data })
        return
      }

      logEvent(eventName, data)
      addToHistory(eventName, data)

      isEmitting = true

      try {
        const matchingCallbacks = []

        for (const [pattern, callbackMap] of listeners.entries()) {
          if (config.enablePatterns ? matchesPattern(eventName, pattern) : pattern === eventName) {
            for (const callback of callbackMap.values()) {
              matchingCallbacks.push(callback)
            }
          }
        }

        for (const callback of matchingCallbacks) {
          try {
            callback(data, eventName)
          } catch (error) {
            console.error(`Event listener error for ${eventName}:`, error)
          }
        }
      } finally {
        isEmitting = false

        if (pendingEvents.length > 0) {
          const nextEvent = pendingEvents.shift()
          setImmediate(() => {
            createEventDispatcher(config).emit(nextEvent.eventName, nextEvent.data)
          })
        }
      }
    },

    removeAllListeners: eventPattern => {
      if (eventPattern) {
        listeners.delete(eventPattern)
        logEvent('listeners:removed', { pattern: eventPattern })
      } else {
        listeners.clear()
        logEvent('listeners:cleared', {})
      }
    },

    getListenerCount: eventPattern => {
      if (eventPattern) {
        const patternMap = listeners.get(eventPattern)
        return patternMap ? patternMap.size : 0
      }

      let total = 0
      for (const patternMap of listeners.values()) {
        total += patternMap.size
      }
      return total
    },

    getEventHistory: () => [...eventHistory],
    clearHistory: () => {
      eventHistory.length = 0
    },
    _getListenerPatterns: () => Array.from(listeners.keys())
  }
}

// Create a default instance for backward compatibility (temporary)
export const eventDispatcher = createEventDispatcher()

// Export class-compatible function for backward compatibility
export const EventDispatcher = createEventDispatcher

// Default export
export default createEventDispatcher
