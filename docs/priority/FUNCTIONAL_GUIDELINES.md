# 🛠️ Entity-State Guidelines - Architecture Implementation Standards

> **Coding standards and patterns for entity-state architecture implementation**

## 🎯 Core Principles

### 1. Stateless Entities Over Stateful Classes
**❌ Avoid:**
```javascript
class Player {
  constructor(x, y) {
    this.x = x;          // ❌ Internal state
    this.y = y;          // ❌ Internal state
    this.health = 100;   // ❌ Internal state
  }
  
  move(dx, dy) {
    this.x += dx;        // ❌ Mutating internal state
    this.y += dy;        // ❌ Mutating internal state
  }
}
```

**✅ Prefer:**
```javascript
const createPlayer = (stateManager) => {
  // Stateless entity - no internal state
  return {
    // Read from global state
    getPosition: () => ({
      x: stateManager.getState('player.x'),
      y: stateManager.getState('player.y')
    }),
    
    getHealth: () => stateManager.getState('player.health'),
    
    // Update global state
    move: (dx, dy) => {
      const currentX = stateManager.getState('player.x')
      const currentY = stateManager.getState('player.y')
      stateManager.setState('player.x', currentX + dx)
      stateManager.setState('player.y', currentY + dy)
    },
    
    // Pure rendering function
    render: (ctx) => {
      const { x, y } = player.getPosition()
      ctx.drawImage(playerSprite, x, y)
    }
  }
}
```

### 2. Centralized State Over Distributed State
**❌ Avoid:**
```javascript
// Multiple sources of truth
const player = { health: 100, x: 400 }      // ❌ Local state
const gameUI = { playerHealth: 100 }        // ❌ Duplicate state
const saveSystem = { currentHealth: 100 }   // ❌ State copies
```

**✅ Prefer:**
```javascript
// Single source of truth - state drives all visuals
const gameState = {
  player: {
    health: 100,
    x: 400,
    y: 300
  },
  enemies: [
    { id: 1, health: 50, x: 800, y: 200 }
  ],
  bullets: [
    { id: 1, x: 450, y: 300, vx: 10, vy: 0 }
  ]
}

// Canvas displays this state - state changes, canvas updates
stateManager.setState('player.health', 90)  // UI automatically reflects this
```

### 3. Entity Factories Over Direct Instantiation
**❌ Avoid:**
```javascript
// Creating entities with internal state
const enemy1 = new Enemy(800, 200, 'grunt')  // ❌ Class instantiation
const enemy2 = new Enemy(900, 150, 'elite')  // ❌ Internal enemy state
```

**✅ Prefer:**
```javascript
// Initialize entity state in global state
const enemies = {
  spawn: (x, y, type) => {
    const newEnemy = {
      id: generateId(),
      health: getHealthForType(type),
      x, y, type,
      ai: getAIForType(type)
    }
    
    const currentEnemies = stateManager.getState('enemies')
    stateManager.setState('enemies', [...currentEnemies, newEnemy])
    
    return newEnemy.id
  },
  
  // Stateless entity behavior
  update: (id, deltaTime) => {
    const enemyState = stateManager.getState('enemies').find(e => e.id === id)
    if (!enemyState) return
    
    // AI logic updates global state
    const newPosition = calculateAIMovement(enemyState, deltaTime)
    enemies.setPosition(id, newPosition.x, newPosition.y)
  }
}
```

### 4. Immutable State Updates Over Mutations
**❌ Avoid:**
```javascript
// Direct state mutation
const enemyState = stateManager.getState('enemies')[0]
enemyState.health -= 10  // ❌ Direct mutation
enemyState.x += 5        // ❌ Direct mutation
```

**✅ Prefer:**
```javascript
// Immutable state updates
const updateEnemyHealth = (id, damage) => {
  const enemies = stateManager.getState('enemies')
  const updatedEnemies = enemies.map(enemy => 
    enemy.id === id 
      ? { ...enemy, health: enemy.health - damage }  // ✅ Immutable update
      : enemy
  )
  stateManager.setState('enemies', updatedEnemies)
}
```

## 📋 Entity Architecture Patterns

### Pattern 1: Entity State Initialization

**Before (Class-based with internal state):**
```javascript
class Player {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.health = 100
    this.speed = 5
  }
}

const player = new Player(400, 300)
```

**After (State initialization):**
```javascript
// Initialize player state in StateManager
const initializePlayer = (x = 400, y = 300) => {
  stateManager.setState('player', {
    x, y,
    health: 100,
    maxHealth: 100,
    speed: 5,
    isAlive: true
  })
}

// Stateless player entity
const player = {
  getState: () => stateManager.getState('player'),
  getPosition: () => ({ 
    x: stateManager.getState('player.x'), 
    y: stateManager.getState('player.y') 
  }),
  
  move: (dx, dy) => {
    const current = player.getPosition()
    stateManager.setState('player.x', current.x + dx)
    stateManager.setState('player.y', current.y + dy)
  },
  
  takeDamage: (amount) => {
    const currentHealth = stateManager.getState('player.health')
    const newHealth = Math.max(0, currentHealth - amount)
    stateManager.setState('player.health', newHealth)
    
    if (newHealth === 0) {
      stateManager.setState('player.isAlive', false)
    }
  }
}
```

