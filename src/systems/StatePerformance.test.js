/**
 * StatePerformance.test.js - Comprehensive tests for performance monitoring module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatePerformance } from '@/systems/StatePerformance.js';

describe('StatePerformance', () => {
    let performance;
    let mockGetState;
    let mockGetHistoryMemoryUsage;

    beforeEach(() => {
        // Mock performance.now() for consistent testing
        vi.spyOn(global.performance, 'now').mockReturnValue(1000);
        
        mockGetState = vi.fn(() => ({ test: 'data', nested: { value: 42 } }));
        mockGetHistoryMemoryUsage = vi.fn(() => 500);

        performance = new StatePerformance({
            onGetState: mockGetState,
            onGetHistoryMemoryUsage: mockGetHistoryMemoryUsage,
            enableDebug: false
        });
    });

    describe('Initialization', () => {
        it('should initialize with default stats', () => {
            const stats = performance.getStats();
            expect(stats.totalUpdates).toBe(0);
            expect(stats.totalGets).toBe(0);
            expect(stats.validationErrors).toBe(0);
            expect(stats.historyOperations).toBe(0);
            expect(stats.averageUpdateTime).toBe(0);
            expect(stats.lastUpdateTime).toBe(0);
        });

        it('should initialize with default options', () => {
            expect(performance.isTrackingEnabled()).toBe(true);
            expect(performance.isMemoryTrackingEnabled()).toBe(true);
        });

        it('should accept custom options', () => {
            const customPerformance = new StatePerformance({
                enablePerformanceTracking: false,
                enableMemoryTracking: false,
                memoryUpdateThreshold: 2000
            });

            expect(customPerformance.isTrackingEnabled()).toBe(false);
            expect(customPerformance.isMemoryTrackingEnabled()).toBe(false);
            expect(customPerformance.options.memoryUpdateThreshold).toBe(2000);
        });
    });

    describe('Statistics Recording', () => {
        it('should record get operations', () => {
            performance.recordGet();
            performance.recordGet();
            
            const stats = performance.getStats();
            expect(stats.totalGets).toBe(2);
        });

        it('should skip recording gets when skipStats is true', () => {
            performance.recordGet(true);
            
            const stats = performance.getStats();
            expect(stats.totalGets).toBe(0);
        });

        it('should record update operations with timing', () => {
            // Mock sequence: initial time, then end time for duration calculation
            global.performance.now.mockReturnValueOnce(1050);
            
            performance.recordUpdate(1000);
            
            const stats = performance.getStats();
            expect(stats.totalUpdates).toBe(1);
            expect(stats.lastUpdateTime).toBe(50);
            expect(stats.averageUpdateTime).toBe(50);
        });

        it('should record validation errors', () => {
            performance.recordValidationError();
            performance.recordValidationError();
            
            const stats = performance.getStats();
            expect(stats.validationErrors).toBe(2);
        });

        it('should record history operations', () => {
            performance.recordHistoryOperation();
            
            const stats = performance.getStats();
            expect(stats.historyOperations).toBe(1);
        });

        it('should not record when performance tracking is disabled', () => {
            const disabledPerformance = new StatePerformance({
                enablePerformanceTracking: false
            });

            disabledPerformance.recordGet();
            disabledPerformance.recordValidationError();
            disabledPerformance.recordHistoryOperation();
            
            const stats = disabledPerformance.getStats();
            expect(stats.totalGets).toBe(0);
            expect(stats.validationErrors).toBe(0);
            expect(stats.historyOperations).toBe(0);
        });
    });

    describe('Average Time Calculation', () => {
        it('should calculate average update time correctly for single update', () => {
            global.performance.now.mockReturnValueOnce(1030);
            
            performance.recordUpdate(1000);
            
            const stats = performance.getStats();
            expect(stats.averageUpdateTime).toBe(30);
        });

        it('should calculate average update time correctly for multiple updates', () => {
            // First update: 30ms
            global.performance.now.mockReturnValueOnce(1030);
            performance.recordUpdate(1000);

            // Second update: 40ms
            global.performance.now.mockReturnValueOnce(2040);
            performance.recordUpdate(2000);

            // Third update: 50ms
            global.performance.now.mockReturnValueOnce(3050);
            performance.recordUpdate(3000);
            
            const stats = performance.getStats();
            expect(stats.totalUpdates).toBe(3);
            expect(stats.lastUpdateTime).toBe(50);
            expect(stats.averageUpdateTime).toBe(40); // (30 + 40 + 50) / 3
        });
    });

    describe('Memory Tracking', () => {
        it('should calculate memory usage from state and history', () => {
            const stateData = { test: 'data', nested: { value: 42 } };
            const expectedStateSize = JSON.stringify(stateData).length;
            
            const memoryUsage = performance.getMemoryUsage();
            expect(memoryUsage).toBe(expectedStateSize + 500); // state + history
            expect(mockGetState).toHaveBeenCalled();
            expect(mockGetHistoryMemoryUsage).toHaveBeenCalled();
        });

        it('should cache memory calculations', () => {
            performance.getMemoryUsage();
            performance.getMemoryUsage();
            
            // Should only call state callback once due to caching
            expect(mockGetState).toHaveBeenCalledTimes(1);
        });

        it('should invalidate cache and recalculate on state changes', () => {
            performance.getMemoryUsage();
            expect(mockGetState).toHaveBeenCalledTimes(1);
            
            // Force memory update to bypass debounce
            performance.invalidateMemoryCache();
            performance.forceMemoryUpdate();
            
            expect(mockGetState).toHaveBeenCalledTimes(2);
        });

        it('should return 0 when memory tracking is disabled', () => {
            const disabledPerformance = new StatePerformance({
                enableMemoryTracking: false
            });

            const memoryUsage = disabledPerformance.getMemoryUsage();
            expect(memoryUsage).toBe(0);
        });

        it('should handle memory calculation errors gracefully', () => {
            const errorState = {};
            // Create circular reference to cause JSON.stringify to fail
            errorState.circular = errorState;
            
            const errorPerformance = new StatePerformance({
                onGetState: () => errorState,
                enableDebug: false
            });

            const memoryUsage = errorPerformance.getMemoryUsage();
            expect(memoryUsage).toBe(0); // Fallback value
        });
    });

    describe('Memory Cache Debouncing', () => {
        it('should debounce memory updates based on threshold', () => {
            const fastPerformance = new StatePerformance({
                onGetState: mockGetState,
                memoryUpdateThreshold: 100
            });

            // First call should update cache
            global.performance.now.mockReturnValue(1000);
            fastPerformance.getMemoryUsage();
            expect(mockGetState).toHaveBeenCalledTimes(1);

            // Call within threshold should use cache
            global.performance.now.mockReturnValue(1050);
            fastPerformance.invalidateMemoryCache();
            fastPerformance.getMemoryUsage();
            expect(mockGetState).toHaveBeenCalledTimes(1);

            // Call after threshold should update cache
            global.performance.now.mockReturnValue(1150);
            fastPerformance.invalidateMemoryCache();
            fastPerformance.getMemoryUsage();
            expect(mockGetState).toHaveBeenCalledTimes(2);
        });

        it('should force memory update bypassing debounce', () => {
            global.performance.now.mockReturnValue(1000);
            performance.getMemoryUsage();
            expect(mockGetState).toHaveBeenCalledTimes(1);

            global.performance.now.mockReturnValue(1050);
            performance.forceMemoryUpdate();
            expect(mockGetState).toHaveBeenCalledTimes(2);
        });
    });

    describe('Statistics and Metrics', () => {
        it('should return comprehensive stats', () => {
            performance.recordGet();
            performance.recordUpdate(1000);
            performance.recordValidationError();
            performance.recordHistoryOperation();

            const stats = performance.getStats();
            expect(stats).toMatchObject({
                totalGets: 1,
                totalUpdates: 1,
                validationErrors: 1,
                historyOperations: 1,
                performanceEnabled: true,
                memoryTrackingEnabled: true
            });
            expect(stats.memoryUsage).toBeGreaterThan(0);
        });

        it('should merge external stats', () => {
            const externalStats = {
                historySize: 10,
                subscriptionCount: 5
            };

            const stats = performance.getStats(externalStats);
            expect(stats.historySize).toBe(10);
            expect(stats.subscriptionCount).toBe(5);
        });

        it('should reset all statistics', () => {
            performance.recordGet();
            performance.recordUpdate(1000);
            performance.recordValidationError();

            performance.resetStats();

            const stats = performance.getStats();
            expect(stats.totalGets).toBe(0);
            expect(stats.totalUpdates).toBe(0);
            expect(stats.validationErrors).toBe(0);
            expect(stats.averageUpdateTime).toBe(0);
        });

        it('should provide detailed performance metrics', () => {
            const metrics = performance.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('statistics');
            expect(metrics).toHaveProperty('timing');
            expect(metrics).toHaveProperty('cache');
            expect(metrics).toHaveProperty('configuration');
        });
    });

    describe('Memory Efficiency', () => {
        it('should calculate memory efficiency metrics', () => {
            performance.recordGet();
            performance.recordUpdate(1000);
            
            const efficiency = performance.getMemoryEfficiency();
            
            expect(efficiency.enabled).toBe(true);
            expect(efficiency.totalMemoryUsage).toBeGreaterThan(0);
            expect(efficiency.averageMemoryPerOperation).toBeGreaterThan(0);
            expect(efficiency.memoryPerUpdate).toBeGreaterThan(0);
        });

        it('should return disabled state when memory tracking is off', () => {
            const disabledPerformance = new StatePerformance({
                enableMemoryTracking: false
            });

            const efficiency = disabledPerformance.getMemoryEfficiency();
            expect(efficiency.enabled).toBe(false);
        });
    });

    describe('Timing Utilities', () => {
        it('should provide timing measurement utility', () => {
            global.performance.now.mockReturnValueOnce(1000).mockReturnValueOnce(1025);
            
            const endTiming = performance.startTiming('test-operation');
            const duration = endTiming();
            
            expect(duration).toBe(25);
        });

        it('should return no-op function when performance tracking disabled', () => {
            const disabledPerformance = new StatePerformance({
                enablePerformanceTracking: false
            });

            const endTiming = disabledPerformance.startTiming('test');
            const result = endTiming();
            
            expect(result).toBeUndefined();
        });
    });

    describe('Configuration', () => {
        it('should update configuration options', () => {
            performance.configure({
                enableMemoryTracking: false,
                memoryUpdateThreshold: 2000
            });

            expect(performance.isMemoryTrackingEnabled()).toBe(false);
            expect(performance.options.memoryUpdateThreshold).toBe(2000);
        });

        it('should reset memory cache when memory tracking is disabled', () => {
            performance.getMemoryUsage(); // Initialize cache
            expect(performance.memoryCacheValid).toBe(true);

            performance.configure({ enableMemoryTracking: false });
            expect(performance.memoryCacheValid).toBe(false);
            expect(performance.cachedStateSize).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null/undefined state gracefully', () => {
            const nullStatePerformance = new StatePerformance({
                onGetState: () => null,
                onGetHistoryMemoryUsage: () => 0
            });

            const memoryUsage = nullStatePerformance.getMemoryUsage();
            expect(memoryUsage).toBe(4); // JSON.stringify(null).length = 4
        });

        it('should handle missing callbacks gracefully', () => {
            const minimalPerformance = new StatePerformance();
            
            const memoryUsage = minimalPerformance.getMemoryUsage();
            expect(memoryUsage).toBe(2); // JSON.stringify({}).length = 2
        });

        it('should handle very large state objects', () => {
            const largeState = {};
            for (let i = 0; i < 1000; i++) {
                largeState[`key${i}`] = `value${i}`.repeat(100);
            }

            const largeStatePerformance = new StatePerformance({
                onGetState: () => largeState,
                onGetHistoryMemoryUsage: () => 1000
            });

            const memoryUsage = largeStatePerformance.getMemoryUsage();
            expect(memoryUsage).toBeGreaterThan(100000); // Should be substantial
        });

        it('should handle rapid successive operations', () => {
            for (let i = 0; i < 100; i++) {
                performance.recordGet();
                performance.recordUpdate(1000 + i);
                performance.recordValidationError();
            }

            const stats = performance.getStats();
            expect(stats.totalGets).toBe(100);
            expect(stats.totalUpdates).toBe(100);
            expect(stats.validationErrors).toBe(100);
        });
    });

    describe('Integration Scenarios', () => {
        it('should work with real-world usage patterns', () => {
            // Simulate a typical StateManager session
            
            // Initial state setup
            global.performance.now.mockReturnValueOnce(1010);
            performance.recordUpdate(1000);
            
            // Multiple gets and updates
            for (let i = 0; i < 10; i++) {
                performance.recordGet();
                if (i % 3 === 0 && i > 0) { // Skip i=0 since we already recorded one update
                    global.performance.now.mockReturnValueOnce(1000 + i * 10 + 15);
                    performance.recordUpdate(1000 + i * 10);
                }
            }
            
            // Some validation errors
            performance.recordValidationError();
            performance.recordValidationError();
            
            // History operations
            performance.recordHistoryOperation();
            performance.recordHistoryOperation();
            performance.recordHistoryOperation();

            const stats = performance.getStats();
            expect(stats.totalGets).toBe(10);
            expect(stats.totalUpdates).toBe(4); // 1 initial + 3 in loop (i=3,6,9)
            expect(stats.validationErrors).toBe(2);
            expect(stats.historyOperations).toBe(3);
            expect(stats.averageUpdateTime).toBeGreaterThan(0);

            const metrics = performance.getPerformanceMetrics();
            expect(metrics.statistics.totalGets).toBe(10);
            expect(metrics.cache.memoryCacheValid).toBeDefined();
        });
    });
});
