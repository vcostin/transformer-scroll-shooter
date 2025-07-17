# Side Effects Architecture Guide

## 🎯 Overview

This document outlines the implementation of a Redux-Saga inspired side effects architecture for the Transformer Scroll Shooter game. The goal is to separate pure business logic from side effects, making the codebase more maintainable, testable, and scalable.

## 🧠 Core Concepts

### What are Side Effects?
Side effects are operations that interact with the outside world or have consequences beyond returning a value:
- **Async operations**: API calls, file I/O, timers
- **State mutations**: Updating global state, localStorage
- **External interactions**: DOM manipulation, sound playback
- **Analytics**: Tracking user behavior
- **Logging**: Error reporting, debug output

### Current Problem
```javascript
// Mixed concerns - hard to test and maintain
class Player {
  takeDamage(damage) {
    // Business logic
    this.health -= damage;
    
    // Side effects mixed in
    this.saveToLocalStorage();    // Persistence
    this.updateHealthBar();       // UI update
    this.playSound('hurt');       // Audio
    this.trackAnalytics('damage'); // Analytics
    
    if (this.health <= 0) {
      this.showGameOver();        // UI flow
    }
  }
}
```

### Solution: Separate Business Logic from Side Effects
```javascript
// Pure business logic - easy to test
class Player {
  takeDamage(damage) {
    this.health -= damage;
    
    // Just emit event - let effects handle the rest
    this.emit('player:damaged', { 
      player: this, 
      damage, 
      previousHealth: this.health + damage 
    });
  }
}

// Side effects in dedicated system
effectManager.effect('player:damaged', async (action, effects) => {
  const { player, damage } = action.payload;
  
  // Async operations with proper error handling
  await effects.call(saveToLocalStorage, player);
  await effects.call(updateHealthBar, player.health);
  
  // Fire and forget operations
  effects.fork(playSound, 'hurt');
  effects.fork(trackAnalytics, 'player_damaged', { damage });
  
  // Conditional flows
  if (player.health <= 0) {
    await effects.call(showGameOver);
    effects.put({ type: 'game:over', payload: { player } });
  }
});
```

## 🏗️ Architecture Components

### 1. Effect Manager
Central coordinator that:
- Listens to all events
- Matches events to effect handlers
- Runs effects with proper context
- Handles errors and cancellation

### 2. Effect Context
Provides Redux-Saga inspired operations:
- **`call(fn, ...args)`**: Await async function
- **`fork(fn, ...args)`**: Fire and forget
- **`put(action)`**: Dispatch new event
- **`take(eventType)`**: Wait for specific event
- **`select(selector)`**: Get data from state
- **`delay(ms)`**: Wait for specified time

### 3. Effect Handlers
Pure functions that define what side effects should occur:
- Receive action and effect context
- Use effect context to perform operations
- Can be async/await or generator functions

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Basic effect system working

**Tasks**:
1. Create `EffectManager` class
2. Implement basic `EffectContext` with `call` and `fork`
3. Integrate with existing `EventDispatcher`
4. Add effect registration system
5. Create basic tests

**Success Criteria**:
- Can register effects for events
- Effects execute when events fire
- Basic async operations work

### Phase 2: Core Features (Week 2)
**Goal**: Full effect context with control flow

**Tasks**:
1. Implement `put`, `take`, `select` operations
2. Add pattern matching for event types
3. Implement error handling and timeout
4. Add effect cancellation support
5. Create comprehensive tests

**Success Criteria**:
- All effect context operations work
- Can handle complex async flows
- Error handling prevents crashes

### Phase 3: Migration (Week 3)
**Goal**: Migrate existing side effects

**Tasks**:
1. Identify all side effects in current codebase
2. Create migration plan with priority order
3. Migrate Player entity side effects
4. Migrate Enemy entity side effects
5. Migrate UI and game flow side effects

**Success Criteria**:
- All identified side effects moved to effect system
- Entities contain only pure business logic
- All tests still pass

## 🔧 Technical Implementation

### Effect Manager Structure
```javascript
class EffectManager {
  constructor(eventDispatcher, stateManager) {
    this.eventDispatcher = eventDispatcher;
    this.stateManager = stateManager;
    this.effects = new Map();
    this.runningEffects = new Set();
  }
  
  // Register effect handler
  registerEffect(eventPattern, effectHandler) {
    if (!this.effects.has(eventPattern)) {
      this.effects.set(eventPattern, []);
    }
    this.effects.get(eventPattern).push(effectHandler);
  }
  
  // Handle incoming events
  async handleEvent(eventType, payload) {
    const matchingEffects = this.findMatchingEffects(eventType);
    
    const effectPromises = matchingEffects.map(effect => 
      this.runEffect(effect, { type: eventType, payload })
    );
    
    await Promise.allSettled(effectPromises);
  }
  
  // Execute effect with context
  async runEffect(effectHandler, action) {
    const context = new EffectContext(this);
    const effectId = Math.random().toString(36);
    
    try {
      this.runningEffects.add(effectId);
      await effectHandler(action, context);
    } catch (error) {
      console.error('Effect error:', error);
      // Error reporting effect
      this.handleEvent('effect:error', { error, action });
    } finally {
      this.runningEffects.delete(effectId);
    }
  }
}
```

