/**
 * Game Test Utilities
 * 
 * This module provides reusable test utilities for testing game components.
 * It centralizes common mocking functionality to eliminate code duplication
 * across test files, particularly for Canvas API and DOM element mocking.
 */

import { vi } from 'vitest';
import { Game } from '@/game/game.js';
import { createMockCanvas, createMockCanvasContext } from './mocks/canvas-mock.js';

// Re-export canvas utilities for convenience
export { createMockCanvas, createMockCanvasContext };

/**
 * Create a mock game instance with minimal dependencies
 * @param {Object} options - Optional configuration
 * @returns {Game} Mock game instance
 */
export function createMockGame(options = {}) {
    // Mock document.getElementById to return a mock canvas
    const mockCanvas = createMockCanvas();
    
    // Store original globals to restore later
    const originalDocument = global.document;
    const originalWindow = global.window;
    const originalProcess = global.process;
    
    // Create mock elements for OptionsMenu
    const mockElement = {
        style: {},
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn()
        },
        innerHTML: ''
    };
    
    global.document = {
        getElementById: vi.fn((id) => {
            if (id === 'gameCanvas') {
                return mockCanvas;
            }
            // Return mock element for any other ID
            return mockElement;
        }),
        createElement: vi.fn(() => ({
            style: {},
            appendChild: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            classList: {
                add: vi.fn(),
                remove: vi.fn(),
                contains: vi.fn()
            },
            innerHTML: ''
        })),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        body: {
            appendChild: vi.fn(),
            removeChild: vi.fn()
        }
    };

    // Mock window for requestAnimationFrame
    global.window = {
        requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
        cancelAnimationFrame: vi.fn()
    };

    // Mock process.env for test detection
    global.process = { 
        ...originalProcess, 
        env: { 
            ...originalProcess?.env, 
            NODE_ENV: 'test' 
        } 
    };

    // Create game instance
    const game = new Game(options);
    
    // Return cleanup function along with game
    const cleanup = () => {
        if (game.destroy) {
            game.destroy();
        }
        // Restore original globals to prevent test pollution
        global.document = originalDocument;
        global.window = originalWindow;
        global.process = originalProcess;
        vi.clearAllMocks();
    };

    return { game, cleanup };
}

/**
 * Create a spy on event dispatcher emissions
 * @param {Object} eventDispatcher - Event dispatcher instance
 * @returns {Object} Spy object
 */
export function createEventSpy(eventDispatcher) {
    return vi.spyOn(eventDispatcher, 'emit');
}

/**
 * Create a mock entity for testing
 * @param {Object} options - Entity options
 * @returns {Object} Mock entity
 */
export function createMockEntity(options = {}) {
    return {
        x: options.x || 0,
        y: options.y || 0,
        width: options.width || 32,
        height: options.height || 32,
        update: vi.fn(),
        render: vi.fn(),
        markedForDeletion: options.markedForDeletion || false,
        ...options
    };
}

/**
 * Wait for next animation frame in tests
 * @returns {Promise} Promise that resolves after next frame
 */
export function waitForNextFrame() {
    return new Promise(resolve => {
        global.requestAnimationFrame(resolve);
    });
}

/**
 * Set up test environment for specific game feature
 * @param {string} feature - Feature name
 * @returns {Object} Test setup object
 */
export function setupGameTest(feature) {
    const setup = {
        feature,
        mocks: new Map(),
        cleanup: []
    };

    // Add common cleanup
    setup.cleanup.push(() => {
        vi.clearAllMocks();
    });

    return setup;
}

/**
 * Mock the game loop for testing without NODE_ENV check
 * @param {Game} game - Game instance
 * @returns {Function} Cleanup function
 */
export function mockGameLoop(game) {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    return () => {
        process.env.NODE_ENV = originalEnv;
    };
}
