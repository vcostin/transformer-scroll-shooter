# Performance Guide

## Overview

This guide provides comprehensive performance testing and optimization strategies for the Transformer Scroll Shooter game's event-driven architecture.

## Performance Targets

### Frame Rate
- **Target**: 60 FPS (16.67ms per frame)
- **Minimum**: 30 FPS (33.33ms per frame)
- **Dropped Frame Threshold**: < 5%

### Event System
- **Event Dispatch**: < 1ms average
- **High-Frequency Events**: < 2ms average
- **Event Listener Limit**: 1000 active listeners
- **Memory per Listener**: ~200 bytes

### Memory Usage
- **Initial Memory**: Baseline measurement
- **Growth Rate**: < 10% per session
- **Garbage Collection**: Minimal impact on frame rate

## Performance Testing

### Running Performance Tests

```bash
# Run all performance tests
npm test tests/performance/

# Run specific performance test
npm test tests/performance/event-system-performance.test.js

# Run with detailed output
npm test tests/performance/ -- --reporter=verbose
```

### Performance Profiling

```javascript
import { performanceProfiler } from './tests/performance/performance-profiler.js';

// Start profiling
performanceProfiler.startProfiling();

// Your code here
gameLoop();

// Stop and get report
const report = performanceProfiler.stopProfiling();
console.log(report);
```

### Benchmark Custom Code

```javascript
// Benchmark a function
const results = performanceProfiler.benchmark('myFunction', () => {
    myFunction();
}, 1000); // 1000 iterations

console.log(`Average time: ${results.average}ms`);
console.log(`95th percentile: ${results.p95}ms`);
```

## Optimization Strategies

### Event System Optimization

#### 1. Event Batching
```javascript
// Instead of emitting many events individually
enemies.forEach(enemy => {
    eventDispatcher.emit('enemy.moved', enemy);
});

// Batch events together
eventDispatcher.emit('enemies.moved', enemies);
```

#### 2. Event Listener Cleanup
```javascript
class MyComponent {
    constructor() {
        this.listeners = new Set();
    }
    
    addListener(event, handler) {
        eventDispatcher.on(event, handler);
        this.listeners.add({ event, handler });
    }
    
    destroy() {
        // Always clean up listeners
        this.listeners.forEach(({ event, handler }) => {
            eventDispatcher.off(event, handler);
        });
        this.listeners.clear();
    }
}
```

#### 3. Selective Event Processing
```javascript
// Use event filtering to reduce processing
eventDispatcher.on('game.update', (data) => {
    // Only process if relevant
    if (data.affectsUI) {
        updateUI(data);
    }
});
```

### State Management Optimization

#### 1. Reduce State Updates
```javascript
// Prefer batchUpdate for grouped changes
stateManager.batchUpdate([
    { path: 'player.x', value: newX },
    { path: 'player.y', value: newY },
    { path: 'player.health', value: newHealth }
], { skipEvents: false });
```

#### 2. Optimize Subscriptions
```javascript
// Use specific state paths
stateManager.subscribe('player.health', callback); // Good
stateManager.subscribe('player', callback); // Less optimal
```

### Memory Management

#### 1. Object Pooling
```javascript
class ObjectPool {
    constructor(createFn, resetFn) {
        this.pool = [];
        this.create = createFn;
        this.reset = resetFn;
    }
    
    get() {
        return this.pool.pop() || this.create();
    }
    
    release(obj) {
        this.reset(obj);
        this.pool.push(obj);
    }
}

// Usage
const bulletPool = new ObjectPool(
    () => new Bullet(),
    (bullet) => bullet.reset()
);
```

#### 2. Avoid Memory Leaks
```javascript
// Remove references when done
class GameComponent {
    destroy() {
        // Clear references
        this.game = null;
        this.eventDispatcher = null;
        this.stateManager = null;
        
        // Clear arrays
        this.enemies.length = 0;
        
        // Remove event listeners
        this.removeAllListeners();
    }
}
```

### DOM Optimization

#### 1. Minimize DOM Operations
```javascript
// Batch DOM updates
const updateBatch = [];
updateBatch.push(() => element.style.left = '100px');
updateBatch.push(() => element.style.top = '200px');

// Execute all at once
requestAnimationFrame(() => {
    updateBatch.forEach(update => update());
});
```

#### 2. Use Canvas for Game Graphics
```javascript
// Avoid DOM for game entities
// Use canvas for better performance
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Draw game objects directly on canvas
ctx.drawImage(spriteImage, player.x, player.y);
```

## Performance Monitoring

### Real-time Monitoring

```javascript
// Monitor frame rate
let frameCount = 0;
let lastTime = performance.now();

function gameLoop() {
    const now = performance.now();
    const deltaTime = now - lastTime;
    
    frameCount++;
    if (frameCount % 60 === 0) {
        const fps = 1000 / (deltaTime / 60);
        console.log(`Current FPS: ${fps.toFixed(1)}`);
    }
    
    lastTime = now;
    requestAnimationFrame(gameLoop);
}
```

