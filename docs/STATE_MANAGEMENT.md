# State Management System Documentation

## Overview

The State Management System provides a robust, centralized way to manage application state with immutable updates, event-driven architecture, and comprehensive debugging tools. It's designed specifically for game development but can be used in any JavaScript application.

## Features

- 🔒 **Immutable Updates**: All state changes create new objects, preserving data integrity
- 🎯 **Event-Driven Architecture**: Integrated with EventDispatcher for reactive programming
- 🌳 **Nested State Support**: Use dot-notation paths (e.g., `'player.position.x'`)
- ✅ **Validation & Type Checking**: Automatic validation with schema definitions
- 🕐 **History & Undo/Redo**: Built-in state history with undo/redo capabilities
- 🔍 **Debug Tools**: Comprehensive debugging and state inspection
- ⚡ **Performance Optimized**: O(1) operations, memory caching, and efficient updates
- 🚀 **Async Support**: Built-in support for async operations with loading states
- 🧩 **Batch Operations**: Atomic updates for multiple state changes
- 💾 **Memory Management**: Automatic cleanup and memory usage tracking

## Quick Start

### Basic Usage

```javascript
import { stateManager } from './src/systems/StateManager.js';

// Get state
const playerHealth = stateManager.getState('player.health');

// Set state
stateManager.setState('player.health', 80);

// Subscribe to changes
const unsubscribe = stateManager.subscribe('player.health', (newValue, oldValue, path) => {
    console.log(`Player health changed from ${oldValue} to ${newValue}`);
});

// Unsubscribe when done
unsubscribe();
```

### Advanced Features

```javascript
// Async state updates with loading states
await stateManager.setStateAsync('player.data', 
    fetch('/api/player').then(res => res.json()),
    {
        loadingPath: 'ui.loading',
        errorPath: 'ui.error'
    }
);

// Batch updates (atomic)
stateManager.batchUpdate([
    { path: 'player.position.x', value: 100 },
    { path: 'player.position.y', value: 200 },
    { path: 'player.velocity.x', value: 0 }
]);

// Transactions for complex operations
stateManager.transaction((state) => {
    state.setState('player.health', 50);
    state.setState('player.shield', 0);
    state.setState('game.status', 'player_damaged');
});
```

## API Reference

### Core Methods

#### `getState(path = '', options = {})`

Gets state value by dot-notation path.

**Parameters:**
- `path` (string): Dot-notation path to state property (empty string returns entire state)
- `options` (object): Options for getting state
  - `skipStats` (boolean): Skip statistics tracking

**Returns:** State value or `undefined` if not found

**Examples:**
```javascript
// Get entire state
const state = stateManager.getState();

// Get specific property
const playerHealth = stateManager.getState('player.health');

// Get nested property
const positionX = stateManager.getState('player.position.x');
```

#### `setState(path, value, options = {})`

Sets state value by path with immutable updates.

**Parameters:**
- `path` (string): Dot-notation path to state property
- `value` (any): New value to set
- `options` (object): Update options
  - `skipValidation` (boolean): Skip validation
  - `skipEvents` (boolean): Skip event emission
  - `skipHistory` (boolean): Skip adding to history
  - `merge` (boolean): Merge with existing object (for objects)

**Returns:** `boolean` - True if state was updated, false if no change

**Examples:**
```javascript
// Basic update
stateManager.setState('player.health', 100);

// Merge with existing object
stateManager.setState('player.position', { x: 10 }, { merge: true });

// Skip validation and history
stateManager.setState('temp.data', value, { 
    skipValidation: true, 
    skipHistory: true 
});
```

#### `setStateAsync(path, valueOrPromise, options = {})`

Sets state asynchronously with optional loading states.

**Parameters:**
- `path` (string): Dot-notation path to state property
- `valueOrPromise` (any|Promise): Value or Promise that resolves to value
- `options` (object): Update options (includes all `setState` options plus:)
  - `loadingPath` (string): Path to set loading state
  - `errorPath` (string): Path to set error messages

**Returns:** `Promise<boolean>` - Promise that resolves when state is updated

