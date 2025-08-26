/**
 * Browser-compatible ID generation utility
 * Provides secure UUID generation with fallback support
 */

/**
 * Generate a unique ID with identity prefix and crypto fallback
 * @param {string} identity - Optional identity/prefix for the ID (e.g., 'sub', 'async', 'entity')
 * @returns {string} Unique identifier
 */
export function generateIdentityId(identity = '') {
  // Use crypto.randomUUID() if available (modern browsers/Node.js)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${identity ? `${identity}_` : ''}${crypto.randomUUID()}`
  }

  // Fallback for older browsers or environments without crypto.randomUUID
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2)
  return `${identity ? `${identity}_` : ''}${timestamp}_${random}`
}

/**
 * Generate a unique ID with crypto fallback (legacy function for compatibility)
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique identifier
 */
export function generateId(prefix = '') {
  return generateIdentityId(prefix)
}

/**
 * Generate a simple counter-based ID for high-frequency scenarios
 * More predictable than random, useful for debugging
 */
let idCounter = 0
export function generateCounterId(prefix = 'id') {
  return `${prefix}_${++idCounter}`
}

/**
 * Generate a collision-resistant ID for subscription systems
 * Combines timestamp, counter, and randomness for maximum uniqueness
 */
let lastTimestamp = 0
let sequenceCounter = 0

export function generateSubscriptionId(path = '') {
  const timestamp = Date.now()

  // Reset counter if timestamp changed
  if (timestamp !== lastTimestamp) {
    lastTimestamp = timestamp
    sequenceCounter = 0
  }

  const uniqueId = `${timestamp}_${sequenceCounter++}_${Math.random().toString(36).slice(2, 5)}`
  return path ? `${path}_${uniqueId}` : uniqueId
}
