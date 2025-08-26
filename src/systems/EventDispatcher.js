/**
 * EventDispatcher - Pure Functional Implementation
 * NO CLASSES, NO `this`, NO COMPATIBILITY LAYERS
 */

import { generateIdentityId } from '../utils/IdGenerator.js'

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
  return generateIdentityId('sub')
}

// ===== CURRIED EVENT FUNCTIONS =====

export function createEventDispatcher(config = {}) {
  const defaultConfig = {
    maxListeners: 50,
    enableLogging: false,
    enablePatterns: true,
    maxHistorySize: 1000
  }

  config = { ...defaultConfig, ...config }

  const listeners = new Map()
  const eventHistory = []
  let isEmitting = false
  const pendingEvents = []

  const logEvent = (eventName, data) => {
    if (config.enableLogging) {
      if (eventName === 'listener:added') {
        console.log(`Subscribed to "${data.pattern}" with ID ${data.subscriptionId}`)
      } else {
        console.log(`🔥 Event: ${eventName}`, data)
      }
    }
  }

  const addToHistory = (eventName, data) => {
    eventHistory.push({
      eventName,
      data,
      timestamp: Date.now()
    })

    if (eventHistory.length > config.maxHistorySize) {
      eventHistory.shift()
    }
  }

  // Helper function to add listeners
  const addListener = (eventPattern, callback, options = {}) => {
    if (typeof eventPattern !== 'string' || !eventPattern.trim()) {
      throw new Error('Event name must be a non-empty string')
    }

    if (typeof callback !== 'function') {
      throw new Error('Handler must be a function')
    }

    const subscriptionId = createSubscriptionId()
    const priority = options.priority || 0

    if (!listeners.has(eventPattern)) {
      listeners.set(eventPattern, new Map())
    }

    // Store callback with metadata including priority
    listeners.get(eventPattern).set(subscriptionId, {
      callback,
      priority,
      subscriptionId
    })

    let totalListeners = 0
    for (const patternMap of listeners.values()) {
      totalListeners += patternMap.size
    }

    if (totalListeners > config.maxListeners) {
      console.warn(`Event dispatcher has ${totalListeners} listeners (max: ${config.maxListeners})`)
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
  }

  return {
    // Dual API: Both curried and traditional with priority support
    on: (eventPattern, callback, options) => {
      // If two or three parameters provided, use traditional API
      if (callback !== undefined) {
        return addListener(eventPattern, callback, options)
      }
      // If one parameter, use curried API
      return (callback, options) => addListener(eventPattern, callback, options)
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
      for (const [id, listenerData] of patternMap.entries()) {
        if (listenerData.callback === callback) {
          patternMap.delete(id)
          if (patternMap.size === 0) {
            listeners.delete(eventPattern)
          }
          break
        }
      }
    },

    // Once method with dual API
    once: (eventPattern, callback) => {
      // If two parameters provided, use traditional API
      if (callback !== undefined) {
        let isRemoved = false
        const unsubscribe = addListener(eventPattern, data => {
          if (!isRemoved) {
            isRemoved = true
            unsubscribe()
            callback(data)
          }
        })
        return unsubscribe
      }
      // If one parameter, use curried API

      return callback => {
        let isRemoved = false
        const unsubscribe = addListener(eventPattern, data => {
          if (!isRemoved) {
            isRemoved = true
            unsubscribe()
            callback(data)
          }
        })
        return unsubscribe
      }
    },

    emit: (eventName, data = {}, options = {}) => {
      if (typeof eventName !== 'string' || !eventName.trim()) {
        throw new Error('Event name must be a non-empty string')
      }

      if (options.async) {
        // Emit asynchronously by directly calling handlers
        setImmediate(() => {
          const matchingCallbacks = []

          for (const [pattern, callbackMap] of listeners.entries()) {
            if (
              config.enablePatterns ? matchesPattern(eventName, pattern) : pattern === eventName
            ) {
              for (const listenerData of callbackMap.values()) {
                matchingCallbacks.push(listenerData)
              }
            }
          }

          // Sort by priority (higher priority first)
          matchingCallbacks.sort((a, b) => b.priority - a.priority)

          for (const listenerData of matchingCallbacks) {
            try {
              listenerData.callback(data, eventName)
            } catch (error) {
              const errorMessage = `Error in event handler for '${eventName}':`
              console.error(errorMessage, error)

              // Emit error event for error handling
              const errorListeners = listeners.get('error')
              if (errorListeners && errorListeners.size > 0) {
                for (const errorListener of errorListeners.values()) {
                  try {
                    errorListener.callback(error, 'error')
                  } catch (nestedError) {
                    console.error('Error in error handler:', nestedError)
                  }
                }
              }
            }
          }
        })
        return true
      }

      if (isEmitting) {
        pendingEvents.push({ eventName, data })
        return false
      }

      logEvent(eventName, data)
      addToHistory(eventName, data)

      isEmitting = true
      let hasListeners = false

      try {
        const matchingCallbacks = []

        for (const [pattern, callbackMap] of listeners.entries()) {
          if (config.enablePatterns ? matchesPattern(eventName, pattern) : pattern === eventName) {
            for (const listenerData of callbackMap.values()) {
              matchingCallbacks.push(listenerData)
            }
          }
        }

        // Sort by priority (higher priority first)
        matchingCallbacks.sort((a, b) => b.priority - a.priority)

        hasListeners = matchingCallbacks.length > 0

        for (const listenerData of matchingCallbacks) {
          try {
            listenerData.callback(data, eventName)
          } catch (error) {
            const errorMessage = `Error in event handler for '${eventName}':`
            console.error(errorMessage, error)

            // Emit error event for error handling
            const errorListeners = listeners.get('error')
            if (errorListeners && errorListeners.size > 0) {
              for (const errorListener of errorListeners.values()) {
                try {
                  errorListener.callback(error, 'error')
                } catch (nestedError) {
                  console.error('Error in error handler:', nestedError)
                }
              }
            }
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

      return hasListeners
    },

    // Additional methods required by tests
    removeAllMatching: pattern => {
      if (!pattern) return

      for (const listenerPattern of listeners.keys()) {
        if (matchesPattern(listenerPattern, pattern)) {
          listeners.delete(listenerPattern)
        }
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

    getTotalListenerCount: () => {
      let total = 0
      for (const patternMap of listeners.values()) {
        total += patternMap.size
      }
      return total
    },

    getEventNames: () => {
      return Array.from(listeners.keys())
    },

    isValidEventName: eventName => {
      if (typeof eventName !== 'string') return false
      if (eventName.trim() === '') return false
      if (eventName.includes(' ')) return false
      if (eventName.includes('@')) return false
      return true
    },

    clear: () => {
      listeners.clear()
      eventHistory.length = 0
    },

    setDebugMode: enabled => {
      config.enableLogging = enabled
      if (enabled) {
        console.log('[EventDispatcher] Debug mode enabled')
      }
    },

    // Properties for test compatibility
    listeners,
    eventHistory,
    debugMode: config.enableLogging,

    get maxHistorySize() {
      return config.maxHistorySize
    },

    set maxHistorySize(value) {
      config.maxHistorySize = value
      // Trim current history if needed
      while (eventHistory.length > value) {
        eventHistory.shift()
      }
    },

    // Helper methods
    removeAllListeners: eventPattern => {
      if (eventPattern) {
        listeners.delete(eventPattern)
        logEvent('listeners:removed', { pattern: eventPattern })
      } else {
        listeners.clear()
        logEvent('listeners:cleared', {})
      }
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
