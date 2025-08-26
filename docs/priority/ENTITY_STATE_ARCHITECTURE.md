# Entity-State Architecture

## 🎯 **Vision: Clean Centralized State with Stateless Entities**

This document defines our core architecture philosophy: **Centralized state management with stateless entity components**. The state drives the visual representation - when state changes, the canvas reflects those changes. Entities are pure functions that read from and write to centralized state.

## 🏗️ **Core Principles**

### **1. Single Source of Truth**
All game state lives in one centralized StateManager:
```javascript
const globalState = {
  player: { health: 100, x: 400, y: 300, sprite: 'player.png' },
  enemies: [{ id: 1, health: 50, x: 800, y: 200, ai: 'aggressive' }],
  game: { score: 0, level: 1, paused: false },
  ui: { menu: false, inventory: false }
}
```

### **2. Stateless Entities**
Entities are pure components that operate on global state - they hold NO internal state:
```javascript
const player = {
  // State access (READ)
  getHealth: () => stateManager.getState('player.health'),
  getPosition: () => ({ 
    x: stateManager.getState('player.x'), 
    y: stateManager.getState('player.y') 
  }),
  
  // State mutations (WRITE)
  takeDamage: (amount) => {
    const currentHealth = stateManager.getState('player.health')
    stateManager.setState('player.health', currentHealth - amount)
  },
  
  move: (dx, dy) => {
    stateManager.setState('player.x', stateManager.getState('player.x') + dx)
    stateManager.setState('player.y', stateManager.getState('player.y') + dy)
  },
  
  // Graphics & behavior (PURE FUNCTIONS)
  render: (ctx) => {
    const { x, y } = player.getPosition()
    const health = player.getHealth()
    
    // Draw sprite
    ctx.drawImage(player.sprite, x, y)
    
    // Draw health bar
    ctx.fillStyle = 'red'
    ctx.fillRect(x, y - 10, (health / 100) * 40, 5)
  },
  
  // Async capabilities
  async loadAssets() {
    player.sprite = new Image()
    player.sprite.src = '/assets/player.png'
    await new Promise(resolve => player.sprite.onload = resolve)
  }
}
```

### **3. Event-Driven Coordination**
Entities communicate through state changes and events:
```javascript
// Entity coordination through events
stateManager.eventDispatcher.on('state:player.health', ({ value }) => {
  if (value <= 0) {
    stateManager.setState('game.gameOver', true)
    // Trigger death animation, save score, etc.
  }
})

stateManager.eventDispatcher.on('state:game.score', ({ value }) => {
  if (value >= 1000) {
    stateManager.setState('game.level', stateManager.getState('game.level') + 1)
  }
})
```

## 🎮 **Architecture Benefits**

### **State-Driven Representation**
- Canvas visually represents the current state
- State changes automatically drive visual updates
- UI never modifies state directly - only events do
- Complete control through event-driven state mutations

### **Predictability**
- All state changes flow through setState()
- Easy to debug - state is in one place
- Time-travel debugging possible
- Replay systems trivial to implement

### **Modularity**
- Entities are independent, pure functions
- Easy to add/remove entities
- Clean separation of concerns
- Testable in isolation

### **Rich Graphics Integration**
- Entities can have sprites, animations, sounds
- Graphics are pure functions of state
- Async asset loading supported
- Multiple visual representations per entity possible

### **Performance**
- No deep object nesting in entities
- Immutable state updates
- Event-driven updates only when needed
- Easy to optimize specific paths

## 🛠️ **Implementation Guidelines**

### **StateManager API**
Simple, clean interface:
```javascript
// Reading state
const health = stateManager.getState('player.health')
const fullState = stateManager.getFullState()

// Writing state
stateManager.setState('player.health', 95)

// Subscribing to changes
const unsubscribe = stateManager.subscribe('player', (newValue, oldValue) => {
  console.log('Player state changed:', newValue)
})

// Events for coordination
stateManager.eventDispatcher.on('state:changed', ({ path, newValue }) => {
  // React to any state change
})
```

### **Entity Structure**
Every entity should follow this pattern:
```javascript
const entityName = {
  // 1. State Accessors (READ)
  getProperty: () => stateManager.getState('path.to.property'),
  
  // 2. State Mutators (WRITE)
  updateProperty: (value) => stateManager.setState('path.to.property', value),
  
  // 3. Graphics Assets
  sprite: null,
  animations: {},
  sounds: {},
  
  // 4. Pure Functions
  update: (deltaTime) => {
    // Game logic based on current state
    const currentState = entityName.getProperty()
    // Update logic here
  },
  
  render: (ctx) => {
    // Pure rendering based on current state
    const state = entityName.getProperty()
    // Draw based on state
  },
  
  // 5. Async Operations
  async initialize() {
    // Load assets, setup, etc.
  }
}
```

