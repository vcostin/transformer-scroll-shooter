# 🔧 State Management API Reference

## Quick Reference

### Core Methods

```javascript
// Get state
const value = stateManager.getState(path, options);

// Set state  
const changed = stateManager.setState(path, value, options);

// Async operations
await stateManager.setStateAsync(path, promise, options);

// Subscribe to changes
const unsubscribe = stateManager.subscribe(path, callback, options);

// Batch updates
const success = stateManager.batchUpdate(updates, options);

// History management
stateManager.undo();
stateManager.redo();
stateManager.canUndo();
stateManager.canRedo();

// Utilities
stateManager.clearAll();
stateManager.resetState(path);
stateManager.getStats();
stateManager.performHealthCheck();
```

---

## Detailed API Documentation

### StateManager.getState(path?, options?)

**Purpose:** Retrieve state value by path

**Parameters:**
- `path` (string, optional): Dot-notation path (e.g., 'player.health')
- `options` (object, optional):
  - `skipStats` (boolean): Skip performance tracking for this call

**Returns:** 
- If path provided: Value at that path or `undefined`
- If no path: Complete state object

**Examples:**
```javascript
// Get entire state
const fullState = stateManager.getState();

// Get specific value
const health = stateManager.getState('player.health'); // 100

// Get nested object
const position = stateManager.getState('player.position'); // { x: 10, y: 20 }

// Skip performance tracking
const fastGet = stateManager.getState('player.score', { skipStats: true });
```

**Edge Cases:**
```javascript
// Non-existent paths return undefined
const missing = stateManager.getState('nonexistent.path'); // undefined

// Empty string returns full state
const all = stateManager.getState(''); // Complete state object
```

---

### StateManager.setState(path, value, options?)

**Purpose:** Set state value with immutable updates and change notifications

**Parameters:**
- `path` (string): Dot-notation path to set
- `value` (any): New value to assign
- `options` (object, optional):
  - `merge` (boolean): Merge objects instead of replacing
  - `skipValidation` (boolean): Skip data validation
  - `skipEvents` (boolean): Don't emit change events
  - `skipHistory` (boolean): Don't add to undo history
  - `skipStats` (boolean): Skip performance tracking for this call

**Returns:** 
- `boolean`: true if state actually changed, false if value was the same

**Examples:**
```javascript
// Basic update
stateManager.setState('player.health', 85); // true

// Merge objects
stateManager.setState('player', { score: 1000 }, { merge: true });
// Preserves other player properties, only updates score

// Skip validation for debugging
stateManager.setState('debug.info', anyValue, { skipValidation: true });

// Silent update (no events)
stateManager.setState('internal.flag', true, { skipEvents: true });

// Don't track in history
stateManager.setState('ui.mousePos', { x, y }, { skipHistory: true });
```

**Immutable updates and structural sharing**

- Updates use a path-copy strategy: shallow copy only the objects along the changed path; unrelated branches keep their references.
- This preserves immutability with lower overhead than cloning the entire state.
- If the new value is effectively equal to the current value at the path, the update is skipped and the method returns `false`.

**Merge semantics**

- When `merge: true`, plain objects at the target path are shallow-merged.
- Arrays are replaced by default; build the new array before calling `setState`.

**Path Creation:**
```javascript
// Automatically creates nested paths
stateManager.setState('new.nested.deeply.buried.value', 42);
// Creates: { new: { nested: { deeply: { buried: { value: 42 } } } } }
```

**Array Handling:**
```javascript
// Set entire array
stateManager.setState('enemies', [enemy1, enemy2]);

// Set array element
stateManager.setState('enemies.0.health', 50);

// Add to array (if parent is array)
const enemies = stateManager.getState('enemies') || [];
stateManager.setState('enemies', [...enemies, newEnemy]);
```

---

### StateManager.setStateAsync(path, valueOrPromise, options?)

**Purpose:** Handle asynchronous state updates with loading states and error handling

**Parameters:**
- `path` (string): Target path for the resolved value
- `valueOrPromise` (any|Promise): Value or Promise that resolves to value
- `options` (object, optional):
  - `loadingPath` (string): Path to set loading indicator
  - `errorPath` (string): Path to store any errors
  - `timeout` (number): Timeout in milliseconds
  - `retryAttempts` (number): Number of retry attempts
  - `retryDelay` (number): Delay between retries in ms
  - `retryBackoff` (number): Backoff multiplier for retry delay

**Returns:** 
- `Promise<boolean>`: Resolves to true if state changed

