# Side Effects Migration Checklist

## 🎯 Overview
This document provides a systematic approach to migrating existing side effects to the new architecture. Use this checklist to ensure comprehensive migration without breaking existing functionality.

## 🔍 Phase 1: Discovery & Analysis

### Step 1: Identify Side Effects
Go through each file and mark side effects:

#### Player Entity (`src/entities/player.js`)
- [ ] `saveToLocalStorage()` calls
- [ ] UI updates (health bar, score display)
- [ ] Sound effects (hurt, power-up, death)
- [ ] Analytics tracking
- [ ] Achievement checks
- [ ] State manager updates

#### Enemy Entity (`src/entities/enemies/enemy.js`)
- [ ] Spawn notifications
- [ ] Death animations
- [ ] Sound effects
- [ ] Score updates
- [ ] Drop item creation
- [ ] State manager updates

#### UI Systems (`src/ui/`)
- [ ] Menu transitions
- [ ] Button click feedback
- [ ] Modal show/hide
- [ ] Animation triggers
- [ ] Sound effects
- [ ] State persistence

#### Game Core (`src/game/`)
- [ ] Level progression
- [ ] Save game state
- [ ] Load game state
- [ ] Pause/resume effects
- [ ] Game over handling

### Step 2: Create Side Effect Inventory
Create a comprehensive list with:
- **Location**: File and line number
- **Type**: UI, Audio, Storage, Analytics, etc.
- **Complexity**: Simple, Medium, Complex
- **Priority**: High, Medium, Low
- **Dependencies**: What it depends on

## 📋 Phase 2: Foundation Implementation

### Step 1: Core Effect System
- [ ] Create `EffectManager` class
- [ ] Implement `EffectContext` with basic operations
- [ ] Integrate with `EventDispatcher`
- [ ] Add effect registration system
- [ ] Create basic tests

### Step 2: Effect Context Operations
- [ ] Implement `call()` operation
- [ ] Implement `fork()` operation
- [ ] Implement `put()` operation
- [ ] Implement `take()` operation
- [ ] Implement `select()` operation
- [ ] Implement `delay()` operation

### Step 3: Pattern Matching
- [ ] Add glob pattern matching (`player:*`)
- [ ] Add wildcard matching (`*:damaged`)
- [ ] Add regex pattern support
- [ ] Test pattern matching thoroughly

## 🔧 Phase 3: Migration Implementation

### Priority 1: Simple Side Effects (Week 1)

#### Audio Effects
- [ ] Extract sound effects from Player
  - [ ] Hurt sound
  - [ ] Power-up sound
  - [ ] Death sound
  - [ ] Level up sound
- [ ] Extract sound effects from Enemy
  - [ ] Spawn sound
  - [ ] Death sound
  - [ ] Hit sound
- [ ] Extract UI sound effects
  - [ ] Button clicks
  - [ ] Menu transitions
  - [ ] Game over sound

#### Storage Operations
- [ ] Extract localStorage operations
  - [ ] Save player state
  - [ ] Save game progress
  - [ ] Save settings
  - [ ] Save high scores

#### Analytics Tracking
- [ ] Extract analytics calls
  - [ ] Player actions
  - [ ] Game events
  - [ ] Performance metrics
  - [ ] Error tracking

### Priority 2: Medium Side Effects (Week 2)

#### UI Updates
- [ ] Extract UI updates from Player
  - [ ] Health bar updates
  - [ ] Score display updates
  - [ ] Lives display updates
  - [ ] Experience bar updates
- [ ] Extract UI updates from Enemy
  - [ ] Enemy counter updates
  - [ ] Boss health bar
  - [ ] Mini-map updates
- [ ] Extract general UI updates
  - [ ] Menu state changes
  - [ ] Modal show/hide
  - [ ] Notification displays

#### State Management
- [ ] Extract state updates from entities
  - [ ] Player state updates
  - [ ] Enemy state updates
  - [ ] Game state updates
  - [ ] UI state updates

### Priority 3: Complex Side Effects (Week 3)

