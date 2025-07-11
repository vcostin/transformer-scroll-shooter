/**
 * Jest Setup File
 * 
 * This file sets up the testing environment for the game tests,
 * including global mocks and polyfills.
 */

// Mock requestAnimationFrame for testing
global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 16);
};

// Mock cancelAnimationFrame
global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock audio context for testing
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { setValueAtTime: jest.fn() }
  })),
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { setValueAtTime: jest.fn() }
  })),
  resume: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve())
}));

// Mock Web Audio API
global.webkitAudioContext = global.AudioContext;

// Global test utilities
global.createMockCanvas = (width = 800, height = 600) => {
  const canvas = {
    width,
    height,
    getContext: jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      closePath: jest.fn(),
      setLineDash: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      })),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      })),
      drawImage: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      isPointInPath: jest.fn(),
      isPointInStroke: jest.fn(),
      // Properties
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'inherit',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowOffsetX: 0,
      shadowOffsetY: 0
    }))
  };
  return canvas;
};

// Setup console mocking for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock performance.now for consistent timing in tests
global.performance = {
  now: jest.fn(() => Date.now())
};

// Set up Date.now mock
const originalDateNow = Date.now;
beforeEach(() => {
  Date.now = jest.fn(() => 1234567890123);
});

afterEach(() => {
  Date.now = originalDateNow;
});

// Export test utilities
module.exports = {
  createMockCanvas: global.createMockCanvas
};
