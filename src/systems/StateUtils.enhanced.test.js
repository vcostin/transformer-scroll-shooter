/**
 * Tests for enhanced StateUtils with safe reference resolution
 * Testing pathOr and safeResolveReference functionality
 */

import { pathOr, safeResolveReference } from '@/systems/StateUtils.js';

describe('Enhanced StateUtils', () => {
    const testState = {
        user: {
            profile: {
                name: 'John',
                age: 30,
                settings: {
                    theme: 'dark',
                    notifications: true
                }
            },
            preferences: {
                minAge: 18,
                maxAge: 65
            }
        },
        app: {
            version: '1.0.0',
            limits: {
                maxUsers: 100,
                minScore: 0
            }
        }
    };

    describe('pathOr()', () => {
        test('should return value when path exists', () => {
            expect(pathOr('default', 'user.profile.name', testState)).toBe('John');
            expect(pathOr(0, 'user.profile.age', testState)).toBe(30);
            expect(pathOr(false, 'user.profile.settings.notifications', testState)).toBe(true);
        });

        test('should return default when path does not exist', () => {
            expect(pathOr('default', 'user.profile.nonexistent', testState)).toBe('default');
            expect(pathOr(999, 'missing.path', testState)).toBe(999);
            expect(pathOr(null, 'user.missing.deeply.nested', testState)).toBe(null);
        });

        test('should handle null/undefined objects', () => {
            expect(pathOr('default', 'any.path', null)).toBe('default');
            expect(pathOr('default', 'any.path', undefined)).toBe('default');
            expect(pathOr('default', 'any.path', 'not an object')).toBe('default');
        });

        test('should handle empty paths', () => {
            expect(pathOr('default', '', testState)).toBe('default');
        });

        test('should handle complex default values', () => {
            const defaultObj = { default: true };
            const defaultArray = [1, 2, 3];
            
            expect(pathOr(defaultObj, 'missing.path', testState)).toBe(defaultObj);
            expect(pathOr(defaultArray, 'missing.path', testState)).toBe(defaultArray);
        });
    });

    describe('safeResolveReference()', () => {
        test('should resolve valid $ references', () => {
            const result = safeResolveReference('$user.profile.age', 'validation.path', testState, 0);
            expect(result).toBe(30);
        });

        test('should resolve relative references', () => {
            const result = safeResolveReference('maxAge', 'user.preferences.minAge', testState, 100);
            expect(result).toBe(65); // Should resolve to user.preferences.maxAge
        });

        test('should return fallback for invalid references', () => {
            const result = safeResolveReference('$nonexistent.path', 'validation.path', testState, 999);
            expect(result).toBe(999);
        });

        test('should handle numeric string references', () => {
            const stateWithNumbers = {
                config: {
                    limit: '50',
                    threshold: 25
                }
            };
            
            const result = safeResolveReference('$config.limit', 'validation.path', stateWithNumbers, 0, true);
            expect(result).toBe(50); // Should convert string to number
        });

        test('should return fallback for non-numeric strings when expecting numbers', () => {
            const result = safeResolveReference('$user.profile.name', 'validation.path', testState, 0, true);
            expect(result).toBe(0); // 'John' is not a valid number
        });

        test('should handle null/undefined references', () => {
            expect(safeResolveReference(null, 'path', testState, 'fallback')).toBe('fallback');
            expect(safeResolveReference(undefined, 'path', testState, 'fallback')).toBe('fallback');
        });

        test('should pass through non-string values', () => {
            expect(safeResolveReference(42, 'path', testState, 0)).toBe(42);
            expect(safeResolveReference(true, 'path', testState, false)).toBe(true);
            expect(safeResolveReference(['array'], 'path', testState, [])).toEqual(['array']);
        });

        test('should handle edge cases with numeric validation', () => {
            const stateWithZero = { value: 0 };
            const result = safeResolveReference('$value', 'path', stateWithZero, -1);
            expect(result).toBe(0); // Zero should be valid
        });

        test('should handle NaN cases gracefully', () => {
            const stateWithNaN = { value: 'not-a-number' };
            const result = safeResolveReference('$value', 'path', stateWithNaN, 100, true);
            expect(result).toBe(100); // Should return fallback for NaN
        });

        test('should resolve deeply nested references', () => {
            const result = safeResolveReference('$user.profile.settings.notifications', 'validation.path', testState, false);
            expect(result).toBe(true);
        });
    });

    describe('Integration with validation scenarios', () => {
        test('should safely validate number ranges', () => {
            const value = 25;
            
            // Test min validation
            const minValue = safeResolveReference('$user.preferences.minAge', 'user.profile.age', testState, null);
            expect(minValue).toBe(18);
            expect(value >= minValue).toBe(true);
            
            // Test max validation
            const maxValue = safeResolveReference('$user.preferences.maxAge', 'user.profile.age', testState, null);
            expect(maxValue).toBe(65);
            expect(value <= maxValue).toBe(true);
        });

        test('should handle missing validation references gracefully', () => {
            const value = 25;
            
            // Test with missing reference - explicitly don't expect numeric conversion
            const minValue = safeResolveReference('$missing.reference', 'user.profile.age', testState, null, false);
            expect(minValue).toBe(null);
            
            // Validation should not fail due to null comparison
            const isValid = minValue === null || value >= minValue;
            expect(isValid).toBe(true);
        });

        test('should work with pathOr for comprehensive safe access', () => {
            // Use pathOr as a building block for even safer access
            const limits = pathOr({}, 'app.limits', testState);
            const maxUsers = limits.maxUsers || 50;
            
            expect(maxUsers).toBe(100);
            
            // Test with missing path
            const missingLimits = pathOr({ maxUsers: 50 }, 'missing.limits', testState);
            expect(missingLimits.maxUsers).toBe(50);
        });
    });

    describe('Performance considerations', () => {
        test('should perform well with many path resolutions', () => {
            const start = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                pathOr('default', 'user.profile.name', testState);
                safeResolveReference('$user.profile.age', 'validation.path', testState, 0);
            }
            
            const duration = performance.now() - start;
            expect(duration).toBeLessThan(100); // Should complete quickly
        });

        test('should handle large state objects efficiently', () => {
            const largeState = {
                users: Array.from({ length: 1000 }, (_, i) => ({
                    id: i,
                    profile: { name: `User ${i}`, age: 20 + (i % 50) }
                }))
            };
            
            const start = performance.now();
            
            for (let i = 0; i < 100; i++) {
                pathOr({}, `users.${i}.profile`, largeState);
            }
            
            const duration = performance.now() - start;
            expect(duration).toBeLessThan(50);
        });
    });
});