**Examples:**
```javascript
// Basic async operation
await stateManager.setStateAsync('player.profile', fetchUserProfile());

// With loading indicator
await stateManager.setStateAsync('game.config', fetchConfig(), {
  loadingPath: 'ui.loadingConfig',
  errorPath: 'ui.configError'
});

// With timeout and retries
await stateManager.setStateAsync('highscores', fetchHighscores(), {
  timeout: 5000,           // 5 second timeout
  retryAttempts: 3,        // Retry 3 times
  retryDelay: 1000,        // Wait 1 second between retries
  retryBackoff: 2,         // Double delay each retry (1s, 2s, 4s)
  loadingPath: 'ui.loadingScores',
  errorPath: 'ui.scoresError'
});

// Handle the result
try {
  const changed = await stateManager.setStateAsync('data', promise);
  console.log('Data updated:', changed);
} catch (error) {
  console.error('Update failed:', error);
  // Error is also stored in errorPath if specified
}
```

**Loading State Management:**
```javascript
// The loading path is automatically managed:
// 1. Set to true when operation starts
// 2. Set to false when operation completes (success or error)

// Monitor loading state
stateManager.subscribe('ui.loadingConfig', (isLoading) => {
  document.getElementById('spinner').style.display = isLoading ? 'block' : 'none';
});

// Monitor errors
stateManager.subscribe('ui.configError', (error) => {
  if (error) {
    showErrorMessage(error.message);
  }
});
```

**Operation Management:**
```javascript
// Get active operations
const activeOps = stateManager.getActiveAsyncOperations();
console.log('Active operations:', activeOps.length);

// Cancel specific operation (by operation ID)
const cancelled = stateManager.cancelAsyncOperation('operation-id-123');

// Cancel all operations
const cancelledCount = stateManager.cancelAllAsyncOperations();
```

---

### StateManager.subscribe(path, callback, options?)

**Purpose:** Listen for state changes at a specific path

**Parameters:**
- `path` (string): Path to watch for changes
- `callback` (function): Called when value changes
  - Signature: `(newValue, oldValue, path) => void`
- `options` (object, optional):
  - `immediate` (boolean): Call callback immediately with current value
  - `deep` (boolean): Watch for changes in nested properties

**Returns:**
- `function`: Unsubscribe function to stop listening

**Examples:**
```javascript
// Basic subscription
const unsubscribe = stateManager.subscribe('player.health', (newHealth, oldHealth) => {
  console.log(`Health changed from ${oldHealth} to ${newHealth}`);
  updateHealthBar(newHealth);
});

// Call immediately with current value
stateManager.subscribe('ui.theme', (theme) => {
  applyTheme(theme);
}, { immediate: true });

// Deep watching for nested changes
stateManager.subscribe('player.inventory', (newInventory, oldInventory) => {
  updateInventoryUI(newInventory);
}, { deep: true });

// Unsubscribe when done
unsubscribe();
```

**Advanced Subscription Patterns:**
```javascript
// Watch entire object
stateManager.subscribe('player', (newPlayer, oldPlayer) => {
  // Called when any player property changes
  updatePlayerDisplay(newPlayer);
});

// Watch array changes
stateManager.subscribe('enemies', (newEnemies, oldEnemies) => {
  // Called when enemy array changes
  rerenderEnemies(newEnemies);
});

// Multiple subscriptions with cleanup
class GameUI {
  constructor() {
    this.subscriptions = [
      stateManager.subscribe('player.health', this.updateHealth),
      stateManager.subscribe('player.score', this.updateScore),
      stateManager.subscribe('game.paused', this.togglePause)
    ];
  }
  
  destroy() {
    this.subscriptions.forEach(unsub => unsub());
  }
  
  updateHealth = (health) => { /* ... */ }
  updateScore = (score) => { /* ... */ }
  togglePause = (paused) => { /* ... */ }
}
```

---

### StateManager.batchUpdate(updates, options?)

**Purpose:** Apply multiple state changes atomically

**Parameters:**
- `updates` (array): Array of update objects
  - Each object: `{ path: string, value: any, options?: object }`
- `options` (object, optional):
  - `atomic` (boolean): All updates succeed or all fail
  - `skipEvents` (boolean): Don't emit events during batch
  - `skipHistory` (boolean): Don't add to history
  - `skipStats` (boolean): Skip performance tracking for this batch

**Returns:**
- `boolean`: true if all updates succeeded

