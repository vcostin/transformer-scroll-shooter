# Test Infrastructure

This directory contains the test infrastructure for the game project. The testing architecture is designed with clear separation of concerns and elimination of code duplication.

## 📁 Structure

```
test/
├── setup.js                 # Global test environment setup
├── game-test-utils.js       # Game-specific test utilities
├── mocks/
│   └── canvas-mock.js       # Shared canvas/2D context mocking
└── README.md               # This file
```

## 🧪 Test Files Overview

### `setup.js` - Global Test Environment
**Purpose**: Global test environment setup that runs automatically for ALL tests
**Responsibilities**:
- Global API mocking (Audio, localStorage, requestAnimationFrame, performance)
- Global canvas API mocking via `HTMLCanvasElement.prototype.getContext`
- Console warning suppression (Web Audio API warnings)
- Automatic mock cleanup with `beforeEach`

### `game-test-utils.js` - Game-Specific Utilities
**Purpose**: Reusable test utilities for specific game testing scenarios
**Responsibilities**:
- Creating mock game instances with complete DOM/Canvas setup
- Specialized mock objects (entities, event spies)
- Test-specific utilities (game loop mocking, test environment setup)
- Custom cleanup functions

### `mocks/canvas-mock.js` - Shared Canvas Mocking
**Purpose**: Centralized canvas and 2D context mocking to eliminate duplication
**Responsibilities**:
- Complete Canvas 2D context API mocking
- Canvas element mocking with proper dimensions and methods
- Reusable across both global setup and individual test utilities

## 🎯 Usage Examples

### Basic Test Setup (Automatic)
```javascript
// No setup needed - global mocks are automatically applied
import { describe, it, expect } from 'vitest';
import { Game } from '@/game/game.js';

describe('My Game Test', () => {
  it('should work with global mocks', () => {
    // Canvas, Audio, and DOM APIs are automatically mocked
    const game = new Game();
    expect(game).toBeDefined();
  });
});
```

### Advanced Test Setup (Manual)
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockGame, createEventSpy } from '@/test/game-test-utils.js';

