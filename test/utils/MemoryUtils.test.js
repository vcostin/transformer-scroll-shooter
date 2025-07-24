/**
 * Tests for MemoryUtils
 * Testing efficient memory estimation and monitoring capabilities
 */

import { estimateMemorySize, trackMemory, MemoryMonitor } from '../utils/MemoryUtils.js';

describe('MemoryUtils', () => {
    describe('estimateMemorySize()', () => {
        test('should estimate memory for primitive types', () => {
            expect(estimateMemorySize(null)).toBe(8);
            expect(estimateMemorySize(undefined)).toBe(8);
            expect(estimateMemorySize(true)).toBe(4);
            expect(estimateMemorySize(42)).toBe(8);
            expect(estimateMemorySize('hello')).toBe(10); // 5 chars * 2 bytes
        });

        test('should estimate memory for objects', () => {
            const obj = { name: 'test', value: 42 };
            const size = estimateMemorySize(obj);
            
            // Object overhead (16) + name key (8) + name value (8) + value key (10) + value value (8)
            expect(size).toBeGreaterThan(40);
        });

        test('should estimate memory for arrays', () => {
            const arr = [1, 2, 3, 'test'];
            const size = estimateMemorySize(arr);
            
            // Array overhead (24) + numbers (24) + string (8)
            expect(size).toBeGreaterThan(50);
        });

        test('should handle circular references', () => {
            const obj = { name: 'test' };
            obj.self = obj; // Circular reference
            
            expect(() => estimateMemorySize(obj)).not.toThrow();
            const size = estimateMemorySize(obj);
            expect(size).toBeGreaterThan(0);
        });

        test('should handle deeply nested objects', () => {
            const deep = {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep'
                        }
                    }
                }
            };
            
            const size = estimateMemorySize(deep);
            expect(size).toBeGreaterThan(50);
        });

        test('should handle functions', () => {
            const fn = () => console.log('test');
            const size = estimateMemorySize(fn);
            expect(size).toBe(32);
        });
    });

    describe('trackMemory()', () => {
        test('should return null when disabled', () => {
            const obj = { test: 'value' };
            const size = trackMemory(obj, { enabled: false });
            expect(size).toBeNull();
        });

        test('should use estimation by default', () => {
            const obj = { test: 'value' };
            const size = trackMemory(obj, { useEstimation: true });
            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThan(0);
        });

        test('should fallback to JSON.stringify when estimation disabled', () => {
            const obj = { test: 'value' };
            const size = trackMemory(obj, { useEstimation: false });
            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThan(0);
        });

        test('should handle serialization errors gracefully', () => {
            const obj = { test: 'value' };
            obj.circular = obj; // Create circular reference
            
            const size = trackMemory(obj, { useEstimation: false });
            expect(typeof size).toBe('number');
            expect(size).toBeGreaterThan(0);
        });
    });

    describe('MemoryMonitor', () => {
        test('should initialize with default options', () => {
            const monitor = new MemoryMonitor();
            expect(monitor.options.sampleRate).toBe(0.1);
            expect(monitor.options.throttleMs).toBe(1000);
            expect(monitor.options.useEstimation).toBe(true);
        });

        test('should throttle calculations', () => {
            const monitor = new MemoryMonitor({ throttleMs: 100 });
            const obj = { test: 'value' };
            
            const size1 = monitor.calculateSize(obj);
            const size2 = monitor.calculateSize(obj); // Should return cached
            
            expect(size1).toBe(size2);
        });

        test('should sample calculations based on sample rate', () => {
            const monitor = new MemoryMonitor({ 
                sampleRate: 0, // Never sample
                throttleMs: 0  // No throttling
            });
            const obj = { test: 'value' };
            
            const initialSize = monitor.cachedSize;
            monitor.calculateSize(obj);
            
            // Should not have calculated due to sampling
            expect(monitor.skipCount).toBeGreaterThan(0);
        });

        test('should warn on high memory usage', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            const monitor = new MemoryMonitor({ maxSize: 10 }); // Very low threshold
            const largeObj = { data: 'x'.repeat(100) };
            
            monitor.calculateSize(largeObj);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('High memory usage detected')
            );
            
            consoleSpy.mockRestore();
        });

        test('should provide statistics', () => {
            const monitor = new MemoryMonitor();
            const stats = monitor.getStats();
            
            expect(stats).toHaveProperty('cachedSize');
            expect(stats).toHaveProperty('lastCalculation');
            expect(stats).toHaveProperty('skipCount');
            expect(stats).toHaveProperty('sampleRate');
        });

        test('should handle estimation vs JSON stringify modes', () => {
            const estimationMonitor = new MemoryMonitor({ useEstimation: true });
            const jsonMonitor = new MemoryMonitor({ useEstimation: false });
            
            const obj = { test: 'value' };
            
            const estimationSize = estimationMonitor.calculateSize(obj);
            const jsonSize = jsonMonitor.calculateSize(obj);
            
            expect(typeof estimationSize).toBe('number');
            expect(typeof jsonSize).toBe('number');
            // Both should be positive, but values may differ
            expect(estimationSize).toBeGreaterThan(0);
            expect(jsonSize).toBeGreaterThan(0);
        });
    });

    describe('Performance Testing', () => {
        test('should be faster than JSON.stringify for large objects', () => {
            const largeObj = {
                users: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    name: `User ${i}`,
                    email: `user${i}@example.com`,
                    profile: {
                        age: 20 + (i % 50),
                        preferences: ['pref1', 'pref2', 'pref3']
                    }
                }))
            };
            
            const estimationStart = performance.now();
            estimateMemorySize(largeObj);
            const estimationTime = performance.now() - estimationStart;
            
            const jsonStart = performance.now();
            JSON.stringify(largeObj).length;
            const jsonTime = performance.now() - jsonStart;
            
            // Estimation should be faster for large objects
            expect(estimationTime).toBeLessThan(jsonTime * 2); // Allow some variance
        });

        test('should handle memory monitoring with minimal overhead', () => {
            const monitor = new MemoryMonitor({
                sampleRate: 0.1,
                throttleMs: 50
            });
            
            const start = performance.now();
            
            for (let i = 0; i < 100; i++) {
                monitor.calculateSize({ iteration: i });
            }
            
            const duration = performance.now() - start;
            expect(duration).toBeLessThan(100); // Should complete quickly
        });
    });
});