**Examples:**
```javascript
// Basic batch update
const success = stateManager.batchUpdate([
  { path: 'player.health', value: 75 },
  { path: 'player.score', value: 2000 },
  { path: 'enemies', value: [] }
]);

// Atomic batch (all or nothing)
const success = stateManager.batchUpdate([
  { path: 'player.x', value: newX },
  { path: 'player.y', value: newY },
  { path: 'player.facing', value: direction }
], { atomic: true });

// Per-update options
stateManager.batchUpdate([
  { path: 'debug.flag', value: true, options: { skipValidation: true } },
  { path: 'ui.temp', value: data, options: { skipHistory: true } }
]);

// Silent batch update (no events until end)
stateManager.batchUpdate(manyUpdates, { skipEvents: true });
```

**Performance Benefits:**
```javascript
// ❌ Slow: Individual updates
entities.forEach(entity => {
  stateManager.setState(`entities.${entity.id}.x`, entity.x);
  stateManager.setState(`entities.${entity.id}.y`, entity.y);
});

// ✅ Fast: Batch update
const updates = entities.flatMap(entity => [
  { path: `entities.${entity.id}.x`, value: entity.x },
  { path: `entities.${entity.id}.y`, value: entity.y }
]);
stateManager.batchUpdate(updates);
```

---

### History Management

#### stateManager.undo()

**Purpose:** Revert to previous state

**Returns:** `boolean` - true if undo was performed

```javascript
// Simple undo
const undid = stateManager.undo();
if (undid) {
  console.log('Action undone');
} else {
  console.log('Nothing to undo');
}
```

#### stateManager.redo()

**Purpose:** Re-apply previously undone change

**Returns:** `boolean` - true if redo was performed

```javascript
const redid = stateManager.redo();
if (redid) {
  console.log('Action redone');
}
```

#### stateManager.canUndo() / stateManager.canRedo()

**Purpose:** Check if undo/redo operations are available

**Returns:** `boolean`

```javascript
// Update UI buttons
function updateUndoRedoButtons() {
  document.getElementById('undo').disabled = !stateManager.canUndo();
  document.getElementById('redo').disabled = !stateManager.canRedo();
}

// Listen for any state change to update buttons
stateManager.subscribe('', updateUndoRedoButtons);
```

#### stateManager.resetState(path?)

**Purpose:** Reset to initial state

**Parameters:**
- `path` (string, optional): Path to reset, or entire state if omitted

```javascript
// Reset entire state
stateManager.resetState();

// Reset specific path
stateManager.resetState('player.health');

// Reset game state but keep UI settings
stateManager.resetState('game');
```

---

### Utility Methods

#### stateManager.getStats()

**Purpose:** Get performance and usage statistics

**Returns:** Object with performance metrics

```javascript
const stats = stateManager.getStats();
console.log(stats);

/* Example output:
{
  totalUpdates: 1547,           // Total setState calls
  totalGets: 3421,              // Total getState calls
  averageUpdateTime: 0.8,       // Average update time in ms
  averageGetTime: 0.1,          // Average get time in ms
  memoryUsage: 2048576,         // Estimated memory usage in bytes
  historySize: 25,              // Number of history entries
  subscriptionCount: 12,        // Active subscriptions
  asyncOperationsActive: 2,     // Currently running async ops
  asyncOperationsCompleted: 18, // Total completed async ops
  asyncOperationsFailed: 1,     // Total failed async ops
  moduleErrors: {               // Errors per module
    StateValidation: [],
    StateAsync: ['Timeout error'],
    // ... other modules
  },
  totalModuleErrors: 1,         // Total module errors
  moduleHealthy: true           // Overall module health
}
*/
```

**Performance Monitoring:**
```javascript
// Set up performance monitoring
setInterval(() => {
  const stats = stateManager.getStats();
  
  // Check for performance issues
  if (stats.averageUpdateTime > 5) {
    console.warn('Slow state updates detected:', stats.averageUpdateTime + 'ms');
  }
  
  // Check memory usage
  if (stats.memoryUsage > 50 * 1024 * 1024) { // 50MB
    console.warn('High memory usage:', stats.memoryUsage);
  }
  
  // Check for errors
  if (stats.totalModuleErrors > 0) {
    console.error('Module errors detected:', stats.moduleErrors);
  }
}, 10000); // Check every 10 seconds
```

#### stateManager.performHealthCheck()

**Purpose:** Check system health and detect issues

**Returns:** Health report object

