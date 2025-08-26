# 🎯 Functional Architecture Plan

## Your Requirements (Clarified)

✅ **Functions over Classes**: Prefer functional patterns, minimize `this` keyword  
✅ **Centralized State Manager**: Single source of truth  
✅ **Event-Driven Actions**: Redux-style actions that apply state changes  
✅ **One-Way Data Binding**: Game as state representation  
✅ **Currying & Dependency Injection**: Modern FP patterns  
✅ **Decision Logic**: State change logic with proper separation  
✅ **Mockable & Testable**: Unit tests with partial state mocking  
✅ **Edge Case Coverage**: Comprehensive test coverage  

## 🚨 Current Problems

1. **Heavy `this` usage** in Game class (1400+ lines)
2. **Multiple StateManager implementations** (confusion)
3. **No currying/DI patterns** anywhere
4. **State decisions scattered** (like pause logic)
5. **Hard to test** (can't mock partial state easily)

## 🔧 Implementation Strategy

### **Phase 1: Functional State Management** (2-3 days)

#### **Curried Action Creators with DI**:
```javascript
// Current (bad): class with this
class GameSystem {
  constructor(stateManager) { this.stateManager = stateManager }
  pauseGame() { this.stateManager.setState('paused', true) }
}

// Better: Curried functions with DI
const createGameActions = (stateManager) => (eventDispatcher) => ({
  pauseGame: (reason) => (currentState) => {
    // Decision logic with state access
    if (currentState.ui.optionsMenuOpen && reason !== 'menu') {
      return currentState // Menu takes priority
    }
    return stateManager.setState('game.paused', true)(currentState)
  }
})

const gameActions = createGameActions(stateManager)(eventDispatcher)
```

#### **State-Driven Decision Logic**:
```javascript
// Pure functions for game rules
const canResumeGame = (state) => !state.ui.optionsMenuOpen
const shouldSpawnEnemy = (state) => !state.game.paused && state.enemies.length < 5

// Curried business logic
const createGameRules = (config) => ({
  canResume: canResumeGame,
  shouldSpawn: shouldSpawnEnemy,
  calculateScore: (points) => (state) => state.score + points * config.multiplier
})
```

#### **Mockable Testing**:
```javascript
// Easy partial state testing
const mockState = { 
  game: { paused: false }, 
  ui: { optionsMenuOpen: true } 
}

const pauseAction = gameActions.pauseGame('system')
const result = pauseAction(mockState)
expect(result.game.paused).toBe(false) // Menu priority works
```

### **Phase 2: Functional Game Loop** (3-4 days)

#### **Pure Update Functions**:
```javascript
// Instead of Game.update() with lots of this
const createGameLoop = (systems) => (deltaTime) => (currentState) => {
  const updatePlayer = systems.player.update(deltaTime)
  const updateEnemies = systems.enemies.update(deltaTime)
  const updateBullets = systems.bullets.update(deltaTime)
  
  return pipe(
    updatePlayer,
    updateEnemies, 
    updateBullets,
    systems.collision.check,
    systems.scoring.calculate
  )(currentState)
}
```

#### **Curried System Functions**:
```javascript
const createAudioSystem = (audioContext) => (settings) => ({
  playSound: (soundId) => (state) => {
    if (!state.settings.audioEnabled) return state
    // Play sound logic
    return state
  }
})

const audioSystem = createAudioSystem(audioContext)(audioSettings)
```

### **Phase 3: Effects for Side Effects** (2-3 days)

#### **Pure vs Side Effects Separation**:
```javascript
// Pure state changes
const addBullet = (bullet) => (state) => ({
  ...state,
  bullets: [...state.bullets, bullet]
})

// Side effects handled separately
const audioEffects = createAudioEffects(audioSystem)
const renderEffects = createRenderEffects(renderer)

// Effect system coordinates side effects
effectManager.onStateChange('bullets.length', audioEffects.playShootSound)
effectManager.onStateChange('score', renderEffects.updateScoreDisplay)
```

## 🎯 Solving Current Pause Problem

With this architecture, the pause problem becomes trivial:

```javascript
// Centralized pause logic with state access
const pauseReducer = (action) => (currentState) => {
  switch (action.type) {
    case 'PAUSE_GAME':
      if (currentState.ui.optionsMenuOpen && action.source !== 'menu') {
        return currentState // Menu takes priority
      }
      return { ...currentState, game: { ...currentState.game, paused: true } }
      
    case 'RESUME_GAME':
      if (currentState.ui.optionsMenuOpen) {
        return currentState // Can't resume while menu open
      }
      return { ...currentState, game: { ...currentState.game, paused: false } }
  }
}

// All pause/resume goes through this - no conflicts!
```

## 🚀 Immediate Next Steps

1. **Start Small**: Convert one system (like audio) to functional + curried pattern
2. **Create State Mocking Utilities**: For comprehensive testing
3. **Implement Action-Based State Changes**: Redux-style dispatch
4. **Add Currying Examples**: Show the pattern for other systems
5. **Remove `this` Dependencies**: Convert Game class methods to pure functions

This approach gives you:
- ✅ **Testable logic** with partial state mocking
- ✅ **Centralized decisions** (no more pause conflicts)  
- ✅ **Currying & DI** patterns throughout
- ✅ **Functions over classes** (minimal `this`)
- ✅ **One-way data flow** (state drives everything)

The pause problem and similar architectural issues will disappear because state changes become predictable and centralized.
