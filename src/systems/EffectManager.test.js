import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EffectManager } from '@/systems/EffectManager.js';
import { EffectContext } from '@/systems/EffectContext.js';

describe('EffectManager', () => {
  let effectManager;
  let mockEventDispatcher;

  beforeEach(() => {
    // Use fake timers for deterministic testing
    vi.useFakeTimers();
    // Create mock event dispatcher
    mockEventDispatcher = {
      emit: vi.fn().mockReturnValue(true),
      on: vi.fn().mockReturnValue(() => {}),
      once: vi.fn().mockReturnValue(() => {}),
      off: vi.fn()
    };

    effectManager = new EffectManager(mockEventDispatcher);
  });

  afterEach(() => {
    if (effectManager.isRunning) {
      effectManager.stop();
    }
    vi.clearAllMocks();
    // Restore real timers after each test
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(effectManager.eventDispatcher).toBe(mockEventDispatcher);
      expect(effectManager.effects).toBeInstanceOf(Map);
      expect(effectManager.runningEffects).toBeInstanceOf(Set);
      expect(effectManager.forkedEffects).toBeInstanceOf(Set);
      expect(effectManager.timeouts).toBeInstanceOf(Set);
      expect(effectManager.isRunning).toBe(false);
      expect(effectManager.debugMode).toBe(false);
    });
  });

  describe('effect()', () => {
    it('should register effect handler for string pattern', () => {
      const handler = vi.fn();
      
      const unsubscribe = effectManager.effect('test:event', handler);
      
      expect(typeof unsubscribe).toBe('function');
      expect(effectManager.effects.size).toBe(1);
    });

    it('should register effect handler for regex pattern', () => {
      const handler = vi.fn();
      const pattern = /^test:.*/;
      
      effectManager.effect(pattern, handler);
      
      expect(effectManager.effects.size).toBe(1);
    });

    it('should register multiple handlers for same pattern', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      effectManager.effect('test:event', handler1);
      effectManager.effect('test:event', handler2);
      
      expect(effectManager.effects.size).toBe(1);
      const effectEntry = Array.from(effectManager.effects.values())[0];
      expect(effectEntry.handlers.length).toBe(2);
    });

    it('should sort handlers by priority', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      effectManager.effect('test:event', handler1, { priority: 1 });
      effectManager.effect('test:event', handler2, { priority: 3 });
      effectManager.effect('test:event', handler3, { priority: 2 });
      
      const effectEntry = Array.from(effectManager.effects.values())[0];
      expect(effectEntry.handlers[0].priority).toBe(3);
      expect(effectEntry.handlers[1].priority).toBe(2);
      expect(effectEntry.handlers[2].priority).toBe(1);
    });

    it('should throw error if pattern is invalid', () => {
      expect(() => effectManager.effect(null, () => {})).toThrow(
        'Effect pattern must be a string or RegExp'
      );
      expect(() => effectManager.effect(123, () => {})).toThrow(
        'Effect pattern must be a string or RegExp'
      );
    });

    it('should throw error if handler is not a function', () => {
      expect(() => effectManager.effect('test:event', 'not a function')).toThrow(
        'Effect handler must be a function'
      );
    });

    it('should return unsubscribe function that removes handler', () => {
      const handler = vi.fn();
      
      const unsubscribe = effectManager.effect('test:event', handler);
      expect(effectManager.effects.size).toBe(1);
      
      unsubscribe();
      expect(effectManager.effects.size).toBe(0);
    });

    it('should handle once option correctly', () => {
      const handler = vi.fn();
      
      effectManager.effect('test:event', handler, { once: true });
      
      const effectEntry = Array.from(effectManager.effects.values())[0];
      expect(effectEntry.handlers[0].once).toBe(true);
    });
  });

  describe('start()', () => {
    it('should start effect manager and hook into event dispatcher', () => {
      const originalEmit = mockEventDispatcher.emit;
      
      effectManager.start();
      
      expect(effectManager.isRunning).toBe(true);
      expect(effectManager._originalEmit).toBeDefined();
      expect(mockEventDispatcher.emit).not.toBe(originalEmit);
      expect(mockEventDispatcher.on).toHaveBeenCalledWith('game:cleanup', expect.any(Function));
      expect(mockEventDispatcher.on).toHaveBeenCalledWith('game:pause', expect.any(Function));
      expect(mockEventDispatcher.on).toHaveBeenCalledWith('game:resume', expect.any(Function));
    });

    it('should not start if already running', () => {
      effectManager.start();
      const firstEmit = mockEventDispatcher.emit;
      
      effectManager.start();
      
      expect(mockEventDispatcher.emit).toBe(firstEmit);
    });
  });

  describe('stop()', () => {
    it('should stop effect manager and restore original emit', () => {
      const originalEmit = mockEventDispatcher.emit;
      effectManager.start();
      const interceptedEmit = mockEventDispatcher.emit;
      
      effectManager.stop();
      
      expect(effectManager.isRunning).toBe(false);
      expect(mockEventDispatcher.emit).not.toBe(interceptedEmit);
      expect(mockEventDispatcher.off).toHaveBeenCalledWith('game:cleanup', expect.any(Function));
      expect(mockEventDispatcher.off).toHaveBeenCalledWith('game:pause', expect.any(Function));
      expect(mockEventDispatcher.off).toHaveBeenCalledWith('game:resume', expect.any(Function));
    });

    it('should not stop if not running', () => {
      effectManager.stop();
      
      expect(effectManager.isRunning).toBe(false);
    });
  });

  describe('_interceptEmit()', () => {
    beforeEach(() => {
      effectManager.start();
    });

    it('should call original emit and trigger effects', () => {
      const handler = vi.fn();
      effectManager.effect('test:event', handler);
      
      // Mock the original emit
      effectManager._originalEmit = vi.fn(() => true);
      
      const result = effectManager._interceptEmit('test:event', { data: 'test' });
      
      expect(effectManager._originalEmit).toHaveBeenCalledWith('test:event', { data: 'test' }, {});
      expect(result).toBe(true);
    });

    it('should trigger matching effects', async () => {
      const handler = vi.fn();
      effectManager.effect('test:event', handler);
      
      effectManager._interceptEmit('test:event', { data: 'test' });
      
      // Wait for effects to complete using fake timers
      vi.advanceTimersByTime(20);
      await Promise.resolve();
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test:event',
          payload: { data: 'test' },
          timestamp: expect.any(Number)
        }),
        expect.any(EffectContext)
      );
    });
  });

  describe('_triggerEffects()', () => {
    it('should trigger effects matching event name', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      effectManager.effect('test:event', handler1);
      effectManager.effect('other:event', handler2);
      
      effectManager._triggerEffects('test:event', { data: 'test' });
      
      // Wait for effects to complete using fake timers
      vi.advanceTimersByTime(20);
      await Promise.resolve();
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should execute effects in priority order', async () => {
      const execution = [];
      const handler1 = vi.fn(() => execution.push('handler1'));
      const handler2 = vi.fn(() => execution.push('handler2'));
      const handler3 = vi.fn(() => execution.push('handler3'));
      
      effectManager.effect('test:event', handler1, { priority: 1 });
      effectManager.effect('test:event', handler2, { priority: 3 });
      effectManager.effect('test:event', handler3, { priority: 2 });
      
      effectManager._triggerEffects('test:event', { data: 'test' });
      
      // Wait for effects to complete using fake timers
      vi.advanceTimersByTime(20);
      await Promise.resolve();
      
      expect(execution).toEqual(['handler2', 'handler3', 'handler1']);
    });

    it('should remove once effects after execution', async () => {
      const handler = vi.fn();
      
      effectManager.effect('test:event', handler, { once: true });
      expect(effectManager.effects.size).toBe(1);
      
      effectManager._triggerEffects('test:event', { data: 'test' });
      
      // Wait for effects to complete using fake timers
      vi.advanceTimersByTime(20);
      await Promise.resolve();
      
      expect(handler).toHaveBeenCalled();
      expect(effectManager.effects.size).toBe(0);
    });

    it('should handle effects that throw errors', async () => {
      const handler = vi.fn(() => {
        throw new Error('Effect error');
      });
      
      effectManager.effect('test:event', handler);
      effectManager._originalEmit = vi.fn();
      
      effectManager._triggerEffects('test:event', { data: 'test' });
      
      // Wait for effects to complete using fake timers
      vi.advanceTimersByTime(20);
      await Promise.resolve();
      
      expect(effectManager._originalEmit).toHaveBeenCalledWith('effect:execution:error', expect.objectContaining({
        eventName: 'test:event',
        error: expect.any(Error)
      }));
    });
  });

  describe('_getMatchingEffects()', () => {
    it('should return effects matching string pattern', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      effectManager.effect('test:event', handler1);
      effectManager.effect('other:event', handler2);
      
      const matches = effectManager._getMatchingEffects('test:event');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].fn).toBe(handler1);
    });

    it('should return effects matching wildcard pattern', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      effectManager.effect('test:*', handler1);
      effectManager.effect('other:*', handler2);
      
      const matches = effectManager._getMatchingEffects('test:event');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].fn).toBe(handler1);
    });

    it('should return effects matching regex pattern', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      effectManager.effect(/^test:.*/, handler1);
      effectManager.effect(/^other:.*/, handler2);
      
      const matches = effectManager._getMatchingEffects('test:event');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].fn).toBe(handler1);
    });

    it('should return effects sorted by priority', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      effectManager.effect('test:event', handler1, { priority: 1 });
      effectManager.effect('test:event', handler2, { priority: 3 });
      effectManager.effect('test:event', handler3, { priority: 2 });
      
      const matches = effectManager._getMatchingEffects('test:event');
      
      expect(matches).toHaveLength(3);
      expect(matches[0].priority).toBe(3);
      expect(matches[1].priority).toBe(2);
      expect(matches[2].priority).toBe(1);
    });
  });

  describe('cancelAllEffects()', () => {
    it('should clear all running effects and timeouts', () => {
      // Add some mock running effects
      effectManager.runningEffects.add(Promise.resolve());
      effectManager.forkedEffects.add(Promise.resolve());
      effectManager.timeouts.add(123);
      
      // Mock clearTimeout
      global.clearTimeout = vi.fn();
      
      effectManager.cancelAllEffects();
      
      expect(effectManager.runningEffects.size).toBe(0);
      expect(effectManager.forkedEffects.size).toBe(0);
      expect(effectManager.timeouts.size).toBe(0);
      expect(global.clearTimeout).toHaveBeenCalledWith(123);
    });
  });

  describe('trackForkedEffect()', () => {
    it('should track forked effect and remove when completed', async () => {
      const promise = Promise.resolve('test');
      
      effectManager.trackForkedEffect(promise);
      
      expect(effectManager.forkedEffects.has(promise)).toBe(true);
      
      await promise;
      vi.advanceTimersByTime(0);
      await Promise.resolve();
      
      expect(effectManager.forkedEffects.has(promise)).toBe(false);
    });
  });

  describe('trackTimeout()', () => {
    it('should track timeout and remove after completion', async () => {
      const timeoutId = 123;
      
      effectManager.trackTimeout(timeoutId);
      
      expect(effectManager.timeouts.has(timeoutId)).toBe(true);
      
      // Wait for timeout to complete using fake timers
      vi.advanceTimersByTime(20);
      await Promise.resolve();
      
      expect(effectManager.timeouts.has(timeoutId)).toBe(false);
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      effectManager.effect('test:event', handler1);
      effectManager.effect('other:event', handler2);
      effectManager.runningEffects.add(Promise.resolve());
      effectManager.forkedEffects.add(Promise.resolve());
      effectManager.timeouts.add(123);
      
      const stats = effectManager.getStats();
      
      expect(stats).toEqual({
        registeredEffects: 2,
        runningEffects: 1,
        forkedEffects: 1,
        activeTimeouts: 1,
        isRunning: false
      });
    });
  });

  describe('setDebugMode()', () => {
    it('should enable debug mode', () => {
      effectManager.setDebugMode(true);
      
      expect(effectManager.debugMode).toBe(true);
    });

    it('should disable debug mode', () => {
      effectManager.setDebugMode(false);
      
      expect(effectManager.debugMode).toBe(false);
    });
  });

  describe('_generateId()', () => {
    it('should generate unique IDs', () => {
      const id1 = effectManager._generateId();
      const id2 = effectManager._generateId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^effect_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^effect_\d+_[a-z0-9]+$/);
    });
  });

  describe('_debug()', () => {
    it('should log when debug mode is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      effectManager.setDebugMode(true);
      
      effectManager._debug('test message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith('[EffectManager]', 'test message', { data: 'test' });
      
      consoleSpy.mockRestore();
    });

    it('should not log when debug mode is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      effectManager.setDebugMode(false);
      
      effectManager._debug('test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});
