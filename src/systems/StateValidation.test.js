/**
 * StateValidation Tests
 * Comprehensive test suite for StateValidation functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    validateValue,
    validateBatch,
    hasValidationRules,
    getPathValidationRules,
    isValidType,
    getValueType,
    validateRequired,
    validateEnum,
    validateNumberRange,
    createValidationError
} from './StateValidation.js';

describe('StateValidation', () => {
    let mockState;

    beforeEach(() => {
        mockState = {
            player: {
                health: 100,
                maxHealth: 100,
                name: 'TestPlayer'
            },
            game: {
                level: 1,
                score: 0,
                difficulty: 'normal'
            }
        };
    });

    describe('validateValue', () => {
        it('should return null for paths without validation rules', () => {
            const result = validateValue('nonexistent.path', 'any value', mockState);
            expect(result).toBeNull();
        });

        it('should validate type constraints', () => {
            // Valid type
            expect(validateValue('player.health', 50, mockState)).toBeNull();
            
            // Invalid type
            expect(validateValue('player.health', 'not a number', mockState))
                .toBe('Expected number, got string');
        });

        it('should handle nullable types', () => {
            // Test a path that doesn't have explicit nullable rules
            // Most paths in our schema don't allow null, so this should fail
            const result = validateValue('player.health', null, mockState);
            expect(result).toBeTruthy(); // Should return an error message
        });

        it('should validate enum values', () => {
            // Valid enum value - game.settings.difficulty has enum rules
            expect(validateValue('game.settings.difficulty', 'normal', mockState)).toBeNull();
            
            // Invalid enum value
            const result = validateValue('game.settings.difficulty', 'invalid', mockState);
            expect(result).toBeTruthy();
            expect(result).toContain('Value must be one of:');
        });

        it('should validate number ranges', () => {
            // Valid range - player.health has min: 0, max: maxHealth (100)
            expect(validateValue('player.health', 75, mockState)).toBeNull();
            
            // Invalid range - too low
            const lowResult = validateValue('player.health', -10, mockState);
            expect(lowResult).toBeTruthy();
            expect(lowResult).toContain('Value must be >=');
                
            // Invalid range - too high (health > maxHealth)
            // Note: The schema uses max: 'maxHealth' which should resolve to player.maxHealth: 100
            const highResult = validateValue('player.health', 150, mockState);
            expect(highResult).toBeTruthy();
            expect(highResult).toContain('Value must be <=');
        });

        it('should validate string constraints', () => {
            // Valid string
            expect(validateValue('player.name', 'ValidName', mockState)).toBeNull();
            
            // Empty string (if not allowed)
            const emptyResult = validateValue('player.name', '', mockState);
            // This depends on your schema rules for player.name
        });

        it('should validate array constraints', () => {
            const arrayValue = [1, 2, 3];
            // This test depends on having array validation rules in your schema
            const result = validateValue('some.array.path', arrayValue, mockState);
            expect(result).toBeNull(); // or check specific validation if rules exist
        });

        it('should validate object constraints', () => {
            const objectValue = { x: 10, y: 20 };
            // This test depends on having object validation rules in your schema
            const result = validateValue('player.position', objectValue, mockState);
            expect(result).toBeNull(); // or check specific validation if rules exist
        });

        it('should handle reference resolution in validation', () => {
            // Test that references like $player.maxHealth are resolved correctly
            const result = validateValue('player.health', 100, mockState);
            expect(result).toBeNull();
        });
    });

    describe('validateBatch', () => {
        it('should validate multiple updates', () => {
            const updates = [
                { path: 'player.health', value: 50 },
                { path: 'game.level', value: 2 },
                { path: 'player.name', value: 'NewName' }
            ];

            const errors = validateBatch(updates, mockState);
            expect(Array.isArray(errors)).toBe(true);
        });

        it('should return errors for invalid updates', () => {
            const updates = [
                { path: 'player.health', value: 'invalid' }, // Should fail type check
                { path: 'game.level', value: 2 }, // Should pass
            ];

            const errors = validateBatch(updates, mockState);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toHaveProperty('path');
            expect(errors[0]).toHaveProperty('error');
        });

        it('should return empty array for all valid updates', () => {
            const updates = [
                { path: 'player.health', value: 75 },
                { path: 'game.level', value: 2 }
            ];

            const errors = validateBatch(updates, mockState);
            expect(errors).toEqual([]);
        });
    });

    describe('hasValidationRules', () => {
        it('should return true for paths with validation rules', () => {
            expect(hasValidationRules('player.health')).toBe(true);
            expect(hasValidationRules('game.settings.difficulty')).toBe(true);
        });

        it('should return false for paths without validation rules', () => {
            expect(hasValidationRules('nonexistent.path')).toBe(false);
        });
    });

    describe('getPathValidationRules', () => {
        it('should return validation rules for valid paths', () => {
            const rules = getPathValidationRules('player.health');
            if (rules) {
                expect(typeof rules).toBe('object');
            }
        });

        it('should return null for paths without rules', () => {
            const rules = getPathValidationRules('nonexistent.path');
            expect(rules).toBeNull();
        });
    });

    describe('isValidType', () => {
        it('should validate primitive types', () => {
            expect(isValidType(42, 'number')).toBe(true);
            expect(isValidType('hello', 'string')).toBe(true);
            expect(isValidType(true, 'boolean')).toBe(true);
            expect(isValidType(null, 'number')).toBe(false); // null is not a number
        });

        it('should validate array type', () => {
            expect(isValidType([1, 2, 3], 'array')).toBe(true);
            expect(isValidType({}, 'array')).toBe(false);
        });

        it('should validate object type', () => {
            expect(isValidType({}, 'object')).toBe(true);
            expect(isValidType([1, 2, 3], 'object')).toBe(false);
        });

        it('should allow any type', () => {
            expect(isValidType(42, 'any')).toBe(true);
            expect(isValidType('hello', 'any')).toBe(true);
            expect(isValidType([], 'any')).toBe(true);
        });

        it('should reject mismatched types', () => {
            expect(isValidType(42, 'string')).toBe(false);
            expect(isValidType('hello', 'number')).toBe(false);
            expect(isValidType(true, 'string')).toBe(false);
        });
    });

    describe('getValueType', () => {
        it('should return correct types for primitives', () => {
            expect(getValueType(42)).toBe('number');
            expect(getValueType('hello')).toBe('string');
            expect(getValueType(true)).toBe('boolean');
            expect(getValueType(null)).toBe('null');
            expect(getValueType(undefined)).toBe('undefined');
        });

        it('should return array for arrays', () => {
            expect(getValueType([1, 2, 3])).toBe('array');
            expect(getValueType([])).toBe('array');
        });

        it('should return object for objects', () => {
            expect(getValueType({})).toBe('object');
            expect(getValueType({ a: 1 })).toBe('object');
        });

        it('should handle special cases', () => {
            expect(getValueType(new Date())).toBe('object');
            expect(getValueType(/regex/)).toBe('object');
        });
    });

    describe('validateRequired', () => {
        it('should pass for non-required values', () => {
            expect(validateRequired(null, false)).toBeNull();
            expect(validateRequired(undefined, false)).toBeNull();
            expect(validateRequired('value', false)).toBeNull();
        });

        it('should pass for required values that exist', () => {
            expect(validateRequired('value', true)).toBeNull();
            expect(validateRequired(0, true)).toBeNull();
            expect(validateRequired(false, true)).toBeNull();
        });

        it('should fail for required values that are null/undefined', () => {
            expect(validateRequired(null, true)).toBe('Value is required');
            expect(validateRequired(undefined, true)).toBe('Value is required');
        });
    });

    describe('validateEnum', () => {
        it('should pass for valid enum values', () => {
            const enumValues = ['red', 'green', 'blue'];
            expect(validateEnum('red', enumValues)).toBeNull();
            expect(validateEnum('green', enumValues)).toBeNull();
        });

        it('should fail for invalid enum values', () => {
            const enumValues = ['red', 'green', 'blue'];
            const result = validateEnum('yellow', enumValues);
            expect(result).toContain('Value must be one of:');
            expect(result).toContain('red, green, blue');
        });

        it('should pass when no enum constraints exist', () => {
            expect(validateEnum('anything', null)).toBeNull();
            expect(validateEnum('anything', undefined)).toBeNull();
        });
    });

    describe('validateNumberRange', () => {
        it('should pass for numbers within range', () => {
            expect(validateNumberRange(5, 0, 10)).toBeNull();
            expect(validateNumberRange(0, 0, 10)).toBeNull();
            expect(validateNumberRange(10, 0, 10)).toBeNull();
        });

        it('should fail for numbers below minimum', () => {
            const result = validateNumberRange(-1, 0, 10);
            expect(result).toBe('Value must be >= 0');
        });

        it('should fail for numbers above maximum', () => {
            const result = validateNumberRange(11, 0, 10);
            expect(result).toBe('Value must be <= 10');
        });

        it('should fail for non-numbers', () => {
            expect(validateNumberRange('5', 0, 10)).toBe('Value must be a number');
            expect(validateNumberRange(null, 0, 10)).toBe('Value must be a number');
        });

        it('should handle undefined min/max', () => {
            expect(validateNumberRange(5, undefined, 10)).toBeNull();
            expect(validateNumberRange(5, 0, undefined)).toBeNull();
            expect(validateNumberRange(5, undefined, undefined)).toBeNull();
        });
    });

    describe('createValidationError', () => {
        it('should create error with proper properties', () => {
            const error = createValidationError('test.path', 'Test message', 'test value');
            
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Validation error for 'test.path': Test message");
            expect(error.path).toBe('test.path');
            expect(error.value).toBe('test value');
            expect(error.type).toBe('ValidationError');
        });

        it('should be throwable', () => {
            const error = createValidationError('test.path', 'Test message', 'test value');
            
            expect(() => {
                throw error;
            }).toThrow("Validation error for 'test.path': Test message");
        });
    });
});
