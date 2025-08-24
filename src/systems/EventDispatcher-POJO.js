/**
 * EventDispatcher POJO+Functional Implementation
 * Phase 4 migration applying proven POJO+Functional pattern
 */

// ===============================================
// POJO+Functional EventDispatcher Implementation
// ===============================================

/**
 * Factory function to create an EventDispatcher POJO
 * @param {Object} options - Configuration options
 * @returns {Object} EventDispatcher POJO with event system state
 */
export function createEventDispatcher(options = {}) {
  // Configuration with defaults
  const config = {
    maxHistorySize: 100,
    debugMode: false,
    ...options
  }

  // Create EventDispatcher POJO
  const eventDispatcher = {
    // Core state
    listeners: new Map(),
    wildcardPatterns: new Map(), // Cache for wildcard patterns
    _eventHistory: new Array(config.maxHistorySize), // Pre-allocated circular buffer
    historyIndex: 0, // Current position in circular buffer
    historyCount: 0, // Number of events stored
    maxHistorySize: config.maxHistorySize,
    debugMode: config.debugMode,
    _idCounter: 0 // More efficient ID generation
  }

  // Initialize event history array
  eventDispatcher._eventHistory.fill(null)

  return eventDispatcher
}

/**
 * Subscribe to an event with optional priority
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} eventName - Event name (supports namespacing with dots)
 * @param {Function} handler - Event handler function
 * @param {Object} options - Options object
 * @returns {Function} Unsubscribe function
 */
export function subscribeToEvent(eventDispatcher, eventName, handler, options = {}) {
  if (typeof eventName !== 'string' || !eventName.trim()) {
    throw new Error('Event name must be a non-empty string')
  }

  if (typeof handler !== 'function') {
    throw new Error('Handler must be a function')
  }

  const { priority = 0, once = false } = options

  if (!eventDispatcher.listeners.has(eventName)) {
    eventDispatcher.listeners.set(eventName, [])
  }

  const listener = {
    handler,
    priority,
    once,
    id: ++eventDispatcher._idCounter
  }

  const eventListeners = eventDispatcher.listeners.get(eventName)
  eventListeners.push(listener)

  // Sort by priority (higher priority first)
  eventListeners.sort((a, b) => b.priority - a.priority)

  // Cache wildcard patterns for optimization
  if (eventName.includes('*')) {
    cacheWildcardPattern(eventDispatcher, eventName)
  }

  debugLog(eventDispatcher, `Subscribed to '${eventName}' with priority ${priority}`)

  // Return unsubscribe function
  return () => unsubscribeFromEvent(eventDispatcher, eventName, handler)
}

/**
 * Subscribe to an event for one-time execution
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} eventName - Event name
 * @param {Function} handler - Event handler function
 * @param {Object} options - Options object
 * @returns {Function} Unsubscribe function
 */
export function subscribeOnceToEvent(eventDispatcher, eventName, handler, options = {}) {
  return subscribeToEvent(eventDispatcher, eventName, handler, { ...options, once: true })
}

/**
 * Unsubscribe from an event
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} eventName - Event name
 * @param {Function} handler - Handler to remove (optional - removes all if not provided)
 */
export function unsubscribeFromEvent(eventDispatcher, eventName, handler = null) {
  if (!eventDispatcher.listeners.has(eventName)) {
    return
  }

  const eventListeners = eventDispatcher.listeners.get(eventName)

  if (handler === null) {
    // Remove all listeners for this event
    eventDispatcher.listeners.delete(eventName)
    // Clean up wildcard pattern cache
    if (eventName.includes('*')) {
      eventDispatcher.wildcardPatterns.delete(eventName)
    }
    debugLog(eventDispatcher, `Removed all listeners for '${eventName}'`)
  } else {
    // Remove specific handler
    const index = eventListeners.findIndex(listener => listener.handler === handler)
    if (index !== -1) {
      eventListeners.splice(index, 1)
      debugLog(eventDispatcher, `Removed specific listener for '${eventName}'`)

      // Clean up empty event arrays and wildcard patterns
      if (eventListeners.length === 0) {
        eventDispatcher.listeners.delete(eventName)
        if (eventName.includes('*')) {
          eventDispatcher.wildcardPatterns.delete(eventName)
        }
      }
    }
  }
}

/**
 * Emit an event to all subscribers
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} eventName - Event name
 * @param {*} data - Data to pass to handlers
 * @param {Object} options - Emission options
 * @returns {boolean} True if event had listeners
 */
