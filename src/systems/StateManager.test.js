/**
 * StateManager Tests
 * Comprehensive test suite for the StateManager system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager, stateManager } from './StateManager.js';
import { DEFAULT_STATE, STATE_PATHS } from '../constants/state-schema.js';

describe('StateManager', () => {
    let testStateManager;

    beforeEach(() => {
        // Create fresh instance for each test
        testStateManager = new StateManager({
            enableDebug: false,
            enableHistory: true,
            enableValidation: true,
            enableEvents: true,
            maxHistorySize: 10
        });
    });

    afterEach(() => {
        // Clean up
        testStateManager.clearAll();
    });

    describe('Constructor', () => {
        it('should create a new instance with default state', () => {
            expect(testStateManager).toBeDefined();
            expect(testStateManager.currentState).toBeDefined();
            expect(testStateManager.getState()).toEqual(DEFAULT_STATE);
        });

        it('should initialize with custom options', () => {
            const customManager = new StateManager({
                enableDebug: true,
                enableHistory: false,
                maxHistorySize: 5
            });
            
            expect(customManager.options.enableDebug).toBe(true);
            expect(customManager.options.enableHistory).toBe(false);
            expect(customManager.options.maxHistorySize).toBe(5);
        });

        it('should initialize statistics', () => {
            const stats = testStateManager.getStats();
            expect(stats.totalUpdates).toBe(0);
            expect(stats.totalGets).toBe(0);
            expect(stats.subscriptionCount).toBe(0);
        });
    });

    describe('getState() method', () => {
        it('should return entire state when no path provided', () => {
            const state = testStateManager.getState();
            expect(state).toEqual(DEFAULT_STATE);
            expect(state).not.toBe(testStateManager.currentState); // Should be cloned
        });

        it('should return specific property by path', () => {
            const playerHealth = testStateManager.getState('player.health');
            expect(playerHealth).toBe(100);
        });

        it('should return nested object by path', () => {
            const playerPosition = testStateManager.getState('player.position');
            expect(playerPosition).toEqual({ x: 0, y: 0 });
        });

        it('should return undefined for non-existent path', () => {
            const nonExistent = testStateManager.getState('nonexistent.path');
            expect(nonExistent).toBeUndefined();
        });

        it('should increment stats counter', () => {
            testStateManager.getState('player.health');
            const stats = testStateManager.getStats();
            expect(stats.totalGets).toBe(1);
        });

        it('should return cloned objects for immutability', () => {
            const position1 = testStateManager.getState('player.position');
            const position2 = testStateManager.getState('player.position');
            expect(position1).toEqual(position2);
            expect(position1).not.toBe(position2); // Different object references
        });
    });

    describe('setState() method', () => {
        it('should set simple property by path', () => {
            const result = testStateManager.setState('player.health', 50);
            expect(result).toBe(true);
            expect(testStateManager.getState('player.health')).toBe(50);
        });

        it('should set nested object by path', () => {
            const newPosition = { x: 10, y: 20 };
            testStateManager.setState('player.position', newPosition);
            expect(testStateManager.getState('player.position')).toEqual(newPosition);
        });

        it('should create nested paths if they don\'t exist', () => {
            testStateManager.setState('custom.nested.path', 'value');
            expect(testStateManager.getState('custom.nested.path')).toBe('value');
        });

        it('should maintain immutability', () => {
            const originalState = testStateManager.getState();
            testStateManager.setState('player.health', 50);
            expect(originalState.player.health).toBe(100); // Original unchanged
        });

        it('should return false if value hasn\'t changed', () => {
            const result = testStateManager.setState('player.health', 100); // Same as default
            expect(result).toBe(false);
        });

        it('should increment stats counter', () => {
            testStateManager.setState('player.health', 50);
            const stats = testStateManager.getStats();
            expect(stats.totalUpdates).toBe(1);
        });

        it('should throw error for invalid path', () => {
            expect(() => testStateManager.setState('', 'value')).toThrow('State path must be a non-empty string');
            expect(() => testStateManager.setState(null, 'value')).toThrow('State path must be a non-empty string');
        });

        it('should support merge option for objects', () => {
            testStateManager.setState('player.position', { x: 10, y: 20 });
            testStateManager.setState('player.position', { x: 15 }, { merge: true });
            
            const position = testStateManager.getState('player.position');
            expect(position).toEqual({ x: 15, y: 20 }); // y preserved, x updated
        });
    });

    describe('State validation', () => {
        it('should validate enum values', () => {
            expect(() => testStateManager.setState('game.status', 'invalid')).toThrow('Validation error');
            
            // Valid enum value should work
            testStateManager.setState('game.status', 'playing');
            expect(testStateManager.getState('game.status')).toBe('playing');
        });

        it('should validate number ranges', () => {
            expect(() => testStateManager.setState('game.level', 0)).toThrow('Validation error');
            expect(() => testStateManager.setState('game.level', 1000)).toThrow('Validation error');
            
            // Valid range should work
            testStateManager.setState('game.level', 5);
            expect(testStateManager.getState('game.level')).toBe(5);
        });

        it('should validate data types', () => {
            expect(() => testStateManager.setState('player.health', 'invalid')).toThrow('Validation error');
            expect(() => testStateManager.setState('game.paused', 'not_boolean')).toThrow('Validation error');
        });

        it('should allow skipping validation', () => {
            const result = testStateManager.setState('game.status', 'invalid', { skipValidation: true });
            expect(result).toBe(true);
            expect(testStateManager.getState('game.status')).toBe('invalid');
        });
    });

    describe('subscribe() method', () => {
        it('should add subscription and return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = testStateManager.subscribe('player.health', callback);
            
            expect(typeof unsubscribe).toBe('function');
            expect(testStateManager.getStats().subscriptionCount).toBe(1);
        });

        it('should trigger subscription on state change', () => {
            const callback = vi.fn();
            testStateManager.subscribe('player.health', callback);
            
            testStateManager.setState('player.health', 50);
            
            expect(callback).toHaveBeenCalledWith(50, 100, 'player.health');
        });

        it('should support immediate callback option', () => {
            const callback = vi.fn();
            testStateManager.subscribe('player.health', callback, { immediate: true });
            
            expect(callback).toHaveBeenCalledWith(100, undefined, 'player.health');
        });

        it('should support deep watching for nested changes', () => {
            const callback = vi.fn();
            testStateManager.subscribe('player', callback, { deep: true });
            
            testStateManager.setState('player.position.x', 10);
            
            expect(callback).toHaveBeenCalled();
        });

        it('should throw error for invalid callback', () => {
            expect(() => testStateManager.subscribe('player.health', 'not_function')).toThrow('Callback must be a function');
        });
    });

    describe('unsubscribe() method', () => {
        it('should remove subscription', () => {
            const callback = vi.fn();
            const unsubscribe = testStateManager.subscribe('player.health', callback);
            
            expect(testStateManager.getStats().subscriptionCount).toBe(1);
            
            const result = unsubscribe();
            expect(result).toBe(true);
            expect(testStateManager.getStats().subscriptionCount).toBe(0);
        });

        it('should not trigger callback after unsubscribe', () => {
            const callback = vi.fn();
            const unsubscribe = testStateManager.subscribe('player.health', callback);
            
            unsubscribe();
            testStateManager.setState('player.health', 50);
            
            expect(callback).not.toHaveBeenCalled();
        });

        it('should return false for non-existent subscription', () => {
            const result = testStateManager.unsubscribe('non-existent-id');
            expect(result).toBe(false);
        });
    });

    describe('History functionality', () => {
        it('should add states to history', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.setState('player.health', 25);
            
            const stats = testStateManager.getStats();
            expect(stats.historySize).toBeGreaterThan(0);
        });

        it('should support undo operation', () => {
            const originalHealth = testStateManager.getState('player.health');
            testStateManager.setState('player.health', 50);
            
            const undoResult = testStateManager.undo();
            expect(undoResult).toBe(true);
            expect(testStateManager.getState('player.health')).toBe(originalHealth);
        });

        it('should support redo operation', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.undo();
            
            const redoResult = testStateManager.redo();
            expect(redoResult).toBe(true);
            expect(testStateManager.getState('player.health')).toBe(50);
        });

        it('should return false when undo is not possible', () => {
            const result = testStateManager.undo();
            expect(result).toBe(false);
        });

        it('should return false when redo is not possible', () => {
            testStateManager.setState('player.health', 50);
            const result = testStateManager.redo();
            expect(result).toBe(false);
        });

        it('should limit history size', () => {
            const manager = new StateManager({ maxHistorySize: 2, enableHistory: true });
            
            // Add more states than history limit
            for (let i = 0; i < 5; i++) {
                manager.setState('player.health', i);
            }
            
            const stats = manager.getStats();
            expect(stats.historySize).toBeLessThanOrEqual(2);
        });

        it('should handle branching history correctly', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.setState('player.health', 25);
            testStateManager.undo(); // Back to 50
            testStateManager.setState('player.health', 75); // New branch
            
            const redoResult = testStateManager.redo();
            expect(redoResult).toBe(false); // Should not be able to redo to 25
        });
    });

    describe('resetState() method', () => {
        it('should reset entire state to defaults', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.setState('game.level', 10);
            
            testStateManager.resetState();
            
            expect(testStateManager.getState()).toEqual(DEFAULT_STATE);
        });

        it('should reset specific path to default value', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.setState('game.level', 10);
            
            testStateManager.resetState('player.health');
            
            expect(testStateManager.getState('player.health')).toBe(100);
            expect(testStateManager.getState('game.level')).toBe(10); // Unchanged
        });

        it('should clear and restart history on full reset', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.resetState();
            
            const stats = testStateManager.getStats();
            expect(stats.historySize).toBe(1); // Only the reset state
        });
    });

    describe('Event integration', () => {
        it('should emit state change events', () => {
            const eventSpy = vi.spyOn(testStateManager.eventDispatcher, 'emit');
            
            testStateManager.setState('player.health', 50);
            
            expect(eventSpy).toHaveBeenCalledWith('state:change', {
                path: 'player.health',
                newValue: 50,
                oldValue: 100,
                timestamp: expect.any(Number)
            });
        });

        it('should emit specific path events', () => {
            const eventSpy = vi.spyOn(testStateManager.eventDispatcher, 'emit');
            
            testStateManager.setState('player.health', 50);
            
            expect(eventSpy).toHaveBeenCalledWith('state:change:player.health', {
                newValue: 50,
                oldValue: 100,
                timestamp: expect.any(Number)
            });
        });

        it('should emit undo/redo events', () => {
            const eventSpy = vi.spyOn(testStateManager.eventDispatcher, 'emit');
            
            testStateManager.setState('player.health', 50);
            testStateManager.undo();
            
            expect(eventSpy).toHaveBeenCalledWith('state:undo', {
                state: expect.any(Object),
                historyIndex: expect.any(Number)
            });
        });

        it('should emit reset events', () => {
            const eventSpy = vi.spyOn(testStateManager.eventDispatcher, 'emit');
            
            testStateManager.resetState();
            
            expect(eventSpy).toHaveBeenCalledWith('state:reset', {
                path: '',
                state: expect.any(Object)
            });
        });

        it('should allow skipping events', () => {
            const eventSpy = vi.spyOn(testStateManager.eventDispatcher, 'emit');
            
            testStateManager.setState('player.health', 50, { skipEvents: true });
            
            expect(eventSpy).not.toHaveBeenCalledWith('state:change', expect.anything());
        });
    });

    describe('Debug mode', () => {
        it('should enable debug mode', () => {
            testStateManager.enableDebugMode();
            expect(testStateManager.options.enableDebug).toBe(true);
        });

        it('should disable debug mode', () => {
            testStateManager.enableDebugMode();
            testStateManager.disableDebugMode();
            expect(testStateManager.options.enableDebug).toBe(false);
        });

        it('should add global reference when debug is enabled', () => {
            if (typeof window !== 'undefined') {
                testStateManager.enableDebugMode();
                expect(window.stateManager).toBe(testStateManager);
                
                testStateManager.disableDebugMode();
                expect(window.stateManager).toBeUndefined();
            }
        });
    });

    describe('Performance and memory', () => {
        it('should track performance statistics', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.getState('player.health');
            
            const stats = testStateManager.getStats();
            expect(stats.totalUpdates).toBe(1);
            expect(stats.totalGets).toBe(1);
            expect(stats.averageUpdateTime).toBeGreaterThanOrEqual(0);
        });

        it('should handle high-frequency updates efficiently', () => {
            const startTime = performance.now();
            
            // Perform many updates
            for (let i = 0; i < 1000; i++) {
                testStateManager.setState('player.position.x', i);
            }
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
            expect(testStateManager.getState('player.position.x')).toBe(999);
        });

        it('should estimate memory usage', () => {
            const stats = testStateManager.getStats();
            expect(stats.memoryUsage).toBeGreaterThan(0);
        });

        it('should handle subscription cleanup efficiently', () => {
            const callbacks = [];
            const unsubscribeFunctions = [];
            
            // Create many subscriptions
            for (let i = 0; i < 100; i++) {
                const callback = vi.fn();
                callbacks.push(callback);
                const unsubscribe = testStateManager.subscribe(`player.position.x`, callback);
                unsubscribeFunctions.push(unsubscribe);
            }
            
            expect(testStateManager.getStats().subscriptionCount).toBe(100);
            
            // Trigger state change
            testStateManager.setState('player.position.x', 10);
            
            // All callbacks should be called
            callbacks.forEach(callback => {
                expect(callback).toHaveBeenCalled();
            });
            
            // Unsubscribe all
            unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
            expect(testStateManager.getStats().subscriptionCount).toBe(0);
        });

        it('should cache memory usage calculations for performance', () => {
            // First call should calculate and cache
            const firstCall = testStateManager.getMemoryUsage();
            expect(firstCall).toBeGreaterThan(0);
            
            // Second call should use cached value (no JSON.stringify overhead)
            const secondCall = testStateManager.getMemoryUsage();
            expect(secondCall).toBe(firstCall);
            
            // After state change, cache should be invalidated
            testStateManager.setState('player.health', 75);
            const thirdCall = testStateManager.getMemoryUsage();
            expect(thirdCall).toBeGreaterThan(0);
            
            // Verify cache is working again
            const fourthCall = testStateManager.getMemoryUsage();
            expect(fourthCall).toBe(thirdCall);
        });
    });

    describe('Utility methods', () => {
        it('should clear all state and history', () => {
            testStateManager.setState('player.health', 50);
            const callback = vi.fn();
            testStateManager.subscribe('player.health', callback);
            
            testStateManager.clearAll();
            
            expect(testStateManager.getState()).toEqual(DEFAULT_STATE);
            expect(testStateManager.getStats().subscriptionCount).toBe(0);
            expect(testStateManager.getStats().historySize).toBe(1);
        });

        it('should emit clearAll event when clearing all state', () => {
            const eventSpy = vi.fn();
            testStateManager.eventDispatcher.on('state:clearAll', eventSpy);
            
            testStateManager.clearAll();
            
            expect(eventSpy).toHaveBeenCalledWith({ timestamp: expect.any(Number) }, 'state:clearAll');
        });

        it('should provide comprehensive statistics', () => {
            testStateManager.setState('player.health', 50);
            testStateManager.subscribe('player.health', vi.fn());
            
            const stats = testStateManager.getStats();
            
            expect(stats).toHaveProperty('totalUpdates');
            expect(stats).toHaveProperty('totalGets');
            expect(stats).toHaveProperty('historySize');
            expect(stats).toHaveProperty('subscriptionCount');
            expect(stats).toHaveProperty('memoryUsage');
            expect(stats).toHaveProperty('averageUpdateTime');
        });
    });

    describe('Error handling', () => {
        it('should handle subscription callback errors gracefully', () => {
            // Mock console.error to prevent stderr output during test
            const originalConsoleError = console.error;
            console.error = vi.fn();
            
            const errorCallback = vi.fn(() => {
                throw new Error('Subscription error');
            });
            
            testStateManager.subscribe('player.health', errorCallback);
            
            // Should not throw error
            expect(() => testStateManager.setState('player.health', 50)).not.toThrow();
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining("StateSubscriptions callback error for 'player.health':"),
                expect.any(Error)
            );
            
            // Restore console.error
            console.error = originalConsoleError;
        });

        it('should handle validation errors properly', () => {
            const statsBefore = testStateManager.getStats();
            
            try {
                testStateManager.setState('game.level', 'invalid');
            } catch (error) {
                expect(error.message).toContain('Validation error');
            }
            
            const statsAfter = testStateManager.getStats();
            expect(statsAfter.validationErrors).toBe(statsBefore.validationErrors + 1);
        });

        it('should handle history operations when history is disabled', () => {
            const manager = new StateManager({ enableHistory: false });
            
            expect(() => manager.undo()).toThrow('History is disabled');
            expect(() => manager.redo()).toThrow('History is disabled');
        });
    });

    describe('Singleton instance', () => {
        it('should provide working singleton instance', () => {
            expect(stateManager).toBeDefined();
            expect(stateManager).toBeInstanceOf(StateManager);
        });

        it('should maintain state across references', () => {
            stateManager.setState('player.health', 75);
            expect(stateManager.getState('player.health')).toBe(75);
        });
    });
});

describe('State Schema Integration', () => {
    let testStateManager;

    beforeEach(() => {
        testStateManager = new StateManager();
    });

    it('should work with STATE_PATHS constants', () => {
        testStateManager.setState(STATE_PATHS.PLAYER_HEALTH, 50);
        expect(testStateManager.getState(STATE_PATHS.PLAYER_HEALTH)).toBe(50);
    });

    it('should validate against schema rules', () => {
        // Valid values should work
        testStateManager.setState(STATE_PATHS.GAME_STATUS, 'playing');
        expect(testStateManager.getState(STATE_PATHS.GAME_STATUS)).toBe('playing');
        
        // Invalid values should fail
        expect(() => testStateManager.setState(STATE_PATHS.GAME_STATUS, 'invalid')).toThrow();
    });

    it('should reset to schema defaults', () => {
        testStateManager.setState(STATE_PATHS.PLAYER_HEALTH, 50);
        testStateManager.resetState(STATE_PATHS.PLAYER_HEALTH);
        expect(testStateManager.getState(STATE_PATHS.PLAYER_HEALTH)).toBe(100); // Default value
    });

    describe('Async state management', () => {
        it('should handle async state updates with setStateAsync', async () => {
            const asyncValue = new Promise(resolve => 
                setTimeout(() => resolve(75), 10)
            );
            
            const result = await testStateManager.setStateAsync('player.health', asyncValue);
            expect(result).toBe(true);
            expect(testStateManager.getState('player.health')).toBe(75);
        });

        it('should handle loading states during async operations', async () => {
            const asyncValue = new Promise(resolve => 
                setTimeout(() => resolve(90), 20)
            );
            
            const promise = testStateManager.setStateAsync('player.health', asyncValue, {
                loadingPath: 'ui.loading'
            });
            
            // Should be loading initially
            expect(testStateManager.getState('ui.loading')).toBe(true);
            
            await promise;
            
            // Should not be loading after completion
            expect(testStateManager.getState('ui.loading')).toBe(false);
            expect(testStateManager.getState('player.health')).toBe(90);
        });

        it('should handle async errors with error states', async () => {
            const asyncError = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Test error')), 10)
            );
            
            await expect(testStateManager.setStateAsync('player.health', asyncError, {
                loadingPath: 'ui.loading',
                errorPath: 'ui.error'
            })).rejects.toThrow('Test error');
            
            expect(testStateManager.getState('ui.loading')).toBe(false);
            expect(testStateManager.getState('ui.error')).toBe('Test error');
        });

        it('should support batch updates atomically', () => {
            const updates = [
                { path: 'player.health', value: 80 },
                { path: 'player.energy', value: 60 },
                { path: 'game.score', value: 1500 }
            ];
            
            const result = testStateManager.batchUpdate(updates);
            expect(result).toBe(true);
            
            expect(testStateManager.getState('player.health')).toBe(80);
            expect(testStateManager.getState('player.energy')).toBe(60);
            expect(testStateManager.getState('game.score')).toBe(1500);
        });

        it('should rollback batch updates on error', () => {
            const originalHealth = testStateManager.getState('player.health');
            
            const updates = [
                { path: 'player.health', value: 80 },
                { path: 'game.status', value: 'invalid-status' } // This should fail validation
            ];
            
            expect(() => testStateManager.batchUpdate(updates)).toThrow();
            
            // Should rollback to original state
            expect(testStateManager.getState('player.health')).toBe(originalHealth);
        });

        it('should support transactions with rollback', () => {
            const originalHealth = testStateManager.getState('player.health');
            const originalScore = testStateManager.getState('game.score');
            
            expect(() => {
                testStateManager.transaction((state) => {
                    state.setState('player.health', 50);
                    state.setState('game.score', 2000);
                    throw new Error('Transaction failed');
                });
            }).toThrow('Transaction failed');
            
            // Should rollback both changes
            expect(testStateManager.getState('player.health')).toBe(originalHealth);
            expect(testStateManager.getState('game.score')).toBe(originalScore);
        });

        it('should emit async error events', async () => {
            const errorSpy = vi.fn();
            testStateManager.eventDispatcher.on('state:async-error', errorSpy);
            
            const asyncError = Promise.reject(new Error('Async test error'));
            
            try {
                await testStateManager.setStateAsync('player.health', asyncError);
            } catch (error) {
                // Expected to throw
            }
            
            expect(errorSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    path: 'player.health',
                    error: expect.objectContaining({
                        message: 'Async test error'
                    })
                }),
                'state:async-error'
            );
        });
    });
});
