# State Management Quick Reference

## Essential APIs

### Basic Operations
```javascript
// Get state
const value = stateManager.getState('path.to.value');

// Set state
stateManager.setState('path.to.value', newValue);

// Subscribe to changes
const unsubscribe = stateManager.subscribe('path', (newVal, oldVal) => {
    // Handle change
});
```

### Async Operations
```javascript
// Async with loading states
await stateManager.setStateAsync('data', 
    fetch('/api/data').then(res => res.json()),
    {
        loadingPath: 'ui.loading',
        errorPath: 'ui.error'
    }
);
```

### Batch Updates
```javascript
// Multiple updates atomically
stateManager.batchUpdate([
    { path: 'player.x', value: 100 },
    { path: 'player.y', value: 200 }
]);
```

### History
```javascript
stateManager.undo();    // Undo last change
stateManager.redo();    // Redo last undone change
```

## Common Patterns

### Loading Pattern
```javascript
async function loadData() {
    await stateManager.setStateAsync('app.data',
        api.fetchData(),
        {
            loadingPath: 'app.loading',
            errorPath: 'app.error'
        }
    );
}
```

### Form Field Pattern
```javascript
function updateField(field, value) {
    stateManager.batchUpdate([
        { path: `form.values.${field}`, value },
        { path: `form.touched.${field}`, value: true }
    ]);
}
```

### Game State Pattern
```javascript
function damagePlayer(amount) {
    stateManager.transaction((state) => {
        const health = state.getState('player.health');
        const newHealth = Math.max(0, health - amount);
        
        state.setState('player.health', newHealth);
        
        if (newHealth <= 0) {
            state.setState('player.alive', false);
            state.setState('game.status', 'game_over');
        }
    });
}
```

## Options Reference

### setState Options
```javascript
{
    skipValidation: false,  // Skip validation
    skipEvents: false,      // Skip event emission
    skipHistory: false,     // Skip history tracking
    merge: false           // Merge with existing object
}
```

### Subscription Options
```javascript
{
    immediate: false,      // Call immediately with current value
    deep: true            // Watch for deep changes
}
```

## Debug Tips

```javascript
// Enable debug mode
stateManager.enableDebugMode();

// Get stats
stateManager.getStats();

// Browser console access
window.stateManager.getState();
```

## Performance Tips

1. **Use batch updates** for multiple related changes
2. **Skip history** for temporary/UI state (`skipHistory: true`)
3. **Unsubscribe** when components unmount
4. **Use transactions** for complex operations
5. **Monitor memory** with `getStats()`
