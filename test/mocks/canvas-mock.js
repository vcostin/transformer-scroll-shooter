/**
 * Canvas Mocking Utilities
 *
 * Shared canvas and 2D context mocking functionality used by both
 * global test setup and individual test utilities.
 */

import { vi } from 'vitest'

/**
 * Create a mock canvas 2D context with all required methods
 * @returns {Object} Mock 2D context
 */
export function createMockCanvasContext() {
  return {
    // Drawing rectangles
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),

    // Drawing paths
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),

    // Transformations
    save: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),

    // Image drawing
    drawImage: vi.fn(),

    // Text
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),

    // Image data
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),

    // Gradients and patterns
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    createPattern: vi.fn(),

    // Canvas reference
    canvas: {
      width: 800,
      height: 600
    }
  }
}

/**
 * Create a mock canvas element
 * @returns {Object} Mock canvas element
 */
export function createMockCanvas() {
  const mockContext = createMockCanvasContext()

  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => mockContext),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600
    }))
  }
}
