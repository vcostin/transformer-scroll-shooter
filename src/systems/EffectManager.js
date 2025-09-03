import { createEffectContext } from '@/systems/EffectContext.js'
import { PatternMatcher } from '@/utils/PatternMatcher.js'
import { GAME_EVENTS } from '@/constants/game-events.js'

/**
 * EffectManager POJO+Functional Implementation
 * Phase 4 migration applying proven POJO+Functional pattern
 */

// ===============================================
// POJO+Functional EffectManager Implementation
// ===============================================

/**
 * Factory function to create an EffectManager POJO
 * @param {Object} eventDispatcher - Event dispatcher instance
 * @param {Object} options - Configuration options
 * @returns {Object} EffectManager POJO with side effects state
 */
export function createEffectManager(eventDispatcher, options = {}) {
  if (!eventDispatcher) {
    throw new Error('EventDispatcher is required')
  }

  // Configuration with defaults
  const config = {
    debugMode: false,
    ...options
  }

  // Create EffectManager POJO
  const effectManager = {
    // Core dependencies
    eventDispatcher,
    patternMatcher: new PatternMatcher(),

    // Effect tracking
    runningEffects: new Set(),
    forkedEffects: new Set(),
    timeouts: new Set(),

    // State
    isRunning: false,
    wasRunning: false,
    debugMode: config.debugMode,

    // Original emit function storage
    _originalEmit: null,

    // Pre-bound handlers for reliable cleanup
    _boundCleanup: null,
    _boundPause: null,
    _boundResume: null
  }

  // Create pre-bound handlers
  effectManager._boundCleanup = () => cleanupEffects(effectManager)
  effectManager._boundPause = () => pauseEffects(effectManager)
  effectManager._boundResume = () => resumeEffects(effectManager)

  // Add functional API methods (only for standalone POJO usage)
  effectManager.effect = (eventPattern, effectHandler, options = {}) => {
    return registerEffect(effectManager, eventPattern, effectHandler, options)
  }

  effectManager.getEffects = () => {
    return getEffectsMap(effectManager)
  }

  effectManager.trackForkedEffect = effectPromise => {
    return trackForkedEffect(effectManager, effectPromise)
  }

  // These methods are only added for standalone POJO usage
  // The class wrapper will override them with proper implementations
  if (!options._skipClassMethods) {
    effectManager.start = () => {
      startEffectManager(effectManager)
    }

    effectManager.stop = () => {
      stopEffectManager(effectManager)
    }
  }

  return effectManager
}

/**
 * Register an effect handler for an event pattern
 * @param {Object} effectManager - EffectManager POJO
 * @param {string|RegExp} eventPattern - Event pattern to match
 * @param {Function} effectHandler - Effect handler function
 * @param {Object} options - Registration options
 * @returns {Function} Unsubscribe function
 */
export function registerEffect(effectManager, eventPattern, effectHandler, options = {}) {
  if (!eventPattern || (typeof eventPattern !== 'string' && !(eventPattern instanceof RegExp))) {
    throw new Error('Effect pattern must be a string or RegExp')
  }

  if (typeof effectHandler !== 'function') {
    throw new Error('Effect handler must be a function')
  }

  const { priority = 0, once = false } = options

  // Register with PatternMatcher for streamlined pattern matching
  const patternId = effectManager.patternMatcher.register(eventPattern, effectHandler, {
    priority,
    once
  })

  debugLog(
    effectManager,
    `Registered effect for pattern '${eventPattern}' with priority ${priority}`
  )

  // Return unsubscribe function
  return () => {
    effectManager.patternMatcher.unregister(patternId)
    debugLog(effectManager, `Unregistered effect for pattern '${eventPattern}'`)
  }
}

/**
 * Start the effect manager
 * @param {Object} effectManager - EffectManager POJO
 */
export function startEffectManager(effectManager) {
  if (effectManager.isRunning) {
    return
  }

  effectManager.isRunning = true
  debugLog(effectManager, 'Effect manager started')

  // Hook into event dispatcher
  effectManager._originalEmit = effectManager.eventDispatcher.emit.bind(
    effectManager.eventDispatcher
  )
  effectManager.eventDispatcher.emit = (eventName, data, options = {}) =>
    interceptEmit(effectManager, eventName, data, options)

  // Listen for lifecycle events (use pre-bound refs for proper unsubscription)
  effectManager.eventDispatcher.on('game:cleanup', effectManager._boundCleanup)
  effectManager.eventDispatcher.on('game:pause', effectManager._boundPause)
  effectManager.eventDispatcher.on('game:resume', effectManager._boundResume)
}

/**
 * Stop the effect manager
 * @param {Object} effectManager - EffectManager POJO
 */
