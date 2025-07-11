# Testing Infrastructure - Phase 4

This document describes the testing infrastructure implemented for the Transformer Scroll Shooter game.

## Overview

The testing infrastructure uses **Vitest** as the testing framework, providing:
- Fast unit testing with ES modules support
- Code coverage reporting  
- Interactive test UI
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
