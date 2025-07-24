# 🧪 State Management Testing Guide

This guide provides comprehensive examples and patterns for testing applications that use our state management system.

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Unit Testing State Operations](#unit-testing-state-operations)
3. [Testing Subscriptions](#testing-subscriptions)
4. [Testing Async Operations](#testing-async-operations)
5. [Testing History Functionality](#testing-history-functionality)
6. [Integration Testing](#integration-testing)
7. [Performance Testing](#performance-testing)
8. [Testing Best Practices](#testing-best-practices)
9. [Common Testing Patterns](#common-testing-patterns)
10. [Debugging Test Issues](#debugging-test-issues)

---

## Testing Setup

### Basic Test Environment

```javascript
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from '@/systems/StateManager.js';

describe('State Management Tests', () => {
  let stateManager;
  
  beforeEach(() => {
    // Create fresh state manager for each test
    stateManager = new StateManager({
      enableHistory: true,
      enablePerformanceTracking: true,
      maxHistorySize: 10
    });
    
    // Set up initial test state
    stateManager.setState('player', {
      health: 100,
      score: 0,
      position: { x: 0, y: 0 }
    });
    
    stateManager.setState('game', {
      level: 1,
      paused: false,
      enemies: []
    });
  });
  
  afterEach(() => {
    // Clean up
    stateManager.clearAll();
    vi.clearAllMocks();
  });
});
```

### Mock Dependencies

```javascript
// Mock external dependencies
vi.mock('@/systems/EventDispatcher.js', () => ({
  eventDispatcher: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

// Mock async operations
const mockFetch = vi.fn();
vi.mock('@/utils/api.js', () => ({
  fetchPlayerData: mockFetch,
  savePlayerData: mockFetch
}));
```

---

## Unit Testing State Operations

### Testing Basic Get/Set Operations

```javascript
describe('Basic State Operations', () => {
  test('should get state value by path', () => {
    const health = stateManager.getState('player.health');
    expect(health).toBe(100);
  });

  test('should get nested state values', () => {
    const position = stateManager.getState('player.position');
    expect(position).toEqual({ x: 0, y: 0 });
    
    const x = stateManager.getState('player.position.x');
    expect(x).toBe(0);
  });

  test('should return undefined for non-existent paths', () => {
    const result = stateManager.getState('nonexistent.path');
    expect(result).toBeUndefined();
  });

  test('should set state value and return true when changed', () => {
    const changed = stateManager.setState('player.health', 85);
    expect(changed).toBe(true);
    expect(stateManager.getState('player.health')).toBe(85);
  });

  test('should return false when setting same value', () => {
    const changed = stateManager.setState('player.health', 100); // Same as initial
    expect(changed).toBe(false);
  });

  test('should create nested paths automatically', () => {
    stateManager.setState('new.deep.path.value', 42);
    expect(stateManager.getState('new.deep.path.value')).toBe(42);
  });
});
```

### Testing State Merging

```javascript
describe('State Merging', () => {
  test('should merge objects when merge option is true', () => {
    stateManager.setState('player', { weapon: 'sword' }, { merge: true });
    
    const player = stateManager.getState('player');
    expect(player).toEqual({
      health: 100,
      score: 0,
      position: { x: 0, y: 0 },
      weapon: 'sword'
    });
  });

  test('should replace objects when merge option is false', () => {
    stateManager.setState('player', { weapon: 'sword' }, { merge: false });
    
    const player = stateManager.getState('player');
    expect(player).toEqual({ weapon: 'sword' });
  });

  test('should merge nested objects correctly', () => {
    stateManager.setState('player.position', { z: 10 }, { merge: true });
    
    const position = stateManager.getState('player.position');
    expect(position).toEqual({ x: 0, y: 0, z: 10 });
  });
});
```

### Testing Validation

```javascript
describe('State Validation', () => {
  test('should validate state updates', () => {
    // Assuming health must be a number
    expect(() => {
      stateManager.setState('player.health', 'invalid');
    }).toThrow('Validation failed');
  });

  test('should skip validation when option is set', () => {
    expect(() => {
      stateManager.setState('player.health', 'debug', { skipValidation: true });
    }).not.toThrow();
    
    expect(stateManager.getState('player.health')).toBe('debug');
  });

  test('should validate complex objects', () => {
    const invalidPlayer = { health: -50, score: 'invalid' };
    
    expect(() => {
      stateManager.setState('player', invalidPlayer);
    }).toThrow();
  });
});
```

---

## Testing Subscriptions

### Basic Subscription Testing

```javascript
describe('State Subscriptions', () => {
  test('should call subscription when state changes', () => {
    const callback = vi.fn();
    
    stateManager.subscribe('player.health', callback);
    stateManager.setState('player.health', 85);
    
    expect(callback).toHaveBeenCalledWith(85, 100, 'player.health');
  });

  test('should not call subscription when state does not change', () => {
    const callback = vi.fn();
    
    stateManager.subscribe('player.health', callback);
    stateManager.setState('player.health', 100); // Same value
    
    expect(callback).not.toHaveBeenCalled();
  });

  test('should call subscription immediately when immediate option is true', () => {
    const callback = vi.fn();
    
    stateManager.subscribe('player.health', callback, { immediate: true });
    
    expect(callback).toHaveBeenCalledWith(100, undefined, 'player.health');
  });

  test('should unsubscribe correctly', () => {
    const callback = vi.fn();
    
    const unsubscribe = stateManager.subscribe('player.health', callback);
    stateManager.setState('player.health', 85);
    expect(callback).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    stateManager.setState('player.health', 70);
    expect(callback).toHaveBeenCalledTimes(1); // Still only called once
  });
});
```

### Testing Deep Subscriptions

```javascript
describe('Deep Subscriptions', () => {
  test('should watch nested changes with deep option', () => {
    const callback = vi.fn();
    
    stateManager.subscribe('player', callback, { deep: true });
    stateManager.setState('player.position.x', 10);
    
    expect(callback).toHaveBeenCalled();
  });

  test('should not watch nested changes without deep option', () => {
    const callback = vi.fn();
    
    stateManager.subscribe('player', callback, { deep: false });
    stateManager.setState('player.position.x', 10);
    
    expect(callback).not.toHaveBeenCalled();
  });

  test('should watch array changes', () => {
    const callback = vi.fn();
    
    stateManager.subscribe('game.enemies', callback);
    
    const enemies = stateManager.getState('game.enemies');
    stateManager.setState('game.enemies', [...enemies, { id: 1, health: 50 }]);
    
    expect(callback).toHaveBeenCalled();
  });
});
```

### Testing Multiple Subscriptions

```javascript
describe('Multiple Subscriptions', () => {
  test('should handle multiple subscriptions to same path', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    stateManager.subscribe('player.health', callback1);
    stateManager.subscribe('player.health', callback2);
    
    stateManager.setState('player.health', 85);
    
    expect(callback1).toHaveBeenCalledWith(85, 100, 'player.health');
    expect(callback2).toHaveBeenCalledWith(85, 100, 'player.health');
  });

  test('should handle subscriptions to different paths', () => {
    const healthCallback = vi.fn();
    const scoreCallback = vi.fn();
    
    stateManager.subscribe('player.health', healthCallback);
    stateManager.subscribe('player.score', scoreCallback);
    
    stateManager.setState('player.health', 85);
    stateManager.setState('player.score', 1000);
    
    expect(healthCallback).toHaveBeenCalledWith(85, 100, 'player.health');
    expect(scoreCallback).toHaveBeenCalledWith(1000, 0, 'player.score');
  });

  test('should manage subscription cleanup', () => {
    const callbacks = Array.from({ length: 5 }, () => vi.fn());
    const unsubscribers = callbacks.map(cb => 
      stateManager.subscribe('player.health', cb)
    );
    
    // Unsubscribe some
    unsubscribers[0]();
    unsubscribers[2]();
    unsubscribers[4]();
    
    stateManager.setState('player.health', 85);
    
    // Only callbacks 1 and 3 should be called
    expect(callbacks[0]).not.toHaveBeenCalled();
    expect(callbacks[1]).toHaveBeenCalled();
    expect(callbacks[2]).not.toHaveBeenCalled();
    expect(callbacks[3]).toHaveBeenCalled();
    expect(callbacks[4]).not.toHaveBeenCalled();
  });
});
```

---

## Testing Async Operations

### Basic Async Testing

```javascript
describe('Async State Operations', () => {
  test('should handle successful async operations', async () => {
    const mockData = { profile: 'user123' };
    mockFetch.mockResolvedValue(mockData);
    
    const promise = stateManager.setStateAsync('player.profile', mockFetch());
    
    await expect(promise).resolves.toBe(true);
    expect(stateManager.getState('player.profile')).toEqual(mockData);
  });

  test('should handle async operation failures', async () => {
    const error = new Error('Network error');
    mockFetch.mockRejectedValue(error);
    
    await expect(
      stateManager.setStateAsync('player.profile', mockFetch())
    ).rejects.toThrow('Network error');
  });

  test('should manage loading states', async () => {
    const loadingCallback = vi.fn();
    stateManager.subscribe('ui.loading', loadingCallback);
    
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 100))
    );
    
    const promise = stateManager.setStateAsync('data', mockFetch(), {
      loadingPath: 'ui.loading'
    });
    
    // Should set loading to true immediately
    expect(stateManager.getState('ui.loading')).toBe(true);
    expect(loadingCallback).toHaveBeenCalledWith(true, undefined, 'ui.loading');
    
    await promise;
    
    // Should set loading to false when complete
    expect(stateManager.getState('ui.loading')).toBe(false);
  });
});
```

### Testing Error Handling

```javascript
describe('Async Error Handling', () => {
  test('should store errors in error path', async () => {
    const error = new Error('API Error');
    mockFetch.mockRejectedValue(error);
    
    try {
      await stateManager.setStateAsync('data', mockFetch(), {
        errorPath: 'ui.error'
      });
    } catch (e) {
      // Expected to throw
    }
    
    const storedError = stateManager.getState('ui.error');
    expect(storedError).toEqual(error);
  });

  test('should handle timeout errors', async () => {
    vi.useFakeTimers();
    
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
    );
    
    const promise = stateManager.setStateAsync('data', mockFetch(), {
      timeout: 5000, // 5 second timeout
      errorPath: 'ui.error'
    });
    
    vi.advanceTimersByTime(5000);
    
    await expect(promise).rejects.toThrow('timeout');
    
    const error = stateManager.getState('ui.error');
    expect(error.message).toContain('timeout');
    
    vi.useRealTimers();
  });

  test('should retry failed operations', async () => {
    let attemptCount = 0;
    mockFetch.mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject(new Error('Temporary error'));
      }
      return Promise.resolve({ data: 'success' });
    });
    
    await stateManager.setStateAsync('data', mockFetch(), {
      retryAttempts: 3,
      retryDelay: 100
    });
    
    expect(attemptCount).toBe(3);
    expect(stateManager.getState('data')).toEqual({ data: 'success' });
  });
});
```

### Testing Async Operation Management

```javascript
describe('Async Operation Management', () => {
  test('should track active operations', async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    const promise1 = stateManager.setStateAsync('data1', mockFetch());
    const promise2 = stateManager.setStateAsync('data2', mockFetch());
    
    const activeOps = stateManager.getActiveAsyncOperations();
    expect(activeOps.length).toBe(2);
    
    await Promise.all([promise1, promise2]);
    
    const activeOpsAfter = stateManager.getActiveAsyncOperations();
    expect(activeOpsAfter.length).toBe(0);
  });

  test('should cancel async operations', async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    const promise = stateManager.setStateAsync('data', mockFetch());
    
    const activeOps = stateManager.getActiveAsyncOperations();
    const operationId = activeOps[0].id;
    
    const cancelled = stateManager.cancelAsyncOperation(operationId);
    expect(cancelled).toBe(true);
    
    await expect(promise).rejects.toThrow('cancelled');
  });

  test('should cancel all async operations', async () => {
    const promises = Array.from({ length: 3 }, (_, i) => 
      stateManager.setStateAsync(`data${i}`, 
        new Promise(resolve => setTimeout(resolve, 1000))
      )
    );
    
    const cancelledCount = stateManager.cancelAllAsyncOperations();
    expect(cancelledCount).toBe(3);
    
    await Promise.allSettled(promises);
    // All promises should be rejected with cancellation error
  });
});
```

---

## Testing History Functionality

### Basic History Testing

```javascript
describe('State History', () => {
  test('should track state changes in history', () => {
    stateManager.setState('player.health', 85);
    stateManager.setState('player.health', 70);
    
    expect(stateManager.canUndo()).toBe(true);
    
    const undid = stateManager.undo();
    expect(undid).toBe(true);
    expect(stateManager.getState('player.health')).toBe(85);
    
    const undidAgain = stateManager.undo();
    expect(undidAgain).toBe(true);
    expect(stateManager.getState('player.health')).toBe(100);
  });

  test('should handle redo operations', () => {
    stateManager.setState('player.health', 85);
    stateManager.undo();
    
    expect(stateManager.canRedo()).toBe(true);
    
    const redid = stateManager.redo();
    expect(redid).toBe(true);
    expect(stateManager.getState('player.health')).toBe(85);
  });

  test('should clear redo history on new changes', () => {
    stateManager.setState('player.health', 85);
    stateManager.setState('player.health', 70);
    stateManager.undo(); // Back to 85
    
    expect(stateManager.canRedo()).toBe(true);
    
    // Make new change
    stateManager.setState('player.health', 90);
    
    expect(stateManager.canRedo()).toBe(false);
  });

  test('should respect history size limit', () => {
    // Set small history limit
    const smallHistoryStateManager = new StateManager({
      enableHistory: true,
      maxHistorySize: 3
    });
    
    // Make more changes than history limit
    for (let i = 0; i < 5; i++) {
      smallHistoryStateManager.setState('counter', i);
    }
    
    // Should only be able to undo 3 times
    let undoCount = 0;
    while (smallHistoryStateManager.canUndo()) {
      smallHistoryStateManager.undo();
      undoCount++;
    }
    
    expect(undoCount).toBe(3);
  });
});
```

### Testing History with Subscriptions

```javascript
describe('History with Subscriptions', () => {
  test('should call subscriptions during undo/redo', () => {
    const callback = vi.fn();
    stateManager.subscribe('player.health', callback);
    
    stateManager.setState('player.health', 85);
    expect(callback).toHaveBeenCalledWith(85, 100, 'player.health');
    
    callback.mockClear();
    
    stateManager.undo();
    expect(callback).toHaveBeenCalledWith(100, 85, 'player.health');
  });

  test('should handle complex state changes in history', () => {
    const playerCallback = vi.fn();
    const gameCallback = vi.fn();
    
    stateManager.subscribe('player', playerCallback, { deep: true });
    stateManager.subscribe('game.level', gameCallback);
    
    // Batch update
    stateManager.batchUpdate([
      { path: 'player.health', value: 85 },
      { path: 'player.score', value: 1000 },
      { path: 'game.level', value: 2 }
    ]);
    
    stateManager.undo();
    
    // Should restore all values
    expect(stateManager.getState('player.health')).toBe(100);
    expect(stateManager.getState('player.score')).toBe(0);
    expect(stateManager.getState('game.level')).toBe(1);
  });
});
```

---

## Integration Testing

### Testing Component Integration

```javascript
describe('Component Integration', () => {
  class MockGameComponent {
    constructor() {
      this.health = 0;
      this.score = 0;
      this.subscriptions = [];
      
      this.subscriptions.push(
        stateManager.subscribe('player.health', (health) => {
          this.health = health;
        }),
        stateManager.subscribe('player.score', (score) => {
          this.score = score;
        })
      );
    }
    
    takeDamage(amount) {
      const currentHealth = stateManager.getState('player.health');
      stateManager.setState('player.health', Math.max(0, currentHealth - amount));
    }
    
    addScore(points) {
      const currentScore = stateManager.getState('player.score');
      stateManager.setState('player.score', currentScore + points);
    }
    
    destroy() {
      this.subscriptions.forEach(unsubscribe => unsubscribe());
    }
  }
  
  test('should integrate with game components', () => {
    const component = new MockGameComponent();
    
    // Initial values should be set
    expect(component.health).toBe(100);
    expect(component.score).toBe(0);
    
    // Test damage
    component.takeDamage(25);
    expect(component.health).toBe(75);
    expect(stateManager.getState('player.health')).toBe(75);
    
    // Test score
    component.addScore(500);
    expect(component.score).toBe(500);
    expect(stateManager.getState('player.score')).toBe(500);
    
    component.destroy();
  });
});
```

### Testing Game Loop Integration

```javascript
describe('Game Loop Integration', () => {
  test('should handle high-frequency updates', () => {
    const positionUpdates = [];
    
    stateManager.subscribe('player.position', (pos) => {
      positionUpdates.push(pos);
    });
    
    // Simulate game loop updates
    for (let i = 0; i < 100; i++) {
      stateManager.setState('player.position', { x: i, y: i * 2 }, {
        skipHistory: true // Don't track in history for performance
      });
    }
    
    expect(positionUpdates).toHaveLength(100);
    expect(stateManager.getState('player.position')).toEqual({ x: 99, y: 198 });
    
    // History should not be cluttered
    expect(stateManager.canUndo()).toBe(false);
  });

  test('should batch entity updates efficiently', () => {
    const entities = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 800,
      y: Math.random() * 600
    }));
    
    // Initialize entities
    stateManager.setState('entities', {});
    
    // Batch update all entities
    const updates = entities.map(entity => ({
      path: `entities.${entity.id}`,
      value: { x: entity.x, y: entity.y }
    }));
    
    const startTime = performance.now();
    stateManager.batchUpdate(updates);
    const endTime = performance.now();
    
    // Should complete quickly
    expect(endTime - startTime).toBeLessThan(10); // 10ms threshold
    
    // Verify all entities are set
    entities.forEach(entity => {
      const stored = stateManager.getState(`entities.${entity.id}`);
      expect(stored).toEqual({ x: entity.x, y: entity.y });
    });
  });
});
```

---

## Performance Testing

### Memory Usage Testing

```javascript
describe('Performance Testing', () => {
  test('should not leak memory with many subscriptions', () => {
    const initialStats = stateManager.getStats();
    
    // Create many subscriptions
    const unsubscribers = [];
    for (let i = 0; i < 1000; i++) {
      unsubscribers.push(
        stateManager.subscribe('test.value', () => {})
      );
    }
    
    let middleStats = stateManager.getStats();
    expect(middleStats.subscriptionCount).toBe(1000);
    
    // Clean up subscriptions
    unsubscribers.forEach(unsub => unsub());
    
    const finalStats = stateManager.getStats();
    expect(finalStats.subscriptionCount).toBe(0);
  });

  test('should handle large state objects efficiently', () => {
    const largeObject = {};
    for (let i = 0; i < 10000; i++) {
      largeObject[`item${i}`] = {
        id: i,
        data: `data${i}`,
        metadata: { created: Date.now(), type: 'test' }
      };
    }
    
    const startTime = performance.now();
    stateManager.setState('largeData', largeObject);
    const setTime = performance.now() - startTime;
    
    const getStartTime = performance.now();
    const retrieved = stateManager.getState('largeData');
    const getTime = performance.now() - getStartTime;
    
    expect(setTime).toBeLessThan(100); // 100ms threshold
    expect(getTime).toBeLessThan(10);  // 10ms threshold
    expect(retrieved).toEqual(largeObject);
  });

  test('should maintain performance with history enabled', () => {
    const historyManager = new StateManager({
      enableHistory: true,
      maxHistorySize: 100
    });
    
    const times = [];
    
    // Perform many state changes
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      historyManager.setState('counter', i);
      times.push(performance.now() - start);
    }
    
    const averageTime = times.reduce((a, b) => a + b) / times.length;
    expect(averageTime).toBeLessThan(1); // 1ms average
    
    // Should be able to undo
    expect(historyManager.canUndo()).toBe(true);
  });
});
```

### Stress Testing

```javascript
describe('Stress Testing', () => {
  test('should handle concurrent operations', async () => {
    const promises = [];
    
    // Create multiple concurrent async operations
    for (let i = 0; i < 50; i++) {
      promises.push(
        stateManager.setStateAsync(`data.${i}`, 
          Promise.resolve(`value${i}`)
        )
      );
    }
    
    const results = await Promise.all(promises);
    
    // All should succeed
    expect(results.every(result => result === true)).toBe(true);
    
    // All values should be set
    for (let i = 0; i < 50; i++) {
      expect(stateManager.getState(`data.${i}`)).toBe(`value${i}`);
    }
  });

  test('should handle rapid subscription changes', () => {
    const callbacks = [];
    const unsubscribers = [];
    
    // Create and destroy subscriptions rapidly
    for (let i = 0; i < 500; i++) {
      const callback = vi.fn();
      callbacks.push(callback);
      
      const unsubscribe = stateManager.subscribe('test.rapid', callback);
      unsubscribers.push(unsubscribe);
      
      // Unsubscribe some immediately
      if (i % 3 === 0) {
        unsubscribe();
      }
    }
    
    // Make a state change
    stateManager.setState('test.rapid', 'changed');
    
    // Only non-unsubscribed callbacks should be called
    const calledCount = callbacks.filter(cb => cb.mock.calls.length > 0).length;
    expect(calledCount).toBeLessThan(500);
    expect(calledCount).toBeGreaterThan(300);
    
    // Clean up remaining subscriptions
    unsubscribers.forEach(unsub => unsub());
  });
});
```

---

## Testing Best Practices

### 1. Test Isolation

```javascript
// ✅ Good: Each test gets fresh state
beforeEach(() => {
  stateManager = new StateManager();
  setupInitialState();
});

// ❌ Bad: Tests share state
const globalStateManager = new StateManager();

test('test 1', () => {
  globalStateManager.setState('value', 1); // Affects other tests
});
```

### 2. Mock External Dependencies

```javascript
// ✅ Good: Mock external services
vi.mock('@/services/api.js', () => ({
  fetchData: vi.fn(),
  saveData: vi.fn()
}));

// ❌ Bad: Use real external services
// This makes tests slow and unreliable
```

### 3. Test Async Operations Properly

```javascript
// ✅ Good: Use async/await and proper error handling
test('should handle async operations', async () => {
  mockApi.mockResolvedValue({ data: 'test' });
  
  await expect(
    stateManager.setStateAsync('data', mockApi())
  ).resolves.toBe(true);
  
  expect(stateManager.getState('data')).toEqual({ data: 'test' });
});

// ❌ Bad: Don't await async operations
test('should handle async operations', () => {
  stateManager.setStateAsync('data', mockApi()); // No await!
  // Test continues before async operation completes
});
```

### 4. Use Meaningful Test Data

```javascript
// ✅ Good: Descriptive test data
const testPlayer = {
  health: 75,
  score: 1250,
  position: { x: 100, y: 200 },
  weapon: 'laser'
};

// ❌ Bad: Magic numbers and unclear data
const testPlayer = {
  health: 42,
  score: 999,
  position: { x: 1, y: 2 },
  weapon: 'abc'
};
```

### 5. Clean Up Resources

```javascript
// ✅ Good: Clean up subscriptions and timers
afterEach(() => {
  subscriptions.forEach(unsub => unsub());
  vi.clearAllTimers();
  stateManager.clearAll();
});

// ❌ Bad: Leave resources hanging
// Causes memory leaks and test interference
```

---

## Common Testing Patterns

### Testing Event-Driven Updates

```javascript
describe('Event-Driven Patterns', () => {
  test('should handle cascading state updates', () => {
    const healthCallback = vi.fn();
    const gameOverCallback = vi.fn();
    
    stateManager.subscribe('player.health', healthCallback);
    stateManager.subscribe('game.gameOver', gameOverCallback);
    
    // Set up logic: when health reaches 0, set game over
    stateManager.subscribe('player.health', (health) => {
      if (health <= 0) {
        stateManager.setState('game.gameOver', true);
      }
    });
    
    // Trigger the cascade
    stateManager.setState('player.health', 0);
    
    expect(healthCallback).toHaveBeenCalledWith(0, 100, 'player.health');
    expect(gameOverCallback).toHaveBeenCalledWith(true, false, 'game.gameOver');
  });
});
```

### Testing State Machines

```javascript
describe('State Machine Patterns', () => {
  const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
  };
  
  beforeEach(() => {
    stateManager.setState('game.state', GAME_STATES.MENU);
  });
  
  test('should transition between game states correctly', () => {
    const stateCallback = vi.fn();
    stateManager.subscribe('game.state', stateCallback);
    
    // Menu -> Playing
    stateManager.setState('game.state', GAME_STATES.PLAYING);
    expect(stateCallback).toHaveBeenCalledWith(
      GAME_STATES.PLAYING, 
      GAME_STATES.MENU, 
      'game.state'
    );
    
    // Playing -> Paused
    stateManager.setState('game.state', GAME_STATES.PAUSED);
    expect(stateCallback).toHaveBeenCalledWith(
      GAME_STATES.PAUSED, 
      GAME_STATES.PLAYING, 
      'game.state'
    );
  });
  
  test('should validate state transitions', () => {
    const validTransitions = {
      [GAME_STATES.MENU]: [GAME_STATES.PLAYING],
      [GAME_STATES.PLAYING]: [GAME_STATES.PAUSED, GAME_STATES.GAME_OVER],
      [GAME_STATES.PAUSED]: [GAME_STATES.PLAYING, GAME_STATES.MENU],
      [GAME_STATES.GAME_OVER]: [GAME_STATES.MENU]
    };
    
    stateManager.subscribe('game.state', (newState, oldState) => {
      if (oldState && !validTransitions[oldState]?.includes(newState)) {
        throw new Error(`Invalid transition from ${oldState} to ${newState}`);
      }
    });
    
    // Valid transition
    stateManager.setState('game.state', GAME_STATES.PLAYING);
    
    // Invalid transition
    expect(() => {
      stateManager.setState('game.state', GAME_STATES.GAME_OVER); // Playing -> GameOver is valid
      stateManager.setState('game.state', GAME_STATES.PAUSED);    // GameOver -> Paused is invalid
    }).toThrow('Invalid transition');
  });
});
```

### Testing Complex Interactions

```javascript
describe('Complex Interaction Patterns', () => {
  test('should handle player-enemy interaction', () => {
    // Set up initial state
    stateManager.setState('player', {
      health: 100,
      position: { x: 100, y: 100 },
      weapon: { damage: 25, range: 50 }
    });
    
    stateManager.setState('enemies', {
      1: { id: 1, health: 50, position: { x: 120, y: 110 } },
      2: { id: 2, health: 75, position: { x: 200, y: 200 } }
    });
    
    // Simulate attack logic
    function attackEnemy(enemyId) {
      const player = stateManager.getState('player');
      const enemy = stateManager.getState(`enemies.${enemyId}`);
      
      if (!enemy) return false;
      
      // Check range
      const distance = Math.sqrt(
        Math.pow(player.position.x - enemy.position.x, 2) +
        Math.pow(player.position.y - enemy.position.y, 2)
      );
      
      if (distance <= player.weapon.range) {
        const newHealth = enemy.health - player.weapon.damage;
        
        if (newHealth <= 0) {
          // Remove enemy
          const enemies = stateManager.getState('enemies');
          const newEnemies = { ...enemies };
          delete newEnemies[enemyId];
          stateManager.setState('enemies', newEnemies);
        } else {
          // Update enemy health
          stateManager.setState(`enemies.${enemyId}.health`, newHealth);
        }
        
        return true;
      }
      
      return false;
    }
    
    // Test attack on close enemy
    const hit1 = attackEnemy(1); // Close enemy
    expect(hit1).toBe(true);
    expect(stateManager.getState('enemies.1.health')).toBe(25);
    
    // Test attack on far enemy
    const hit2 = attackEnemy(2); // Far enemy
    expect(hit2).toBe(false);
    expect(stateManager.getState('enemies.2.health')).toBe(75);
    
    // Test killing enemy
    attackEnemy(1); // Second attack should kill
    expect(stateManager.getState('enemies.1')).toBeUndefined();
  });
});
```

---

## Debugging Test Issues

### Common Issues and Solutions

#### 1. Subscriptions Not Being Called

```javascript
// Problem: Subscription callback not called
test('debug subscription issue', () => {
  const callback = vi.fn();
  
  stateManager.subscribe('player.health', callback);
  stateManager.setState('player.health', 85);
  
  // Debug: Check if value actually changed
  console.log('Current value:', stateManager.getState('player.health'));
  console.log('Callback calls:', callback.mock.calls);
  
  expect(callback).toHaveBeenCalled();
});
```

#### 2. Async Test Failures

```javascript
// Problem: Async test timing issues
test('debug async issue', async () => {
  mockApi.mockImplementation(() => 
    new Promise(resolve => {
      console.log('Mock API called');
      setTimeout(() => {
        console.log('Mock API resolving');
        resolve({ data: 'test' });
      }, 100);
    })
  );
  
  console.log('Starting async operation');
  const result = await stateManager.setStateAsync('data', mockApi());
  console.log('Async operation completed:', result);
  
  expect(result).toBe(true);
});
```

#### 3. State Not Updating

```javascript
// Problem: State appears not to update
test('debug state update issue', () => {
  console.log('Initial state:', stateManager.getState());
  
  const changed = stateManager.setState('player.health', 85);
  console.log('setState returned:', changed);
  console.log('New state:', stateManager.getState());
  console.log('Health value:', stateManager.getState('player.health'));
  
  expect(changed).toBe(true);
});
```

### Debugging Tools for Tests

```javascript
// Enable debug mode for tests
beforeEach(() => {
  stateManager = new StateManager({
    enableDebugMode: true,
    enablePerformanceTracking: true
  });
});

// Add debug helper
function debugStateManager() {
  console.log('=== State Manager Debug ===');
  console.log('Current state:', stateManager.getState());
  console.log('Stats:', stateManager.getStats());
  console.log('Health:', stateManager.performHealthCheck());
  console.log('Can undo:', stateManager.canUndo());
  console.log('Can redo:', stateManager.canRedo());
  console.log('========================');
}

// Use in tests when debugging
test('debug test', () => {
  debugStateManager();
  
  stateManager.setState('test.value', 42);
  
  debugStateManager();
});
```

---

This testing guide provides comprehensive patterns and examples for testing applications that use our state management system. The key is to test behavior, not implementation, and to ensure your tests are isolated, fast, and reliable.
