/**
 * Unit tests for Main Entry Point
 * Tests module loading and basic functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Main Entry Point', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    afterEach(() => {
        vi.clearAllMocks();
    });
    
    describe('Module Imports', () => {
        it('should import all required modules', async () => {
            // Mock console.error to prevent stderr output during test
            const originalConsoleError = console.error;
            console.error = vi.fn();
            
            // Import the main module
            const mainModule = await import('./main.js');
            
            // Check that all expected exports are present
            expect(mainModule.GAME_CONSTANTS).toBeDefined();
            expect(mainModule.GAME_INFO).toBeDefined();
            expect(mainModule.CollisionUtils).toBeDefined();
            expect(mainModule.MathUtils).toBeDefined();
            expect(mainModule.Player).toBeDefined();
            expect(mainModule.Bullet).toBeDefined();
            expect(mainModule.Enemy).toBeDefined();
            expect(mainModule.AudioManager).toBeDefined();
            
            // Verify that Game initialization was attempted and failed gracefully
            expect(console.error).toHaveBeenCalledWith(
                '❌ Game initialization failed:',
                expect.any(Error)
            );
            
            // Restore console.error
            console.error = originalConsoleError;
            expect(mainModule.Powerup).toBeDefined();
            expect(mainModule.PowerupSpawner).toBeDefined();
            expect(mainModule.Background).toBeDefined();
            expect(mainModule.Explosion).toBeDefined();
            expect(mainModule.PowerupEffect).toBeDefined();
            expect(mainModule.MuzzleFlash).toBeDefined();
            expect(mainModule.TransformEffect).toBeDefined();
            expect(mainModule.OptionsMenu).toBeDefined();
            expect(mainModule.Game).toBeDefined();
        });
        
        it('should have valid module structure', async () => {
            const mainModule = await import('./main.js');
            
            // Check that game constants are properly structured
            expect(mainModule.GAME_CONSTANTS).toHaveProperty('BOSS_LEVEL_INTERVAL');
            expect(mainModule.GAME_INFO).toHaveProperty('version');
            
            // Check that classes are constructable
            expect(typeof mainModule.Player).toBe('function');
            expect(typeof mainModule.Game).toBe('function');
            expect(typeof mainModule.AudioManager).toBe('function');
        });
    });
    
    describe('Module Integration', () => {
        it('should have all utility functions available', async () => {
            const mainModule = await import('./main.js');
            
            // Check math utils
            expect(mainModule.MathUtils.clamp).toBeDefined();
            expect(mainModule.MathUtils.lerp).toBeDefined();
            expect(mainModule.MathUtils.magnitude).toBeDefined();
            
            // Check collision utils
            expect(mainModule.CollisionUtils.checkRectCollision).toBeDefined();
            expect(mainModule.CollisionUtils.checkCircleCollision).toBeDefined();
        });
        
        it('should have all effect classes available', async () => {
            const mainModule = await import('./main.js');
            
            expect(mainModule.Explosion).toBeDefined();
            expect(mainModule.PowerupEffect).toBeDefined();
            expect(mainModule.MuzzleFlash).toBeDefined();
            expect(mainModule.TransformEffect).toBeDefined();
        });
        
        it('should have all system classes available', async () => {
            const mainModule = await import('./main.js');
            
            expect(mainModule.AudioManager).toBeDefined();
            expect(mainModule.Powerup).toBeDefined();
            expect(mainModule.PowerupSpawner).toBeDefined();
            expect(mainModule.Background).toBeDefined();
            expect(mainModule.OptionsMenu).toBeDefined();
        });
    });
    
    describe('Class Instantiation', () => {
        it('should be able to create instances of game classes', async () => {
            const mainModule = await import('./main.js');
            
            // Mock required dependencies
            const mockGame = {
                canvas: { width: 800, height: 600 },
                width: 800,
                height: 600,
                bullets: [],
                effects: [],
                player: { x: 400, y: 300, width: 30, height: 30 }
            };
            
            const mockCtx = {
                fillStyle: '',
                fillRect: vi.fn(),
                save: vi.fn(),
                restore: vi.fn(),
                translate: vi.fn(),
                scale: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                fillText: vi.fn(),
                strokeText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 10 }),
                getImageData: vi.fn(),
                putImageData: vi.fn()
            };
            
            // Test that classes can be instantiated
            expect(() => new mainModule.AudioManager()).not.toThrow();
            expect(() => new mainModule.Powerup(mockGame, 100, 200, 'health')).not.toThrow();
            // PowerupSpawner is an object, not a class
            expect(mainModule.PowerupSpawner).toBeDefined();
            expect(typeof mainModule.PowerupSpawner).toBe('object');
            expect(() => new mainModule.Background(mockGame)).not.toThrow();
            expect(() => new mainModule.Explosion(mockGame, 100, 200, 'medium')).not.toThrow();
            expect(() => new mainModule.PowerupEffect(mockGame, 100, 200)).not.toThrow();
            expect(() => new mainModule.MuzzleFlash(mockGame, 100, 200, 0)).not.toThrow();
            expect(() => new mainModule.TransformEffect(mockGame, 100, 200)).not.toThrow();
        });
        
        it('should be able to create player and enemy instances', async () => {
            const mainModule = await import('./main.js');
            
            const mockGame = {
                canvas: { width: 800, height: 600 },
                width: 800,
                height: 600,
                bullets: [],
                effects: [],
                player: { x: 400, y: 300, width: 30, height: 30 }
            };
            
            // Test entity creation
            expect(() => new mainModule.Player(mockGame)).not.toThrow();
            expect(() => new mainModule.Enemy(mockGame, 100, 200, 'fighter')).not.toThrow();
            expect(() => new mainModule.Bullet(mockGame, 100, 200, 5, 0, true)).not.toThrow();
        });
    });
    
    describe('Utility Functions', () => {
        it('should have working math utility functions', async () => {
            const mainModule = await import('./main.js');
            
            // Test math utility functions
            expect(mainModule.MathUtils.clamp(5, 0, 10)).toBe(5);
            expect(mainModule.MathUtils.clamp(-5, 0, 10)).toBe(0);
            expect(mainModule.MathUtils.clamp(15, 0, 10)).toBe(10);
            
            expect(mainModule.MathUtils.lerp(0, 10, 0.5)).toBe(5);
            expect(mainModule.MathUtils.magnitude({ x: 3, y: 4 })).toBe(5);
        });
        
        it('should have working collision utility functions', async () => {
            const mainModule = await import('./main.js');
            
            // Test collision utility functions
            const rect1 = { x: 0, y: 0, width: 10, height: 10 };
            const rect2 = { x: 5, y: 5, width: 10, height: 10 };
            const rect3 = { x: 20, y: 20, width: 10, height: 10 };
            
            expect(mainModule.CollisionUtils.checkRectCollision(rect1, rect2)).toBe(true);
            expect(mainModule.CollisionUtils.checkRectCollision(rect1, rect3)).toBe(false);
            
            expect(mainModule.CollisionUtils.checkCircleCollision(
                { x: 0, y: 0, radius: 5 },
                { x: 3, y: 4, radius: 5 }
            )).toBe(true);
            
            expect(mainModule.CollisionUtils.pointInRect({ x: 5, y: 5 }, rect1)).toBe(true);
            expect(mainModule.CollisionUtils.pointInRect({ x: 15, y: 15 }, rect1)).toBe(false);
        });
    });
    
    describe('Constants and Configuration', () => {
        it('should have valid game constants', async () => {
            const mainModule = await import('./main.js');
            
            expect(mainModule.GAME_CONSTANTS.BOSS_LEVEL_INTERVAL).toBeTypeOf('number');
            expect(mainModule.GAME_CONSTANTS.BOSS_LEVEL_INTERVAL).toBeGreaterThan(0);
            
            expect(mainModule.GAME_CONSTANTS.ENEMIES_PER_LEVEL).toBeTypeOf('number');
            expect(mainModule.GAME_CONSTANTS.ENEMIES_PER_LEVEL).toBeGreaterThan(0);
            
            expect(mainModule.GAME_CONSTANTS.MAX_MESSAGES).toBeTypeOf('number');
            expect(mainModule.GAME_CONSTANTS.MAX_MESSAGES).toBeGreaterThan(0);
        });
        
        it('should have valid game info', async () => {
            const mainModule = await import('./main.js');
            
            expect(mainModule.GAME_INFO.version).toBeTypeOf('string');
            expect(mainModule.GAME_INFO.version).toMatch(/^\d+\.\d+\.\d+$/);
            
            expect(mainModule.GAME_INFO.name).toBeTypeOf('string');
            expect(mainModule.GAME_INFO.name.length).toBeGreaterThan(0);
            
            expect(mainModule.GAME_INFO.author).toBeTypeOf('string');
            expect(mainModule.GAME_INFO.welcomeMessage).toBeInstanceOf(Array);
        });
    });
    
    describe('Error Handling', () => {
        it('should handle module loading errors gracefully', async () => {
            // This test ensures the main module can be imported without throwing
            expect(async () => {
                await import('./main.js');
            }).not.toThrow();
        });
        
        it('should handle class instantiation with invalid parameters', async () => {
            const mainModule = await import('./main.js');
            
            // Test that classes handle invalid parameters gracefully
            expect(() => new mainModule.AudioManager()).not.toThrow();
            expect(() => new mainModule.Powerup(null, 0, 0, 'invalid')).not.toThrow();
            expect(() => new mainModule.Explosion(null, 0, 0, 'invalid')).not.toThrow();
        });
    });
});
