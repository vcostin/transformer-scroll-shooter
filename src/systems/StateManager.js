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
        this.currentState = this.deepClone(DEFAULT_STATE);

        // State history for undo/redo functionality
        this.history = [];
        this.historyIndex = -1;

        // Subscriptions for state changes
        this.subscriptions = new Map();

        // Performance tracking
        this.stats = {
            totalUpdates: 0,
            totalGets: 0,
            totalSubscriptions: 0,
            validationErrors: 0,
            historyOperations: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0
        };

        // Event dispatcher reference
        this.eventDispatcher = eventDispatcher;

        // Initialize history with current state
        if (this.options.enableHistory) {
            this.addCurrentStateToHistory();
        }

        // Debug mode setup
        if (this.options.enableDebug) {
            this.enableDebugMode();
        }
    }

    /**
     * Get state value by path
     * @param {string} path - Dot-notation path to state property
     * @returns {*} State value or undefined if not found
     */
    getState(path = '') {
        const startTime = performance.now();
        this.stats.totalGets++;

        try {
            if (!path) {
                return this.options.immutable ? this.deepClone(this.currentState) : this.currentState;
            }

            const value = this.getValueByPath(this.currentState, path);
            const result = this.options.immutable && typeof value === 'object' && value !== null 
                ? this.deepClone(value) 
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
            if (!path || typeof path !== 'string') {
                throw new Error('State path must be a non-empty string');
            }

            // Validate value if validation is enabled
            if (this.options.enableValidation && !updateOptions.skipValidation) {
                const validationError = this.validateValue(path, value);
                if (validationError) {
                    this.stats.validationErrors++;
                    throw new Error(`Validation error for '${path}': ${validationError}`);
                }
            }

            // Create new state with immutable update
            const oldValue = this.getValueByPath(this.currentState, path);
            const newState = this.setValueByPath(this.currentState, path, value, updateOptions.merge);

            // Check if state actually changed
            if (this.deepEqual(oldValue, value)) {
                if (this.options.enableDebug) {
                    console.log(`⚠️ StateManager: setState('${path}') - No change, skipping update`);
                }
                return false;
            }

            // Update current state
            this.currentState = newState;
            this.stats.totalUpdates++;

            // Add new state to history after updating
            if (this.options.enableHistory && !updateOptions.skipHistory) {
                this.addCurrentStateToHistory();
            }

            // Emit events
            if (this.options.enableEvents && !updateOptions.skipEvents) {
                this.emitStateChange(path, value, oldValue);
            }

            // Trigger subscriptions
            this.triggerSubscriptions(path, value, oldValue);

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
        } finally {
            this.updateAverageTime(performance.now() - startTime);
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
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const subscriptionOptions = {
            immediate: false,
            deep: true,
            ...options
        };

        const subscriptionId = `${path}_${Date.now()}_${Math.random()}`;
        const subscription = {
            id: subscriptionId,
            path,
            callback,
            options: subscriptionOptions
        };

        // Add to subscriptions map
        if (!this.subscriptions.has(path)) {
            this.subscriptions.set(path, []);
        }
        this.subscriptions.get(path).push(subscription);
        this.stats.totalSubscriptions++;

        // Call immediately if requested
        if (subscriptionOptions.immediate) {
            const currentValue = this.getState(path);
            callback(currentValue, undefined, path);
        }

        if (this.options.enableDebug) {
            console.log(`📡 StateManager: Subscribed to '${path}'`, subscription);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(subscriptionId);
    }

    /**
     * Unsubscribe from state changes
     * @param {string} subscriptionId - ID of subscription to remove
     * @returns {boolean} True if subscription was removed
     */
    unsubscribe(subscriptionId) {
        for (const [path, subscriptions] of this.subscriptions.entries()) {
            const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);
                if (subscriptions.length === 0) {
                    this.subscriptions.delete(path);
                }
                
                if (this.options.enableDebug) {
                    console.log(`📡 StateManager: Unsubscribed from '${path}'`, subscriptionId);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Undo last state change
     * @returns {boolean} True if undo was successful
     */
    undo() {
        if (!this.options.enableHistory) {
            throw new Error('History is disabled');
        }

        if (this.historyIndex <= 0) {
            return false;
        }

        this.historyIndex--;
        this.currentState = this.deepClone(this.history[this.historyIndex]);
        this.stats.historyOperations++;

        // Emit undo event
        if (this.options.enableEvents) {
            this.eventDispatcher.emit('state:undo', {
                state: this.currentState,
                historyIndex: this.historyIndex
            });
        }

        if (this.options.enableDebug) {
            console.log(`↶ StateManager: Undo to history index ${this.historyIndex}`);
        }

        return true;
    }

    /**
     * Redo last undone state change
     * @returns {boolean} True if redo was successful
     */
    redo() {
        if (!this.options.enableHistory) {
            throw new Error('History is disabled');
        }

        if (this.historyIndex >= this.history.length - 1) {
            return false;
        }

        this.historyIndex++;
        this.currentState = this.deepClone(this.history[this.historyIndex]);
        this.stats.historyOperations++;

        // Emit redo event
        if (this.options.enableEvents) {
            this.eventDispatcher.emit('state:redo', {
                state: this.currentState,
                historyIndex: this.historyIndex
            });
        }

        if (this.options.enableDebug) {
            console.log(`↷ StateManager: Redo to history index ${this.historyIndex}`);
        }

        return true;
    }

    /**
     * Reset state to default values
     * @param {string} path - Optional path to reset, resets entire state if not provided
     */
    resetState(path = '') {
        if (!path) {
            // Reset entire state
            this.currentState = this.deepClone(DEFAULT_STATE);
            if (this.options.enableHistory) {
                this.clearHistory();
                this.addCurrentStateToHistory();
            }
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
        return {
            ...this.stats,
            historySize: this.history.length,
            historyIndex: this.historyIndex,
            subscriptionCount: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.length, 0),
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
        this.currentState = this.deepClone(DEFAULT_STATE);
        this.clearHistory();
        this.subscriptions.clear();
        this.stats = {
            totalUpdates: 0,
            totalGets: 0,
            totalSubscriptions: 0,
            validationErrors: 0,
            historyOperations: 0,
            averageUpdateTime: 0,
            lastUpdateTime: 0
        };

        if (this.options.enableHistory) {
            this.addCurrentStateToHistory();
        }

        if (this.options.enableEvents) {
            this.eventDispatcher.emit('state:clear');
        }
    }

    // Private methods

    /**
     * Get value from object by dot-notation path
     * @private
     */
    getValueByPath(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === null || current === undefined || !(part in current)) {
                return undefined;
            }
            current = current[part];
        }

        return current;
    }

    /**
     * Set value in object by dot-notation path (immutable)
     * @private
     */
    setValueByPath(obj, path, value, merge = false) {
        const parts = path.split('.');
        const newObj = this.deepClone(obj);
        let current = newObj;

        // Navigate to the parent of the target property
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] === undefined || current[part] === null) {
                current[part] = {};
            } else if (typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }

        // Set the final value
        const finalKey = parts[parts.length - 1];
        if (merge && typeof current[finalKey] === 'object' && typeof value === 'object') {
            current[finalKey] = { ...current[finalKey], ...value };
        } else {
            current[finalKey] = value;
        }

        return newObj;
    }

    /**
     * Deep clone an object
     * @private
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }

    /**
     * Deep equality check
     * @private
     */
    deepEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.deepEqual(a[i], b[i])) return false;
            }
            return true;
        }
        if (typeof a === 'object' && typeof b === 'object') {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            if (keysA.length !== keysB.length) return false;
            for (const key of keysA) {
                if (!keysB.includes(key)) return false;
                if (!this.deepEqual(a[key], b[key])) return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Validate value against schema
     * @private
     */
    validateValue(path, value) {
        const rules = getValidationRules(path);
        if (!rules) return null;

        // Type validation
        if (rules.type) {
            if (rules.type === 'any') return null;
            if (rules.nullable && value === null) return null;

            const valueType = Array.isArray(value) ? 'array' : typeof value;
            if (valueType !== rules.type) {
                return `Expected ${rules.type}, got ${valueType}`;
            }
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
            return `Value must be one of: ${rules.enum.join(', ')}`;
        }

        // Number range validation
        if (typeof value === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                return `Value must be >= ${rules.min}`;
            }
            if (rules.max !== undefined && value > rules.max) {
                return `Value must be <= ${rules.max}`;
            }
        }

        return null;
    }

    /**
     * Add current state to history
     * @private
     */
    addCurrentStateToHistory() {
        // Remove any history after current index (when we're in the middle of history)
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add current state
        this.history.push(this.deepClone(this.currentState));
        this.historyIndex = this.history.length - 1;

        // Trim history if it exceeds max size
        if (this.history.length > this.options.maxHistorySize) {
            const removeCount = this.history.length - this.options.maxHistorySize;
            this.history.splice(0, removeCount);
            this.historyIndex -= removeCount;
        }
    }

    /**
     * Clear state history
     * @private
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
    }

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
     * Trigger subscriptions for a path change
     * @private
     */
    triggerSubscriptions(path, newValue, oldValue) {
        // Direct path subscriptions
        if (this.subscriptions.has(path)) {
            for (const subscription of this.subscriptions.get(path)) {
                try {
                    subscription.callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`StateManager subscription error for '${path}':`, error);
                }
            }
        }

        // Parent path subscriptions (for deep watching)
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.subscriptions.has(parentPath)) {
                for (const subscription of this.subscriptions.get(parentPath)) {
                    if (subscription.options.deep) {
                        const currentParentValue = this.getState(parentPath);
                        try {
                            subscription.callback(currentParentValue, undefined, parentPath);
                        } catch (error) {
                            console.error(`StateManager subscription error for '${parentPath}':`, error);
                        }
                    }
                }
            }
        }
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
        return JSON.stringify(this.currentState).length + JSON.stringify(this.history).length;
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

// Export default instance for convenience
export default stateManager;
