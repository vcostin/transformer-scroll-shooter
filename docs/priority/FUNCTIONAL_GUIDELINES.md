# 🛠️ Functional Guidelines - Phase 5 Implementation Standards

> **Coding standards and patterns for Phase 5 functional migration**

## 🎯 Core Principles

### 1. Factory Functions Over Classes
**❌ Avoid:**
```javascript
class StateAsync {
  constructor(options) {
    this.options = options;
  }
  
  method() {
    return this.options.value;
  }
}
```

**✅ Prefer:**
```javascript
const createStateAsync = (options = {}) => {
  // Use closure variables instead of this.property
  const asyncOptions = { ...defaultOptions, ...options };
  
  // Return object with methods (functional API)
  return {
    method: () => asyncOptions.value,
    // Pure functions that don't mutate state
  }
}
```

### 2. Closure Variables Over `this` Keywords
**❌ Avoid:**
```javascript
this.property = value;
this.method = () => this.property;
```

**✅ Prefer:**
```javascript
const property = value;
const method = () => property;
```

### 3. Pure Functions for Business Logic
**❌ Avoid:**
```javascript
updateState() {
  this.state.value += 1; // Mutation
  return this.state;
}
```

**✅ Prefer:**
```javascript
const updateState = (currentState) => ({
  ...currentState,
  value: currentState.value + 1 // Immutable update
});
```

## 📋 Migration Patterns

### Pattern 1: Simple Class to Factory Function

**Before:**
```javascript
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