```javascript
const health = stateManager.performHealthCheck();
console.log(health);

/* Example output:
{
  healthy: true,
  modules: {
    StateUtils: { healthy: true, errors: [] },
    StateValidation: { healthy: true, errors: [] },
    StateSubscriptions: { healthy: true, errors: [] },
    StateHistory: { healthy: true, errors: [] },
    StatePerformance: { healthy: true, errors: [] },
    StateAsync: { healthy: false, errors: ['Connection timeout'] }
  },
  issues: [],
  recommendations: []
}
*/

// Use in error handling
if (!health.healthy) {
  console.error('State manager has issues:', health.issues);
  
  // Show user-friendly error
  stateManager.setState('ui.systemError', {
    message: 'System issues detected',
    details: health.issues.join(', ')
  });
}
```

#### stateManager.clearAll()

**Purpose:** Clear all state and reset to defaults

```javascript
// Clear everything and start fresh
stateManager.clearAll();

// Equivalent to:
// - Clear all state
// - Clear history
// - Clear subscriptions (but don't unsubscribe)
// - Reset performance stats
// - Cancel async operations
```

#### Debug Methods

```javascript
// Enable/disable debug mode
stateManager.enableDebugMode();   // Logs all operations
stateManager.disableDebugMode();  // Stop logging

// Check if debug mode is enabled
const isDebug = stateManager.isDebugMode();
```

---

## Event System Integration

The state manager integrates with the global event system to provide additional functionality:

### Event Types

```javascript
import { eventDispatcher } from '@/systems/EventDispatcher.js';

// Listen for all state changes
eventDispatcher.on('state:change', ({ path, newValue, oldValue, timestamp }) => {
  console.log(`State changed at ${path}:`, oldValue, '->', newValue);
});

// Listen for specific path changes
eventDispatcher.on('state:change:player.health', ({ newValue, oldValue }) => {
  if (newValue < oldValue) {
    playDamageSound();
  }
});

// Listen for async operation events
eventDispatcher.on('state:asyncStart', ({ path, operationId }) => {
  console.log(`Async operation started for ${path}`);
});

eventDispatcher.on('state:asyncSuccess', ({ path, value, operationId }) => {
  console.log(`Async operation completed successfully for ${path}`);
});

eventDispatcher.on('state:asyncError', ({ path, error, operationId }) => {
  console.error(`Async operation failed for ${path}:`, error);
});

// Listen for batch operations
eventDispatcher.on('state:batchStart', ({ updateCount }) => {
  console.log(`Batch update starting with ${updateCount} changes`);
});

eventDispatcher.on('state:batchComplete', ({ updateCount, successCount }) => {
  console.log(`Batch complete: ${successCount}/${updateCount} succeeded`);
});

// Listen for history events
eventDispatcher.on('state:undo', ({ stateBefore, stateAfter }) => {
  console.log('Undo performed');
});

eventDispatcher.on('state:redo', ({ stateBefore, stateAfter }) => {
  console.log('Redo performed');
});
```

---

## Type Definitions

For TypeScript users or documentation purposes:

```typescript
interface StateManagerOptions {
  enableHistory?: boolean;
  maxHistorySize?: number;
  enablePerformanceTracking?: boolean;
  enableMemoryTracking?: boolean;
  enableDebugMode?: boolean;
}

interface SetStateOptions {
  merge?: boolean;
  skipValidation?: boolean;
  skipEvents?: boolean;
  skipHistory?: boolean;
  skipStats?: boolean;
}

interface SetStateAsyncOptions extends SetStateOptions {
  loadingPath?: string;
  errorPath?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  retryBackoff?: number;
}

interface SubscribeOptions {
  immediate?: boolean;
  deep?: boolean;
}

interface BatchUpdateOptions {
  atomic?: boolean;
  skipEvents?: boolean;
  skipHistory?: boolean;
  skipStats?: boolean;
}

interface UpdateOperation {
  path: string;
  value: any;
  options?: SetStateOptions;
}

interface PerformanceStats {
  totalUpdates: number;
  totalGets: number;
  averageUpdateTime: number;
  averageGetTime: number;
  memoryUsage: number;
  historySize: number;
  subscriptionCount: number;
  asyncOperationsActive: number;
  asyncOperationsCompleted: number;
  asyncOperationsFailed: number;
  moduleErrors: Record<string, any[]>;
  totalModuleErrors: number;
  moduleHealthy: boolean;
}

interface HealthReport {
  healthy: boolean;
  modules: Record<string, { healthy: boolean; errors: any[] }>;
  issues: string[];
  recommendations: string[];
}

type StateChangeCallback = (newValue: any, oldValue: any, path: string) => void;
type UnsubscribeFunction = () => void;
```

---

This API reference provides complete documentation for all available methods and options in the state management system. For practical examples and usage patterns, refer to the main State Management Guide.