export function stopEffectManager(effectManager) {
  if (!effectManager.isRunning) {
    return
  }

  effectManager.isRunning = false
  debugLog(effectManager, 'Effect manager stopping')

  // Cancel all running effects
  cancelAllEffects(effectManager)

  // Restore original emit function
  if (effectManager._originalEmit) {
    effectManager.eventDispatcher.emit = effectManager._originalEmit
    effectManager._originalEmit = null
  }

  // Clean up listeners (must use the same function references passed to `on`)
  effectManager.eventDispatcher.off('game:cleanup', effectManager._boundCleanup)
  effectManager.eventDispatcher.off('game:pause', effectManager._boundPause)
  effectManager.eventDispatcher.off('game:resume', effectManager._boundResume)

  debugLog(effectManager, 'Effect manager stopped')
}

/**
 * Cancel all running effects
 * @param {Object} effectManager - EffectManager POJO
 */
export function cancelAllEffects(effectManager) {
  // Cancel all running effects - properly handle cancellation
  for (const effectPromise of effectManager.runningEffects) {
    // Check if the promise has a cancel method (AbortController pattern)
    if (effectPromise && typeof effectPromise.cancel === 'function') {
      try {
        effectPromise.cancel()
      } catch (error) {
        debugLog(effectManager, 'Error cancelling effect:', error)
      }
    }
  }
  effectManager.runningEffects.clear()

  // Cancel all forked effects - properly handle cancellation
  for (const forkedPromise of effectManager.forkedEffects) {
    if (forkedPromise && typeof forkedPromise.cancel === 'function') {
      try {
        forkedPromise.cancel()
      } catch (error) {
        debugLog(effectManager, 'Error cancelling forked effect:', error)
      }
    }
  }
  effectManager.forkedEffects.clear()

  // Clear all timeouts
  for (const timeoutId of effectManager.timeouts) {
    clearTimeout(timeoutId)
  }
  effectManager.timeouts.clear()

  debugLog(effectManager, 'All effects cancelled')
}

/**
 * Track a forked effect for potential cancellation
 * @param {Object} effectManager - EffectManager POJO
 * @param {Promise} effectPromise - Forked effect promise
 */
export function trackForkedEffect(effectManager, effectPromise) {
  effectManager.forkedEffects.add(effectPromise)

  effectPromise.finally(() => {
    effectManager.forkedEffects.delete(effectPromise)
  })
}

/**
 * Track a timeout for potential cancellation
 * @param {Object} effectManager - EffectManager POJO
 * @param {number} timeoutId - Timeout ID
 */
export function trackTimeout(effectManager, timeoutId) {
  effectManager.timeouts.add(timeoutId)

  // Auto-cleanup tracking: Remove timeout ID on microtask to prevent leaks
  Promise.resolve().then(() => {
    effectManager.timeouts.delete(timeoutId)
  })
}

/**
 * Untrack a timeout if it has already fired and been cleared elsewhere
 * @param {Object} effectManager - EffectManager POJO
 * @param {number} timeoutId - Timeout ID
 */
export function untrackTimeout(effectManager, timeoutId) {
  effectManager.timeouts.delete(timeoutId)
}

/**
 * Get current statistics
 * @param {Object} effectManager - EffectManager POJO
 * @returns {Object} Statistics object
 */
export function getEffectManagerStats(effectManager) {
  return {
    registeredEffects: effectManager.patternMatcher.patterns.size,
    runningEffects: effectManager.runningEffects.size,
    forkedEffects: effectManager.forkedEffects.size,
    activeTimeouts: effectManager.timeouts.size,
    isRunning: effectManager.isRunning
  }
}

/**
 * Enable/disable debug mode
 * @param {Object} effectManager - EffectManager POJO
 * @param {boolean} enabled - Debug mode enabled
 */
export function setEffectManagerDebugMode(effectManager, enabled) {
  effectManager.debugMode = enabled
}

/**
 * Get effects map (for compatibility with tests)
 * @param {Object} effectManager - EffectManager POJO
 * @returns {Map} Effects map in legacy format
 */
export function getEffectsMap(effectManager) {
  // Create a legacy-compatible effects map from PatternMatcher data
  const effectsMap = new Map()

  for (const [, patternEntry] of effectManager.patternMatcher.patterns) {
    const patternKey =
      patternEntry.pattern instanceof RegExp
        ? patternEntry.pattern.source
        : patternEntry.pattern.replace(/\*/g, '.*')

    if (!effectsMap.has(patternKey)) {
      const pattern =
        patternEntry.pattern instanceof RegExp
          ? patternEntry.pattern
          : new RegExp(`^${patternKey}$`)
      effectsMap.set(patternKey, { pattern, handlers: [] })
    }

    const effectEntry = effectsMap.get(patternKey)
    effectEntry.handlers.push({
      fn: patternEntry.handler,
      priority: patternEntry.priority,
      once: patternEntry.once,
      id: patternEntry.id,
      pattern: patternEntry.pattern
    })
  }

  // Sort handlers by priority within each effect entry
  for (const effectEntry of effectsMap.values()) {
    effectEntry.handlers.sort((a, b) => b.priority - a.priority)
  }

  return effectsMap
}