**Examples:**
```javascript
// Basic async update
await stateManager.setStateAsync('player.data', fetchPlayerData());

// With loading and error states
await stateManager.setStateAsync('game.highScores', 
    fetch('/api/highscores').then(res => res.json()),
    {
        loadingPath: 'ui.loadingHighScores',
        errorPath: 'ui.highScoresError'
    }
);
```

### Subscription Methods

#### `subscribe(path, callback, options = {})`

Subscribes to state changes at a specific path.

**Parameters:**
- `path` (string): Dot-notation path to state property
- `callback` (function): Function called when state changes `(newValue, oldValue, path) => void`
- `options` (object): Subscription options
  - `immediate` (boolean): Call callback immediately with current value
  - `deep` (boolean): Watch for deep changes in objects/arrays

**Returns:** `Function` - Unsubscribe function

**Examples:**
```javascript
// Basic subscription
const unsubscribe = stateManager.subscribe('player.health', (newHealth, oldHealth) => {
    console.log(`Health: ${oldHealth} → ${newHealth}`);
});

// Immediate callback
stateManager.subscribe('game.score', (score) => {
    updateScoreDisplay(score);
}, { immediate: true });

// Unsubscribe
unsubscribe();
```

#### `unsubscribe(subscriptionId)`

Unsubscribes from state changes (typically called via the returned function from `subscribe`).

**Parameters:**
- `subscriptionId` (string): ID of subscription to remove

**Returns:** `boolean` - True if subscription was removed

### Batch Operations

#### `batchUpdate(updates, batchOptions = {})`

Performs multiple state updates atomically.

**Parameters:**
- `updates` (Array): Array of update objects `{ path, value, options }`
- `batchOptions` (object): Batch options
  - `skipEvents` (boolean): Skip event emission
  - `skipHistory` (boolean): Skip adding to history

**Returns:** `boolean` - True if any updates were applied

**Examples:**
```javascript
// Multiple related updates
stateManager.batchUpdate([
    { path: 'player.position.x', value: 100 },
    { path: 'player.position.y', value: 200 },
    { path: 'player.lastMoved', value: Date.now() }
]);

// With options
stateManager.batchUpdate([
    { path: 'ui.modal', value: 'settings' },
    { path: 'ui.overlay', value: true }
], { skipHistory: true });
```

#### `transaction(transactionFn)`

Creates a transaction for multiple related updates with automatic rollback on error.

**Parameters:**
- `transactionFn` (function): Function that performs updates `(stateManager) => any`

**Returns:** Result of transaction function

**Examples:**
```javascript
// Safe complex operation
stateManager.transaction((state) => {
    state.setState('player.health', 0);
    state.setState('player.alive', false);
    state.setState('game.status', 'game_over');
    
    // If any of these fail, all changes are rolled back
    return 'game_over';
});
```

### History Methods

#### `undo()`

Undoes the last state change.

**Returns:** `boolean` - True if undo was successful

#### `redo()`

Redoes the last undone state change.

**Returns:** `boolean` - True if redo was successful

#### `resetState(path = '')`

Resets state to default values.

**Parameters:**
- `path` (string): Optional path to reset (resets entire state if not provided)

**Examples:**
```javascript
// Reset entire state
stateManager.resetState();

// Reset specific path
stateManager.resetState('player');

// Undo/redo
stateManager.undo();
stateManager.redo();
```

### Utility Methods

#### `getStats()`

Gets comprehensive statistics about the state manager.

**Returns:** `Object` - Statistics including:
- `totalUpdates`: Number of state updates
- `totalGets`: Number of state reads
- `validationErrors`: Number of validation errors
- `historyOperations`: Number of history operations
- `averageUpdateTime`: Average update time in milliseconds
- `lastUpdateTime`: Last update time in milliseconds
- `historySize`: Number of history entries
- `historyIndex`: Current history index
- `subscriptionCount`: Number of active subscriptions
- `memoryUsage`: Memory usage information

#### `enableDebugMode()` / `disableDebugMode()`

Enables/disables debug mode with enhanced logging.

#### `clearAll()`

Clears all state and resets to defaults.

## Configuration Options

When creating a StateManager instance, you can configure its behavior:

