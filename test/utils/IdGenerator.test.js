/**
 * Tests for IdGenerator utility
 * Comprehensive testing for secure ID generation with collision resistance
 */

import { generateId, generateCounterId, generateSubscriptionId } from '../utils/IdGenerator.js';

describe('IdGenerator', () => {
    describe('generateId()', () => {
        test('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            
            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe('string');
            expect(id1.length).toBeGreaterThan(0);
        });

        test('should support prefix', () => {
            const id = generateId('test');
            expect(id).toMatch(/^test_/);
        });

        test('should generate UUID format when crypto.randomUUID is available', () => {
            // Mock crypto.randomUUID if not available
            const originalCrypto = global.crypto;
            global.crypto = {
                randomUUID: () => '550e8400-e29b-41d4-a716-446655440000'
            };

            const id = generateId();
            expect(id).toBe('550e8400-e29b-41d4-a716-446655440000');

            global.crypto = originalCrypto;
        });

        test('should handle missing crypto gracefully', () => {
            const originalCrypto = global.crypto;
            global.crypto = undefined;

            const id = generateId();
            expect(typeof id).toBe('string');
            expect(id.length).toBeGreaterThan(0);

            global.crypto = originalCrypto;
        });
    });

    describe('generateCounterId()', () => {
        test('should generate sequential IDs', () => {
            const id1 = generateCounterId();
            const id2 = generateCounterId();
            
            const num1 = parseInt(id1.split('_')[1]);
            const num2 = parseInt(id2.split('_')[1]);
            
            expect(num2).toBe(num1 + 1);
        });

        test('should support custom prefix', () => {
            const id = generateCounterId('counter');
            expect(id).toMatch(/^counter_\d+$/);
        });
    });

    describe('generateSubscriptionId()', () => {
        test('should generate collision-resistant IDs', () => {
            const ids = [];
            for (let i = 0; i < 1000; i++) {
                ids.push(generateSubscriptionId('test.path'));
            }
            
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length); // No collisions
        });

        test('should include path in ID', () => {
            const id = generateSubscriptionId('user.profile');
            expect(id).toMatch(/^user\.profile_/);
        });

        test('should handle high-frequency generation', () => {
            const startTime = Date.now();
            const ids = [];
            
            // Generate many IDs in quick succession
            for (let i = 0; i < 100; i++) {
                ids.push(generateSubscriptionId('path'));
            }
            
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        test('should reset counter on timestamp change', async () => {
            const id1 = generateSubscriptionId('test');
            
            // Wait for timestamp change
            await new Promise(resolve => setTimeout(resolve, 5));
            
            const id2 = generateSubscriptionId('test');
            
            // Should have different timestamps
            const timestamp1 = id1.split('_')[1];
            const timestamp2 = id2.split('_')[1];
            expect(timestamp1).not.toBe(timestamp2);
        });
    });

    describe('Performance and Collision Testing', () => {
        test('should handle burst generation without collisions', () => {
            const ids = new Set();
            const iterations = 10000;
            
            for (let i = 0; i < iterations; i++) {
                ids.add(generateId());
            }
            
            expect(ids.size).toBe(iterations);
        });

        test('should maintain uniqueness across different generators', () => {
            const ids = new Set();
            
            for (let i = 0; i < 1000; i++) {
                ids.add(generateId());
                ids.add(generateCounterId());
                ids.add(generateSubscriptionId('test'));
            }
            
            expect(ids.size).toBe(3000);
        });
    });
});
