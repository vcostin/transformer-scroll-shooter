# State Management System

A robust, centralized state management system designed for JavaScript applications with a focus on game development.

## 🚀 Quick Start

```javascript
import { stateManager } from './src/systems/StateManager.js';

// Get state
const playerHealth = stateManager.getState('player.health');

// Set state
stateManager.setState('player.health', 80);

// Subscribe to changes
const unsubscribe = stateManager.subscribe('player.health', (newValue, oldValue) => {
    console.log(`Health changed: ${oldValue} → ${newValue}`);
});
```

## ✨ Features

- 🔒 **Immutable Updates** - All state changes create new objects
- 🎯 **Event-Driven** - Reactive programming with automatic event emission
- 🌳 **Nested State Support** - Use dot-notation paths (`'player.position.x'`)
- ✅ **Validation** - Automatic type checking with schema definitions
- 🕐 **History & Undo/Redo** - Built-in state history with undo/redo
- 🔍 **Debug Tools** - Comprehensive debugging and inspection
- ⚡ **Performance Optimized** - O(1) operations and memory caching
- 🚀 **Async Support** - Built-in async operations with loading states
- 🧩 **Batch Operations** - Atomic updates for multiple changes
- 💾 **Memory Management** - Automatic cleanup and usage tracking

## 📚 Documentation

### Core Documentation
- **[Complete API Reference](./STATE_MANAGEMENT.md)** - Full documentation with examples
- **[Quick Reference](./docs/STATE_MANAGEMENT_QUICK_REFERENCE.md)** - Essential APIs and common patterns
- **[Migration Guide](./docs/STATE_MANAGEMENT_MIGRATION.md)** - How to migrate from direct state manipulation

### Key Concepts

#### Basic Usage
```javascript
// Get state value
const health = stateManager.getState('player.health');

// Set state value
stateManager.setState('player.health', 100);

// Subscribe to changes
const unsubscribe = stateManager.subscribe('player.health', (newVal, oldVal) => {
    updateHealthBar(newVal);
});
```

#### Async Operations
```javascript
// Handle async operations with loading states
await stateManager.setStateAsync('player.data', 
    fetch('/api/player').then(res => res.json()),
    {
        loadingPath: 'ui.loading',
        errorPath: 'ui.error'
    }
);
```

#### Batch Updates
```javascript
// Multiple updates atomically
stateManager.batchUpdate([
    { path: 'player.position.x', value: 100 },
    { path: 'player.position.y', value: 200 },
    { path: 'player.lastMoved', value: Date.now() }
]);
```

#### Transactions
```javascript
// Complex operations with automatic rollback
stateManager.transaction((state) => {
    state.setState('player.health', 0);
    state.setState('player.alive', false);
    state.setState('game.status', 'game_over');
});
```

## 🎮 Game Development Patterns

### Player Damage System
```javascript
function damagePlayer(amount) {
    stateManager.transaction((state) => {
        const currentHealth = state.getState('player.health');
        const newHealth = Math.max(0, currentHealth - amount);
        
        state.setState('player.health', newHealth);
        
        if (newHealth <= 0) {
            state.setState('player.alive', false);
            state.setState('game.status', 'game_over');
        }
    });
}
```

### Loading Game Data
```javascript
async function loadGameData() {
    await stateManager.setStateAsync('game.data',
        fetch('/api/gamedata').then(res => res.json()),
        {
            loadingPath: 'ui.loading.game',
            errorPath: 'ui.error.game'
        }
    );
}
```

### UI State Management
```javascript
// Modal system
stateManager.setState('ui.modal.type', 'settings');
stateManager.setState('ui.modal.visible', true);

// Form handling
stateManager.batchUpdate([
    { path: 'form.values.username', value: 'player123' },
    { path: 'form.touched.username', value: true }
]);
```

## 🔧 Configuration

```javascript
const stateManager = new StateManager({
    maxHistorySize: 100,        // History entries to keep
    enableHistory: true,        // Enable undo/redo
    enableValidation: true,     // Enable schema validation
    enableEvents: true,         // Enable event emission
    enableDebug: false,         // Enable debug logging
    immutable: true            // Use immutable updates
});
```

## 🧪 Testing

The state manager includes comprehensive test coverage:

```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
```

### Test Example
```javascript
describe('StateManager', () => {
    beforeEach(() => {
        stateManager.resetState();
    });

    it('should update state immutably', () => {
        stateManager.setState('player.health', 80);
        expect(stateManager.getState('player.health')).toBe(80);
    });

    it('should trigger subscriptions', () => {
        const callback = vi.fn();
        stateManager.subscribe('player.health', callback);
        
        stateManager.setState('player.health', 80);
        
        expect(callback).toHaveBeenCalledWith(80, 100, 'player.health');
    });
});
```

## 🐛 Debugging

### Enable Debug Mode
```javascript
stateManager.enableDebugMode();

// All state changes will be logged
stateManager.setState('player.health', 80);
// Console: "✅ StateManager: setState('player.health') {oldValue: 100, newValue: 80}"

// Access state manager in browser console
window.stateManager.getState();
window.stateManager.getStats();
```

### Performance Monitoring
```javascript
const stats = stateManager.getStats();
console.log('State Manager Stats:', {
    updates: stats.totalUpdates,
    gets: stats.totalGets,
    avgUpdateTime: stats.averageUpdateTime,
    memoryUsage: stats.memoryUsage
});
```

## 📈 Performance

The state manager is optimized for high-performance game development:

- **O(1) subscription operations** - Fast subscribe/unsubscribe
- **Memory caching** - Cached size calculations
- **Efficient updates** - Only updates when values actually change
- **Batch operations** - Multiple updates in single operation
- **Immutable sharing** - Reuses unchanged objects

### Performance Tips
1. Use `batchUpdate()` for multiple related changes
2. Set `skipHistory: true` for temporary/UI state
3. Always unsubscribe when components are destroyed
4. Use transactions for complex operations
5. Monitor memory usage with `getStats()`

## 🔗 Integration

### With EventDispatcher
```javascript
// State changes automatically emit events
eventDispatcher.on('state:change', (event) => {
    console.log(`State changed: ${event.path} = ${event.newValue}`);
});

// Async operations
eventDispatcher.on('state:async-error', (event) => {
    console.error('Async error:', event.error);
});
```

### With React/Vue/Angular
```javascript
// React Hook example
function useStateManager(path) {
    const [value, setValue] = useState(() => stateManager.getState(path));
    
    useEffect(() => {
        return stateManager.subscribe(path, (newValue) => {
            setValue(newValue);
        });
    }, [path]);
    
    return [value, (newValue) => stateManager.setState(path, newValue)];
}
```

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and ensure all tests pass before submitting a pull request.

## 📞 Support

For questions, issues, or feature requests:
1. Check the [documentation](./STATE_MANAGEMENT.md)
2. Review the [migration guide](./docs/STATE_MANAGEMENT_MIGRATION.md)
3. Check existing issues on GitHub
4. Create a new issue with detailed information

---

*Built with ❤️ for game developers who need reliable state management.*