### Pattern 2: Entity Collection Management

**Before (Array of class instances):**
```javascript
class Enemy {
  constructor(x, y, type) {
    this.x = x
    this.y = y
    this.type = type
    this.health = 50
  }
}

const enemies = [
  new Enemy(800, 200, 'grunt'),
  new Enemy(900, 150, 'elite')
]
```

**After (State-managed collection):**
```javascript
// Initialize enemies in state
const initializeEnemies = () => {
  stateManager.setState('enemies', [])
}

// Stateless enemy management
const enemies = {
  spawn: (x, y, type) => {
    const newEnemy = {
      id: generateId(),
      x, y, type,
      health: getHealthForType(type),
      ai: getAIForType(type),
      isAlive: true
    }
    
    const current = stateManager.getState('enemies')
    stateManager.setState('enemies', [...current, newEnemy])
    return newEnemy.id
  },
  
  getById: (id) => {
    return stateManager.getState('enemies').find(e => e.id === id)
  },
  
  getAll: () => stateManager.getState('enemies'),
  
  updatePosition: (id, x, y) => {
    const current = stateManager.getState('enemies')
    const updated = current.map(enemy => 
      enemy.id === id ? { ...enemy, x, y } : enemy
    )
    stateManager.setState('enemies', updated)
  },
  
  remove: (id) => {
    const current = stateManager.getState('enemies')
    const filtered = current.filter(enemy => enemy.id !== id)
    stateManager.setState('enemies', filtered)
  }
}
```

### Pattern 3: Entity Behavior Systems

**Before (Method-based behavior):**
```javascript
class Enemy {
  update(deltaTime) {
    this.x += this.speed * deltaTime  // Internal state mutation
    this.checkCollisions()            // Mixed concerns
  }
  
  checkCollisions() {
    // Collision logic mixed with entity
  }
}
```

**After (Stateless behavior systems):**
```javascript
// Separate behavior systems
const enemyMovement = {
  update: (deltaTime) => {
    const enemies = stateManager.getState('enemies')
    const updatedEnemies = enemies.map(enemy => {
      const newX = enemy.x + (enemy.speed || 2) * deltaTime
      return { ...enemy, x: newX }
    })
    stateManager.setState('enemies', updatedEnemies)
  }
}

const enemyAI = {
  update: (deltaTime) => {
    const enemies = stateManager.getState('enemies')
    const playerPos = stateManager.getState('player')
    
    enemies.forEach(enemy => {
      const behavior = getAIBehavior(enemy.ai)
      const newState = behavior.calculate(enemy, playerPos, deltaTime)
      enemies.updatePosition(enemy.id, newState.x, newState.y)
    })
  }
}

const collisionSystem = {
  checkEnemyCollisions: () => {
    const enemies = stateManager.getState('enemies')
    const bullets = stateManager.getState('bullets')
    
    // Pure collision detection logic
    // Updates state through StateManager
  }
}
```
class SimpleClass {
  constructor(config) {
    this.config = config;
    this.initialized = false;
  }
  
  init() {
    this.initialized = true;
  }
  
  getValue() {
    return this.config.value;
  }
}

// Usage
const instance = new SimpleClass({ value: 42 });
```

**After:**
```javascript
const createSimpleClass = (config = {}) => {
  // Closure variables replace instance properties
  const classConfig = { ...config };
  let initialized = false;
  
  // Return functional API
  return {
    init: () => {
      initialized = true;
    },
    
    getValue: () => classConfig.value,
    
    isInitialized: () => initialized
  }
}

// Usage (same interface)
const instance = createSimpleClass({ value: 42 });
```

### Pattern 2: Class with Dependencies

**Before:**
```javascript
class ServiceClass {
  constructor(dependency1, dependency2) {
    this.dep1 = dependency1;
    this.dep2 = dependency2;
  }
  
  process(data) {
    const result1 = this.dep1.transform(data);
    return this.dep2.finalize(result1);
  }
}
```

**After:**
```javascript
const createServiceClass = (dependency1, dependency2) => {
  // Dependencies captured in closure
  const dep1 = dependency1;
  const dep2 = dependency2;
  
  return {
    process: (data) => {
      const result1 = dep1.transform(data);
      return dep2.finalize(result1);
    }
  }
}
```

### Pattern 3: Stateful Class with Methods

**Before:**
```javascript
class StatefulClass {
  constructor() {
    this.state = { count: 0 };
    this.listeners = [];
  }
  
