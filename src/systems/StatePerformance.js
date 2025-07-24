/**
 * StatePerformance - Performance monitoring and optimization for StateManager
 * 
 * Handles:
 * - Performance metrics tracking
 * - Memory usage monitoring
 * - Operation timing
 * - Optimization suggestions
 * - Batch operation coordination
 * 
 * @author Development Team
 * @version 1.0.0
 */

import { MemoryMonitor } from '@/utils/MemoryUtils.js';

export class StatePerformance {
    constructor(options = {}) {
        // Performance statistics
        this.stats = {
            totalUpdates: 0,
            totalGets: 0,
            validationErrors: 0,
            historyOperations: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0
        };

        // Initialize memory monitoring with enhanced utilities
        this.memoryMonitor = new MemoryMonitor({
            sampleRate: options.memorySampleRate || 1.0, // Default to 100% for reliable testing
            throttleMs: options.memoryThrottleMs || 0, // Default to no throttling for tests
            useEstimation: options.useMemoryEstimation !== false,
            maxSize: options.memoryWarningThreshold || 1024 * 1024
        });
        
        // Legacy memory tracking for backward compatibility
        this.cachedStateSize = 0;
        this.memoryCacheValid = false;

        // Configuration
        this.options = {
            enableMemoryTracking: options.enableMemoryTracking !== false,
            enablePerformanceTracking: options.enablePerformanceTracking !== false,
            memoryUpdateThreshold: options.memoryUpdateThreshold || 1000, // ms
            ...options
        };

        // Callbacks for external system integration
        this.onGetState = options.onGetState || (() => ({}));
        this.onGetHistoryMemoryUsage = options.onGetHistoryMemoryUsage || (() => 0);

        // Cache management
        this.lastMemoryUpdate = 0;
        this.memoryUpdateDebounce = this.options.memoryUpdateThreshold;
    }

    /**
     * Record a state get operation
     * @param {boolean} skipStats - Whether to skip statistics tracking
     */
    recordGet(skipStats = false) {
        if (!skipStats && this.options.enablePerformanceTracking) {
            this.stats.totalGets++;
        }
    }

    /**
     * Record a state update operation with timing
     * @param {number} startTime - Start time from performance.now()
     */
    recordUpdate(startTime) {
        if (!this.options.enablePerformanceTracking) return;

        const updateTime = performance.now() - startTime;
        this.stats.totalUpdates++;
        this.stats.lastUpdateTime = updateTime;
        this.updateAverageTime(updateTime);

        // Invalidate memory cache when state changes
        this.invalidateMemoryCache();
    }

    /**
     * Record a validation error
     */
    recordValidationError() {
        if (this.options.enablePerformanceTracking) {
            this.stats.validationErrors++;
        }
    }

    /**
     * Record a history operation
     */
    recordHistoryOperation() {
        if (this.options.enablePerformanceTracking) {
            this.stats.historyOperations++;
        }
    }

    /**
     * Update average update time calculation
     * @private
     * @param {number} time - Update time in milliseconds
     */
    updateAverageTime(time) {
        if (this.stats.totalUpdates === 0) {
            this.stats.averageUpdateTime = time;
        } else {
            this.stats.averageUpdateTime = (
                this.stats.averageUpdateTime * (this.stats.totalUpdates - 1) + time
            ) / this.stats.totalUpdates;
        }
    }

    /**
     * Get estimated memory usage with caching
     * @returns {number} Total memory usage in bytes (estimated)
     */
    getMemoryUsage() {
        if (!this.options.enableMemoryTracking) return 0;

        if (!this.memoryCacheValid) {
            this.updateMemoryCache();
        }

        const historyMemory = this.onGetHistoryMemoryUsage();
        return this.cachedStateSize + historyMemory;
    }

    /**
     * Update memory cache with current state size
     * Uses debouncing to avoid excessive memory calculations
     * @private
     */
    updateMemoryCache() {
        if (!this.options.enableMemoryTracking) return;

        const now = performance.now();
        
        // Debounce memory calculations for performance
        if (now - this.lastMemoryUpdate < this.memoryUpdateDebounce) {
            return;
        }

        try {
            const state = this.onGetState();
            
            // Quick size estimation first
            const quickSize = JSON.stringify(state).length;
            const memorySizeThreshold = 50 * 1024; // 50KB threshold
            
            // Check state size before calculating memory
            if (quickSize > memorySizeThreshold) {
                if (this.options.enableDebug) {
                    console.warn('StatePerformance: State size exceeds threshold, using lightweight estimation');
                }
                this.cachedStateSize = quickSize; // Fallback lightweight estimation
            } else {
                // Use enhanced memory monitoring for smaller states
                const calculatedSize = this.memoryMonitor.calculateSize(state);
                this.cachedStateSize = calculatedSize || quickSize;
            }
            this.memoryCacheValid = true;
            this.lastMemoryUpdate = now;
            
            if (this.options.enableDebug && calculatedSize === 0) {
                console.warn('StatePerformance: Memory calculation returned 0, using fallback');
                // Fallback to JSON.stringify if estimation fails
                this.cachedStateSize = JSON.stringify(state).length;
            }
        } catch (error) {
            // Fallback if state retrieval fails
            this.cachedStateSize = 0;
            this.memoryCacheValid = false;
            if (this.options.enableDebug) {
                console.warn('StatePerformance: Failed to calculate memory usage:', error);
            }
        }
    }

