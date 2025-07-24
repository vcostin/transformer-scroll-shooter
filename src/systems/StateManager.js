/**
 * StateManager - Centralized state management system with immutable updates
 * 
 * Features:
 * - Immutable state updates using deep cloning
 * - Event-driven architecture with EventDispatcher integration
 * - Nested state path support (e.g., 'player.position.x')
 * - State validation and type checking
 * - State history and undo/redo functionality
 * - Debug tools and state inspection
 * - Performance optimizations for high-frequency updates
 * - Memory management and cleanup
 */

import { eventDispatcher } from './EventDispatcher.js';
import { DEFAULT_STATE, STATE_SCHEMA, getValidationRules, getDefaultValue } from '../constants/state-schema.js';
import { 
    getValueByPath, 
    setValueByPath, 
    deepClone, 
    deepEqual, 
    resolveReference as resolveReferenceUtil,
    isValidPath
} from './StateUtils.js';
import { validateValue as validateValueUtil } from './StateValidation.js';
import { StateHistory } from './StateHistory.js';
import { StateSubscriptions } from './StateSubscriptions.js';

/**
 * StateManager class for centralized state management
 */
export class StateManager {
    /**
     * Create a new StateManager instance
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Configuration
        this.options = {
            maxHistorySize: 100,
            enableHistory: true,
            enableValidation: true,
            enableEvents: true,
            enableDebug: false,
            immutable: true,
            ...options
        };

        // Current state (deep clone of default state)
        this.currentState = deepClone(DEFAULT_STATE);

        // State history management
        this.stateHistory = new StateHistory({
            maxHistorySize: this.options.maxHistorySize,
            enableHistory: this.options.enableHistory,
            enableDebug: this.options.enableDebug,
            enableEvents: this.options.enableEvents
        }, {
            onInvalidateCache: () => this.invalidateMemoryCache(),
            onEmitEvent: (eventName, payload) => {
                if (this.options.enableEvents) {
                    this.eventDispatcher.emit(eventName, payload);
                }
            },
            onUpdateStats: (operation) => {
                if (operation === 'historyOperations') {
                    this.stats.historyOperations++;
                }
            }
        });

        // State subscriptions management
        this.stateSubscriptions = new StateSubscriptions({
            enableDebug: this.options.enableDebug
        }, {
            onGetState: (path) => this.getState(path)
        });

        // Performance tracking
        this.stats = {
            totalUpdates: 0,
            totalGets: 0,
            validationErrors: 0,
            historyOperations: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0
        };

        // Cached memory usage tracking
        this.cachedStateSize = 0;
        this.memoryCacheValid = false;

        // Event dispatcher reference
        this.eventDispatcher = eventDispatcher;

        // Initialize history with current state
        this.stateHistory.initialize(this.currentState);

        // Debug mode setup
        if (this.options.enableDebug) {
            this.enableDebugMode();
        }
    }

    /**
     * Get state value by path
     * @param {string} path - Dot-notation path to state property
     * @param {Object} options - Options for getting state
     * @param {boolean} options.skipStats - Whether to skip statistics tracking
     * @returns {*} State value or undefined if not found
     */
    getState(path = '', options = {}) {
        const startTime = performance.now();
        
        if (!options.skipStats) {
            this.stats.totalGets++;
        }

        try {
            if (!path) {
                return this.options.immutable ? deepClone(this.currentState) : this.currentState;
            }

            const value = getValueByPath(this.currentState, path);
            const result = this.options.immutable && typeof value === 'object' && value !== null 
                ? deepClone(value) 
                : value;

            if (this.options.enableDebug) {
                console.log(`🔍 StateManager: getState('${path}')`, result);
            }

            return result;
        } finally {
            this.stats.lastUpdateTime = performance.now() - startTime;
        }
    }

