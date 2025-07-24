/**
 * Tests for enhanced StateAsync retry logic
 * Testing promise factory approach to prevent single-use promise issues
 */

import { StateAsync } from '../systems/StateAsync.js';

describe('StateAsync Retry Logic', () => {
    let stateAsync;
    let mockCallbacks;

    beforeEach(() => {
        mockCallbacks = {
            onSetState: jest.fn(),
            onEmitEvent: jest.fn()
        };
        
        stateAsync = new StateAsync({
            enableDebug: false,
            defaultTimeout: 1000,
            retryAttempts: 2,
            retryDelay: 10
        }, mockCallbacks);
    });

    describe('withRetry()', () => {
        test('should succeed on first attempt when promise resolves', async () => {
            const promiseFactory = jest.fn(() => Promise.resolve('success'));
            
            const result = await stateAsync.withRetry(promiseFactory, 2, 10);
            
            expect(result).toBe('success');
            expect(promiseFactory).toHaveBeenCalledTimes(1);
        });

        test('should retry failed promises using factory function', async () => {
            let attemptCount = 0;
            const promiseFactory = jest.fn(() => {
                attemptCount++;
                if (attemptCount < 3) {
                    return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
                }
                return Promise.resolve('success on third attempt');
            });
            
            const result = await stateAsync.withRetry(promiseFactory, 2, 1);
            
            expect(result).toBe('success on third attempt');
            expect(promiseFactory).toHaveBeenCalledTimes(3);
        });

        test('should throw last error when all retries exhausted', async () => {
            const promiseFactory = jest.fn(() => Promise.reject(new Error('Always fails')));
            
            await expect(stateAsync.withRetry(promiseFactory, 2, 1))
                .rejects.toThrow('Always fails');
            
            expect(promiseFactory).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
        });

        test('should handle non-function promise (backward compatibility)', async () => {
            const promise = Promise.resolve('direct promise');
            
            const result = await stateAsync.withRetry(promise, 0, 10);
            
            expect(result).toBe('direct promise');
        });

        test('should delay between retries', async () => {
            let attemptCount = 0;
            const timestamps = [];
            
            const promiseFactory = () => {
                timestamps.push(Date.now());
                attemptCount++;
                if (attemptCount < 3) {
                    return Promise.reject(new Error('Retry needed'));
                }
                return Promise.resolve('success');
            };
            
            await stateAsync.withRetry(promiseFactory, 2, 50);
            
            expect(timestamps).toHaveLength(3);
            // Check that there was a delay between attempts
            expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(45); // Allow for timing variance
            expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(45);
        });

        test('should track retry statistics', async () => {
            const promiseFactory = jest.fn()
                .mockReturnValueOnce(Promise.reject(new Error('Fail 1')))
                .mockReturnValueOnce(Promise.reject(new Error('Fail 2')))
                .mockReturnValueOnce(Promise.resolve('Success'));
            
            const initialRetries = stateAsync.stats.retries;
            
            await stateAsync.withRetry(promiseFactory, 2, 1);
            
            expect(stateAsync.stats.retries).toBe(initialRetries + 2);
        });

        test('should work with async factory functions', async () => {
            let callCount = 0;
            const asyncFactory = async () => {
                callCount++;
                await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
                if (callCount < 2) {
                    throw new Error('Need retry');
                }
                return 'async success';
            };
            
            const result = await stateAsync.withRetry(asyncFactory, 2, 1);
            
            expect(result).toBe('async success');
            expect(callCount).toBe(2);
        });
    });

    describe('setStateAsync with retry integration', () => {
        test('should properly retry async state operations', async () => {
            let attemptCount = 0;
            const mockAsyncOperation = () => {
                attemptCount++;
                if (attemptCount < 3) {
                    return Promise.reject(new Error(`Network error ${attemptCount}`));
                }
                return Promise.resolve('final data');
            };
            
            const result = await stateAsync.setStateAsync('test.path', mockAsyncOperation(), {
                retryAttempts: 2,
                retryDelay: 1
            });
            
            expect(result).toBe('final data');
            expect(mockCallbacks.onSetState).toHaveBeenCalledWith('test.path', 'final data', expect.any(Object));
        });

        test('should handle retry with loading and error states', async () => {
            let attemptCount = 0;
            const mockAsyncOperation = () => {
                attemptCount++;
                if (attemptCount < 2) {
                    return Promise.reject(new Error('Temporary failure'));
                }
                return Promise.resolve('recovered data');
            };
            
            await stateAsync.setStateAsync('test.path', mockAsyncOperation(), {
                retryAttempts: 1,
                retryDelay: 1,
                loadingPath: 'ui.loading',
                errorPath: 'ui.error'
            });
            
            // Should set loading state
            expect(mockCallbacks.onSetState).toHaveBeenCalledWith('ui.loading', true, expect.any(Object));
            // Should clear loading state after success
            expect(mockCallbacks.onSetState).toHaveBeenCalledWith('ui.loading', false, expect.any(Object));
            // Should set final value
            expect(mockCallbacks.onSetState).toHaveBeenCalledWith('test.path', 'recovered data', expect.any(Object));
        });

        test('should properly handle promise vs promise factory in setStateAsync', async () => {
            // Test with direct promise (should work with factory wrapper)
            const directPromise = Promise.resolve('direct value');
            
            const result1 = await stateAsync.setStateAsync('test.path1', directPromise, {
                retryAttempts: 1
            });
            
            expect(result1).toBe('direct value');
            
            // Test with factory function
            const factoryFunction = () => Promise.resolve('factory value');
            
            const result2 = await stateAsync.setStateAsync('test.path2', factoryFunction(), {
                retryAttempts: 1
            });
            
            expect(result2).toBe('factory value');
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle zero retries', async () => {
            const promiseFactory = jest.fn(() => Promise.reject(new Error('Immediate failure')));
            
            await expect(stateAsync.withRetry(promiseFactory, 0, 10))
                .rejects.toThrow('Immediate failure');
            
            expect(promiseFactory).toHaveBeenCalledTimes(1);
        });

        test('should handle retry with zero delay', async () => {
            let callCount = 0;
            const fastFactory = () => {
                callCount++;
                if (callCount < 2) {
                    return Promise.reject(new Error('Quick fail'));
                }
                return Promise.resolve('quick success');
            };
            
            const start = Date.now();
            const result = await stateAsync.withRetry(fastFactory, 1, 0);
            const duration = Date.now() - start;
            
            expect(result).toBe('quick success');
            expect(duration).toBeLessThan(50); // Should be very fast with zero delay
        });

        test('should handle synchronous errors in factory', async () => {
            let callCount = 0;
            const errorFactory = () => {
                callCount++;
                if (callCount < 2) {
                    throw new Error('Sync error'); // Synchronous error
                }
                return Promise.resolve('success after sync error');
            };
            
            const result = await stateAsync.withRetry(errorFactory, 1, 1);
            
            expect(result).toBe('success after sync error');
        });

        test('should properly preserve error messages across retries', async () => {
            const errors = ['Error 1', 'Error 2', 'Error 3'];
            let callCount = 0;
            
            const failingFactory = () => {
                const error = new Error(errors[callCount]);
                callCount++;
                return Promise.reject(error);
            };
            
            try {
                await stateAsync.withRetry(failingFactory, 2, 1);
            } catch (error) {
                expect(error.message).toBe('Error 3'); // Should be the last error
            }
        });
    });

    describe('Performance and reliability', () => {
        test('should handle many concurrent retry operations', async () => {
            const operations = Array.from({ length: 50 }, (_, i) => {
                let attempts = 0;
                const factory = () => {
                    attempts++;
                    if (attempts < 2 && Math.random() > 0.5) {
                        return Promise.reject(new Error(`Random failure ${i}`));
                    }
                    return Promise.resolve(`Success ${i}`);
                };
                
                return stateAsync.withRetry(factory, 1, 1);
            });
            
            const results = await Promise.all(operations);
            
            expect(results).toHaveLength(50);
            results.forEach((result, i) => {
                expect(result).toBe(`Success ${i}`);
            });
        });

        test('should handle promise factory that returns different promise types', async () => {
            const mixedFactory = () => {
                const random = Math.random();
                if (random > 0.5) {
                    return Promise.resolve('Promise.resolve');
                } else {
                    return new Promise(resolve => setTimeout(() => resolve('new Promise'), 1));
                }
            };
            
            const result = await stateAsync.withRetry(mixedFactory, 0, 1);
            
            expect(['Promise.resolve', 'new Promise']).toContain(result);
        });
    });
});
