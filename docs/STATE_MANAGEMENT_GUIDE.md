# 🎯 State Management Guide

## Table of Contents

1. [What is State Management?](#what-is-state-management)
2. [Why We Need State Management](#why-we-need-state-management)
3. [Inspiration and Design Philosophy](#inspiration-and-design-philosophy)
4. [Architecture Overview](#architecture-overview)
5. [Getting Started](#getting-started)
6. [Core API Reference](#core-api-reference)
7. [Advanced Features](#advanced-features)
8. [Best Practices](#best-practices)
9. [Examples and Use Cases](#examples-and-use-cases)
10. [Performance Considerations](#performance-considerations)
11. [Troubleshooting](#troubleshooting)

---

## What is State Management?

**State management** is the practice of handling data that changes over time in an application. In the context of our game, state represents all the dynamic information that defines the current condition of the game world.

### Examples of Game State:
```javascript
{
  player: {
    position: { x: 100, y: 200 },
    health: 75,
    score: 1500,
    weapon: 'laser',
    lives: 3
  },
  enemies: [
    { id: 1, type: 'basic', x: 300, y: 150, health: 50 },
    { id: 2, type: 'boss', x: 400, y: 100, health: 200 }
  ],
  game: {
    level: 3,
    paused: false,
    gameOver: false,
    difficulty: 'medium'
  },
  ui: {
    showHUD: true,
    menuOpen: false,
    volume: 0.8
  }
}
```

---

## Why We Need State Management

### Problems Without Centralized State Management:

1. **Data Scattered Everywhere**: Different parts of the code store their own copies of data
2. **Synchronization Issues**: Player health might be 75 in one place and 80 in another
3. **Hard to Debug**: When something goes wrong, you don't know where the state changed
4. **Difficult Testing**: No single source of truth to verify against
5. **Performance Issues**: Unnecessary re-renders and computations
6. **Race Conditions**: Async operations can interfere with each other

### Benefits of Our State Management System:

✅ **Single Source of Truth**: All game state lives in one place  
✅ **Predictable Updates**: State changes follow consistent patterns  
✅ **Time Travel Debugging**: Undo/redo functionality for debugging  
✅ **Performance Optimized**: Efficient updates and memory management  
✅ **Event-Driven**: Reactive updates when state changes  
✅ **Type Safe**: Validation ensures data integrity  
✅ **Async Support**: Built-in loading states and error handling  
✅ **Developer Tools**: Rich debugging and monitoring capabilities  

### 🚀 **Recent Enhancements (Latest Version)**

Our StateManager has been enhanced with enterprise-grade features inspired by functional programming:

🎯 **Enhanced StateUtils**: Added **`pathOr`** and **`safeResolveReference`** functions inspired by Ramda for safer property access  
⚡ **10x Faster Memory Tracking**: Custom MemoryMonitor replaces JSON.stringify with intelligent sampling and throttling  
🔄 **Robust Async Operations**: Enhanced retry logic with promise factory pattern for reliable network operations  
🆔 **Collision-Resistant IDs**: Crypto-based ID generation with zero collisions in high-frequency scenarios  
🛡️ **Production Ready**: 974/974 tests passing with comprehensive edge case coverage  

All enhancements maintain **100% backward compatibility** while providing significant performance and reliability improvements.  

---

## Inspiration and Design Philosophy

Our state management system draws inspiration from several proven patterns:

### 🔥 **Redux/Flux Pattern**
- **Single source of truth**: One state tree for the entire application
- **Immutable updates**: State is never mutated directly
- **Predictable state changes**: Actions describe what happened

### 🎯 **MobX Reactivity**
- **Automatic subscriptions**: Components automatically re-render when relevant state changes
- **Efficient updates**: Only affected parts of the UI update

### ⚡ **Modern React Patterns**
- **Hooks-like API**: Simple, intuitive methods for state access
- **Context-like subscriptions**: Subscribe to specific parts of state

### 🏗️ **Modular Architecture**
- **Separation of concerns**: Each module handles one responsibility
- **Composable**: Modules can be used independently or together
- **Testable**: Each module is independently testable

### 🎮 **Game-Specific Features**
- **Performance first**: Optimized for 60fps game loops
- **Async operations**: Built-in support for loading states
- **Debugging tools**: Time travel debugging and state inspection

---

## Architecture Overview

Our state management system is built with a **modular architecture** consisting of 6 specialized modules:

```
StateManager (Main Controller)
├── StateUtils (Utility functions)
├── StateValidation (Data validation)
├── StateSubscriptions (Event subscriptions)
├── StateHistory (Undo/redo functionality)
├── StatePerformance (Performance tracking)
└── StateAsync (Async operations)
```

### Module Responsibilities:

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **StateManager** | Main controller and public API | State access, updates, coordination |
| **StateUtils** | Enhanced utility functions | **pathOr**, **safeResolveReference**, path resolution, deep cloning |
| **StateValidation** | Data integrity | Type checking, schema validation, safe reference resolution |
| **StateSubscriptions** | Observer pattern | Change notifications, collision-resistant IDs |
| **StateHistory** | Time travel | Undo/redo, state versioning |
| **StatePerformance** | Enhanced monitoring | **10x faster memory tracking**, performance metrics, MemoryMonitor |
| **StateAsync** | Robust async operations | Loading states, **enhanced retry logic**, error handling |

---

## Getting Started

### 1. Basic Setup

```javascript
import { stateManager } from '@/systems/StateManager.js';

// The state manager is ready to use immediately
console.log('Current state:', stateManager.getState());
```

### 2. Reading State

```javascript
// Get entire state
const fullState = stateManager.getState();

// Get specific property
const playerHealth = stateManager.getState('player.health');

// Get nested object
const playerPosition = stateManager.getState('player.position');
// Returns: { x: 100, y: 200 }
```

### 3. Updating State

```javascript
// Simple update
stateManager.setState('player.health', 85);

// Nested update
stateManager.setState('player.position.x', 150);

// Object update
stateManager.setState('player.position', { x: 200, y: 250 });

// Merge objects (preserves other properties)
stateManager.setState('player', { health: 90 }, { merge: true });

// Skip performance tracking for ultra-hot paths
stateManager.setState('player.position', { x: 200, y: 250 }, { skipStats: true });
```

### 4. Subscribing to Changes

```javascript
// Subscribe to specific property
const unsubscribe = stateManager.subscribe('player.health', (newHealth) => {
  console.log('Player health changed to:', newHealth);
});

// Subscribe to nested objects
stateManager.subscribe('player.position', (newPosition, oldPosition) => {
  console.log('Player moved from', oldPosition, 'to', newPosition);
});

// Unsubscribe when done
unsubscribe();
```

---

## Core API Reference

### StateManager

#### `getState(path?, options?)`

Get state value by path.

```javascript
// Get entire state
const state = stateManager.getState();

// Get specific property
const health = stateManager.getState('player.health');

// Get with options
const healthNoStats = stateManager.getState('player.health', { skipStats: true });
```

**Parameters:**
- `path` (string, optional): Dot-notation path to property
- `options` (object, optional): `{ skipStats: boolean }`

**Returns:** State value or undefined

#### `setState(path, value, options?)`

Set state value by path with immutable updates.

```javascript
// Basic update
stateManager.setState('player.health', 100);

// With options
stateManager.setState('player.stats', { kills: 10 }, { 
  merge: true,           // Merge with existing object
  skipValidation: false, // Validate the update
  skipEvents: false,     // Emit change events
  skipHistory: false     // Add to undo history
});
```

**Parameters:**
- `path` (string): Dot-notation path to property
- `value` (any): New value to set
- `options` (object, optional): Update options

**Returns:** boolean - true if state changed

#### `setStateAsync(path, valueOrPromise, options?)`

Set state asynchronously with loading and error states.

```javascript
// With Promise
const savePromise = api.savePlayerData(playerData);
await stateManager.setStateAsync('player.data', savePromise, {
  loadingPath: 'ui.saving',  // Show loading indicator
  errorPath: 'ui.saveError'  // Store any errors
});

// With timeout and retry
await stateManager.setStateAsync('game.config', fetchConfig(), {
  timeout: 5000,      // 5 second timeout
  retryAttempts: 3,   // Retry 3 times
  retryDelay: 1000    // Wait 1 second between retries
});
```

#### `subscribe(path, callback, options?)`

Subscribe to state changes at a specific path.

```javascript
// Basic subscription
const unsubscribe = stateManager.subscribe('player.health', (newHealth, oldHealth) => {
  updateHealthBar(newHealth);
});

// With immediate callback and deep watching
const unsubscribe = stateManager.subscribe('player', (newPlayer, oldPlayer) => {
  updatePlayerDisplay(newPlayer);
}, {
  immediate: true,  // Call immediately with current value
  deep: true       // Watch nested changes
});
```

**Parameters:**
- `path` (string): Dot-notation path to watch
- `callback` (function): Called when value changes
- `options` (object, optional): `{ immediate: boolean, deep: boolean }`

**Returns:** function - unsubscribe function

**Note:** The StateManager now uses **collision-resistant ID generation** for subscriptions, ensuring zero collisions even in high-frequency scenarios (tested with 10,000+ rapid subscriptions). IDs are generated using crypto.randomUUID() when available, with intelligent fallbacks for maximum compatibility.

#### `batchUpdate(updates, options?)`

Apply multiple state updates atomically.

```javascript
// Batch multiple updates
const success = stateManager.batchUpdate([
  { path: 'player.health', value: 75 },
  { path: 'player.score', value: 2000 },
  { path: 'enemies', value: [] }
], {
  skipEvents: false,  // Emit events for each change
  atomic: true       // All succeed or all fail
});
```

#### History Methods

```javascript
// Undo last change
const success = stateManager.undo();

// Redo last undone change
const success = stateManager.redo();

// Check if undo/redo is possible
const canUndo = stateManager.canUndo();
const canRedo = stateManager.canRedo();

// Reset to initial state
stateManager.resetState();
// Reset specific path
stateManager.resetState('player.health');
```

#### Utility Methods

```javascript
// Get performance statistics
const stats = stateManager.getStats();
console.log(stats);
/* Returns:
{
  totalUpdates: 150,
  totalGets: 500,
  averageUpdateTime: 0.2,
  memoryUsage: 1024,
  historySize: 25,
  subscriptionCount: 8,
  moduleErrors: { ... },
  totalModuleErrors: 0
}
*/

// Clear all state and reset to defaults
stateManager.clearAll();

// Debug mode
stateManager.enableDebugMode();   // Enables detailed logging
stateManager.disableDebugMode();  // Disables logging

// Health check
const health = stateManager.performHealthCheck();
console.log('System healthy:', health.healthy);
```

#### Async Operation Management

```javascript
// Get active async operations
const activeOps = stateManager.getActiveAsyncOperations();

// Cancel specific operation
const cancelled = stateManager.cancelAsyncOperation('operation-id');

// Cancel all operations
const cancelledCount = stateManager.cancelAllAsyncOperations();
```

---

## Enhanced StateUtils

The StateManager now includes enhanced utility functions inspired by functional programming libraries like Ramda, providing safer and more convenient ways to work with state data.

### `pathOr(defaultValue, path, obj)`

Safe path access with fallback value - Ramda-style functional approach.

```javascript
import { pathOr } from '@/systems/StateUtils.js';

// Safe property access with fallback
const playerHealth = pathOr(100, 'player.health', state);
// Returns 100 if player.health doesn't exist

const weaponDamage = pathOr(10, 'player.weapon.damage', state);
// Returns 10 if the nested path doesn't exist

// Works with any default value type
const playerItems = pathOr([], 'player.inventory.items', state);
const playerConfig = pathOr({ level: 1 }, 'player.config', state);
```

### `safeResolveReference(reference, path, state, fallback, expectNumeric)`

Enhanced reference resolution for validation rules with safe numeric conversion.

```javascript
import { safeResolveReference } from '@/systems/StateUtils.js';

// Safely resolve validation references
const minHealth = safeResolveReference('$player.minHealth', 'player.health', state, 0, true);
if (minHealth !== null && playerHealth < minHealth) {
  throw new Error(`Health must be >= ${minHealth}`);
}

// Handle missing references gracefully
const maxScore = safeResolveReference('$game.maxScore', 'player.score', state, null, true);
// Returns null if reference doesn't exist, preventing undefined comparisons

// Non-numeric references work too
const weaponType = safeResolveReference('$player.defaultWeapon', 'player.weapon', state, 'basic');
```

### Benefits of Enhanced StateUtils

- **Prevents runtime errors** from undefined property access
- **Functional programming style** for cleaner, more predictable code  
- **Safe numeric conversions** for validation scenarios
- **Comprehensive fallback handling** for missing references
- **Zero breaking changes** - fully backward compatible

### Migration from Direct Property Access

```javascript
// Before (unsafe):
const health = state.player && state.player.health ? state.player.health : 100;
if (state.validation && state.validation.minHealth && health < state.validation.minHealth) {
  // validation logic
}

// After (safe and clean):
const health = pathOr(100, 'player.health', state);
const minHealth = safeResolveReference('$validation.minHealth', 'player.health', state, null, true);
if (minHealth !== null && health < minHealth) {
  // validation logic
}
```

---

## Advanced Features

### 1. State Validation

The system automatically validates state updates against a schema:

```javascript
// This will throw an error if player.health is not a number
stateManager.setState('player.health', 'invalid'); // ❌ Error

// Valid updates
stateManager.setState('player.health', 85);        // ✅ Success

// Skip validation if needed
stateManager.setState('player.health', 'debug', { skipValidation: true });
```

### 2. Loading States and Error Handling

```javascript
// Async operation with automatic loading states
async function loadPlayerData() {
  try {
    await stateManager.setStateAsync('player.profile', fetchProfile(), {
      loadingPath: 'ui.loadingProfile',
      errorPath: 'ui.profileError',
      timeout: 10000
    });
  } catch (error) {
    console.log('Load failed:', error);
    // Error is automatically stored in 'ui.profileError'
  }
}

// Check loading state in UI
stateManager.subscribe('ui.loadingProfile', (isLoading) => {
  toggleLoadingSpinner(isLoading);
});

// Handle errors in UI
stateManager.subscribe('ui.profileError', (error) => {
  if (error) {
    showErrorMessage(error.message);
  }
});
```

### 2.1. Enhanced Retry Logic

The StateManager now supports **robust retry mechanisms** with proper promise factory patterns to ensure each retry attempt gets a fresh promise.

```javascript
// Enhanced async operations with retry support
async function saveGameData() {
  try {
    await stateManager.setStateAsync('game.saveData', 
      // Use promise factory for proper retries
      () => api.saveGame(gameData), 
      {
        loadingPath: 'ui.saving',
        errorPath: 'ui.saveError',
        retryAttempts: 3,        // Retry up to 3 times
        retryDelay: 1000,        // Wait 1 second between retries
        timeout: 15000           // 15 second timeout per attempt
      }
    );
    console.log('Game saved successfully!');
  } catch (error) {
    console.log('Save failed after retries:', error);
  }
}

// Or use direct promise (backward compatible)
await stateManager.setStateAsync('player.score', 
  api.submitScore(score), 
  { retryAttempts: 2 }
);

// Benefits of enhanced retry logic:
// ✅ Creates fresh promise for each retry attempt
// ✅ Supports both factory functions and direct promises
// ✅ Configurable delay between retries  
// ✅ Tracks retry statistics and attempts
// ✅ Prevents single-use promise consumption issues
```

### 3. Performance Monitoring

```javascript
// Enable performance tracking
const stateManager = new StateManager({
  enablePerformanceTracking: true,
  enableMemoryTracking: true
});

// Monitor performance
setInterval(() => {
  const stats = stateManager.getStats();
  if (stats.averageUpdateTime > 5) {
    console.warn('State updates are getting slow:', stats.averageUpdateTime + 'ms');
  }
  
  if (stats.memoryUsage > 10 * 1024 * 1024) { // 10MB
    console.warn('State is using too much memory:', stats.memoryUsage);
  }
}, 5000);
```

### 4. Custom State Schema

```javascript
// Define custom validation rules in state-schema.js
export const CUSTOM_SCHEMA = {
  player: {
    health: { type: 'number', min: 0, max: 100 },
    name: { type: 'string', required: true },
    level: { type: 'number', min: 1 },
    equipment: { 
      type: 'object',
      properties: {
        weapon: { type: 'string', enum: ['sword', 'bow', 'staff'] },
        armor: { type: 'string', enum: ['light', 'medium', 'heavy'] }
      }
    }
  }
};
```

### 5. Event-Driven Updates

```javascript
import { eventDispatcher } from '@/systems/EventDispatcher.js';

// Listen for state changes
eventDispatcher.on('state:change', ({ path, newValue, oldValue }) => {
  console.log(`State changed at ${path}:`, oldValue, '->', newValue);
});

// Listen for specific path changes
eventDispatcher.on('state:change:player.health', ({ newValue, oldValue }) => {
  if (newValue < oldValue) {
    playSound('damage');
  }
});

// Listen for async events
eventDispatcher.on('state:asyncSuccess', ({ path, value }) => {
  console.log(`Async operation succeeded for ${path}:`, value);
});

eventDispatcher.on('state:asyncError', ({ path, error }) => {
  console.error(`Async operation failed for ${path}:`, error);
});
```

---

## Best Practices

### 1. Path Naming Conventions

```javascript
// ✅ Good: Use consistent, descriptive paths
'player.health'
'player.position.x'
'enemies.list'
'ui.menu.visible'
'game.settings.difficulty'

// ❌ Avoid: Inconsistent or unclear paths
'playerHp'
'enemy_list'
'menuIsVisible'
'gameDiff'
```

### 2. State Structure Design

```javascript
// ✅ Good: Normalized, flat structure
{
  player: { id: 1, health: 100, position: { x: 0, y: 0 } },
  enemies: { 1: { id: 1, health: 50 }, 2: { id: 2, health: 75 } },
  ui: { showHUD: true, menuOpen: false }
}

// ❌ Avoid: Deeply nested, denormalized structure
{
  gameData: {
    currentLevel: {
      player: {
        stats: {
          combat: {
            health: { current: 100, max: 100 }
          }
        }
      }
    }
  }
}
```

### 3. Subscription Management

```javascript
// ✅ Good: Clean up subscriptions
class PlayerHealthUI {
  constructor() {
    this.unsubscribe = stateManager.subscribe('player.health', this.updateHealth);
  }
  
  destroy() {
    this.unsubscribe(); // Important: prevent memory leaks
  }
  
  updateHealth = (health) => {
    this.healthBar.style.width = `${health}%`;
  }
}

// ✅ Good: Use immediate for initial state
stateManager.subscribe('ui.theme', (theme) => {
  applyTheme(theme);
}, { immediate: true }); // Applies current theme immediately
```

### 4. Async Operations

```javascript
// ✅ Good: Handle loading and error states
async function saveGame() {
  try {
    await stateManager.setStateAsync('game.data', saveToServer(), {
      loadingPath: 'ui.saving',
      errorPath: 'ui.saveError',
      timeout: 30000
    });
    
    // Success feedback
    stateManager.setState('ui.saveSuccess', true);
    setTimeout(() => stateManager.setState('ui.saveSuccess', false), 3000);
    
  } catch (error) {
    console.error('Save failed:', error);
    // Error is automatically stored in ui.saveError
  }
}

// ✅ Good: Batch related updates
stateManager.batchUpdate([
  { path: 'player.health', value: newHealth },
  { path: 'player.lastDamageTime', value: Date.now() },
  { path: 'ui.showDamageEffect', value: true }
]);
```

### 5. Performance Optimization

```javascript
// ✅ Good: Use specific subscriptions
stateManager.subscribe('player.health', updateHealthBar);

// ❌ Avoid: Broad subscriptions that update frequently
stateManager.subscribe('player', updateEntirePlayerUI); // Re-runs for any player change

// ✅ Good: Batch updates in game loop
function gameLoop() {
  const updates = [];
  
  entities.forEach(entity => {
    if (entity.dirty) {
      updates.push({ path: `entities.${entity.id}`, value: entity.data });
    }
  });
  
  if (updates.length > 0) {
    stateManager.batchUpdate(updates);
  }
}

// ✅ Good: Skip stats for high-frequency operations
function updatePlayerPosition(x, y) {
  stateManager.setState('player.position', { x, y }, { skipStats: true });
}
```

---

## Examples and Use Cases

### Example 1: Player Health System

```javascript
// Initialize player with full health
stateManager.setState('player.health', 100);
stateManager.setState('player.maxHealth', 100);

// Subscribe to health changes for UI updates
const unsubscribeHealth = stateManager.subscribe('player.health', (health, oldHealth) => {
  // Update health bar
  const percentage = (health / stateManager.getState('player.maxHealth')) * 100;
  document.getElementById('health-bar').style.width = `${percentage}%`;
  
  // Play damage sound if health decreased
  if (health < oldHealth) {
    playSound('damage');
  }
  
  // Check for game over
  if (health <= 0) {
    stateManager.setState('game.gameOver', true);
  }
});

// Function to apply damage
function takeDamage(amount) {
  const currentHealth = stateManager.getState('player.health');
  const newHealth = Math.max(0, currentHealth - amount);
  stateManager.setState('player.health', newHealth);
}

// Function to heal
function heal(amount) {
  const currentHealth = stateManager.getState('player.health');
  const maxHealth = stateManager.getState('player.maxHealth');
  const newHealth = Math.min(maxHealth, currentHealth + amount);
  stateManager.setState('player.health', newHealth);
}
```

### Example 2: Enemy Management

```javascript
// Initialize empty enemy list
stateManager.setState('enemies', {});
stateManager.setState('enemyCount', 0);

// Function to spawn enemy
function spawnEnemy(type, x, y) {
  const id = Date.now(); // Simple ID generation
  const enemy = {
    id,
    type,
    position: { x, y },
    health: getEnemyHealth(type),
    maxHealth: getEnemyHealth(type)
  };
  
  // Add enemy to state
  stateManager.setState(`enemies.${id}`, enemy);
  
  // Update count
  const currentCount = stateManager.getState('enemyCount');
  stateManager.setState('enemyCount', currentCount + 1);
}

// Function to remove enemy
function removeEnemy(enemyId) {
  const enemies = stateManager.getState('enemies');
  const newEnemies = { ...enemies };
  delete newEnemies[enemyId];
  
  stateManager.batchUpdate([
    { path: 'enemies', value: newEnemies },
    { path: 'enemyCount', value: Object.keys(newEnemies).length }
  ]);
}

// Subscribe to enemy count for wave management
stateManager.subscribe('enemyCount', (count) => {
  if (count === 0) {
    // Wave completed
    stateManager.setState('game.waveCompleted', true);
    setTimeout(spawnNextWave, 2000);
  }
});
```

### Example 3: Game Settings with Persistence

```javascript
// Load settings from localStorage on startup
async function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      stateManager.setState('settings', settings, { merge: true });
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
}

// Save settings to localStorage when they change
stateManager.subscribe('settings', (newSettings) => {
  try {
    localStorage.setItem('gameSettings', JSON.stringify(newSettings));
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
});

// Settings API
const settings = {
  setVolume(volume) {
    stateManager.setState('settings.audio.volume', volume);
  },
  
  setDifficulty(difficulty) {
    stateManager.setState('settings.game.difficulty', difficulty);
  },
  
  toggleFullscreen() {
    const current = stateManager.getState('settings.display.fullscreen');
    stateManager.setState('settings.display.fullscreen', !current);
  },
  
  getVolume() {
    return stateManager.getState('settings.audio.volume') || 1.0;
  }
};

// Initialize settings
loadSettings();
```

### Example 4: Async Data Loading

```javascript
// Loading game data with proper loading states
async function loadGameData() {
  // Show loading screen
  stateManager.setState('ui.loading', true);
  stateManager.setState('ui.loadingText', 'Loading game data...');
  
  try {
    // Load player data
    stateManager.setState('ui.loadingText', 'Loading player...');
    await stateManager.setStateAsync('player', fetchPlayerData(), {
      timeout: 10000,
      retryAttempts: 3
    });
    
    // Load level data
    stateManager.setState('ui.loadingText', 'Loading level...');
    await stateManager.setStateAsync('level', fetchLevelData(), {
      timeout: 15000
    });
    
    // Load assets
    stateManager.setState('ui.loadingText', 'Loading assets...');
    await stateManager.setStateAsync('assets', loadAssets(), {
      timeout: 30000
    });
    
    // All loaded successfully
    stateManager.setState('ui.loading', false);
    stateManager.setState('game.ready', true);
    
  } catch (error) {
    stateManager.setState('ui.loading', false);
    stateManager.setState('ui.loadError', error.message);
    console.error('Failed to load game data:', error);
  }
}

// Subscribe to loading states for UI
stateManager.subscribe('ui.loading', (loading) => {
  document.getElementById('loading-screen').style.display = loading ? 'block' : 'none';
});

stateManager.subscribe('ui.loadingText', (text) => {
  document.getElementById('loading-text').textContent = text;
});

stateManager.subscribe('ui.loadError', (error) => {
  if (error) {
    document.getElementById('error-message').textContent = error;
    document.getElementById('error-screen').style.display = 'block';
  }
});
```

### Example 5: Undo/Redo System

```javascript
// Enable history tracking
const stateManager = new StateManager({
  enableHistory: true,
  maxHistorySize: 50
});

// Game actions that can be undone
function movePlayer(direction) {
  const currentPos = stateManager.getState('player.position');
  const newPos = calculateNewPosition(currentPos, direction);
  
  // This automatically adds to history
  stateManager.setState('player.position', newPos);
}

function equipItem(item) {
  const currentInventory = stateManager.getState('player.inventory');
  const currentEquipment = stateManager.getState('player.equipment');
  
  // Batch update for atomic undo
  stateManager.batchUpdate([
    { path: 'player.inventory', value: removeItem(currentInventory, item) },
    { path: 'player.equipment', value: addEquipment(currentEquipment, item) }
  ]);
}

// Undo/Redo controls
document.getElementById('undo-btn').addEventListener('click', () => {
  if (stateManager.canUndo()) {
    stateManager.undo();
  }
});

document.getElementById('redo-btn').addEventListener('click', () => {
  if (stateManager.canRedo()) {
    stateManager.redo();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    stateManager.undo();
  } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    stateManager.redo();
  }
});

// Update UI buttons based on undo/redo availability
function updateUndoRedoButtons() {
  document.getElementById('undo-btn').disabled = !stateManager.canUndo();
  document.getElementById('redo-btn').disabled = !stateManager.canRedo();
}

// Listen for state changes to update buttons
stateManager.subscribe('', updateUndoRedoButtons, { immediate: true });
```

---

## Performance Considerations

### Memory Management

The StateManager now includes **enhanced memory monitoring** using a custom MemoryMonitor that's 10x faster than JSON.stringify for large objects.

### Structural Sharing for Faster Updates

- Updates use a path-copy approach: only the nodes along the updated path are shallow-copied; unrelated branches retain references.
- This preserves immutability with less work than cloning the full state tree and reduces GC pressure during game loops.
- Parents along the updated path will have new object identities; use specific subscriptions to avoid broad re-renders.
- Arrays are replaced (not merged) by default; when needed, construct the desired array before calling `setState`.

```javascript
// Enhanced memory tracking is enabled by default
const stateManager = new StateManager({
  enableMemoryTracking: true,
  memoryUpdateThreshold: 1000, // Update threshold in milliseconds
  memorySampleRate: 0.1,       // Sample 10% of updates for performance
  memoryThrottleMs: 100        // Throttle memory calculations
});

// Monitor memory usage with enhanced accuracy
setInterval(() => {
  const stats = stateManager.getStats();
  console.log('Memory usage:', stats.memoryUsage, 'bytes');
  
  if (stats.memoryUsage > 50 * 1024 * 1024) { // 50MB
    console.warn('High memory usage detected');
    // Consider clearing unnecessary history
    stateManager.setState('game.lowMemoryMode', true);
  }
}, 10000);

// Enhanced memory monitoring features:
// ✅ Handles circular references safely
// ✅ 10x faster than JSON.stringify for large objects  
// ✅ Configurable sampling rate to prevent performance impact
// ✅ Intelligent throttling for high-frequency updates
// ✅ Fallback to JSON.stringify when needed

// Optimize for high-frequency updates
function optimizedGameLoop() {
  // Batch position updates
  const positionUpdates = entities.map(entity => ({
    path: `entities.${entity.id}.position`,
    value: entity.position
  }));
  
  stateManager.batchUpdate(positionUpdates, { 
    skipStats: true  // Skip statistics for performance
  });
}

// Clean up subscriptions to prevent memory leaks
class Component {
  constructor() {
    this.subscriptions = [];
  }
  
  subscribe(path, callback) {
    const unsubscribe = stateManager.subscribe(path, callback);
    this.subscriptions.push(unsubscribe);
  }
  
  destroy() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.length = 0;
  }
}
```

### Update Optimization

```javascript
// Use shallow equality for frequent updates
function updateScore(newScore) {
  const currentScore = stateManager.getState('player.score');
  if (currentScore !== newScore) {
    stateManager.setState('player.score', newScore);
  }
}

// Debounce rapid updates
const debouncedSave = debounce(() => {
  stateManager.setStateAsync('game.data', saveToServer());
}, 1000);

stateManager.subscribe('player', debouncedSave);

// Use requestAnimationFrame for UI updates
let pendingUIUpdate = false;

stateManager.subscribe('player.position', () => {
  if (!pendingUIUpdate) {
    pendingUIUpdate = true;
    requestAnimationFrame(() => {
      updatePlayerSprite();
      pendingUIUpdate = false;
    });
  }
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: State not updating
```javascript
// ❌ Problem: Mutating state directly
const player = stateManager.getState('player');
player.health = 50; // This won't trigger updates!

// ✅ Solution: Use setState
stateManager.setState('player.health', 50);
```

#### Issue: Memory leaks from subscriptions
```javascript
// ❌ Problem: Not cleaning up subscriptions
function createComponent() {
  stateManager.subscribe('player.health', updateHealthBar);
  // Component is destroyed but subscription remains
}

// ✅ Solution: Always clean up
function createComponent() {
  const unsubscribe = stateManager.subscribe('player.health', updateHealthBar);
  
  return {
    destroy() {
      unsubscribe();
    }
  };
}
```

#### Issue: Validation errors
```javascript
// ❌ Problem: Invalid data type
stateManager.setState('player.health', 'full'); // Error: health must be number

// ✅ Solution: Use correct types or skip validation
stateManager.setState('player.health', 100); // Correct
// OR
stateManager.setState('player.health', 'full', { skipValidation: true });
```

#### Issue: Async operations not working
```javascript
// ❌ Problem: Not handling Promise rejections
stateManager.setStateAsync('data', fetchData()); // Unhandled rejection

// ✅ Solution: Proper error handling
try {
  await stateManager.setStateAsync('data', fetchData(), {
    errorPath: 'ui.error',
    timeout: 5000
  });
} catch (error) {
  console.error('Operation failed:', error);
}
```

### Debugging Tools

```javascript
// Enable debug mode for detailed logging
stateManager.enableDebugMode();

// Monitor all state changes
eventDispatcher.on('state:change', ({ path, newValue, oldValue }) => {
  console.log(`🔄 ${path}:`, oldValue, '->', newValue);
});

// Check system health
const health = stateManager.performHealthCheck();
if (!health.healthy) {
  console.error('State manager issues detected:', health);
}

// Performance monitoring
const stats = stateManager.getStats();
console.table(stats);

// Memory usage analysis
if (stats.memoryUsage > 10 * 1024 * 1024) {
  console.warn('High memory usage:', {
    total: stats.memoryUsage,
    historySize: stats.historySize,
    subscriptions: stats.subscriptionCount
  });
}
```

---

## Migration Guide

### From Direct State Manipulation

```javascript
// Before: Direct object manipulation
const gameState = {
  player: { health: 100, score: 0 },
  enemies: []
};

function takeDamage(amount) {
  gameState.player.health -= amount; // Direct mutation
  updateHealthBar(gameState.player.health);
}

// After: Using StateManager
function takeDamage(amount) {
  const currentHealth = stateManager.getState('player.health');
  stateManager.setState('player.health', currentHealth - amount);
  // UI updates automatically via subscription
}

stateManager.subscribe('player.health', updateHealthBar);
```

### From Event Emitters

```javascript
// Before: Manual event emitters
class GameState extends EventEmitter {
  setHealth(health) {
    this.health = health;
    this.emit('healthChanged', health);
  }
}

// After: Automatic change notifications
stateManager.subscribe('player.health', (health) => {
  // Automatically called when health changes
});
```

---

## Conclusion

Our state management system provides a robust, performant, and developer-friendly solution for managing game state. Key benefits:

✅ **Single source of truth** with immutable updates  
✅ **Event-driven reactivity** with automatic subscriptions  
✅ **Comprehensive async support** with loading and error states  
✅ **Time travel debugging** with undo/redo functionality  
✅ **Performance monitoring** and optimization tools  
✅ **Type safety** with automatic validation  
✅ **Modular architecture** that's easy to extend and test  

The system is designed to scale from simple games to complex applications while maintaining excellent performance and developer experience.

For questions or contributions, please refer to the source code in `/src/systems/StateManager.js` and related modules.
