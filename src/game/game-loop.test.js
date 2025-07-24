/**
 * Event-Driven Game Loop Tests
 * Tests for the refactored event-driven game architecture
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GAME_EVENTS } from '../constants/game-events.js';
import { createMockGame, createEventSpy, mockGameLoop } from '@test/game-test-utils.js';

describe('Event-Driven Game Loop', () => {
    let game;
    let eventSpy;
    let cleanup;

    beforeEach(() => {
        // Create game instance using test utility
        const result = createMockGame();
        game = result.game;
        cleanup = result.cleanup;
        
        // Spy on event emissions
        eventSpy = createEventSpy(game.eventDispatcher);
    });

    afterEach(() => {
        if (cleanup) {
            cleanup();
        }
        vi.clearAllMocks();
    });

    describe('Game Loop Architecture', () => {
        it('should emit game:frame event on each frame', () => {
            const currentTime = 1000;
            const previousTime = 983.33;
            const deltaTime = currentTime - previousTime;
            
            game.lastTime = previousTime;
            
            // Use utility to mock game loop
            const restoreEnv = mockGameLoop(game);
            
            game.gameLoop(currentTime);
            
            restoreEnv();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_FRAME,
                expect.objectContaining({
                    deltaTime,
                    currentTime,
                    frame: expect.any(Number)
                })
            );
        });

        it('should emit game:update event when not paused', () => {
            const deltaTime = 16.67;
            game.paused = false;
            game.gameOver = false;
            
            game.update(deltaTime);
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_UPDATE,
                expect.objectContaining({
                    deltaTime,
                    currentTime: expect.any(Number),
                    frame: expect.any(Number)
                })
            );
        });

        it('should not emit game:update when paused', () => {
            const deltaTime = 16.67;
            game.paused = true;
            
            game.gameLoop(1000);
            
            expect(eventSpy).not.toHaveBeenCalledWith(
                GAME_EVENTS.GAME_UPDATE,
                expect.any(Object)
            );
        });

        it('should emit game:render event on each frame', () => {
            game.render();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_RENDER,
                expect.objectContaining({
                    ctx: game.ctx,
                    deltaTime: expect.any(Number)
                })
            );
        });
    });

    describe('Game State Events', () => {
        it('should emit game:start event when game starts', () => {
            game.startGame();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_START,
                expect.objectContaining({
                    timestamp: expect.any(Number)
                })
            );
        });

        it('should emit game:pause event when game is paused', () => {
            game.pauseGame();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_PAUSE,
                expect.objectContaining({
                    timestamp: expect.any(Number)
                })
            );
            
            expect(game.paused).toBe(true);
        });

        it('should emit game:resume event when game is resumed', () => {
            game.paused = true;
            game.resumeGame();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_RESUME,
                expect.objectContaining({
                    timestamp: expect.any(Number)
                })
            );
            
            expect(game.paused).toBe(false);
        });

        it('should emit game:over event when game ends', () => {
            game.endGame();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_OVER,
                expect.objectContaining({
                    timestamp: expect.any(Number),
                    score: expect.any(Number),
                    level: expect.any(Number)
                })
            );
            
            expect(game.gameOver).toBe(true);
        });

        it('should emit game:restart event when game restarts', () => {
            game.gameOver = true;
            game.restart();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_RESTART,
                expect.objectContaining({
                    timestamp: expect.any(Number)
                })
            );
            
            expect(game.gameOver).toBe(false);
        });
    });

    describe('Entity Update Events', () => {
        it('should emit entity:update events for each entity type', () => {
            const deltaTime = 16.67;
            
            // Add some test entities
            game.enemies.push({ update: vi.fn(), markedForDeletion: false });
            game.bullets.push({ update: vi.fn(), markedForDeletion: false });
            game.powerups.push({ update: vi.fn(), markedForDeletion: false });
            
            game.update(deltaTime);
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.ENTITY_UPDATE,
                expect.objectContaining({
                    entityType: 'enemies',
                    deltaTime,
                    count: 1
                })
            );
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.ENTITY_UPDATE,
                expect.objectContaining({
                    entityType: 'bullets',
                    deltaTime,
                    count: 1
                })
            );
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.ENTITY_UPDATE,
                expect.objectContaining({
                    entityType: 'powerups',
                    deltaTime,
                    count: 1
                })
            );
        });

        it('should handle entity cleanup through events', () => {
            game.enemies.push({ update: vi.fn(), markedForDeletion: true });
            game.bullets.push({ update: vi.fn(), markedForDeletion: true });
            
            const initialEnemyCount = game.enemies.length;
            const initialBulletCount = game.bullets.length;
            
            game.update(16.67);
            
            expect(game.enemies.length).toBe(initialEnemyCount - 1);
            expect(game.bullets.length).toBe(initialBulletCount - 1);
        });
    });

    describe('Performance Events', () => {
        it('should emit performance:fps_update events', () => {
            // Simulate FPS calculation
            game.frameCount = 60;
            game.fpsTimer = 1000;
            
            game.calculateFPS(16.67);
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.PERFORMANCE_FPS_UPDATE,
                expect.objectContaining({
                    fps: expect.any(Number),
                    frameTime: expect.any(Number)
                })
            );
        });

        it('should emit performance:frame_time events', () => {
            const currentTime = 1000;
            const previousTime = 983.33;
            const deltaTime = currentTime - previousTime;
            
            game.lastTime = previousTime;
            
            // Use utility to mock game loop
            const restoreEnv = mockGameLoop(game);
            
            game.gameLoop(currentTime);
            
            restoreEnv();
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.PERFORMANCE_FRAME_TIME,
                expect.objectContaining({
                    deltaTime,
                    timestamp: currentTime
                })
            );
        });
    });

    describe('Event Listener Management', () => {
        it('should register core game event listeners', () => {
            const mockEffect = vi.spyOn(game.effectManager, 'effect');
            
            game.setupEffects();
            
            expect(mockEffect).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_START,
                expect.any(Function)
            );
            
            expect(mockEffect).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_PAUSE,
                expect.any(Function)
            );
            
            expect(mockEffect).toHaveBeenCalledWith(
                GAME_EVENTS.GAME_RESUME,
                expect.any(Function)
            );
        });

        it('should cleanup event listeners on destroy', () => {
            const mockOff = vi.spyOn(game.eventDispatcher, 'off');
            
            game.setupEffects();
            game.destroy();
            
            expect(mockOff).toHaveBeenCalled();
        });
    });

    describe('Integration with State Management', () => {
        it('should update state when game events occur', () => {
            const mockSetState = vi.spyOn(game.stateManager, 'setState');
            
            game.startGame();
            
            expect(mockSetState).toHaveBeenCalledWith(
                'game.state',
                'running'
            );
        });

        it('should emit events when state changes', () => {
            game.stateManager.setState('game.score', 100);
            
            expect(eventSpy).toHaveBeenCalledWith(
                GAME_EVENTS.UI_SCORE_UPDATE,
                expect.objectContaining({
                    score: 100,
                    previousScore: 0,
                    delta: 100
                })
            );
        });
    });

    describe('Error Handling', () => {
        it('should handle event listener errors gracefully', () => {
            // Mock console.error to prevent stderr output during test
            const originalConsoleError = console.error;
            console.error = vi.fn();
            
            const errorHandler = vi.fn();
            const faultyHandler = vi.fn(() => {
                throw new Error('Test error');
            });
            
            game.eventDispatcher.on(GAME_EVENTS.GAME_UPDATE, faultyHandler);
            game.eventDispatcher.on('error', errorHandler);
            
            // Should not throw
            expect(() => {
                game.update(16.67);
            }).not.toThrow();
            
            expect(errorHandler).toHaveBeenCalled();
            
            // Verify error was logged
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining("Error in event handler for 'game:update':"),
                expect.any(Error)
            );
            
            // Restore console.error
            console.error = originalConsoleError;
        });

        it('should maintain frame rate despite event errors', () => {
            // Mock console.error to prevent stderr output during test
            const originalConsoleError = console.error;
            console.error = vi.fn();
            
            const faultyHandler = vi.fn(() => {
                throw new Error('Test error');
            });
            
            game.eventDispatcher.on(GAME_EVENTS.GAME_UPDATE, faultyHandler);
            
            const startTime = performance.now();
            game.gameLoop(startTime);
            game.gameLoop(startTime + 16.67);
            
            // Restore console.error
            console.error = originalConsoleError;
            
            // Should continue running
            expect(game.animationFrameId).toBeDefined();
        });
    });
});
