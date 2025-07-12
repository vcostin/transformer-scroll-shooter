# State Management Migration Guide

## Overview

This guide helps you migrate from direct state manipulation to the centralized StateManager system.

## Before and After Examples

### Basic State Access

**Before (Direct manipulation):**
```javascript
// Direct object access
let gameState = {
    player: { health: 100, x: 0, y: 0 },
    game: { score: 0, level: 1 }
};

// Direct modification
gameState.player.health = 80;
gameState.game.score += 100;
```

**After (StateManager):**
```javascript
// Centralized state management
import { stateManager } from './src/systems/StateManager.js';

// Immutable updates
stateManager.setState('player.health', 80);
stateManager.setState('game.score', stateManager.getState('game.score') + 100);
```

### Event Handling

**Before (Manual event handling):**
```javascript
// Manual event system
const listeners = [];

function updateHealth(newHealth) {
    const oldHealth = gameState.player.health;
    gameState.player.health = newHealth;
    
    // Manual event emission
    listeners.forEach(listener => {
        if (listener.path === 'player.health') {
            listener.callback(newHealth, oldHealth);
        }
    });
}
```

**After (Built-in subscriptions):**
```javascript
// Automatic event handling
stateManager.subscribe('player.health', (newHealth, oldHealth) => {
    console.log(`Health changed: ${oldHealth} → ${newHealth}`);
});

// Simple update triggers all subscribers
stateManager.setState('player.health', 80);
```

### Async Operations

**Before (Manual async handling):**
```javascript
let loading = false;
let error = null;

async function loadPlayerData() {
    loading = true;
    error = null;
    
    try {
        const data = await fetch('/api/player').then(res => res.json());
        gameState.player = { ...gameState.player, ...data };
        loading = false;
    } catch (err) {
        error = err.message;
        loading = false;
    }
}
```

**After (Built-in async support):**
```javascript
// Automatic loading and error handling
await stateManager.setStateAsync('player.data',
    fetch('/api/player').then(res => res.json()),
    {
        loadingPath: 'ui.loading',
        errorPath: 'ui.error'
    }
);
```

## Migration Steps

### Step 1: Install StateManager

```javascript
// Import the state manager
import { stateManager } from './src/systems/StateManager.js';
```

### Step 2: Define State Schema

Create or update your state schema:

```javascript
// src/constants/state-schema.js
export const DEFAULT_STATE = {
    player: {
        health: 100,
        position: { x: 0, y: 0 },
        inventory: []
    },
    game: {
        score: 0,
        level: 1,
        status: 'playing'
    }
};

export const STATE_SCHEMA = {
    player: {
        health: { type: 'number', min: 0, max: 100 },
        position: {
            x: { type: 'number' },
            y: { type: 'number' }
        }
    },
    game: {
        score: { type: 'number', min: 0 },
        level: { type: 'number', min: 1 }
    }
};
```

### Step 3: Replace Direct State Access

**Replace getters:**
```javascript
// Before
const health = gameState.player.health;

// After
const health = stateManager.getState('player.health');
```

**Replace setters:**
```javascript
// Before
gameState.player.health = 80;

// After
stateManager.setState('player.health', 80);
```

### Step 4: Migrate Event Listeners

**Before:**
```javascript
// Manual listeners
const healthListeners = [];

function onHealthChange(callback) {
    healthListeners.push(callback);
}

function updateHealth(newHealth) {
    const oldHealth = gameState.player.health;
    gameState.player.health = newHealth;
    
    healthListeners.forEach(callback => callback(newHealth, oldHealth));
}
```

**After:**
```javascript
// Automatic subscriptions
function onHealthChange(callback) {
    return stateManager.subscribe('player.health', callback);
}

// Updates automatically trigger subscribers
stateManager.setState('player.health', 80);
```

### Step 5: Migrate Complex Operations

**Before (Manual transaction):**
```javascript
function damagePlayer(amount) {
    const oldHealth = gameState.player.health;
    const newHealth = Math.max(0, oldHealth - amount);
    
    gameState.player.health = newHealth;
    
    if (newHealth <= 0) {
        gameState.player.alive = false;
        gameState.game.status = 'game_over';
    }
}
```

**After (Atomic transaction):**
```javascript
function damagePlayer(amount) {
    stateManager.transaction((state) => {
        const oldHealth = state.getState('player.health');
        const newHealth = Math.max(0, oldHealth - amount);
        
        state.setState('player.health', newHealth);
        
        if (newHealth <= 0) {
            state.setState('player.alive', false);
            state.setState('game.status', 'game_over');
        }
    });
}
```

## Common Migration Patterns

### Pattern 1: Component State

**Before:**
```javascript
class PlayerComponent {
    constructor() {
        this.health = 100;
        this.position = { x: 0, y: 0 };
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.onHealthChange();
    }
    
    onHealthChange() {
        // Manual event handling
    }
}
```

