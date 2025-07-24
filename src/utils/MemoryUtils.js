/**
 * Memory estimation utilities for performance monitoring
 * Provides efficient alternatives to JSON.stringify for memory calculations
 */

/**
 * Fast memory estimation using object traversal
 * More efficient than JSON.stringify for large objects
 * @param {*} obj - Object to estimate memory for
 * @param {Set} visited - Circular reference tracking
 * @returns {number} Estimated memory size in bytes
 */
export function estimateMemorySize(obj, visited = new Set()) {
    if (obj === null || obj === undefined) return 8; // null/undefined pointer
    
    // Prevent circular references
    if (visited.has(obj)) return 0;
    visited.add(obj);
    
    let size = 0;
    
    switch (typeof obj) {
        case 'boolean':
            size = 4;
            break;
        case 'number':
            size = 8;
            break;
        case 'string':
            size = obj.length * 2; // UTF-16 encoding
            break;
        case 'object':
            if (Array.isArray(obj)) {
                size = 24; // Array overhead
                for (const item of obj) {
                    size += estimateMemorySize(item, visited);
                }
            } else {
                size = 16; // Object overhead
                for (const [key, value] of Object.entries(obj)) {
                    size += key.length * 2; // Key string
                    size += estimateMemorySize(value, visited);
                }
            }
            break;
        case 'function':
            size = 32; // Function overhead
            break;
        default:
            size = 8; // Other types
    }
    
    visited.delete(obj);
    return size;
}

/**
 * Lightweight memory tracking that can be disabled for performance
 * @param {*} obj - Object to track
 * @param {Object} options - Configuration options
 * @returns {number|null} Memory size or null if disabled
 */
export function trackMemory(obj, options = {}) {
    const { enabled = true, useEstimation = true, maxDepth = 10 } = options;
    
    if (!enabled) return null;
    
    try {
        if (useEstimation) {
            return estimateMemorySize(obj);
        } else {
            // Fallback to JSON.stringify for accuracy when needed
            return JSON.stringify(obj).length;
        }
    } catch (error) {
        // Handle circular references or serialization errors
        console.warn('Memory tracking failed, using estimation:', error.message);
        return estimateMemorySize(obj);
    }
}

/**
 * Memory monitoring with sampling and throttling
 * Reduces performance impact by limiting calculation frequency
 */
export class MemoryMonitor {
    constructor(options = {}) {
        this.options = {
            sampleRate: 0.1, // Only calculate 10% of the time
            throttleMs: 1000, // Minimum time between calculations
            useEstimation: true,
            maxSize: 1024 * 1024, // 1MB threshold for warnings
            ...options
        };
        
        this.lastCalculation = 0;
        this.cachedSize = 0;
        this.skipCount = 0;
    }
    
    /**
     * Calculate memory size with intelligent sampling
     * @param {*} obj - Object to measure
     * @returns {number} Memory size or cached value
     */
    calculateSize(obj) {
        const now = Date.now();
        
        // Throttle calculations
        if (now - this.lastCalculation < this.options.throttleMs) {
            return this.cachedSize;
        }
        
        // Sample only a percentage of calculations
        if (Math.random() > this.options.sampleRate) {
            this.skipCount++;
            return this.cachedSize;
        }
        
        this.lastCalculation = now;
        this.cachedSize = trackMemory(obj, this.options);
        
        // Warn if memory usage is high
        if (this.cachedSize > this.options.maxSize) {
            console.warn(`High memory usage detected: ${(this.cachedSize / 1024 / 1024).toFixed(2)}MB`);
        }
        
        return this.cachedSize;
    }
    
    /**
     * Get statistics about memory monitoring
     * @returns {Object} Monitoring statistics
     */
    getStats() {
        return {
            cachedSize: this.cachedSize,
            lastCalculation: this.lastCalculation,
            skipCount: this.skipCount,
            sampleRate: this.options.sampleRate
        };
    }
}
