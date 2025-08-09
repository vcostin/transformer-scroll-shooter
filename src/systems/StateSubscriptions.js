/**
 * StateSubscriptions - Subscription management module for StateManager
 *
 * Handles observer pattern implementation for state change notifications.
 * Provides efficient subscription management with O(1) unsubscribe performance and deep watching support.
 *
 * Features:
 * - Path-based subscriptions with dot notation support
 * - Deep watching for nested object changes
 * - Immediate callback option for current state
 * - O(1) unsubscribe performance using index optimization
 * - Error handling for callback failures
 * - Debug logging for subscription operations
 *
 * @module StateSubscriptions
 */

import { generateSubscriptionId } from '@/utils/IdGenerator.js'

/**
 * StateSubscriptions class for managing state change subscriptions
 */
export class StateSubscriptions {
  /**
   * Create a StateSubscriptions instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.enableDebug - Whether debug logging is enabled
   * @param {Object} callbacks - Callback functions for external operations
   * @param {Function} callbacks.onGetState - Called to get current state value (path)
   */
  constructor(options = {}, callbacks = {}) {
    this.options = {
      enableDebug: false,
      ...options
    }

    this.callbacks = {
      onGetState: () => undefined,
      ...callbacks
    }

    // Subscriptions for state changes (Map: path -> subscription[])
    this.subscriptions = new Map()

    // Subscription index for O(1) unsubscribe performance (Map: subscriptionId -> {path, index})
    this.subscriptionIndex = new Map()
  }

  /**
   * Subscribe to state changes at a specific path
   * @param {string} path - Dot-notation path to state property
   * @param {Function} callback - Function to call when state changes
   * @param {Object} options - Subscription options
   * @param {boolean} options.immediate - Call callback immediately with current value
   * @param {boolean} options.deep - Watch for nested changes (default: true)
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function')
    }

    const subscriptionOptions = {
      immediate: false,
      deep: true,
      ...options
    }

    const subscriptionId = this.generateSubscriptionId(path)
    const subscription = {
      id: subscriptionId,
      path,
      callback,
      options: subscriptionOptions
    }

    // Add to subscriptions map
    if (!this.subscriptions.has(path)) {
      this.subscriptions.set(path, [])
    }
    const subscriptions = this.subscriptions.get(path)
    subscriptions.push(subscription)

    // Add to subscription index for O(1) unsubscribe
    this.subscriptionIndex.set(subscriptionId, {
      path,
      index: subscriptions.length - 1
    })

    // Call immediately if requested
    if (subscriptionOptions.immediate) {
      const currentValue = this.callbacks.onGetState(path)
      this.safeCallCallback(subscription, currentValue, undefined, path)
    }

    if (this.options.enableDebug) {
      console.log(`📡 StateSubscriptions: Subscribed to '${path}'`, subscription)
    }

    // Return unsubscribe function
    return () => this.unsubscribe(subscriptionId)
  }

  /**
   * Unsubscribe from state changes
   * @param {string} subscriptionId - ID of subscription to remove
   * @returns {boolean} True if subscription was removed
   */
  unsubscribe(subscriptionId) {
    const subscriptionInfo = this.subscriptionIndex.get(subscriptionId)
    if (!subscriptionInfo) {
      return false
    }

    const { path, index } = subscriptionInfo
    const subscriptions = this.subscriptions.get(path)

    if (!subscriptions || index >= subscriptions.length) {
      return false
    }

    // Remove from subscriptions array (swap with last element to avoid shifting)
    const lastIndex = subscriptions.length - 1
    if (index < lastIndex) {
      subscriptions[index] = subscriptions[lastIndex]
      // Update index for the swapped subscription
      this.subscriptionIndex.set(subscriptions[index].id, {
        path,
        index
      })
    }
    subscriptions.pop()

    // Remove from subscription index
    this.subscriptionIndex.delete(subscriptionId)

    // Clean up empty subscription paths
    if (subscriptions.length === 0) {
      this.subscriptions.delete(path)
    }

    if (this.options.enableDebug) {
      console.log(`📡 StateSubscriptions: Unsubscribed from '${path}'`, subscriptionId)
    }

    return true
  }

  /**
   * Trigger subscriptions for a path change
   * @param {string} path - Path that changed
   * @param {*} newValue - New value at the path
   * @param {*} oldValue - Previous value at the path
   */
  triggerSubscriptions(path, newValue, oldValue) {
    // Direct path subscriptions
    if (this.subscriptions.has(path)) {
      for (const subscription of this.subscriptions.get(path)) {
        this.safeCallCallback(subscription, newValue, oldValue, path)
      }
    }

    // Parent path subscriptions (for deep watching)
    this.triggerParentSubscriptions(path)
  }

