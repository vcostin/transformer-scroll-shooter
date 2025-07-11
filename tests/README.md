# Game Unit Tests

This directory contains unit tests for the Transformer Scroll Shooter game.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- `game.test.js` - Tests for the main Game class including:
  - Boss spawning logic
  - Level progression
  - Message system
  - Game state management

- `setup.js` - Test setup file with mocks and utilities

## Test Coverage

The tests cover:

✅ **Boss Spawning Logic**
- Boss spawns on correct levels (every 5 levels)
- Warning messages are displayed
- Boss properties are set correctly

✅ **Level Progression** 
- Level advances after boss defeat
- Level advances after killing enough regular enemies
- Enemy kill count resets properly

✅ **Message System**
- Messages are limited to maximum count
- Message durations are set correctly based on type
- Message fade-out behavior

✅ **Game State Management**
- Game state resets properly on restart
- Score, level, and other properties are handled correctly

## Adding New Tests

To add new tests:

1. Create test files in the `tests/` directory
2. Use the `.test.js` suffix
3. Mock external dependencies (canvas, audio, etc.)
4. Follow the existing test patterns

## Mock Objects

The test suite includes comprehensive mocks for:
- Canvas API
- Audio API
- DOM elements
- Game objects (Player, Boss, etc.)
- Browser APIs (requestAnimationFrame, etc.)

This ensures tests run quickly and reliably without requiring a browser environment.
