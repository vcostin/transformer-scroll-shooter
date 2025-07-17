import { EffectContext } from '@/systems/EffectContext.js';

/**
 * EffectManager - Coordinates side effects execution
 * Inspired by Redux-Saga's effect management
 */
export class EffectManager {
  constructor(eventDispatcher) {
    this.eventDispatcher = eventDispatcher;
    this.effects = new Map(); // eventPattern -> [effectHandlers]
    this.runningEffects = new Set();
    this.forkedEffects = new Set();
    this.timeouts = new Set();
    this.isRunning = false;
    this.debugMode = false;
  }

  /**
   * Register an effect handler for an event pattern
   * @param {string|RegExp} eventPattern - Event pattern to match
   * @param {Function} effectHandler - Effect handler function
   * @param {Object} options - Registration options
   * @param {number} options.priority - Handler priority (higher = called first)
   * @param {boolean} options.once - If true, handler is called only once
   * @returns {Function} Unsubscribe function
   */
  effect(eventPattern, effectHandler, options = {}) {
    if (!eventPattern || (typeof eventPattern !== 'string' && !(eventPattern instanceof RegExp))) {
      throw new Error('Effect pattern must be a string or RegExp');
    }

    if (typeof effectHandler !== 'function') {
      throw new Error('Effect handler must be a function');
    }

    const { priority = 0, once = false } = options;

    // Convert string patterns to RegExp for consistent handling
    const patternKey = eventPattern instanceof RegExp ? eventPattern.source : eventPattern.replace(/\*/g, '.*');
    const pattern = eventPattern instanceof RegExp ? eventPattern : new RegExp(`^${patternKey}$`);

    if (!this.effects.has(patternKey)) {
      this.effects.set(patternKey, { pattern, handlers: [] });
    }

    const handler = {
      fn: effectHandler,
      priority,
      once,
      id: this._generateId(),
      pattern: eventPattern
    };

    const effectEntry = this.effects.get(patternKey);
    effectEntry.handlers.push(handler);

    // Sort by priority (higher priority first)
    effectEntry.handlers.sort((a, b) => b.priority - a.priority);

    this._debug(`Registered effect for pattern '${eventPattern}' with priority ${priority}`);

    // Return unsubscribe function
    return () => {
      const index = effectEntry.handlers.findIndex(h => h.id === handler.id);
      if (index !== -1) {
        effectEntry.handlers.splice(index, 1);
        if (effectEntry.handlers.length === 0) {
          this.effects.delete(patternKey);
        }
        this._debug(`Unregistered effect for pattern '${eventPattern}'`);
      }
    };
  }

  /**
   * Start the effect manager
   * Hooks into the event dispatcher to intercept events
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this._debug('Effect manager started');

    // Hook into event dispatcher
    this._originalEmit = this.eventDispatcher.emit.bind(this.eventDispatcher);
    this.eventDispatcher.emit = this._interceptEmit.bind(this);

    // Listen for cleanup events
    this.eventDispatcher.on('game:cleanup', this._cleanup.bind(this));
    this.eventDispatcher.on('game:pause', this._pause.bind(this));
    this.eventDispatcher.on('game:resume', this._resume.bind(this));
  }

  /**
   * Stop the effect manager
   * Cancels all running effects and unhooks from event dispatcher
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this._debug('Effect manager stopping');

    // Cancel all running effects
    this.cancelAllEffects();

    // Restore original emit function
    if (this._originalEmit) {
      this.eventDispatcher.emit = this._originalEmit;
      this._originalEmit = null;
    }

    // Clean up listeners
    this.eventDispatcher.off('game:cleanup', this._cleanup);
    this.eventDispatcher.off('game:pause', this._pause);
    this.eventDispatcher.off('game:resume', this._resume);

    this._debug('Effect manager stopped');
  }

  /**
   * Intercept event emissions to trigger effects
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   * @param {Object} options - Emission options
   * @returns {boolean} True if event had listeners
   */
  _interceptEmit(eventName, data, options = {}) {
    // First emit the event normally
    const hadListeners = this._originalEmit(eventName, data, options);

    // Then trigger matching effects
    this._triggerEffects(eventName, data);

    return hadListeners;
  }

