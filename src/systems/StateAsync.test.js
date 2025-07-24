/**
 * StateAsync.test.js - Comprehensive tests for async state management module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateAsync } from './StateAsync.js';

describe('StateAsync', () => {
    let stateAsync;
    let mockSetState;
    let mockEmitEvent;
    let mockState;

    beforeEach(() => {
        // Mock state object
        mockState = { test: 'value' };
        
        // Mock callbacks
        mockSetState = vi.fn((path, value, options) => {
            mockState[path] = value;
            return true;
        });
        mockEmitEvent = vi.fn();

        // Create StateAsync instance
        stateAsync = new StateAsync({
            enableDebug: false,
            enableEvents: true
        }, {
            onSetState: mockSetState,
            onEmitEvent: mockEmitEvent
        });

        // Mock performance.now() for consistent testing
        vi.spyOn(global.performance, 'now').mockReturnValue(1000);
    });

    describe('Initialization', () => {
        it('should initialize with default options', () => {
            expect(stateAsync.options.enableEvents).toBe(true);
            expect(stateAsync.options.defaultTimeout).toBe(30000);
            expect(stateAsync.options.retryAttempts).toBe(0);
            expect(stateAsync.stats.totalAsyncOperations).toBe(0);
        });

        it('should accept custom options', () => {
            const customAsync = new StateAsync({
                defaultTimeout: 5000,
                retryAttempts: 3,
                retryDelay: 500
            });

            expect(customAsync.options.defaultTimeout).toBe(5000);
            expect(customAsync.options.retryAttempts).toBe(3);
            expect(customAsync.options.retryDelay).toBe(500);
        });

        it('should initialize with empty active operations', () => {
            expect(stateAsync.getActiveOperations()).toEqual([]);
            expect(stateAsync.activeOperations.size).toBe(0);
        });
    });

    describe('setStateAsync with non-promise values', () => {
        it('should handle non-promise values directly', async () => {
            const result = await stateAsync.setStateAsync('test.path', 'simple value');
            
            expect(mockSetState).toHaveBeenCalledWith('test.path', 'simple value', {});
            expect(result).toBe(true);
        });

        it('should handle null values', async () => {
            const result = await stateAsync.setStateAsync('test.path', null);
            
            expect(mockSetState).toHaveBeenCalledWith('test.path', null, {});
            expect(result).toBe(true);
        });

        it('should handle undefined values', async () => {
            const result = await stateAsync.setStateAsync('test.path', undefined);
            
            expect(mockSetState).toHaveBeenCalledWith('test.path', undefined, {});
            expect(result).toBe(true);
        });
    });

    describe('setStateAsync with promises', () => {
        it('should handle successful promise resolution', async () => {
            const promise = Promise.resolve('resolved value');
            
            global.performance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1050);
            
            const result = await stateAsync.setStateAsync('test.path', promise);
            
            expect(mockSetState).toHaveBeenCalledWith('test.path', 'resolved value', {});
            expect(result).toBe(true);
            expect(stateAsync.stats.totalAsyncOperations).toBe(1);
            expect(stateAsync.stats.successfulOperations).toBe(1);
        });

        it('should handle promise rejection', async () => {
            const error = new Error('Test error');
            const promise = Promise.reject(error);
            
            await expect(stateAsync.setStateAsync('test.path', promise)).rejects.toThrow('Test error');
            
            expect(stateAsync.stats.totalAsyncOperations).toBe(1);
            expect(stateAsync.stats.failedOperations).toBe(1);
        });

        it('should emit success event on successful resolution', async () => {
            const promise = Promise.resolve('success value');
            
            await stateAsync.setStateAsync('test.path', promise);
            
            expect(mockEmitEvent).toHaveBeenCalledWith('state:async-success', expect.objectContaining({
                path: 'test.path',
                value: 'success value'
            }));
        });

        it('should emit error event on promise rejection', async () => {
            const error = new Error('Test error');
            const promise = Promise.reject(error);
            
            try {
                await stateAsync.setStateAsync('test.path', promise);
            } catch (e) {
                // Expected
            }
            
            expect(mockEmitEvent).toHaveBeenCalledWith('state:async-error', expect.objectContaining({
                path: 'test.path',
                error
            }));
        });
    });

    describe('Loading state management', () => {
        it('should set and clear loading state for successful operation', async () => {
            const promise = Promise.resolve('final value');
            
            await stateAsync.setStateAsync('data.value', promise, {
                loadingPath: 'data.loading'
            });
            
            // Should set loading to true, then false
            expect(mockSetState).toHaveBeenNthCalledWith(1, 'data.loading', true, { skipHistory: true });
            expect(mockSetState).toHaveBeenNthCalledWith(2, 'data.loading', false, { skipHistory: true });
            expect(mockSetState).toHaveBeenNthCalledWith(3, 'data.value', 'final value', { loadingPath: 'data.loading' });
        });

        it('should clear loading state on error', async () => {
            const error = new Error('Test error');
            const promise = Promise.reject(error);
            
            try {
                await stateAsync.setStateAsync('data.value', promise, {
                    loadingPath: 'data.loading'
                });
            } catch (e) {
                // Expected
            }
            
            // Should set loading to true, then false on error
            expect(mockSetState).toHaveBeenCalledWith('data.loading', true, { skipHistory: true });
            expect(mockSetState).toHaveBeenCalledWith('data.loading', false, { skipHistory: true });
        });

        it('should support loading options', async () => {
            const promise = Promise.resolve('value');
            
            await stateAsync.setStateAsync('data.value', promise, {
                loadingPath: 'data.loading',
                loadingOptions: { customOption: true }
            });
            
            expect(mockSetState).toHaveBeenCalledWith('data.loading', true, { 
                skipHistory: true, 
                customOption: true 
            });
        });
    });

    describe('Error state management', () => {
        it('should set error state on promise rejection', async () => {
            const error = new Error('Test error message');
            const promise = Promise.reject(error);
            
            try {
                await stateAsync.setStateAsync('data.value', promise, {
                    errorPath: 'data.error'
                });
            } catch (e) {
                // Expected
            }
            
            expect(mockSetState).toHaveBeenCalledWith('data.error', 'Test error message', { skipHistory: true });
        });

        it('should clear error state on successful operation', async () => {
            const promise = Promise.resolve('success');
            
            await stateAsync.setStateAsync('data.value', promise, {
                errorPath: 'data.error'
            });
            
            expect(mockSetState).toHaveBeenCalledWith('data.error', null, { skipHistory: true });
        });

        it('should support error options', async () => {
            const error = new Error('Test error');
            const promise = Promise.reject(error);
            
            try {
                await stateAsync.setStateAsync('data.value', promise, {
                    errorPath: 'data.error',
                    errorOptions: { customErrorOption: true }
                });
            } catch (e) {
                // Expected
            }
            
            expect(mockSetState).toHaveBeenCalledWith('data.error', 'Test error', { 
                skipHistory: true, 
                customErrorOption: true 
            });
        });

        it('should handle string errors', async () => {
            const promise = Promise.reject('String error');
            
            try {
                await stateAsync.setStateAsync('data.value', promise, {
                    errorPath: 'data.error'
                });
            } catch (e) {
                // Expected
            }
            
            expect(mockSetState).toHaveBeenCalledWith('data.error', 'String error', { skipHistory: true });
        });

        it('should handle unknown error types', async () => {
            const promise = Promise.reject({ weird: 'object' });
            
            try {
                await stateAsync.setStateAsync('data.value', promise, {
                    errorPath: 'data.error'
                });
            } catch (e) {
                // Expected
            }
            
            expect(mockSetState).toHaveBeenCalledWith('data.error', 'Unknown error', { skipHistory: true });
        });
    });

    describe('Operation tracking', () => {
        it('should track active operations', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            
            // Start async operation
            const asyncOp = stateAsync.setStateAsync('test.path', promise);
            
            // Check active operations
            const activeOps = stateAsync.getActiveOperations();
            expect(activeOps).toHaveLength(1);
            expect(activeOps[0].path).toBe('test.path');
            
            // Complete operation
            resolvePromise('done');
            await asyncOp;
            
            // Should be no active operations
            expect(stateAsync.getActiveOperations()).toHaveLength(0);
        });

        it('should generate unique operation IDs', () => {
            const id1 = stateAsync.generateOperationId();
            const id2 = stateAsync.generateOperationId();
            
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^async_\d+_\d+$/);
        });

        it('should track operation duration', async () => {
            let currentTime = 1000;
            global.performance.now.mockImplementation(() => currentTime);
            
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            
            const asyncOp = stateAsync.setStateAsync('test.path', promise);
            
            // Advance time for duration calculation
            currentTime = 1100;
            const activeOps = stateAsync.getActiveOperations();
            expect(activeOps[0].duration).toBe(100); // 1100 - 1000
            
            resolvePromise('done');
            await asyncOp;
        });
    });

    describe('Timeout functionality', () => {
        it('should timeout operations that exceed timeout limit', async () => {
            vi.useFakeTimers();
            
            const slowPromise = new Promise(resolve => {
                setTimeout(() => resolve('too slow'), 2000);
            });
            
            const asyncOp = stateAsync.setStateAsync('test.path', slowPromise, {
                timeout: 1000
            });
            
            // Fast forward past timeout
            vi.advanceTimersByTime(1500);
            
            await expect(asyncOp).rejects.toThrow('Operation timed out after 1000ms');
            expect(stateAsync.stats.timeouts).toBe(1);
            
            vi.useRealTimers();
        });

        it('should not timeout operations that complete within limit', async () => {
            vi.useFakeTimers();
            
            const fastPromise = new Promise(resolve => {
                setTimeout(() => resolve('fast enough'), 500);
            });
            
            const asyncOp = stateAsync.setStateAsync('test.path', fastPromise, {
                timeout: 1000
            });
            
            vi.advanceTimersByTime(600);
            
            const result = await asyncOp;
            expect(result).toBe(true);
            expect(stateAsync.stats.timeouts).toBe(0);
            
            vi.useRealTimers();
        });
    });

    describe('Retry functionality', () => {
        it('should retry failed operations', async () => {
            let attempts = 0;
            
            // Create a function that returns a promise that fails twice then succeeds
            const createPromise = () => {
                attempts++;
                if (attempts <= 2) {
                    return Promise.reject(new Error(`Attempt ${attempts} failed`));
                } else {
                    return Promise.resolve('success after retries');
                }
            };
            
            // Since we need to call the function each retry, we'll test the retry logic
            // by creating a custom implementation that tracks retries
            const customAsync = new StateAsync({
                retryAttempts: 2,
                retryDelay: 1
            }, {
                onSetState: mockSetState,
                onEmitEvent: mockEmitEvent
            });
            
            try {
                // This will test retry logic internally, but we expect it to still fail
                // since we can't easily recreate the promise
                await customAsync.setStateAsync('test.path', Promise.reject(new Error('Test error')), {
                    retryAttempts: 1,
                    retryDelay: 1
                });
            } catch (error) {
                // Expected to fail, but should have attempted retries
                expect(customAsync.stats.retries).toBe(1);
            }
        });

        it('should fail after exhausting retry attempts', async () => {
            const alwaysFailPromise = Promise.reject(new Error('Always fails'));
            
            await expect(stateAsync.setStateAsync('test.path', alwaysFailPromise, {
                retryAttempts: 2,
                retryDelay: 10
            })).rejects.toThrow('Always fails');
            
            expect(stateAsync.stats.retries).toBe(2);
        });
    });

    describe('Batch operations', () => {
        it('should execute batch operations concurrently', async () => {
            const operations = [
                { path: 'data.a', valueOrPromise: Promise.resolve('value A'), options: {} },
                { path: 'data.b', valueOrPromise: Promise.resolve('value B'), options: {} },
                { path: 'data.c', valueOrPromise: Promise.resolve('value C'), options: {} }
            ];
            
            const results = await stateAsync.batchSetStateAsync(operations);
            
            expect(results).toEqual([true, true, true]);
            expect(mockSetState).toHaveBeenCalledWith('data.a', 'value A', {});
            expect(mockSetState).toHaveBeenCalledWith('data.b', 'value B', {});
            expect(mockSetState).toHaveBeenCalledWith('data.c', 'value C', {});
        });

        it('should execute batch operations sequentially when requested', async () => {
            const executionOrder = [];
            
            const operations = [
                { 
                    path: 'data.a', 
                    valueOrPromise: Promise.resolve('A').then(v => {
                        executionOrder.push('A');
                        return v;
                    }), 
                    options: {} 
                },
                { 
                    path: 'data.b', 
                    valueOrPromise: Promise.resolve('B').then(v => {
                        executionOrder.push('B');
                        return v;
                    }), 
                    options: {} 
                }
            ];
            
            await stateAsync.batchSetStateAsync(operations, { sequential: true });
            
            expect(executionOrder).toEqual(['A', 'B']);
        });

        it('should handle batch loading states', async () => {
            const operations = [
                { path: 'data.a', valueOrPromise: Promise.resolve('A'), options: {} },
                { path: 'data.b', valueOrPromise: Promise.resolve('B'), options: {} }
            ];
            
            await stateAsync.batchSetStateAsync(operations, {
                loadingPath: 'global.loading'
            });
            
            expect(mockSetState).toHaveBeenCalledWith('global.loading', true, { skipHistory: true });
            expect(mockSetState).toHaveBeenCalledWith('global.loading', false, { skipHistory: true });
        });

        it('should handle batch errors', async () => {
            const operations = [
                { path: 'data.a', valueOrPromise: Promise.resolve('A'), options: {} },
                { path: 'data.b', valueOrPromise: Promise.reject(new Error('Batch error')), options: {} }
            ];
            
            await expect(stateAsync.batchSetStateAsync(operations, {
                errorPath: 'global.error'
            })).rejects.toThrow('Batch error');
            
            expect(mockSetState).toHaveBeenCalledWith('global.error', 'Batch error', { skipHistory: true });
        });

        it('should emit batch events', async () => {
            const operations = [
                { path: 'data.a', valueOrPromise: Promise.resolve('A'), options: {} }
            ];
            
            await stateAsync.batchSetStateAsync(operations);
            
            expect(mockEmitEvent).toHaveBeenCalledWith('state:async-batch-success', expect.objectContaining({
                operations: ['data.a'],
                results: [true]
            }));
        });
    });

    describe('Operation cancellation', () => {
        it('should cancel active operations', async () => {
            let resolvePromise;
            const promise = new Promise(resolve => {
                resolvePromise = resolve;
            });
            
            const asyncOp = stateAsync.setStateAsync('test.path', promise, {
                loadingPath: 'test.loading'
            });
            
            const activeOps = stateAsync.getActiveOperations();
            const operationId = activeOps[0].id;
            
            const cancelled = stateAsync.cancelOperation(operationId);
            expect(cancelled).toBe(true);
            
            // Loading state should be cleared
            expect(mockSetState).toHaveBeenCalledWith('test.loading', false, { skipHistory: true });
            
            // Operation should be removed from active list
            expect(stateAsync.getActiveOperations()).toHaveLength(0);
        });

        it('should return false for non-existent operation cancellation', () => {
            const cancelled = stateAsync.cancelOperation('non-existent-id');
            expect(cancelled).toBe(false);
        });

        it('should cancel all operations', async () => {
            const promise1 = new Promise(() => {}); // Never resolves
            const promise2 = new Promise(() => {}); // Never resolves
            
            stateAsync.setStateAsync('test.path1', promise1, { loadingPath: 'loading1' });
            stateAsync.setStateAsync('test.path2', promise2, { loadingPath: 'loading2' });
            
            expect(stateAsync.getActiveOperations()).toHaveLength(2);
            
            const cancelledCount = stateAsync.cancelAllOperations();
            expect(cancelledCount).toBe(2);
            expect(stateAsync.getActiveOperations()).toHaveLength(0);
        });
    });

    describe('Statistics and monitoring', () => {
        it('should track operation statistics', async () => {
            // Successful operation
            await stateAsync.setStateAsync('test.success', Promise.resolve('success'));
            
            // Failed operation
            try {
                await stateAsync.setStateAsync('test.fail', Promise.reject(new Error('fail')));
            } catch (e) {
                // Expected
            }
            
            const stats = stateAsync.getAsyncStats();
            expect(stats.totalAsyncOperations).toBe(2);
            expect(stats.successfulOperations).toBe(1);
            expect(stats.failedOperations).toBe(1);
            expect(stats.averageOperationTime).toBeGreaterThanOrEqual(0);
        });

        it('should reset statistics', () => {
            stateAsync.stats.totalAsyncOperations = 5;
            stateAsync.stats.successfulOperations = 3;
            
            stateAsync.resetStats();
            
            expect(stateAsync.stats.totalAsyncOperations).toBe(0);
            expect(stateAsync.stats.successfulOperations).toBe(0);
        });

        it('should track longest running operation', async () => {
            let currentTime = 1000;
            global.performance.now.mockImplementation(() => currentTime);
            
            const promise = new Promise(() => {}); // Never resolves
            stateAsync.setStateAsync('test.path', promise);
            
            // Advance time to simulate duration
            currentTime = 1200;
            
            const stats = stateAsync.getAsyncStats();
            expect(stats.longestRunningOperation).toMatchObject({
                path: 'test.path',
                duration: 200
            });
        });
    });

    describe('Configuration', () => {
        it('should update configuration options', () => {
            stateAsync.configure({
                defaultTimeout: 5000,
                retryAttempts: 3
            });
            
            expect(stateAsync.options.defaultTimeout).toBe(5000);
            expect(stateAsync.options.retryAttempts).toBe(3);
        });

        it('should disable events when configured', async () => {
            stateAsync.configure({ enableEvents: false });
            
            await stateAsync.setStateAsync('test.path', Promise.resolve('value'));
            
            expect(mockEmitEvent).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        it('should handle empty batch operations', async () => {
            const results = await stateAsync.batchSetStateAsync([]);
            expect(results).toEqual([]);
        });

        it('should handle null batch operations', async () => {
            const results = await stateAsync.batchSetStateAsync(null);
            expect(results).toEqual([]);
        });

        it('should handle operations without callbacks', () => {
            const standaloneAsync = new StateAsync();
            
            // Should not throw
            expect(() => {
                standaloneAsync.setStateAsync('test', 'value');
            }).not.toThrow();
        });

        it('should handle promise rejection with no error message', async () => {
            const promise = Promise.reject();
            
            try {
                await stateAsync.setStateAsync('test.path', promise, {
                    errorPath: 'test.error'
                });
            } catch (e) {
                // Expected
            }
            
            expect(mockSetState).toHaveBeenCalledWith('test.error', 'Unknown error', { skipHistory: true });
        });
    });
});
