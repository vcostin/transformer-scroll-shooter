/**
 * Browser-compatible ID generation utility
 * Provides secure UUID generation with fallback support
 */

/**
 * Generate a unique ID with crypto fallback
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique identifier
 */
export function generateId(prefix = '') {
    // Use crypto.randomUUID() if available (modern browsers/Node.js)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        const uuid = crypto.randomUUID();
        return prefix ? `${prefix}_${uuid}` : uuid;
    }
    
    // Fallback for older browsers or environments without crypto.randomUUID
    // Uses timestamp + base36 random for uniqueness
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    const id = `${timestamp}_${random}`;
    return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a simple counter-based ID for high-frequency scenarios
 * More predictable than random, useful for debugging
 */
let idCounter = 0;
export function generateCounterId(prefix = 'id') {
    return `${prefix}_${++idCounter}`;
}

/**
 * Generate a collision-resistant ID for subscription systems
 * Combines timestamp, counter, and randomness for maximum uniqueness
 */
let lastTimestamp = 0;
let sequenceCounter = 0;

export function generateSubscriptionId(path = '') {
    const timestamp = Date.now();
    
    // Reset counter if timestamp changed
    if (timestamp !== lastTimestamp) {
        lastTimestamp = timestamp;
        sequenceCounter = 0;
    }
    
    const uniqueId = `${timestamp}_${sequenceCounter++}_${Math.random().toString(36).slice(2, 5)}`;
    return path ? `${path}_${uniqueId}` : uniqueId;
}