### **State Organization**
Organize state logically:
```javascript
const gameState = {
  // Game meta-state
  game: {
    paused: false,
    score: 0,
    level: 1,
    gameOver: false,
    difficulty: 'normal'
  },
  
  // Individual entities
  player: {
    health: 100,
    x: 400,
    y: 300,
    powerLevel: 1,
    inventory: []
  },
  
  // Collections of entities
  enemies: [
    { id: 1, health: 50, x: 800, y: 200, type: 'grunt' },
    { id: 2, health: 75, x: 900, y: 150, type: 'elite' }
  ],
  
  // UI state
  ui: {
    menu: false,
    inventory: false,
    dialogue: null
  },
  
  // System state
  audio: {
    enabled: true,
    volume: 0.7
  }
}
```

## 🔄 **Entity Lifecycle**

### **1. Initialization**
```javascript
// Entity registers itself in state
stateManager.setState('enemies', [
  ...stateManager.getState('enemies'),
  { id: generateId(), health: 50, x: 800, y: 200 }
])
```

### **2. Update Loop**
```javascript
// Entity updates based on current state
enemy.update = (deltaTime) => {
  const enemyState = stateManager.getState(`enemies.${enemy.id}`)
  const playerPos = stateManager.getState('player')
  
  // AI logic based on state
  const newX = moveTowards(enemyState.x, playerPos.x, deltaTime)
  stateManager.setState(`enemies.${enemy.id}.x`, newX)
}
```

### **3. Rendering**
```javascript
// Pure rendering function
enemy.render = (ctx) => {
  const enemyState = stateManager.getState(`enemies.${enemy.id}`)
  if (!enemyState) return // Entity destroyed
  
  ctx.drawImage(enemy.sprite, enemyState.x, enemyState.y)
}
```

### **4. Destruction**
```javascript
// Entity removes itself from state
const enemies = stateManager.getState('enemies')
const updatedEnemies = enemies.filter(e => e.id !== enemy.id)
stateManager.setState('enemies', updatedEnemies)
```

## 🚀 **Advanced Patterns**

### **Computed Properties**
```javascript
const player = {
  getHealth: () => stateManager.getState('player.health'),
  getMaxHealth: () => stateManager.getState('player.maxHealth'),
  
  // Computed property
  getHealthPercentage: () => {
    return (player.getHealth() / player.getMaxHealth()) * 100
  }
}
```

### **Entity Composition**
```javascript
// Mix behaviors into entities
const movable = {
  move: (entityPath, dx, dy) => {
    stateManager.setState(`${entityPath}.x`, stateManager.getState(`${entityPath}.x`) + dx)
    stateManager.setState(`${entityPath}.y`, stateManager.getState(`${entityPath}.y`) + dy)
  }
}

const renderable = {
  render: (entityPath, ctx, sprite) => {
    const { x, y } = stateManager.getState(entityPath)
    ctx.drawImage(sprite, x, y)
  }
}

// Compose entity
const enemy = {
  ...movable,
  ...renderable,
  // Entity-specific methods
}
```

### **State Middleware**
```javascript
// Add validation, logging, etc.
const originalSetState = stateManager.setState
stateManager.setState = (path, value) => {
  // Validation
  if (path.includes('health') && value < 0) {
    console.warn('Health cannot be negative')
    return
  }
  
  // Logging
  console.log(`State change: ${path} = ${value}`)
  
  // Call original
  return originalSetState(path, value)
}
```

## 📋 **Migration Strategy**

### **Phase 1: Core StateManager** ✅
- [x] Simplified StateManager implementation
- [x] Clean getState/setState API
- [x] Event system for coordination

### **Phase 2: Entity Refactoring**
- [ ] Convert Player to stateless entity
- [ ] Convert Enemies to stateless entities
- [ ] Convert Bullets to stateless entities
- [ ] Update rendering pipeline

### **Phase 3: Advanced Features**
- [ ] Entity composition system
- [ ] Asset management integration
- [ ] Performance optimizations
- [ ] Developer tools

### **Phase 4: Polish**
- [ ] Documentation examples
- [ ] Best practices guide
- [ ] Performance benchmarks

## 🎯 **Success Metrics**

- **Code Clarity**: Easy to understand entity responsibilities
- **Debuggability**: State changes are traceable
- **Performance**: No unnecessary re-renders or updates
- **Modularity**: Entities can be developed independently
- **Flexibility**: Easy to add new features and behaviors

---

**This architecture provides the foundation for a clean, scalable, and powerful game engine where:**

- **State is the single source of truth** - everything visual represents current state
- **Entities are pure functions** - they read state, execute logic, and write new state  
- **Canvas displays state** - visual representation is always in sync with state
- **Events control everything** - all changes flow through controlled state mutations
- **UI never drives state** - user input creates events, events modify state, state updates visuals

**The canvas becomes a perfect mirror of the centralized state, with full control through events.**