  /**
   * Trigger parent subscriptions for deep watching
   * @param {string} path - Changed path
   * @private
   */
  triggerParentSubscriptions(path) {
    const pathParts = path.split('.')
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.')
      if (this.subscriptions.has(parentPath)) {
        for (const subscription of this.subscriptions.get(parentPath)) {
          if (subscription.options.deep) {
            const currentParentValue = this.callbacks.onGetState(parentPath)
            this.safeCallCallback(subscription, currentParentValue, undefined, parentPath)
          }
        }
      }
    }
  }

  /**
   * Safely call a subscription callback with error handling
   * @param {Object} subscription - Subscription object
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   * @param {string} path - Path that changed
   * @private
   */
  safeCallCallback(subscription, newValue, oldValue, path) {
    try {
      subscription.callback(newValue, oldValue, path)
    } catch (error) {
      console.error(`StateSubscriptions callback error for '${path}':`, error)
    }
  }

  /**
   * Generate a unique subscription ID using enhanced ID generator
   * @param {string} path - Subscription path
   * @returns {string} Unique subscription ID
   * @private
   */
  generateSubscriptionId(path) {
    return generateSubscriptionId(path)
  }

  /**
   * Clear all subscriptions
   */
  clearAll() {
    this.subscriptions.clear()
    this.subscriptionIndex.clear()

    if (this.options.enableDebug) {
      console.log('🗑️ StateSubscriptions: All subscriptions cleared')
    }
  }

  /**
   * Get subscription statistics
   * @returns {Object} Subscription statistics
   */
  getSubscriptionStats() {
    const totalSubscriptions = Array.from(this.subscriptions.values()).reduce(
      (sum, subs) => sum + subs.length,
      0
    )

    return {
      totalSubscriptions,
      pathCount: this.subscriptions.size,
      indexSize: this.subscriptionIndex.size,
      subscriptionsByPath: Array.from(this.subscriptions.entries()).map(([path, subs]) => ({
        path,
        count: subs.length
      }))
    }
  }

  /**
   * Check if a path has subscriptions
   * @param {string} path - Path to check
   * @returns {boolean} True if path has subscriptions
   */
  hasSubscriptions(path) {
    return this.subscriptions.has(path) && this.subscriptions.get(path).length > 0
  }

  /**
   * Get all subscription paths
   * @returns {string[]} Array of all subscription paths
   */
  getSubscriptionPaths() {
    return Array.from(this.subscriptions.keys())
  }

  /**
   * Get subscriptions for a specific path
   * @private
   * @param {string} path - Path to get subscriptions for
   * @returns {Object[]} Array of subscription objects for the path
   */
  getSubscriptionsForPath(path) {
    return this.subscriptions.get(path) || []
  }

  /**
   * Update subscription options
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * Get subscription by ID (for debugging)
   * @param {string} subscriptionId - Subscription ID
   * @returns {Object|null} Subscription object or null if not found
   */
  getSubscriptionById(subscriptionId) {
    const subscriptionInfo = this.subscriptionIndex.get(subscriptionId)
    if (!subscriptionInfo) {
      return null
    }

    const { path, index } = subscriptionInfo
    const subscriptions = this.subscriptions.get(path)
    return subscriptions && subscriptions[index] ? subscriptions[index] : null
  }

  /**
   * Validate subscription integrity (for debugging)
   * @returns {Object} Validation results
   */
  validateIntegrity() {
    const issues = []
    let validSubscriptions = 0

    // Check that all indexed subscriptions exist in subscriptions map
    for (const [subscriptionId, info] of this.subscriptionIndex) {
      const { path, index } = info
      const subscriptions = this.subscriptions.get(path)

      if (!subscriptions) {
        issues.push(`Indexed subscription ${subscriptionId} references non-existent path: ${path}`)
      } else if (index >= subscriptions.length) {
        issues.push(
          `Indexed subscription ${subscriptionId} has invalid index ${index} for path: ${path}`
        )
      } else if (subscriptions[index].id !== subscriptionId) {
        issues.push(`Indexed subscription ${subscriptionId} ID mismatch at path: ${path}[${index}]`)
      } else {
        validSubscriptions++
      }
    }

    // Check that all subscriptions are properly indexed
    for (const [path, subscriptions] of this.subscriptions) {
      for (let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i]
        const indexInfo = this.subscriptionIndex.get(subscription.id)

        if (!indexInfo) {
          issues.push(`Subscription ${subscription.id} at ${path}[${i}] is not indexed`)
        } else if (indexInfo.path !== path || indexInfo.index !== i) {
          issues.push(
            `Subscription ${subscription.id} index mismatch: expected ${path}[${i}], got ${indexInfo.path}[${indexInfo.index}]`
          )
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      validSubscriptions,
      totalIndexed: this.subscriptionIndex.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.length,
        0
      )
    }
  }
}

export default StateSubscriptions