/**
 * Get effects that match the event name
 * @param {Object} effectManager - EffectManager POJO
 * @param {string} eventName - Event name
 * @returns {Array} Array of matching effect handlers
 */
export function getMatchingEffects(effectManager, eventName) {
  // Use PatternMatcher for streamlined effect lookup
  const matches = effectManager.patternMatcher.getMatches(eventName)

  // Convert to legacy format for compatibility
  return matches.map(match => ({
    fn: match.handler,
    priority: match.priority,
    once: match.once,
    id: match.id,
    pattern: match.pattern
  }))
}

/**
 * Initialize entity state in state manager
 * @param {Object} effectManager - EffectManager POJO
 * @param {Object} config - Configuration object
 */
export function initializeEntityState(effectManager, { stateManager, initialState }) {
  registerEffect(effectManager, GAME_EVENTS.ENTITY_STATE_INIT, () => {
    Object.entries(initialState).forEach(([key, value]) => {
      stateManager.setState(key, value)
    })
  })
}

/**
 * Generate unique ID for effects
 * @returns {string} Unique ID
 */
export function generateEffectId() {
  return `effect_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// ===============================================
// Helper Functions (Private)
// ===============================================

/**
 * Intercept event emissions to trigger effects
 * @param {Object} effectManager - EffectManager POJO
 * @param {string} eventName - Event name
 * @param {*} data - Event data
 * @param {Object} options - Emission options
 * @returns {boolean} True if event had listeners
 */
function interceptEmit(effectManager, eventName, data, options = {}) {
  // First emit the event normally
  const hadListeners = effectManager._originalEmit(eventName, data, options)

  // Then trigger matching effects
  triggerEffects(effectManager, eventName, data)

  return hadListeners
}

/**
 * Trigger effects that match the event
 * @param {Object} effectManager - EffectManager POJO
 * @param {string} eventName - Event name
 * @param {*} data - Event data
 */
function triggerEffects(effectManager, eventName, data) {
  // Get matches using the advanced PatternMatcher
  const matchingPatterns = effectManager.patternMatcher.getMatches(eventName)
  if (matchingPatterns.length === 0) {
    return
  }
  debugLog(effectManager, `Triggering ${matchingPatterns.length} effects for event '${eventName}'`)

  const toRemove = []

  for (const patternEntry of matchingPatterns) {
    try {
      executeEffect(effectManager, patternEntry, eventName, data)

      // Mark once effects for removal
      if (patternEntry.once) {
        toRemove.push(patternEntry.id)
      }
    } catch (error) {
      debugLog(effectManager, `Error executing effect for '${eventName}':`, error)

      // Emit error event
      effectManager._originalEmit('effect:execution:error', {
        eventName,
        data,
        effect: patternEntry.handler.name || 'anonymous',
        pattern: patternEntry.pattern,
        error,
        timestamp: Date.now()
      })
    }
  }

  // Remove once effects from PatternMatcher
  effectManager.patternMatcher.removeOncePatterns(toRemove)
}

/**
 * Execute a single effect
 * @param {Object} effectManager - EffectManager POJO
 * @param {Object} patternEntry - Pattern entry from PatternMatcher
 * @param {string} eventName - Event name
 * @param {*} data - Event data
 */
function executeEffect(effectManager, patternEntry, eventName, data) {
  const context = createEffectContext(effectManager, effectManager.eventDispatcher)

  const action = {
    type: eventName,
    payload: data,
    timestamp: Date.now()
  }

  // Execute the effect with context
  const effectPromise = Promise.resolve(patternEntry.handler(action, context))

  // Track the running effect
  effectManager.runningEffects.add(effectPromise)

  effectPromise
    .then(() => {
      effectManager.runningEffects.delete(effectPromise)
      debugLog(effectManager, `Effect completed for '${eventName}'`)
    })
    .catch(error => {
      effectManager.runningEffects.delete(effectPromise)
      debugLog(effectManager, `Effect failed for '${eventName}':`, error)

      // Emit error event
      effectManager._originalEmit('effect:execution:error', {
        eventName,
        data,
        effect: (patternEntry && patternEntry.handler && patternEntry.handler.name) || 'anonymous',
        error,
        timestamp: Date.now()
      })
    })
}

/**
 * Cleanup handler for game cleanup events
 * @param {Object} effectManager - EffectManager POJO
 */
function cleanupEffects(effectManager) {
  debugLog(effectManager, 'Cleaning up effects')
  cancelAllEffects(effectManager)
}

/**
 * Pause handler for game pause events
 * @param {Object} effectManager - EffectManager POJO
 */
function pauseEffects(effectManager) {
  debugLog(effectManager, 'Pausing effects')
  effectManager.wasRunning = effectManager.isRunning
  effectManager.isRunning = false
  debugLog(effectManager, 'Effects paused, was running:', effectManager.wasRunning)
}

/**
 * Resume handler for game resume events
 * @param {Object} effectManager - EffectManager POJO
 */
function resumeEffects(effectManager) {
  debugLog(effectManager, 'Resuming effects')
  // Only resume if it was running before pause
  if (effectManager.wasRunning !== false) {
    effectManager.isRunning = true
    debugLog(effectManager, 'Effects resumed')
  } else {
    debugLog(effectManager, 'Effects not resumed - was not running before pause')
  }
}

/**
 * Debug logging utility
 * @param {Object} effectManager - EffectManager POJO
 * @param {...*} args - Arguments to log
 */
function debugLog(effectManager, ...args) {
  if (effectManager.debugMode) {
    console.log('[EffectManager]', ...args)
  }
}

// ===============================================
// Legacy Class Wrapper (Backward Compatibility)
// ===============================================
export class EffectManager {
  /**
   * Create a new EffectManager instance
   * @param {Object} eventDispatcher - Event dispatcher instance
   * @param {Object} options - Configuration options
   */
  constructor(eventDispatcher, options = {}) {
    // Create the POJO state and assign properties to this
    const effectManagerPOJO = createEffectManager(eventDispatcher, {
      ...options,
      _skipClassMethods: true
    })
    Object.assign(this, effectManagerPOJO)
  }

  /**
   * Get effects map (for compatibility with tests)
   */
  get effects() {
    return getEffectsMap(this)
  }

  /**
   * Register an effect handler for an event pattern
   * @param {string|RegExp} eventPattern - Event pattern to match
   * @param {Function} effectHandler - Effect handler function
   * @param {Object} options - Registration options
   * @returns {Function} Unsubscribe function
   */
  effect(eventPattern, effectHandler, options = undefined) {
    return registerEffect(this, eventPattern, effectHandler, options || {})
  }

  /**
   * Start the effect manager
   */
  start() {
    return startEffectManager(this)
  }

  /**
   * Stop the effect manager
   */
  stop() {
    return stopEffectManager(this)
  }

  /**
   * Cancel all running effects
   */
  cancelAllEffects() {
    return cancelAllEffects(this)
  }

  /**
   * Track a forked effect for potential cancellation
   * @param {Promise} effectPromise - Forked effect promise
   */
  trackForkedEffect(effectPromise) {
    return trackForkedEffect(this, effectPromise)
  }

  /**
   * Track a timeout for potential cancellation
   * @param {number} timeoutId - Timeout ID
   */
  trackTimeout(timeoutId) {
    return trackTimeout(this, timeoutId)
  }

  /**
   * Untrack a timeout if it has already fired and been cleared elsewhere
   * @param {number} timeoutId - Timeout ID
   */
  untrackTimeout(timeoutId) {
    return untrackTimeout(this, timeoutId)
  }

  /**
   * Get current statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return getEffectManagerStats(this)
  }

  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Debug mode enabled
   */
  setDebugMode(enabled) {
    return setEffectManagerDebugMode(this, enabled)
  }

  /**
   * Initialize entity state in state manager
   * @param {Object} config - Configuration object
   */
  initializeEntityState(config) {
    return initializeEntityState(this, config)
  }

  // Private methods for backward compatibility
  _interceptEmit(eventName, data, options = {}) {
    return interceptEmit(this, eventName, data, options)
  }

  _triggerEffects(eventName, data) {
    return triggerEffects(this, eventName, data)
  }

  _executeEffect(patternEntry, eventName, data) {
    return executeEffect(this, patternEntry, eventName, data)
  }

  _getMatchingEffects(eventName) {
    return getMatchingEffects(this, eventName)
  }

  _removeOnceEffects(effectsToRemove) {
    // PatternMatcher handles once effect removal automatically
    effectsToRemove.forEach(effect => {
      debugLog(this, `Removed once effect for pattern '${effect.pattern}'`)
    })
  }

  _cleanup() {
    return cleanupEffects(this)
  }

  _pause() {
    return pauseEffects(this)
  }

  _resume() {
    return resumeEffects(this)
  }

  _generateId() {
    return generateEffectId()
  }

  _debug(...args) {
    return debugLog(this, ...args)
  }
}

// No default singleton instance for EffectManager - requires eventDispatcher dependency
export default EffectManager
