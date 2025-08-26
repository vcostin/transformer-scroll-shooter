# 🎯 Next Priorities - Immediate Action Items

> **Quick reference for starting Phase 5 functional migration**

## 🔴 HIGH PRIORITY - Start Here (Phase 5a)

### 1. StateAsync.js Migration 
**File**: `src/systems/StateAsync.js`  
**Issue**: 75+ `this` keyword violations, ES6 class structure  
**Effort**: 2-3 days  
**Risk**: Low (standalone system with good test coverage)

**Key Problems**:
- Line 14: `constructor(options = {}, callbacks = {})`
- Line 16: Multiple `this.options`, `this.callbacks` usage throughout
- Class-based structure needs complete factory function conversion

**Target Pattern**:
```javascript
// Replace class with factory function
const createStateAsync = (options = {}, callbacks = {}) => {
  // Use closure variables instead of this.property
  const asyncOptions = { ...defaultOptions, ...options };
  const asyncCallbacks = { ...defaultCallbacks, ...callbacks };
  
  return {
    // Return functional API
  }
}
```

**Tests to Maintain**: 19 tests in `StateAsync.test.js`

### 2. EffectContext.js Migration
**File**: `src/systems/EffectContext.js`  
**Issue**: ES6 class with 25+ `this` violations  
**Effort**: 1-2 days  
**Risk**: Medium (integrates with EffectManager)

**Key Problems**:
- Line 5: `class EffectContext {`
- Line 6: `constructor(effectManager, eventDispatcher) {`
- Line 7: Multiple `this.effectManager`, `this.eventDispatcher` usage

**Target Pattern**:
```javascript
// Replace with factory function
const createEffectContext = (effectManager, eventDispatcher) => {
  // Use closure variables for state
  return {
    // Functional API methods
  }
}
```

**Tests to Maintain**: 10 tests in `EffectContext.test.js`

### 3. Enemy.js Large Refactoring
**File**: `src/entities/enemies/enemy.js`  
**Issue**: Large ES6 class (1400+ lines)  
**Effort**: 3-4 days  
**Risk**: High (complex game entity with many dependencies)

**Key Problems**:
- Line 1405: `class Enemy {`
- Line 1406: `constructor(game, x, y, type) {`
- Extensive use of `this` throughout large codebase

**Strategy**: Break into smaller functional modules first:
1. Enemy state management
2. Enemy behavior patterns  
3. Enemy rendering
4. Enemy collision detection

**Tests to Maintain**: 19 tests in `enemy.test.js`

## 🟡 MEDIUM PRIORITY (Phase 5b)

### 4. UI Layer Migration
**Files**: `src/ui/*.js`  
**Issues**: Multiple `new` keyword usage, direct DOM access  
**Effort**: 1 week total  
**Approach**: Convert to canvas-based functional patterns

**Priority Order**:
1. `options.js` - Most `new` keyword violations
2. `UIManager.js` - Core UI coordination
3. `MenuSystem.js` - Menu functionality
4. `InputHandler.js` - Input management
5. `DisplayManager.js` - Display coordination

### 5. Rendering Layer Enhancement  
**Files**: `src/rendering/*.js`, `src/utils/parallax*.js`  
**Issues**: `new` keyword usage in rendering pipeline  
**Effort**: 2-3 days

### 6. Utility Functions
**Files**: Various `src/utils/*.js`, `src/constants/*.js`  
**Issues**: Scattered `new` keyword and `this` usage  
**Effort**: 1-2 days

## 🟢 LOW PRIORITY (Phase 5c)

### 7. Promise Error Handling
**Files**: `src/systems/EffectManager.js`, `src/systems/EffectContext.js`  
**Issue**: Missing `.catch()` handlers  
**Effort**: Half day

### 8. Main Entry Point Cleanup
**File**: `src/main.js`  
**Issue**: Unused imports, potential factory patterns  
**Effort**: 1-2 hours

## 📋 Implementation Checklist

### Before Starting Each File:
- [ ] Read existing tests to understand expected behavior
- [ ] Run tests to establish baseline: `npm test -- <file>.test.js`
- [ ] Create backup branch: `git checkout -b feature/migrate-<filename>`

### During Migration:
- [ ] Replace `class` with factory function
- [ ] Replace `this.property` with closure variables
- [ ] Replace `new Constructor()` with `createConstructor()`
- [ ] Maintain all existing APIs for backward compatibility
- [ ] Run tests frequently: `npm test -- <file>.test.js`

### After Migration:
- [ ] All tests pass: `npm test`
- [ ] Code analysis improves: `npm run analyze`
- [ ] No new `this` keywords: Search for "this\\." regex
- [ ] No new `class` declarations: Search for "^class " regex
- [ ] Memory leak check: Verify cleanup patterns

## 🎯 Success Validation

### Per-File Completion Criteria:
1. ✅ All existing tests pass
2. ✅ No `this` keywords in migrated file
3. ✅ No `class` declarations in migrated file
4. ✅ Factory function pattern implemented
5. ✅ Backward compatibility maintained
6. ✅ Code analysis shows improvement

### Overall Phase 5 Success:
- **Phase 5a**: Zero ES6 classes in core systems
- **Phase 5b**: Consistent functional patterns across UI
- **Phase 5c**: Complete functional architecture

## 🔧 Development Environment Setup

```bash
# Start development environment
npm run dev

# Run specific file tests
npm test -- src/systems/StateAsync.test.js

# Check code quality  
npm run analyze

# Run all tests
npm test

# Format code
npm run format
```

## 📞 Quick Reference Commands

```bash
# Find remaining this keywords
grep -r "this\." src/ --include="*.js"

# Find remaining classes
grep -r "^class " src/ --include="*.js"

# Find remaining new keywords  
grep -r "new [A-Z]" src/ --include="*.js"

# Check specific file violations
npm run analyze | grep "filename.js"
```

---

**Start Point**: `StateAsync.js` migration (highest priority, lowest risk)  
**Next Step**: Run `npm test -- src/systems/StateAsync.test.js` to establish baseline  
**Goal**: Maintain 100% test success throughout Phase 5 migration
