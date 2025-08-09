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

import { eventDispatcher } from '@/systems/EventDispatcher.js';
import { DEFAULT_STATE, getDefaultValue } from '@/constants/state-schema.js';
import { 
    getValueByPath, 
    setValueByPath, 
    deepClone, 
    deepEqual, 
    isValidPath
} from '@/systems/StateUtils.js';
import { validateValue as validateValueUtil } from '@/systems/StateValidation.js';
import { StateHistory } from '@/systems/StateHistory.js';
import { StateSubscriptions } from '@/systems/StateSubscriptions.js';
import { StatePerformance } from '@/systems/StatePerformance.js';
import { StateAsync } from '@/systems/StateAsync.js';

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
            onInvalidateCache: () => this.statePerformance.invalidateMemoryCache(),
            onEmitEvent: (eventName, payload) => {
                if (this.options.enableEvents) {
                    this.eventDispatcher.emit(eventName, payload);
                }
            },
            onUpdateStats: (operation) => {
                if (operation === 'historyOperations') {
                    this.statePerformance.recordHistoryOperation();
                }
            }
        });

        // State subscriptions management
        this.stateSubscriptions = new StateSubscriptions({
            enableDebug: this.options.enableDebug
        }, {
            onGetState: (path) => this.getState(path)
        });

        // Performance tracking and monitoring
        this.statePerformance = new StatePerformance({
            enablePerformanceTracking: this.options.enablePerformanceTracking !== false,
            enableMemoryTracking: this.options.enableMemoryTracking !== false,
            enableDebug: this.options.enableDebug,
            memoryUpdateThreshold: this.options.memoryUpdateThreshold || 1000
        }, {
            onGetState: () => this.currentState,
            onGetHistoryMemoryUsage: () => this.stateHistory.getHistoryMemoryUsage()
        });

        // Async state management with safe state update callback
        this.stateAsync = new StateAsync({
            enableEvents: this.options.enableEvents,
            enableDebug: this.options.enableDebug,
            defaultTimeout: this.options.asyncTimeout || 30000,
            retryAttempts: this.options.asyncRetryAttempts || 0,
            retryDelay: this.options.asyncRetryDelay || 1000
        }, {
            onSetState: (path, value, options) => this._safeCallModule('directSetState', () => this._directSetState(path, value, options)),
            onEmitEvent: (eventName, payload) => this._safeEmitEvent(eventName, payload)
        });

        // Event dispatcher reference
        this.eventDispatcher = eventDispatcher;

        // Error tracking
        this.moduleErrors = {
            history: 0,
            subscriptions: 0,
            performance: 0,
            async: 0,
            validation: 0
        };

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
        this.statePerformance.recordGet(options.skipStats);

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
        } catch (error) {
            if (this.options.enableDebug) {
                console.error('StateManager: getState error:', error);
            }
            throw error;
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
                    this.statePerformance.recordValidationError();
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
            this._safeCallModule('performance', () => this.statePerformance.recordUpdate(startTime));

            // Add new state to history after updating
            if (!updateOptions.skipHistory) {
                this._safeCallModule('history', () => this.stateHistory.addStateToHistory(this.currentState));
            }

            // Emit events
            if (this.options.enableEvents && !updateOptions.skipEvents) {
                this._safeCallModule('events', () => this.emitStateChange(path, value, oldValue));
            }

            // Trigger subscriptions
            if (!updateOptions.silent) {
                this._safeCallModule('subscriptions', () => this.stateSubscriptions.triggerSubscriptions(path, value, oldValue));
            }

            if (this.options.enableDebug) {
                console.log(`✅ StateManager: setState('${path}')`, { 
                    oldValue, 
                    newValue: value,
                    updateTime: performance.now() - startTime
                });
            }

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
        return this.stateAsync.setStateAsync(path, valueOrPromise, options);
    }

    /**
     * Direct state update without triggering async operations (prevents circular dependency)
     * Used internally by StateAsync to avoid infinite recursion
     * @param {string} path - Dot-notation path to state property
     * @param {*} value - New value to set
     * @param {Object} options - Update options
     * @returns {boolean} True if state was updated, false otherwise
     * @private
     */
    _directSetState(path, value, options = {}) {
        const updateOptions = {
            skipValidation: false,
            skipEvents: false,
            skipHistory: false,
            merge: false,
            skipAsync: true, // Prevent async operation triggering
            ...options
        };

        try {
            // Validate path
            if (!isValidPath(path)) {
                throw new Error('State path must be a non-empty string');
            }

            // Get current value for comparison
            const oldValue = this.getState(path);

            // Validate new value if validation is enabled and module exists
            if (!updateOptions.skipValidation && this.stateValidation) {
                const validationResult = this._safeCallModule('validateValue', () => 
                    this.stateValidation.validateValue(path, value)
                );
                if (validationResult !== true) {
                    throw new Error(`Validation failed for '${path}': ${validationResult}`);
                }
            }

            // Update state using utils
            this.currentState = this._safeCallModule('setValueByPath', () => 
                setValueByPath(this.currentState, path, value, updateOptions.merge)
            );

            // Add to history if enabled
            if (!updateOptions.skipHistory) {
                this._safeCallModule('addToHistory', () => 
                    this.stateHistory.addStateToHistory(this.currentState)
                );
            }

            // Track performance
            this._safeCallModule('trackOperation', () => 
                this.statePerformance.recordUpdate(Date.now())
            );

            // Emit change events if enabled
            if (!updateOptions.skipEvents && oldValue !== value) {
                this._safeCallModule('notifySubscribers', () => 
                    this.stateSubscriptions.triggerSubscriptions(path, value, oldValue)
                );
                this._safeEmitEvent('stateChange', { path, value, oldValue });
            }

            return true;
        } catch (error) {
            if (this.options.enableDebug) {
                console.error(`❌ StateManager: _directSetState('${path}') failed:`, error);
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
                this.statePerformance.recordUpdate(startTime);
            }

            return hasChanges;

        } catch (error) {
            // Rollback on error
            this.currentState = originalState;
            this.statePerformance.invalidateMemoryCache();
            
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
            this.statePerformance.invalidateMemoryCache();
            
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
            this.statePerformance.invalidateMemoryCache();
            
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
        const historyStats = this._safeCallModule('history', () => this.stateHistory.getHistoryStats()) || {};
        const subscriptionStats = this._safeCallModule('subscriptions', () => this.stateSubscriptions.getSubscriptionStats()) || {};
        const asyncStats = this._safeCallModule('async', () => this.stateAsync.getAsyncStats()) || {};
        
        const performanceStats = this._safeCallModule('performance', () => this.statePerformance.getStats({
            historySize: historyStats.historySize,
            historyIndex: historyStats.historyIndex,
            subscriptionCount: subscriptionStats.totalSubscriptions,
            ...asyncStats
        })) || {};

        // Add module error statistics
        return {
            ...performanceStats,
            moduleErrors: this.getModuleErrors(),
            totalModuleErrors: Object.values(this.moduleErrors).reduce((sum, count) => sum + count, 0)
        };
    }

    /**
     * Get estimated memory usage
     * @returns {number} Total memory usage in bytes (estimated)
     */
    getMemoryUsage() {
        return this.statePerformance.getMemoryUsage();
    }

    /**
     * Get active async operations
     * @returns {Array} Array of active operation information
     */
    getActiveAsyncOperations() {
        return this.stateAsync.getActiveOperations();
    }

    /**
     * Cancel an active async operation
     * @param {string} operationId - ID of operation to cancel
     * @returns {boolean} True if operation was cancelled
     */
    cancelAsyncOperation(operationId) {
        return this.stateAsync.cancelOperation(operationId);
    }

    /**
     * Cancel all active async operations
     * @returns {number} Number of operations cancelled
     */
    cancelAllAsyncOperations() {
        return this.stateAsync.cancelAllOperations();
    }

    /**
     * Perform integration health check across all modules
     * @returns {Object} Health check results
     */
    performHealthCheck() {
        const healthCheck = {
            timestamp: Date.now(),
            healthy: true,
            modules: {},
            summary: {
                totalErrors: 0,
                modulesHealthy: 0,
                modulesWithErrors: 0
            }
        };

        // Check each module
        const modules = ['history', 'subscriptions', 'performance', 'async', 'validation'];
        
        modules.forEach(moduleName => {
            const moduleErrors = this.moduleErrors[moduleName] || 0;
            const isHealthy = moduleErrors === 0;
            
            healthCheck.modules[moduleName] = {
                healthy: isHealthy,
                errorCount: moduleErrors,
                status: isHealthy ? 'OK' : 'ERRORS'
            };

            if (isHealthy) {
                healthCheck.summary.modulesHealthy++;
            } else {
                healthCheck.summary.modulesWithErrors++;
                healthCheck.healthy = false;
            }

            healthCheck.summary.totalErrors += moduleErrors;
        });

        // Test basic integration
        try {
            const testState = this.getState();
            const testStats = this.getStats();
            
            healthCheck.integration = {
                getStateWorking: !!testState,
                getStatsWorking: !!testStats,
                eventDispatcherAvailable: !!this.eventDispatcher
            };
        } catch (error) {
            healthCheck.healthy = false;
            healthCheck.integration = {
                error: error.message,
                working: false
            };
        }

        if (this.options.enableDebug) {
            console.log(`🏥 StateManager: Health check ${healthCheck.healthy ? 'PASSED' : 'FAILED'}`, healthCheck);
        }

        return healthCheck;
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
        try {
            // Reset current state first
            this.currentState = deepClone(DEFAULT_STATE);
            
            // Cancel async operations first to prevent interference
            this._safeCallModule('async', () => {
                this.stateAsync.cancelAllOperations();
                this.stateAsync.resetStats();
            });

            // Clear subscriptions to prevent unwanted triggers
            this._safeCallModule('subscriptions', () => this.stateSubscriptions.clearAll());

            // Reset performance tracking
            this._safeCallModule('performance', () => {
                this.statePerformance.invalidateMemoryCache();
                this.statePerformance.resetStats();
            });

            // Reset history last (after other modules are clean)
            this._safeCallModule('history', () => {
                this.stateHistory.clearHistory();
                this.stateHistory.addStateToHistory(this.currentState);
            });

            // Reset module error counters
            this.resetModuleErrors();

            // Emit clearAll event
            this._safeEmitEvent('state:clearAll', { 
                timestamp: Date.now(),
                resetModules: ['async', 'subscriptions', 'performance', 'history']
            });

            if (this.options.enableDebug) {
                console.log('🧹 StateManager: Successfully cleared all state and reset modules');
            }
        } catch (error) {
            if (this.options.enableDebug) {
                console.error('❌ StateManager: Error during clearAll operation:', error);
            }
            throw error;
        }
    }

    // Private methods

    /**
     * Safely call a module method with error tracking
     * @private
     * @param {string} moduleName - Name of the module for error tracking
     * @param {Function} operation - Operation to execute
     * @returns {*} Result of the operation
     */
    _safeCallModule(moduleName, operation) {
        try {
            return operation();
        } catch (error) {
            this.moduleErrors[moduleName] = (this.moduleErrors[moduleName] || 0) + 1;
            
            if (this.options.enableDebug) {
                console.error(`❌ StateManager: ${moduleName} module error:`, error);
            }

            // Emit error event for monitoring
            this._safeEmitEvent('state:moduleError', {
                module: moduleName,
                error: error.message,
                timestamp: Date.now()
            });

            throw error;
        }
    }

    /**
     * Safely emit an event with error handling
     * @private
     * @param {string} eventName - Name of the event
     * @param {*} payload - Event payload
     */
    _safeEmitEvent(eventName, payload) {
        try {
            if (this.options.enableEvents) {
                this.eventDispatcher.emit(eventName, payload);
            }
        } catch (error) {
            if (this.options.enableDebug) {
                console.error(`❌ StateManager: Event emission error for '${eventName}':`, error);
            }
            // Don't re-throw event errors to prevent cascading failures
        }
    }

    /**
     * Get module error statistics
     * @returns {Object} Error statistics by module
     */
    getModuleErrors() {
        return { ...this.moduleErrors };
    }

    /**
     * Reset module error counters
     */
    resetModuleErrors() {
        this.moduleErrors = {
            history: 0,
            subscriptions: 0,
            performance: 0,
            async: 0,
            validation: 0
        };
    }

    /**
     * Emit state change event
     * @private
     */
    emitStateChange(path, newValue, oldValue) {
        // Emit general state change event
        this._safeEmitEvent('state:change', {
            path,
            newValue,
            oldValue,
            timestamp: Date.now()
        });

        // Emit specific path event
        this._safeEmitEvent(`state:change:${path}`, {
            newValue,
            oldValue,
            timestamp: Date.now()
        });
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