    /**
     * Set state value by path with immutable updates
     * @param {string} path - Dot-notation path to state property
     * @param {*} value - New value to set
     * @param {Object} options - Update options
     * @returns {boolean} True if state was updated, false otherwise
     */
    setState(path, value, options = {}) {
        const startTime = performance.now();
        const updateOptions = {
            skipValidation: false,
            skipEvents: false,
            skipHistory: false,
            merge: false,
            ...options
        };

        try {
            // Validate path
            if (!isValidPath(path)) {
                throw new Error('State path must be a non-empty string');
            }

            // Validate value if validation is enabled
            if (this.options.enableValidation && !updateOptions.skipValidation) {
                const validationError = validateValueUtil(path, value, this.currentState);
                if (validationError) {
                    this.stats.validationErrors++;
                    throw new Error(`Validation error for '${path}': ${validationError}`);
                }
            }

            // Create new state with immutable update
            const oldValue = getValueByPath(this.currentState, path);
            const newState = setValueByPath(this.currentState, path, value, updateOptions.merge);

            // Check if state actually changed
            if (deepEqual(oldValue, value)) {
                if (this.options.enableDebug) {
                    console.log(`⚠️ StateManager: setState('${path}') - No change, skipping update`);
                }
                return false;
            }

            // Update current state
            this.currentState = newState;
            this.stats.totalUpdates++;
            
            // Invalidate memory cache since state changed
            this.invalidateMemoryCache();

            // Add new state to history after updating
            if (!updateOptions.skipHistory) {
                this.stateHistory.addStateToHistory(this.currentState);
            }

            // Emit events
            if (this.options.enableEvents && !updateOptions.skipEvents) {
                this.emitStateChange(path, value, oldValue);
            }

            // Trigger subscriptions
            if (!updateOptions.silent) {
                this.stateSubscriptions.triggerSubscriptions(path, value, oldValue);
            }

            if (this.options.enableDebug) {
                console.log(`✅ StateManager: setState('${path}')`, { 
                    oldValue, 
                    newValue: value,
                    updateTime: performance.now() - startTime
                });
            }

            // Update average time only for successful updates
            this.updateAverageTime(performance.now() - startTime);

            return true;
        } catch (error) {
            if (this.options.enableDebug) {
                console.error(`❌ StateManager: setState('${path}') failed:`, error);
            }
            throw error;
        }
    }

    /**
     * Set state asynchronously with optional loading states
     * @param {string} path - Dot-notation path to state property
     * @param {Promise|*} valueOrPromise - Value or Promise that resolves to value
     * @param {Object} options - Update options
     * @returns {Promise} Promise that resolves when state is updated
     */
    async setStateAsync(path, valueOrPromise, options = {}) {
        // If it's not a promise, just use regular setState
        if (!valueOrPromise || typeof valueOrPromise.then !== 'function') {
            return this.setState(path, valueOrPromise, options);
        }

        // Set loading state if requested
        if (options.loadingPath) {
            this.setState(options.loadingPath, true, { skipHistory: true });
        }

        try {
            const value = await valueOrPromise;
            
            // Clear loading state
            if (options.loadingPath) {
                this.setState(options.loadingPath, false, { skipHistory: true });
            }
            
            // Set the actual value
            return this.setState(path, value, options);
            
        } catch (error) {
            // Clear loading state on error
            if (options.loadingPath) {
                this.setState(options.loadingPath, false, { skipHistory: true });
            }
            
            // Set error state if requested
            if (options.errorPath) {
                this.setState(options.errorPath, error.message || 'Unknown error', { skipHistory: true });
            }
            
            // Emit error event
            if (this.options.enableEvents) {
                this.eventDispatcher.emit('state:async-error', {
                    path,
                    error,
                    timestamp: Date.now()
                });
            }
            
            throw error;
        }
    }