#### Async Flows
- [ ] Game initialization sequence
- [ ] Level loading sequence
- [ ] Save/load operations
- [ ] Network operations (if any)

#### Error Handling
- [ ] Error reporting
- [ ] Crash recovery
- [ ] State corruption handling
- [ ] Network error handling

#### Complex Interactions
- [ ] Achievement system
- [ ] Tutorial system
- [ ] Multiplayer hooks (future)
- [ ] Replay system (future)

## ✅ Migration Process per Side Effect

### Step 1: Identify
```javascript
// Current code with side effect
class Player {
  takeDamage(damage) {
    this.health -= damage;
    this.saveToLocalStorage();  // ← Side effect identified
    this.updateHealthBar();     // ← Side effect identified
    this.playSound('hurt');     // ← Side effect identified
  }
}
```

### Step 2: Create Effect Handler
```javascript
// Create dedicated effect handler
const playerDamageEffect = async (action, effects) => {
  const { player, damage } = action.payload;
  
  // Migrate side effects
  await effects.call(saveToLocalStorage, player);
  await effects.call(updateHealthBar, player.health);
  effects.fork(playSound, 'hurt');
};
```

### Step 3: Register Effect
```javascript
// Register effect handler
effectManager.registerEffect('player:damaged', playerDamageEffect);
```

### Step 4: Update Entity
```javascript
// Clean entity code
class Player {
  takeDamage(damage) {
    this.health -= damage;
    // Just emit event
    this.emit('player:damaged', { player: this, damage });
  }
}
```

### Step 5: Test
- [ ] Unit test entity logic
- [ ] Unit test effect handler
- [ ] Integration test full flow
- [ ] Performance test if needed

### Step 6: Cleanup
- [ ] Remove old side effect code
- [ ] Update related tests
- [ ] Update documentation
- [ ] Code review

## 🧪 Testing Checklist

### Unit Tests
- [ ] Entity business logic tests (without side effects)
- [ ] Effect handler tests (isolated)
- [ ] Effect context operation tests
- [ ] Pattern matching tests

### Integration Tests
- [ ] Event to effect flow tests
- [ ] Multiple effects for same event
- [ ] Effect error handling
- [ ] Effect cancellation

### Performance Tests
- [ ] Effect execution performance
- [ ] Memory usage patterns
- [ ] Event dispatch performance
- [ ] Large number of effects

## 📊 Migration Tracking

### Progress Metrics
- [ ] **Side Effects Identified**: ___ / ___
- [ ] **Simple Effects Migrated**: ___ / ___
- [ ] **Medium Effects Migrated**: ___ / ___
- [ ] **Complex Effects Migrated**: ___ / ___
- [ ] **Tests Updated**: ___ / ___
- [ ] **Documentation Updated**: ___ / ___

### Success Criteria
- [ ] All identified side effects migrated
- [ ] All tests passing
- [ ] No performance regression
- [ ] Code coverage maintained
- [ ] Documentation complete

## 🚨 Risk Mitigation

### Common Issues
- [ ] **Event ordering**: Ensure effects execute in correct order
- [ ] **Error propagation**: Handle effect errors gracefully
- [ ] **Memory leaks**: Ensure proper cleanup
- [ ] **Performance**: Monitor effect execution time

### Rollback Plan
- [ ] Keep old code commented until verification
- [ ] Feature flags for new/old behavior
- [ ] Automated tests for both paths
- [ ] Performance monitoring

## 🎯 Completion Criteria

### Phase 1 Complete
- [ ] Basic effect system working
- [ ] Can register and execute effects
- [ ] Basic tests passing
- [ ] Documentation updated

### Phase 2 Complete
- [ ] Full effect context implemented
- [ ] Pattern matching working
- [ ] Error handling robust
- [ ] Comprehensive tests

### Phase 3 Complete
- [ ] All side effects migrated
- [ ] Entities contain only business logic
- [ ] All tests updated and passing
- [ ] Performance benchmarks met
- [ ] Documentation complete

---

*Use this checklist to ensure systematic and thorough migration to the new side effects architecture.*