describe('Advanced Game Test', () => {
  let game, cleanup, eventSpy;

  beforeEach(() => {
    ({ game, cleanup } = createMockGame());
    eventSpy = createEventSpy(game.eventDispatcher);
  });

  afterEach(() => {
    cleanup();
  });

  it('should work with specialized mocks', () => {
    game.start();
    expect(eventSpy).toHaveBeenCalledWith('game:start', expect.any(Object));
  });
});
```

## 🔧 Design Principles

### Single Responsibility
- **`setup.js`**: Global environment setup only
- **`game-test-utils.js`**: Game-specific utilities only  
- **`canvas-mock.js`**: Canvas mocking only

### DRY (Don't Repeat Yourself)
- Canvas mocking is centralized in `canvas-mock.js`
- No duplication between global setup and test utilities
- Reusable utilities prevent test code duplication

### Separation of Concerns
- Global setup handles environment-wide concerns
- Test utilities handle test-specific concerns
- Shared mocks handle common mocking patterns

## 📋 Available Utilities

### From `game-test-utils.js`:
- `createMockGame(options)` - Create mock game with DOM setup
- `createMockCanvas()` - Create mock canvas element
- `createMockCanvasContext()` - Create mock 2D context
- `createEventSpy(dispatcher)` - Create event emission spy
- `createMockEntity(options)` - Create mock entity
- `waitForNextFrame()` - Wait for next animation frame
- `setupGameTest(feature)` - Set up feature-specific test environment
- `mockGameLoop(game)` - Mock game loop for testing

### From `canvas-mock.js`:
- `createMockCanvasContext()` - Complete 2D context mock
- `createMockCanvas()` - Complete canvas element mock

## 🏗️ Architecture Benefits

1. **No Code Duplication**: Canvas mocking is centralized
2. **Clear Separation**: Each file has a single, well-defined purpose
3. **Reusable**: Utilities can be used across multiple test files
4. **Maintainable**: Changes to mocking only need to be made in one place
5. **Extensible**: Easy to add new test utilities without affecting existing code

## 🚀 Best Practices

1. **Use global mocks** for basic functionality (they're applied automatically)
2. **Use test utilities** for complex scenarios requiring specialized setup
3. **Always call cleanup functions** to prevent test pollution
4. **Import only what you need** to keep tests focused and fast
5. **Add new utilities** to the appropriate file based on their purpose

## 📝 Adding New Test Utilities

### For Canvas/2D Context Mocking
Add to `mocks/canvas-mock.js` if it's reusable canvas functionality.

### For Game-Specific Utilities
Add to `game-test-utils.js` if it's game-specific testing functionality.

### For Global Environment Setup
Add to `setup.js` if it needs to be applied to ALL tests automatically.
- Hot reload during development
- Comprehensive test utilities and mocks

## Test Structure

```
test/
├── setup.js           # Test environment setup and mocks
├── collision.test.js   # Collision utility tests
├── math.test.js       # Math utility tests  
├── game-constants.test.js # Game constants tests
├── player.test.js     # Player class tests
└── integration.test.js # Integration tests
```

## Test Scripts

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## What's Tested

### ✅ **Utilities** (97%+ coverage)
- `src/utils/math.js` - Mathematical functions
- `src/utils/collision.js` - Collision detection functions

### ✅ **Constants** (100% coverage)
- `src/constants/game-constants.js` - Game configuration

### ✅ **Player Class** (28% coverage)
- Basic constructor and properties
- Mode system integration
- Power-up system structure

### ✅ **Integration Tests**
- Module exports and imports
- Cross-module functionality
- Game object integration

## Test Environment

The test environment includes comprehensive mocks for:
- **Canvas API** - 2D rendering context
- **Audio API** - Sound playback
- **DOM APIs** - LocalStorage, requestAnimationFrame
- **Game Objects** - Mock game instances for testing

## Coverage Report

Current coverage levels:
- **Math Utils**: 96.33% (lines)
- **Collision Utils**: 97.93% (lines)  
- **Game Constants**: 100% (lines)
- **Player Class**: 28.67% (lines)

## Adding New Tests

### For Utilities
```javascript
import { describe, it, expect } from 'vitest'
import * as YourUtils from '../src/utils/your-utils.js'

describe('YourUtils', () => {
  it('should do something', () => {
    expect(YourUtils.someFunction(input)).toBe(expected)
  })
})
```

### For Game Objects
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { YourClass } from '../src/entities/your-class.js'

describe('YourClass', () => {
  let mockGame
  let instance

  beforeEach(() => {
    mockGame = {
      // Mock game properties
      width: 800,
      height: 600,
      ctx: { /* mock canvas context */ },
      audio: { playSound: vi.fn() }
    }
    instance = new YourClass(mockGame)
  })

  it('should initialize correctly', () => {
    expect(instance).toBeDefined()
    expect(instance.game).toBe(mockGame)
  })
})
```

## Test Configuration

The test configuration is in `vitest.config.js`:
- **Environment**: jsdom (for DOM APIs)
- **Setup**: `test/setup.js` (mocks and utilities)
- **Coverage**: v8 provider with HTML reports
- **Globals**: Test functions available without imports

## Benefits

1. **Quality Assurance**: Catches bugs before deployment
2. **Refactoring Safety**: Ensures changes don't break existing functionality
3. **Documentation**: Tests serve as usage examples
4. **Development Speed**: Fast feedback during development
5. **Code Coverage**: Identifies untested code paths

## Next Steps

1. **Expand Player Tests**: Add more comprehensive player testing
2. **Add Bullet Tests**: Test bullet physics and interactions
3. **Add Enemy Tests**: Test enemy AI and behavior
4. **Add Game Logic Tests**: Test level progression and scoring
5. **Add Integration Tests**: Test complete game scenarios

## CI/CD Integration

The test suite is designed to integrate with CI/CD pipelines:
- Fast execution (< 1 second)
- Clear pass/fail reporting
- Code coverage metrics
- No external dependencies

Run `npm run test:run` in your CI pipeline to validate builds.