export function emitEvent(eventDispatcher, eventName, data = null, options = {}) {
  if (typeof eventName !== 'string' || !eventName.trim()) {
    throw new Error('Event name must be a non-empty string')
  }

  const { async = false } = options

  // Record event in history
  recordEvent(eventDispatcher, eventName, data)

  // Get direct listeners
  const directListeners = eventDispatcher.listeners.get(eventName) || []

  // Get wildcard listeners (namespace matching)
  const wildcardListeners = getWildcardListeners(eventDispatcher, eventName)

  // Combine and sort all listeners
  const allListeners = [...directListeners, ...wildcardListeners].sort(
    (a, b) => b.priority - a.priority
  )

  if (allListeners.length === 0) {
    debugLog(eventDispatcher, `No listeners for '${eventName}'`)
    return false
  }

  debugLog(eventDispatcher, `Emitting '${eventName}' to ${allListeners.length} listeners`)

  // Call handlers
  const toRemove = []

  for (const listener of allListeners) {
    try {
      if (async) {
        // Asynchronous execution
        Promise.resolve().then(() => listener.handler(data, eventName))
      } else {
        // Synchronous execution
        listener.handler(data, eventName)
      }

      // Mark once listeners for removal
      if (listener.once) {
        toRemove.push({ eventName, listener })
      }
    } catch (error) {
      console.error(`Error in event handler for '${eventName}':`, error)

      // Emit error event if not already emitting an error event (prevent infinite loops)
      if (eventName !== 'error') {
        emitEvent(eventDispatcher, 'error', {
          originalEvent: eventName,
          error,
          listener: listener.handler,
          timestamp: Date.now()
        })
      }

      // Continue executing other handlers
    }
  }

  // Remove once listeners
  toRemove.forEach(({ eventName, listener }) => {
    unsubscribeFromEvent(eventDispatcher, eventName, listener.handler)
  })

  return true
}

/**
 * Remove all listeners for events matching a pattern
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} pattern - Pattern to match (supports wildcards with *)
 */
export function removeAllMatchingEvents(eventDispatcher, pattern) {
  const regex = new RegExp(pattern.replace(/\*/g, '.*'))
  const eventsToRemove = []

  for (const eventName of eventDispatcher.listeners.keys()) {
    if (regex.test(eventName)) {
      eventsToRemove.push(eventName)
    }
  }

  eventsToRemove.forEach(eventName => unsubscribeFromEvent(eventDispatcher, eventName))
  debugLog(eventDispatcher, `Removed all listeners matching pattern '${pattern}'`)
}

/**
 * Get all event names that have listeners
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @returns {string[]} Array of event names
 */
export function getEventNames(eventDispatcher) {
  return Array.from(eventDispatcher.listeners.keys())
}

/**
 * Get listener count for an event
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} eventName - Event name
 * @returns {number} Number of listeners
 */
export function getListenerCount(eventDispatcher, eventName) {
  const listeners = eventDispatcher.listeners.get(eventName)
  return listeners ? listeners.length : 0
}

/**
 * Get total listener count across all events
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @returns {number} Total number of listeners
 */
export function getTotalListenerCount(eventDispatcher) {
  let total = 0
  for (const listeners of eventDispatcher.listeners.values()) {
    total += listeners.length
  }
  return total
}

/**
 * Get recent event history
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {number} limit - Max number of events to return
 * @returns {Array} Array of event objects
 */
export function getEventHistory(eventDispatcher, limit = 10) {
  const result = []
  const actualLimit = Math.min(limit, eventDispatcher.historyCount)

  for (let i = 0; i < actualLimit; i++) {
    const index =
      (eventDispatcher.historyIndex - i - 1 + eventDispatcher.maxHistorySize) %
      eventDispatcher.maxHistorySize
    const event = eventDispatcher._eventHistory[index]
    if (event) {
      result.unshift(event)
    }
  }

  return result
}

/**
 * Clear all listeners and history
 * @param {Object} eventDispatcher - EventDispatcher POJO
 */
export function clearEventDispatcher(eventDispatcher) {
  eventDispatcher.listeners.clear()
  eventDispatcher.wildcardPatterns.clear()
  eventDispatcher._eventHistory.fill(null) // Clear circular buffer
  eventDispatcher.historyIndex = 0
  eventDispatcher.historyCount = 0
  debugLog(eventDispatcher, 'Cleared all listeners and history')
}

/**
 * Enable/disable debug mode
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {boolean} enabled - Whether to enable debug mode
 */
export function setEventDispatcherDebugMode(eventDispatcher, enabled) {
  eventDispatcher.debugMode = enabled
  debugLog(eventDispatcher, `Debug mode ${enabled ? 'enabled' : 'disabled'}`)
}

/**
 * Validate event name format
 * @param {string} eventName - Event name to validate
 * @returns {boolean} True if valid
 */
export function isValidEventName(eventName) {
  if (typeof eventName !== 'string' || !eventName.trim()) {
    return false
  }

  // Basic validation: alphanumeric, dots, dashes, underscores
  return /^[a-zA-Z0-9._-]+$/.test(eventName)
}

// ===============================================
// Helper Functions (Private)
// ===============================================

/**
 * Record event in history using circular buffer
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} eventName - Event name
 * @param {*} data - Event data
 */
