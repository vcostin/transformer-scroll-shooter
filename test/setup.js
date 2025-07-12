/**
 * Vitest Setup - Phase 4 Testing Infrastructure
 * 
 * This file sets up the testing environment for the game modules
 */

import { beforeEach, vi } from 'vitest'

// Suppress only Web Audio API warnings during tests
const originalWarn = console.warn
vi.spyOn(console, 'warn').mockImplementation((...args) => {
  const message = args.join(' ')
  if (message.includes('Web Audio API not supported')) {
    // Suppress only Web Audio API warnings
    return
  }
  // Allow all other warnings to pass through
  originalWarn(...args)
})

// Mock canvas and 2D context for testing
// Import canvas context from shared mocks to avoid duplication
import { createMockCanvasContext } from './mocks/canvas-mock.js'

global.HTMLCanvasElement.prototype.getContext = vi.fn(() => createMockCanvasContext())

// Mock Audio API
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn(),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  volume: 1,
  currentTime: 0,
  duration: 0,
  paused: true,
  ended: false,
  muted: false,
  src: '',
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock performance.now
global.performance = {
  now: vi.fn(() => Date.now()),
}

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

console.log('🧪 Vitest setup complete - Game testing environment ready')