```javascript
const stateManager = new StateManager({
    maxHistorySize: 100,        // Maximum history entries
    enableHistory: true,        // Enable undo/redo functionality
    enableValidation: true,     // Enable state validation
    enableEvents: true,         // Enable event emission
    enableDebug: false,         // Enable debug logging
    immutable: true            // Use immutable updates
});
```

## State Schema and Validation

The state manager uses a schema-based validation system. Define your state structure:

```javascript
// In state-schema.js
export const STATE_SCHEMA = {
    player: {
        health: { type: 'number', min: 0, max: 100 },
        position: {
            x: { type: 'number' },
            y: { type: 'number' }
        },
        inventory: { type: 'array', items: { type: 'string' } }
    },
    game: {
        score: { type: 'number', min: 0 },
        level: { type: 'number', min: 1 },
        status: { type: 'string', enum: ['playing', 'paused', 'game_over'] }
    }
};
```

## Event System Integration

The state manager integrates with the EventDispatcher system:

```javascript
// Listen to state events
eventDispatcher.on('state:change', (event) => {
    console.log(`State changed: ${event.path} = ${event.newValue}`);
});

// Batch updates
eventDispatcher.on('state:batch-update', (event) => {
    console.log('Batch update:', event.changes);
});

// Async operations
eventDispatcher.on('state:async-error', (event) => {
    console.error('Async state error:', event.error);
});
```

## Performance Considerations

### Memory Management

The state manager includes built-in memory management:

- **Automatic cleanup**: Removes unused subscriptions and history entries
- **Memory caching**: Caches memory usage calculations
- **Efficient updates**: Uses O(1) operations for subscriptions

### Optimization Tips

1. **Use batch updates** for multiple related changes
2. **Skip history** for temporary/UI state changes
3. **Use subscription options** wisely (immediate, deep)
4. **Validate schemas** during development, consider disabling in production
5. **Monitor memory usage** with `getStats()`

## Common Patterns

### Loading States

```javascript
// Pattern for async operations
async function loadPlayerData() {
    try {
        await stateManager.setStateAsync('player.data',
            fetch('/api/player').then(res => res.json()),
            {
                loadingPath: 'ui.loading.player',
                errorPath: 'ui.error.player'
            }
        );
    } catch (error) {
        console.error('Failed to load player data:', error);
    }
}
```

### Form State Management

```javascript
// Managing form state
const formState = {
    values: {},
    errors: {},
    touched: {}
};

// Update form field
function updateField(field, value) {
    stateManager.batchUpdate([
        { path: `form.values.${field}`, value },
        { path: `form.touched.${field}`, value: true },
        { path: `form.errors.${field}`, value: null }
    ]);
}
```

### Game State Patterns

```javascript
// Player damage with multiple effects
function damagePlayer(amount) {
    stateManager.transaction((state) => {
        const currentHealth = state.getState('player.health');
        const newHealth = Math.max(0, currentHealth - amount);
        
        state.setState('player.health', newHealth);
        
        if (newHealth <= 0) {
            state.setState('player.alive', false);
            state.setState('game.status', 'game_over');
        } else if (newHealth < 25) {
            state.setState('player.status', 'critical');
        }
    });
}
```

## Debugging

### Debug Mode

```javascript
// Enable debug mode
stateManager.enableDebugMode();

// Now all state changes are logged
stateManager.setState('player.health', 50);
// Console: "✅ StateManager: setState('player.health') {oldValue: 100, newValue: 50}"

// Access in browser console
window.stateManager.getState(); // Full state
window.stateManager.getStats(); // Statistics
```

### Common Issues

1. **Path not found**: Check dot-notation syntax and state schema
2. **Validation errors**: Ensure values match schema requirements
3. **Memory leaks**: Always unsubscribe from subscriptions
4. **Performance**: Use batch updates and avoid excessive nesting

## Testing

The state manager includes comprehensive test coverage. Run tests with:

```bash
npm test
```

Key test patterns:
- State updates and immutability
- Subscription management
- History operations
- Async operations
- Error handling
- Performance benchmarks

---

*This documentation covers the complete public API of the State Management System. For implementation details, see the source code in `src/systems/StateManager.js`.*