    /**
     * Batch multiple state updates atomically
     * @param {Array} updates - Array of {path, value, options} objects
     * @param {Object} batchOptions - Batch options
     * @returns {boolean} True if any updates were applied
     */
    batchUpdate(updates, batchOptions = {}) {
        if (!Array.isArray(updates) || updates.length === 0) {
            return false;
        }

        const startTime = performance.now();
        let hasChanges = false;
        const changes = [];
        
        // Store original state for rollback
        const originalState = deepClone(this.currentState);

        try {
            // Apply all updates without triggering events/history
            for (const update of updates) {
                const { path, value, options = {} } = update;
                const result = this.setState(path, value, {
                    ...options,
                    skipEvents: true,
                    skipHistory: true,
                    silent: true
                });
                
                if (result) {
                    hasChanges = true;
                    changes.push({ path, value, oldValue: getValueByPath(originalState, path) });
                }
            }

            // If we have changes, handle events and history
            if (hasChanges && !batchOptions.skipEvents) {
                // Add to history as a single operation
                if (!batchOptions.skipHistory) {
                    this.stateHistory.addStateToHistory(this.currentState);
                }

                // Emit batch event
                if (this.options.enableEvents) {
                    this.eventDispatcher.emit('state:batch-update', {
                        changes,
                        timestamp: Date.now()
                    });
                }

                // Trigger subscriptions for all changed paths
                for (const change of changes) {
                    this.stateSubscriptions.triggerSubscriptions(change.path, change.value, change.oldValue);
                }
            }

            // Update performance stats
            if (hasChanges) {
                this.stats.totalUpdates++;
                this.updateAverageTime(performance.now() - startTime);
            }

            return hasChanges;

        } catch (error) {
            // Rollback on error
            this.currentState = originalState;
            this.invalidateMemoryCache();
            
            if (this.options.enableDebug) {
                console.error('🚨 StateManager: Batch update failed, rolled back', error);
            }
            
            throw error;
        }
    }

    /**
     * Create a transaction for multiple related updates
     * @param {Function} transactionFn - Function that performs updates
     * @returns {*} Result of transaction function
     */
    transaction(transactionFn) {
        const originalState = deepClone(this.currentState);
        const startTime = performance.now();
        
        try {
            // Execute transaction
            const result = transactionFn(this);
            
            // Add to history as single operation
            this.stateHistory.addStateToHistory(this.currentState);
            
            // Emit transaction event
            if (this.options.enableEvents) {
                this.eventDispatcher.emit('state:transaction', {
                    timestamp: Date.now(),
                    duration: performance.now() - startTime
                });
            }
            
            if (this.options.enableDebug) {
                console.log('💰 StateManager: Transaction completed', result);
            }
            
            return result;
            
        } catch (error) {
            // Rollback entire transaction
            this.currentState = originalState;
            this.invalidateMemoryCache();
            
            if (this.options.enableDebug) {
                console.error('🚨 StateManager: Transaction failed, rolled back', error);
            }
            
            throw error;
        }
    }

    /**
     * Subscribe to state changes at a specific path
     * @param {string} path - Dot-notation path to state property
     * @param {Function} callback - Function to call when state changes
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback, options = {}) {
        return this.stateSubscriptions.subscribe(path, callback, options);
    }

    /**
     * Unsubscribe from state changes
     * @param {string} subscriptionId - ID of subscription to remove
     * @returns {boolean} True if subscription was removed
     */
    unsubscribe(subscriptionId) {
        return this.stateSubscriptions.unsubscribe(subscriptionId);
    }

    /**
     * Undo last state change
     * @returns {boolean} True if undo was successful
     */
    undo() {
        const previousState = this.stateHistory.undo();
        
        if (previousState !== null) {
            this.currentState = previousState;
            return true;
        }
        
        return false;
    }

    /**
     * Redo last undone state change
     * @returns {boolean} True if redo was successful
     */
    redo() {
        const nextState = this.stateHistory.redo();
        
        if (nextState !== null) {
            this.currentState = nextState;
            return true;
        }
        
        return false;
    }