**After:**
```javascript
class PlayerComponent {
    constructor() {
        // Subscribe to state changes
        this.unsubscribeHealth = stateManager.subscribe('player.health', 
            (newHealth, oldHealth) => this.onHealthChange(newHealth, oldHealth)
        );
        
        this.unsubscribePosition = stateManager.subscribe('player.position',
            (newPos, oldPos) => this.onPositionChange(newPos, oldPos)
        );
    }
    
    takeDamage(amount) {
        const currentHealth = stateManager.getState('player.health');
        stateManager.setState('player.health', currentHealth - amount);
    }
    
    onHealthChange(newHealth, oldHealth) {
        // Automatic event handling
    }
    
    destroy() {
        // Clean up subscriptions
        this.unsubscribeHealth();
        this.unsubscribePosition();
    }
}
```

### Pattern 2: Global State

**Before:**
```javascript
// Global state object
window.gameState = {
    player: { health: 100 },
    game: { score: 0 }
};

// Access from anywhere
function updateScore(points) {
    window.gameState.game.score += points;
}
```

**After:**
```javascript
// Centralized state manager
import { stateManager } from './src/systems/StateManager.js';

// Access from anywhere
function updateScore(points) {
    const currentScore = stateManager.getState('game.score');
    stateManager.setState('game.score', currentScore + points);
}
```

### Pattern 3: Form State

**Before:**
```javascript
class FormComponent {
    constructor() {
        this.values = {};
        this.errors = {};
        this.touched = {};
    }
    
    updateField(field, value) {
        this.values[field] = value;
        this.touched[field] = true;
        this.validate(field);
    }
    
    validate(field) {
        // Manual validation
    }
}
```

**After:**
```javascript
class FormComponent {
    constructor() {
        // Subscribe to form state changes
        this.unsubscribeValues = stateManager.subscribe('form.values', 
            (values) => this.onValuesChange(values)
        );
    }
    
    updateField(field, value) {
        stateManager.batchUpdate([
            { path: `form.values.${field}`, value },
            { path: `form.touched.${field}`, value: true }
        ]);
    }
    
    onValuesChange(values) {
        // Automatic validation through state system
    }
    
    destroy() {
        this.unsubscribeValues();
    }
}
```

## Testing Migration

### Before (Manual testing)
```javascript
describe('Player damage', () => {
    it('should reduce health', () => {
        const gameState = { player: { health: 100 } };
        
        // Manual state change
        gameState.player.health = 80;
        
        expect(gameState.player.health).toBe(80);
    });
});
```

### After (StateManager testing)
```javascript
describe('Player damage', () => {
    it('should reduce health', () => {
        // Reset state
        stateManager.resetState();
        
        // Update through state manager
        stateManager.setState('player.health', 80);
        
        expect(stateManager.getState('player.health')).toBe(80);
    });
});
```

## Common Gotchas

### 1. Immutability

**Problem:** Direct object modification
```javascript
// This won't work - direct modification
const player = stateManager.getState('player');
player.health = 80; // This doesn't update state!
```

**Solution:** Use setState
```javascript
// This works - immutable update
stateManager.setState('player.health', 80);
```

### 2. Subscription Cleanup

**Problem:** Memory leaks from forgotten subscriptions
```javascript
// This creates a memory leak
stateManager.subscribe('player.health', (health) => {
    // Handler never cleaned up
});
```

**Solution:** Always unsubscribe
```javascript
// This is safe
const unsubscribe = stateManager.subscribe('player.health', (health) => {
    // Handler
});

// Later...
unsubscribe();
```

### 3. Path Typos

**Problem:** Typos in paths
```javascript
// Typo in path
stateManager.setState('player.healt', 80); // Wrong!
```

**Solution:** Use constants
```javascript
// Define path constants
const PATHS = {
    PLAYER_HEALTH: 'player.health',
    PLAYER_POSITION: 'player.position'
};

stateManager.setState(PATHS.PLAYER_HEALTH, 80);
```

## Benefits After Migration

1. **Immutability**: No accidental state mutations
2. **Validation**: Automatic type checking and validation
3. **Events**: Built-in event system for reactive updates
4. **History**: Undo/redo functionality out of the box
5. **Debug**: Comprehensive debugging and inspection tools
6. **Performance**: Optimized updates and memory management
7. **Testing**: Easier to test with predictable state changes

## Gradual Migration Strategy

You can migrate incrementally:

1. Start with new features using StateManager
2. Migrate critical state paths first
3. Add subscriptions to replace manual event handling
4. Gradually move complex operations to transactions
5. Finally, remove old state management code

This approach allows you to adopt the new system gradually while maintaining existing functionality.
