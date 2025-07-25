/**
 * EventDispatcher - Core event system for the game
 * Provides pub/sub pattern with game-specific features
 */
export class EventDispatcher {
  constructor() {
    this.listeners = new Map();
    this.wildcardPatterns = new Map(); // Cache for wildcard patterns
    this._eventHistory = new Array(100); // Pre-allocated circular buffer
    this.historyIndex = 0; // Current position in circular buffer
    this.historyCount = 0; // Number of events stored
    this.maxHistorySize = 100;
    this.debugMode = false;
    this._idCounter = 0; // More efficient ID generation
  }

  /**
   * Get event history (for compatibility)
   */
  get eventHistory() {
    return this.getEventHistory(this.historyCount);
  }

  /**
   * Subscribe to an event with optional priority
   * @param {string} eventName - Event name (supports namespacing with dots)
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options object
   * @param {number} options.priority - Handler priority (higher = called first)
   * @param {boolean} options.once - If true, handler is called only once
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler, options = {}) {
    if (typeof eventName !== 'string' || !eventName.trim()) {
      throw new Error('Event name must be a non-empty string');
    }
    
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    const { priority = 0, once = false } = options;
    
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listener = {
      handler,
      priority,
      once,
      id: ++this._idCounter
    };

    const eventListeners = this.listeners.get(eventName);
    eventListeners.push(listener);
    
    // Sort by priority (higher priority first)
    eventListeners.sort((a, b) => b.priority - a.priority);

    // Cache wildcard patterns for optimization
    if (eventName.includes('*')) {
      this._cacheWildcardPattern(eventName);
    }

    this._debug(`Subscribed to '${eventName}' with priority ${priority}`);

    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }

  /**
   * Subscribe to an event for one-time execution
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   * @param {Object} options - Options object
   * @returns {Function} Unsubscribe function
   */
  once(eventName, handler, options = {}) {
    return this.on(eventName, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {Function} handler - Handler to remove (optional - removes all if not provided)
   */
  off(eventName, handler = null) {
    if (!this.listeners.has(eventName)) {
      return;
    }

    const eventListeners = this.listeners.get(eventName);
    
    if (handler === null) {
      // Remove all listeners for this event
      this.listeners.delete(eventName);
      // Clean up wildcard pattern cache
      if (eventName.includes('*')) {
        this.wildcardPatterns.delete(eventName);
      }
      this._debug(`Removed all listeners for '${eventName}'`);
    } else {
      // Remove specific handler
      const index = eventListeners.findIndex(listener => listener.handler === handler);
      if (index !== -1) {
        eventListeners.splice(index, 1);
        this._debug(`Removed specific listener for '${eventName}'`);
        
        // Clean up empty event arrays and wildcard patterns
        if (eventListeners.length === 0) {
          this.listeners.delete(eventName);
          if (eventName.includes('*')) {
            this.wildcardPatterns.delete(eventName);
          }
        }
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventName - Event name
   * @param {*} data - Data to pass to handlers
   * @param {Object} options - Emission options
   * @param {boolean} options.async - If true, handlers are called asynchronously
   * @returns {boolean} True if event had listeners
   */
  emit(eventName, data = null, options = {}) {
    if (typeof eventName !== 'string' || !eventName.trim()) {
      throw new Error('Event name must be a non-empty string');
    }

    const { async = false } = options;
    
    // Record event in history
    this._recordEvent(eventName, data);

    // Get direct listeners
    const directListeners = this.listeners.get(eventName) || [];
    
    // Get wildcard listeners (namespace matching)
    const wildcardListeners = this._getWildcardListeners(eventName);
    
    // Combine and sort all listeners
    const allListeners = [...directListeners, ...wildcardListeners]
      .sort((a, b) => b.priority - a.priority);

    if (allListeners.length === 0) {
      this._debug(`No listeners for '${eventName}'`);
      return false;
    }

    this._debug(`Emitting '${eventName}' to ${allListeners.length} listeners`);

    // Call handlers
    const toRemove = [];
    
    for (const listener of allListeners) {
      try {
        if (async) {
          // Asynchronous execution
          Promise.resolve().then(() => listener.handler(data, eventName));
        } else {
          // Synchronous execution
          listener.handler(data, eventName);
        }
        
        // Mark once listeners for removal
        if (listener.once) {
          toRemove.push({ eventName, listener });
        }
      } catch (error) {
        console.error(`Error in event handler for '${eventName}':`, error);
        
        // Emit error event if not already emitting an error event (prevent infinite loops)
        if (eventName !== 'error') {
          this.emit('error', {
            originalEvent: eventName,
            error,
            listener: listener.handler,
            timestamp: Date.now()
          });
        }
        
        // Continue executing other handlers
      }
    }

    // Remove once listeners
    toRemove.forEach(({ eventName, listener }) => {
      this.off(eventName, listener.handler);
    });

    return true;
  }

  /**
   * Remove all listeners for events matching a pattern
   * @param {string} pattern - Pattern to match (supports wildcards with *)
   */
  removeAllMatching(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const eventsToRemove = [];
    
    for (const eventName of this.listeners.keys()) {
      if (regex.test(eventName)) {
        eventsToRemove.push(eventName);
      }
    }
    
    eventsToRemove.forEach(eventName => this.off(eventName));
    this._debug(`Removed all listeners matching pattern '${pattern}'`);
  }

  /**
   * Get all event names that have listeners
   * @returns {string[]} Array of event names
   */
  getEventNames() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for an event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(eventName) {
    const listeners = this.listeners.get(eventName);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get total listener count across all events
   * @returns {number} Total number of listeners
   */
  getTotalListenerCount() {
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.length;
    }
    return total;
  }

  /**
   * Get recent event history
   * @param {number} limit - Max number of events to return
   * @returns {Array} Array of event objects
   */
  getEventHistory(limit = 10) {
    const result = [];
    const actualLimit = Math.min(limit, this.historyCount);
    
    for (let i = 0; i < actualLimit; i++) {
      const index = (this.historyIndex - i - 1 + this.maxHistorySize) % this.maxHistorySize;
      const event = this._eventHistory[index];
      if (event) {
        result.unshift(event);
      }
    }
    
    return result;
  }

  /**
   * Clear all listeners and history
   */
  clear() {
    this.listeners.clear();
    this.wildcardPatterns.clear();
    this._eventHistory.fill(null); // Clear circular buffer
    this.historyIndex = 0;
    this.historyCount = 0;
    this._debug('Cleared all listeners and history');
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this._debug(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Validate event name format
   * @param {string} eventName - Event name to validate
   * @returns {boolean} True if valid
   */
  isValidEventName(eventName) {
    if (typeof eventName !== 'string' || !eventName.trim()) {
      return false;
    }
    
    // Basic validation: alphanumeric, dots, dashes, underscores
    return /^[a-zA-Z0-9._-]+$/.test(eventName);
  }

  // Private methods
  _generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  _recordEvent(eventName, data) {
    // Use circular buffer for better performance
    this._eventHistory[this.historyIndex] = {
      eventName,
      data,
      timestamp: Date.now()
    };
    
    this.historyIndex = (this.historyIndex + 1) % this.maxHistorySize;
    if (this.historyCount < this.maxHistorySize) {
      this.historyCount++;
    }
  }

  _getWildcardListeners(eventName) {
    const wildcardListeners = [];
    
    // Use cached regex patterns for better performance
    for (const [pattern, cachedRegex] of this.wildcardPatterns) {
      if (cachedRegex.test(eventName)) {
        const listeners = this.listeners.get(pattern);
        if (listeners) {
          wildcardListeners.push(...listeners);
        }
      }
    }
    
    return wildcardListeners;
  }

  _cacheWildcardPattern(pattern) {
    if (!this.wildcardPatterns.has(pattern)) {
      const escapedPattern = this._escapeRegex(pattern).replace(/\\\*/g, '.*');
      const regex = new RegExp('^' + escapedPattern + '$');
      this.wildcardPatterns.set(pattern, regex);
    }
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _debug(message) {
    if (this.debugMode) {
      console.log(`[EventDispatcher] ${message}`);
    }
  }
}

// Create and export singleton instance
export const eventDispatcher = new EventDispatcher();

// Export class for testing and custom instances
export default EventDispatcher;