    /**
     * Reset state to default values
     * @param {string} path - Optional path to reset, resets entire state if not provided
     */
    resetState(path = '') {
        if (!path) {
            // Reset entire state
            this.currentState = deepClone(DEFAULT_STATE);
            
            // Invalidate memory cache since state changed
            this.invalidateMemoryCache();
            
            this.stateHistory.clearHistory();
            this.stateHistory.addStateToHistory(this.currentState);
        } else {
            // Reset specific path to default value
            const defaultValue = getDefaultValue(path);
            if (defaultValue !== undefined) {
                this.setState(path, defaultValue, { skipHistory: false });
            }
        }

        if (this.options.enableEvents) {
            this.eventDispatcher.emit('state:reset', { path, state: this.currentState });
        }

        if (this.options.enableDebug) {
            console.log(`🔄 StateManager: Reset state${path ? ` at '${path}'` : ''}`);
        }
    }

    /**
     * Get state manager statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const historyStats = this.stateHistory.getHistoryStats();
        const subscriptionStats = this.stateSubscriptions.getSubscriptionStats();
        return {
            ...this.stats,
            historySize: historyStats.historySize,
            historyIndex: historyStats.historyIndex,
            subscriptionCount: subscriptionStats.totalSubscriptions,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Enable debug mode with enhanced logging
     */
    enableDebugMode() {
        this.options.enableDebug = true;
        
        // Add global state manager to window for debugging
        if (typeof window !== 'undefined') {
            window.stateManager = this;
        }

        console.log('🐛 StateManager: Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebugMode() {
        this.options.enableDebug = false;
        
        // Remove global reference
        if (typeof window !== 'undefined' && window.stateManager === this) {
            delete window.stateManager;
        }

        console.log('🐛 StateManager: Debug mode disabled');
    }

    /**
     * Clear all state and reset to defaults
     */
    clearAll() {
        this.currentState = deepClone(DEFAULT_STATE);
        
        // Invalidate memory cache since state changed
        this.invalidateMemoryCache();
        this.stateSubscriptions.clearAll();
        this.stats = {
            totalUpdates: 0,
            totalGets: 0,
            validationErrors: 0,
            historyOperations: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0
        };

        this.stateHistory.clearHistory();
        this.stateHistory.addStateToHistory(this.currentState);

        if (this.options.enableEvents) {
            this.eventDispatcher.emit('state:clearAll', { timestamp: Date.now() });
        }
    }

    // Private methods

    /**
     * Emit state change event
     * @private
     */
    emitStateChange(path, newValue, oldValue) {
        this.eventDispatcher.emit('state:change', {
            path,
            newValue,
            oldValue,
            timestamp: Date.now()
        });

        // Emit specific path event
        this.eventDispatcher.emit(`state:change:${path}`, {
            newValue,
            oldValue,
            timestamp: Date.now()
        });
    }

    /**
     * Update average update time
     * @private
     */
    updateAverageTime(time) {
        if (this.stats.totalUpdates === 0) {
            this.stats.averageUpdateTime = time;
        } else {
            this.stats.averageUpdateTime = (this.stats.averageUpdateTime * (this.stats.totalUpdates - 1) + time) / this.stats.totalUpdates;
        }
    }

    /**
     * Get estimated memory usage
     * @private
     */
    getMemoryUsage() {
        if (!this.memoryCacheValid) {
            this.updateMemoryCache();
        }
        return this.cachedStateSize + this.stateHistory.getHistoryMemoryUsage();
    }

    /**
     * Update memory cache with current state size
     * @private
     */
    updateMemoryCache() {
        this.cachedStateSize = JSON.stringify(this.currentState).length;
        this.memoryCacheValid = true;
    }

    /**
     * Invalidate memory cache (called when state or history changes)
     * @private
     */
    invalidateMemoryCache() {
        this.memoryCacheValid = false;
    }
}

// Create singleton instance
export const stateManager = new StateManager({
    enableDebug: false,
    enableHistory: true,
    enableValidation: true,
    enableEvents: true,
    maxHistorySize: 50
});