### Effect Context Operations
```javascript
class EffectContext {
  constructor(effectManager) {
    this.effectManager = effectManager;
    this.eventDispatcher = effectManager.eventDispatcher;
    this.stateManager = effectManager.stateManager;
  }
  
  // Call async function and await result
  async call(fn, ...args) {
    return await fn(...args);
  }
  
  // Fork - fire and forget
  fork(fn, ...args) {
    fn(...args).catch(error => {
      console.error('Forked effect error:', error);
    });
  }
  
  // Dispatch new event
  put(action) {
    this.eventDispatcher.emit(action.type, action.payload);
  }
  
  // Wait for specific event
  async take(eventType, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.eventDispatcher.off(eventType, handler);
        reject(new Error(`take(${eventType}) timeout`));
      }, timeout);
      
      const handler = (payload) => {
        clearTimeout(timer);
        this.eventDispatcher.off(eventType, handler);
        resolve(payload);
      };
      
      this.eventDispatcher.on(eventType, handler);
    });
  }
  
  // Get data from state
  select(selector) {
    return selector(this.stateManager.getState());
  }
  
  // Wait for specified time
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 🎯 Migration Strategy

### Step 1: Identify Side Effects
Audit current codebase for:
- File I/O operations
- DOM manipulations
- Sound playback
- Analytics tracking
- State updates
- Async operations

### Step 2: Prioritize Migration
1. **High Impact, Low Risk**: Simple side effects like sound playback
2. **Medium Impact, Medium Risk**: UI updates and state persistence
3. **High Impact, High Risk**: Complex async flows and error handling

### Step 3: Gradual Migration
- Keep existing code working during migration
- Add effects alongside existing side effects
- Remove old side effects once new system is verified
- Update tests to use new architecture

## 📊 Benefits

### Immediate Benefits
- **Testability**: Pure business logic is easy to test
- **Maintainability**: Side effects are centralized
- **Debugging**: Clear separation of concerns
- **Code Quality**: Reduced coupling

### Long-term Benefits
- **Scalability**: Easy to add new side effects
- **Reliability**: Better error handling and recovery
- **Performance**: Optimized async operations
- **Features**: Enables advanced features like undo/redo

## 🧪 Testing Strategy

### Unit Testing
```javascript
// Test business logic without side effects
test('player takes damage', () => {
  const player = new Player();
  const eventSpy = jest.spyOn(player, 'emit');
  
  player.takeDamage(25);
  
  expect(player.health).toBe(75);
  expect(eventSpy).toHaveBeenCalledWith('player:damaged', {
    player,
    damage: 25,
    previousHealth: 100
  });
});

// Test effects separately
test('damage effect plays sound', async () => {
  const mockPlaySound = jest.fn();
  const mockContext = { fork: mockPlaySound };
  const action = { payload: { damage: 25 } };
  
  await damageEffect(action, mockContext);
  
  expect(mockPlaySound).toHaveBeenCalledWith(playSound, 'hurt');
});
```

### Integration Testing
```javascript
// Test complete flow
test('player damage triggers all effects', async () => {
  const player = new Player();
  const effectManager = new EffectManager(eventDispatcher, stateManager);
  
  // Register effects
  effectManager.registerEffect('player:damaged', damageEffect);
  
  // Spy on side effects
  const saveSpy = jest.spyOn(storage, 'save');
  const soundSpy = jest.spyOn(audio, 'play');
  
  // Trigger damage
  player.takeDamage(25);
  
  // Wait for effects
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Verify effects executed
  expect(saveSpy).toHaveBeenCalled();
  expect(soundSpy).toHaveBeenCalledWith('hurt');
});
```

## 🚀 Getting Started

1. **Review this document** and understand the concepts
2. **Start with Phase 1** - basic effect system
3. **Test thoroughly** at each phase
4. **Migrate incrementally** - don't break existing functionality
5. **Document patterns** as you discover them

## 📚 Resources

- **Redux-Saga Documentation**: https://redux-saga.js.org/
- **Effect Pattern Examples**: See `/examples/effects/` (to be created)
- **Migration Checklist**: See `/docs/SIDE_EFFECTS_MIGRATION.md` (to be created)

---

*This architecture will evolve as we implement and learn from real-world usage.*