  /**
   * Trigger effects that match the event
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  _triggerEffects(eventName, data) {
    const matchingEffects = this._getMatchingEffects(eventName);
    
    if (matchingEffects.length === 0) {
      return;
    }

    this._debug(`Triggering ${matchingEffects.length} effects for event '${eventName}'`);

    const toRemove = [];

    for (const effect of matchingEffects) {
      try {
        this._executeEffect(effect, eventName, data);
        
        // Mark once effects for removal
        if (effect.once) {
          toRemove.push(effect);
        }
      } catch (error) {
        this._debug(`Error executing effect for '${eventName}':`, error);
        
        // Emit error event
        this._originalEmit('effect:execution:error', {
          eventName,
          data,
          effect: effect.fn.name || 'anonymous',
          error,
          timestamp: Date.now()
        });
      }
    }

    // Remove once effects
    this._removeOnceEffects(toRemove);
  }

  /**
   * Execute a single effect
   * @param {Object} effect - Effect handler object
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  _executeEffect(effect, eventName, data) {
    const context = new EffectContext(this, this.eventDispatcher);
    
    const action = {
      type: eventName,
      payload: data,
      timestamp: Date.now()
    };

    // Execute the effect with context
    const effectPromise = Promise.resolve(effect.fn(action, context));
    
    // Track the running effect
    this.runningEffects.add(effectPromise);

    effectPromise
      .then(() => {
        this.runningEffects.delete(effectPromise);
        this._debug(`Effect completed for '${eventName}'`);
      })
      .catch((error) => {
        this.runningEffects.delete(effectPromise);
        this._debug(`Effect failed for '${eventName}':`, error);
        
        // Emit error event
        this._originalEmit('effect:execution:error', {
          eventName,
          data,
          effect: effect.fn.name || 'anonymous',
          error,
          timestamp: Date.now()
        });
      });
  }

  /**
   * Get effects that match the event name
   * @param {string} eventName - Event name
   * @returns {Array} Array of matching effect handlers
   */
  _getMatchingEffects(eventName) {
    const matchingEffects = [];

    for (const [patternKey, effectEntry] of this.effects) {
      if (effectEntry.pattern.test(eventName)) {
        matchingEffects.push(...effectEntry.handlers);
      }
    }

    // Sort by priority (higher priority first)
    return matchingEffects.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove once effects after execution
   * @param {Array} effectsToRemove - Effects to remove
   */
  _removeOnceEffects(effectsToRemove) {
    for (const effect of effectsToRemove) {
      for (const [patternKey, effectEntry] of this.effects) {
        const index = effectEntry.handlers.findIndex(h => h.id === effect.id);
        if (index !== -1) {
          effectEntry.handlers.splice(index, 1);
          if (effectEntry.handlers.length === 0) {
            this.effects.delete(patternKey);
          }
          this._debug(`Removed once effect for pattern '${effect.pattern}'`);
          break;
        }
      }
    }
  }

  /**
   * Cancel all running effects
   */
  cancelAllEffects() {
    // Cancel all running effects - properly handle cancellation
    for (const effectPromise of this.runningEffects) {
      // Check if the promise has a cancel method (AbortController pattern)
      if (effectPromise && typeof effectPromise.cancel === 'function') {
        try {
          effectPromise.cancel();
        } catch (error) {
          this._debug('Error cancelling effect:', error);
        }
      }
    }
    this.runningEffects.clear();

    // Cancel all forked effects - properly handle cancellation
    for (const forkedPromise of this.forkedEffects) {
      if (forkedPromise && typeof forkedPromise.cancel === 'function') {
        try {
          forkedPromise.cancel();
        } catch (error) {
          this._debug('Error cancelling forked effect:', error);
        }
      }
    }
    this.forkedEffects.clear();

    // Clear all timeouts
    for (const timeoutId of this.timeouts) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();

    this._debug('All effects cancelled');
  }

  /**
   * Track a forked effect for potential cancellation
   * @param {Promise} effectPromise - Forked effect promise
   */
  trackForkedEffect(effectPromise) {
    this.forkedEffects.add(effectPromise);
    
    effectPromise
      .finally(() => {
        this.forkedEffects.delete(effectPromise);
      });
  }

  /**
   * Track a timeout for potential cancellation
   * @param {number} timeoutId - Timeout ID
   */
  trackTimeout(timeoutId) {
    this.timeouts.add(timeoutId);
    
    // Auto-remove after timeout completes - use Promise.resolve().then() for better async handling
    Promise.resolve().then(() => {
      this.timeouts.delete(timeoutId);
    });
  }

  /**
   * Get current statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      registeredEffects: Array.from(this.effects.entries()).reduce((sum, [, effectEntry]) => sum + effectEntry.handlers.length, 0),
      runningEffects: this.runningEffects.size,
      forkedEffects: this.forkedEffects.size,
      activeTimeouts: this.timeouts.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Cleanup handler for game cleanup events
   */
  _cleanup() {
    this._debug('Cleaning up effects');
    this.cancelAllEffects();
  }

  /**
   * Pause handler for game pause events
   */
  _pause() {
    this._debug('Pausing effects');
    // Could implement pause logic here
  }

  /**
   * Resume handler for game resume events
   */
  _resume() {
    this._debug('Resuming effects');
    // Could implement resume logic here
  }

   /**
    * Generate unique ID for effects
    * @returns {string} Unique ID
    */
   _generateId() {
     return `effect_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
   }  /**
   * Debug logging
   * @param {...*} args - Arguments to log
   */
  _debug(...args) {
    if (this.debugMode) {
      console.log('[EffectManager]', ...args);
    }
  }
}