function recordEvent(eventDispatcher, eventName, data) {
  // Use circular buffer for better performance
  eventDispatcher._eventHistory[eventDispatcher.historyIndex] = {
    eventName,
    data,
    timestamp: Date.now()
  }

  eventDispatcher.historyIndex = (eventDispatcher.historyIndex + 1) % eventDispatcher.maxHistorySize
  if (eventDispatcher.historyCount < eventDispatcher.maxHistorySize) {
    eventDispatcher.historyCount++
  }
}

/**
 * Get wildcard listeners for an event name
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} eventName - Event name to match against
 * @returns {Array} Array of wildcard listeners
 */
function getWildcardListeners(eventDispatcher, eventName) {
  const wildcardListeners = []

  // Use cached regex patterns for better performance
  for (const [pattern, cachedRegex] of eventDispatcher.wildcardPatterns) {
    if (cachedRegex.test(eventName)) {
      const listeners = eventDispatcher.listeners.get(pattern)
      if (listeners) {
        wildcardListeners.push(...listeners)
      }
    }
  }

  return wildcardListeners
}

/**
 * Cache wildcard pattern for performance
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} pattern - Wildcard pattern to cache
 */
function cacheWildcardPattern(eventDispatcher, pattern) {
  if (!eventDispatcher.wildcardPatterns.has(pattern)) {
    const escapedPattern = escapeRegex(pattern).replace(/\\\*/g, '.*')
    const regex = new RegExp('^' + escapedPattern + '$')
    eventDispatcher.wildcardPatterns.set(pattern, regex)
  }
}

/**
 * Escape regex special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Debug logging utility
 * @param {Object} eventDispatcher - EventDispatcher POJO
 * @param {string} message - Debug message
 */
function debugLog(eventDispatcher, message) {
  if (eventDispatcher.debugMode) {
    console.log(`[EventDispatcher] ${message}`)
  }
}

// ===============================================
// Legacy Class Wrapper (Backward Compatibility)
// ===============================================
export class EventDispatcher {
  /**
   * Create a new EventDispatcher instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Create the POJO state and assign properties to this
    const eventDispatcherPOJO = createEventDispatcher(options)
    Object.assign(this, eventDispatcherPOJO)
  }

  /**
   * Get event history (for compatibility)
   */
  get eventHistory() {
    return getEventHistory(this)
  }

  /**
   * Subscribe to an event with optional priority
   * @param {string} eventName - Event name (supports namespacing with dots)
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options object
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler, options = {}) {
    return subscribeToEvent(this, eventName, handler, options)
  }

  /**
   * Subscribe to an event for one-time execution
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options object
   * @returns {Function} Unsubscribe function
   */
  once(eventName, handler, options = {}) {
    return subscribeOnceToEvent(this, eventName, handler, options)
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {Function} handler - Handler to remove (optional - removes all if not provided)
   */
  off(eventName, handler = null) {
    return unsubscribeFromEvent(this, eventName, handler)
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventName - Event name
   * @param {*} data - Data to pass to handlers
   * @param {Object} options - Emission options
   * @returns {boolean} True if event had listeners
   */
  emit(eventName, data = null, options = {}) {
    return emitEvent(this, eventName, data, options)
  }

  /**
   * Remove all listeners for events matching a pattern
   * @param {string} pattern - Pattern to match (supports wildcards with *)
   */
  removeAllMatching(pattern) {
    return removeAllMatchingEvents(this, pattern)
  }

  /**
   * Get all event names that have listeners
   * @returns {string[]} Array of event names
   */
  getEventNames() {
    return getEventNames(this)
  }

  /**
   * Get listener count for an event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(eventName) {
    return getListenerCount(this, eventName)
  }

  /**
   * Get total listener count across all events
   * @returns {number} Total number of listeners
   */
  getTotalListenerCount() {
    return getTotalListenerCount(this)
  }

  /**
   * Get recent event history
   * @param {number} limit - Max number of events to return
   * @returns {Array} Array of event objects
   */
  getEventHistory(limit = 10) {
    return getEventHistory(this, limit)
  }

  /**
   * Clear all listeners and history
   */
  clear() {
    return clearEventDispatcher(this)
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    return setEventDispatcherDebugMode(this, enabled)
  }

  /**
   * Validate event name format
   * @param {string} eventName - Event name to validate
   * @returns {boolean} True if valid
   */
  isValidEventName(eventName) {
    return isValidEventName(eventName)
  }

  // Private methods for backward compatibility
  _generateId() {
    return Math.random().toString(36).substr(2, 9)
  }

  _recordEvent(eventName, data) {
    return recordEvent(this, eventName, data)
  }

  _getWildcardListeners(eventName) {
    return getWildcardListeners(this, eventName)
  }

  _cacheWildcardPattern(pattern) {
    return cacheWildcardPattern(this, pattern)
  }

  _escapeRegex(str) {
    return escapeRegex(str)
  }

  _debug(message) {
    return debugLog(this, message)
  }
}

// ===============================================
// Default Instance Export
// ===============================================
export const eventDispatcher = new EventDispatcher()

// Export class for testing and custom instances
export default EventDispatcher