    /**
     * Invalidate memory cache (called when state changes)
     * Uses smart invalidation to avoid unnecessary recalculations
     */
    invalidateMemoryCache() {
        if (this.options.enableMemoryTracking) {
            this.memoryCacheValid = false;
        }
    }

    /**
     * Force memory cache update
     * Bypasses debouncing for immediate accurate results
     */
    forceMemoryUpdate() {
        if (this.options.enableMemoryTracking) {
            this.lastMemoryUpdate = 0; // Reset debounce
            this.updateMemoryCache();
        }
    }

    /**
     * Get comprehensive performance statistics
     * @param {Object} externalStats - Additional stats from other modules
     * @returns {Object} Complete statistics object
     */
    getStats(externalStats = {}) {
        const baseStats = { ...this.stats };

        if (this.options.enableMemoryTracking) {
            baseStats.memoryUsage = this.getMemoryUsage();
            baseStats.cachedStateSize = this.cachedStateSize;
            baseStats.memoryCacheValid = this.memoryCacheValid;
        }

        return {
            ...baseStats,
            ...externalStats,
            performanceEnabled: this.options.enablePerformanceTracking,
            memoryTrackingEnabled: this.options.enableMemoryTracking
        };
    }

    /**
     * Reset all performance statistics
     * Useful for benchmarking and testing
     */
    resetStats() {
        this.stats = {
            totalUpdates: 0,
            totalGets: 0,
            validationErrors: 0,
            historyOperations: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0
        };

        this.invalidateMemoryCache();
    }

    /**
     * Get performance metrics for debugging
     * @returns {Object} Detailed performance metrics
     */
    getPerformanceMetrics() {
        const now = performance.now();
        
        return {
            statistics: this.getStats(),
            timing: {
                lastMemoryUpdate: this.lastMemoryUpdate,
                timeSinceLastMemoryUpdate: now - this.lastMemoryUpdate,
                memoryUpdateDebounce: this.memoryUpdateDebounce
            },
            cache: {
                memoryCacheValid: this.memoryCacheValid,
                cachedStateSize: this.cachedStateSize,
                memoryTrackingEnabled: this.options.enableMemoryTracking
            },
            configuration: {
                enableMemoryTracking: this.options.enableMemoryTracking,
                enablePerformanceTracking: this.options.enablePerformanceTracking,
                memoryUpdateThreshold: this.options.memoryUpdateThreshold
            }
        };
    }

    /**
     * Start a performance timing measurement
     * @param {string} operation - Name of the operation being measured
     * @returns {Function} End timing function
     */
    startTiming(operation = 'unknown') {
        if (!this.options.enablePerformanceTracking) {
            return () => {};
        }

        const startTime = performance.now();
        
        return () => {
            const duration = performance.now() - startTime;
            if (this.options.enableDebug) {
                console.log(`StatePerformance: ${operation} took ${duration.toFixed(2)}ms`);
            }
            return duration;
        };
    }

    /**
     * Configure performance monitoring options
     * @param {Object} newOptions - New configuration options
     */
    configure(newOptions) {
        this.options = { ...this.options, ...newOptions };
        
        // Reset cache if memory tracking was disabled
        if (!this.options.enableMemoryTracking) {
            this.memoryCacheValid = false;
            this.cachedStateSize = 0;
        }
    }

    /**
     * Check if performance tracking is enabled
     * @returns {boolean} Whether performance tracking is active
     */
    isTrackingEnabled() {
        return this.options.enablePerformanceTracking;
    }

    /**
     * Check if memory tracking is enabled
     * @returns {boolean} Whether memory tracking is active
     */
    isMemoryTrackingEnabled() {
        return this.options.enableMemoryTracking;
    }

    /**
     * Get memory efficiency metrics
     * @returns {Object} Memory efficiency statistics
     */
    getMemoryEfficiency() {
        if (!this.options.enableMemoryTracking) {
            return { enabled: false };
        }

        const memoryUsage = this.getMemoryUsage();
        const totalOperations = this.stats.totalUpdates + this.stats.totalGets;
        
        return {
            enabled: true,
            totalMemoryUsage: memoryUsage,
            averageMemoryPerOperation: totalOperations > 0 ? memoryUsage / totalOperations : 0,
            memoryPerUpdate: this.stats.totalUpdates > 0 ? memoryUsage / this.stats.totalUpdates : 0,
            cacheHitRate: this.memoryCacheValid ? 1 : 0,
            lastCacheUpdate: this.lastMemoryUpdate
        };
    }
}

export default StatePerformance;