  increment() {
    this.state.count++;
    this.notifyListeners();
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(cb => cb(this.state));
  }
}
```

**After:**
```javascript
const createStatefulClass = () => {
  // Mutable state in closure (when necessary)
  let state = { count: 0 };
  const listeners = [];
  
  const notifyListeners = () => {
    listeners.forEach(cb => cb({ ...state })); // Pass copy
  }
  
  return {
    increment: () => {
      state = { ...state, count: state.count + 1 }; // Immutable update
      notifyListeners();
    },
    
    addListener: (callback) => {
      listeners.push(callback);
    },
    
    getState: () => ({ ...state }) // Return copy
  }
}
```

## 🧪 Testing Considerations

### Maintain Existing Test Interface
```javascript
// If existing test expects:
const instance = new OriginalClass(config);
instance.method();

// New factory should work the same way:
const instance = createOriginalClass(config);
instance.method(); // Same interface
```

### Test Both APIs if Maintaining Compatibility
```javascript
describe('StateAsync', () => {
  // Test functional API
  describe('Functional API', () => {
    it('should work with factory function', () => {
      const async = createStateAsync(options);
      expect(async.method()).toBe(expected);
    });
  });
  
  // Test class API if maintaining backward compatibility
  describe('Class API (deprecated)', () => {
    it('should work with class constructor', () => {
      const async = new StateAsync(options);
      expect(async.method()).toBe(expected);
    });
  });
});
```

## 🔧 Advanced Patterns

### Curried Functions for Configuration
```javascript
const createConfigurableService = (baseConfig) => (specificConfig) => {
  const finalConfig = { ...baseConfig, ...specificConfig };
  
  return {
    process: (data) => {
      // Use finalConfig for processing
    }
  }
}

// Usage
const createHttpService = createConfigurableService({ timeout: 5000 });
const httpService = createHttpService({ url: 'api.example.com' });
```

### Higher-Order Functions for Behavior
```javascript
const withLogging = (serviceFactory) => (...args) => {
  const service = serviceFactory(...args);
  
  return {
    ...service,
    process: (data) => {
      console.log('Processing:', data);
      const result = service.process(data);
      console.log('Result:', result);
      return result;
    }
  }
}

// Usage
const createLoggingService = withLogging(createServiceClass);
```

### Functional Composition
```javascript
const compose = (...functions) => (value) =>
  functions.reduceRight((acc, fn) => fn(acc), value);

const pipeline = compose(
  step3,
  step2,
  step1
);

const result = pipeline(input);
```

## 🚨 Common Pitfalls to Avoid

### 1. Memory Leaks with Closures
**❌ Problematic:**
```javascript
const createService = () => {
  const expensiveResource = new LargeObject();
  
  return {
    smallMethod: () => 'small result'
    // expensiveResource is captured but not used
  }
}
```

**✅ Better:**
```javascript
const createService = () => {
  // Only capture what you need
  return {
    smallMethod: () => 'small result'
  }
}
```

### 2. Breaking Encapsulation
**❌ Problematic:**
```javascript
const createService = () => {
  const state = { value: 0 };
  
  return {
    getState: () => state // Returns reference!
  }
}
```

**✅ Better:**
```javascript
const createService = () => {
  const state = { value: 0 };
  
  return {
    getState: () => ({ ...state }) // Returns copy
  }
}
```

### 3. Overusing Closures
**❌ Problematic:**
```javascript
const createService = () => {
  return {
    method1: () => { /* complex logic */ },
    method2: () => { /* complex logic */ },
    // Many methods in closure
  }
}
```

**✅ Better:**
```javascript
// Extract pure functions
const method1Logic = (input) => { /* pure logic */ };
const method2Logic = (input) => { /* pure logic */ };

const createService = () => {
  return {
    method1: (input) => method1Logic(input),
    method2: (input) => method2Logic(input)
  }
}
```

## ✅ Quality Checklist

### Code Review Checklist:
- [ ] No `class` keywords in migrated files
- [ ] No `this` keywords in migrated files  
- [ ] No `new` keywords for object instantiation
- [ ] Factory functions return consistent APIs
- [ ] Closure variables used appropriately
- [ ] Memory leaks prevented (no unnecessary captures)
- [ ] Immutable data patterns used
- [ ] Pure functions for business logic
- [ ] Existing tests pass without modification
- [ ] Code analysis shows improvement

### Performance Checklist:
- [ ] No performance regression in migrated code
- [ ] Memory usage stable or improved
- [ ] Function creation patterns optimized
- [ ] Large objects not unnecessarily captured in closures

---

**Golden Rule**: If it worked as a class, it should work identically as a factory function.  
**Testing Rule**: All existing tests must pass without modification.  
**Performance Rule**: No performance regressions allowed.