### Memory Monitoring

```javascript
// Monitor memory usage
function checkMemory() {
    if (performance.memory) {
        const used = performance.memory.usedJSHeapSize / 1024 / 1024;
        const total = performance.memory.totalJSHeapSize / 1024 / 1024;
        console.log(`Memory: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB`);
    }
}

setInterval(checkMemory, 5000); // Check every 5 seconds
```

## Performance Regression Testing

### Automated Performance Tests

```javascript
// Set up performance regression tests
describe('Performance Regression', () => {
    const PERFORMANCE_BASELINE = {
        eventDispatch: 1.0, // ms
        frameTime: 16.67,   // ms
        memoryGrowth: 10    // %
    };
    
    it('should not regress event dispatch performance', () => {
        const results = measureEventDispatch();
        expect(results.average).toBeLessThan(PERFORMANCE_BASELINE.eventDispatch);
    });
});
```

### CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run performance tests
        run: npm run test:performance
      - name: Upload performance report
        uses: actions/upload-artifact@v2
        with:
          name: performance-report
          path: performance-report.json
```

## Troubleshooting Common Issues

### High Memory Usage

1. **Check for memory leaks**
   - Use Chrome DevTools Memory tab
   - Look for increasing heap size over time
   - Check for detached DOM nodes

2. **Event listener cleanup**
   - Ensure all event listeners are removed
   - Use WeakMap for object references
   - Clear timers and intervals

3. **Object pooling**
   - Implement pooling for frequently created objects
   - Reuse objects instead of creating new ones

### Low Frame Rate

1. **Profile the game loop**
   - Use Chrome DevTools Performance tab
   - Identify bottlenecks in the main thread
   - Optimize heavy computations

2. **Reduce rendering overhead**
   - Use requestAnimationFrame
   - Avoid unnecessary DOM manipulation
   - Use CSS transforms for animations

3. **Optimize event processing**
   - Reduce event frequency
   - Use event delegation
   - Debounce high-frequency events

### Event System Bottlenecks

1. **Too many listeners**
   - Audit event listener count
   - Remove unused listeners
   - Use more specific event names

2. **Complex event handlers**
   - Profile event handler execution time
   - Optimize handler logic
   - Use async processing for heavy operations

3. **Event data size**
   - Minimize event payload size
   - Use references instead of copying data
   - Implement event data compression

## Best Practices

### Code Organization

1. **Separate concerns**
   - Keep event handlers focused
   - Use dependency injection
   - Maintain clear module boundaries

2. **Use TypeScript**
   - Provides better optimization hints
   - Catches errors at compile time
   - Improves IDE performance

3. **Implement proper error handling**
   - Prevent event handler errors from crashing the game
   - Log performance issues
   - Provide fallback behaviors

### Testing Strategy

1. **Unit tests for performance**
   - Test individual components
   - Verify performance thresholds
   - Mock external dependencies

2. **Integration performance tests**
   - Test complete workflows
   - Verify system-wide performance
   - Test under load conditions

3. **End-to-end performance tests**
   - Test real user scenarios
   - Measure actual user experience
   - Validate on different devices

## Tools and Resources

### Development Tools

- **Chrome DevTools**: Performance profiling and memory analysis
- **Firefox Developer Tools**: Performance monitoring and debugging
- **Node.js Profiling**: `node --prof` for server-side profiling
- **Lighthouse**: Web performance auditing

### Libraries and Frameworks

- **Benchmark.js**: JavaScript benchmarking library
- **WebGL**: Hardware-accelerated graphics
- **Web Workers**: Background processing
- **SharedArrayBuffer**: Shared memory between threads

### Monitoring Services
 
## State Updates: Structural Sharing and Hot Paths

- State updates use structural sharing (path-copy shallow clones along the updated path) to minimize allocations.
- For ultra-hot update paths (like per-frame positions), pass `{ skipStats: true }` to avoid stats overhead:
```javascript
stateManager.setState('player.position', { x, y }, { skipStats: true });
```
- Use specific subscriptions (e.g., `player.position`) to limit recalculations caused by parent identity changes.

- **New Relic**: Application performance monitoring
- **DataDog**: Performance metrics and alerting
- **Sentry**: Error tracking and performance monitoring
- **LogRocket**: Session replay and performance insights

## Conclusion

Performance optimization is an ongoing process. Regular monitoring, testing, and optimization ensure the game maintains excellent performance as it evolves. Use this guide as a reference for implementing performance best practices and troubleshooting issues.

Remember:
- Measure before optimizing
- Focus on the biggest bottlenecks first
- Test performance changes thoroughly
- Monitor performance in production
- Keep performance requirements in mind during development
