import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventDispatcher } from '@/systems/EventDispatcher.js';

describe('EventDispatcher', () => {
  let dispatcher;
  
  beforeEach(() => {
    dispatcher = new EventDispatcher();
  });

  describe('Constructor', () => {
    it('should create a new instance with empty listeners', () => {
      expect(dispatcher.listeners).toBeDefined();
      expect(dispatcher.listeners.size).toBe(0);
      expect(dispatcher.eventHistory).toEqual([]);
      expect(dispatcher.debugMode).toBe(false);
    });
  });

  describe('on() method', () => {
    it('should add a listener for an event', () => {
      const handler = vi.fn();
      dispatcher.on('test.event', handler);
      
      expect(dispatcher.getListenerCount('test.event')).toBe(1);
    });

    it('should return an unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('test.event', handler);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(dispatcher.getListenerCount('test.event')).toBe(0);
    });

    it('should throw error for invalid event name', () => {
      expect(() => dispatcher.on('', vi.fn())).toThrow('Event name must be a non-empty string');
      expect(() => dispatcher.on(123, vi.fn())).toThrow('Event name must be a non-empty string');
      expect(() => dispatcher.on(null, vi.fn())).toThrow('Event name must be a non-empty string');
    });

    it('should throw error for invalid handler', () => {
      expect(() => dispatcher.on('test', 'not-a-function')).toThrow('Handler must be a function');
      expect(() => dispatcher.on('test', 123)).toThrow('Handler must be a function');
      expect(() => dispatcher.on('test', null)).toThrow('Handler must be a function');
    });

    it('should sort listeners by priority', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      dispatcher.on('test', handler1, { priority: 1 });
      dispatcher.on('test', handler2, { priority: 10 });
      dispatcher.on('test', handler3, { priority: 5 });
      
      dispatcher.emit('test');
      
      // Higher priority should be called first
      expect(handler2).toHaveBeenCalledBefore(handler3);
      expect(handler3).toHaveBeenCalledBefore(handler1);
    });

    it('should handle multiple listeners for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      dispatcher.on('test', handler1);
      dispatcher.on('test', handler2);
      
      expect(dispatcher.getListenerCount('test')).toBe(2);
    });
  });

  describe('once() method', () => {
    it('should add a one-time listener', () => {
      const handler = vi.fn();
      dispatcher.once('test.event', handler);
      
      expect(dispatcher.getListenerCount('test.event')).toBe(1);
      
      dispatcher.emit('test.event');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(dispatcher.getListenerCount('test.event')).toBe(0);
    });

    it('should remove listener after first call', () => {
      const handler = vi.fn();
      dispatcher.once('test.event', handler);
      
      dispatcher.emit('test.event');
      dispatcher.emit('test.event');
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return an unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.once('test.event', handler);
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(dispatcher.getListenerCount('test.event')).toBe(0);
    });
  });

  describe('off() method', () => {
    it('should remove specific listener', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      dispatcher.on('test', handler1);
      dispatcher.on('test', handler2);
      
      dispatcher.off('test', handler1);
      
      expect(dispatcher.getListenerCount('test')).toBe(1);
      
      dispatcher.emit('test');
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners when no handler specified', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      dispatcher.on('test', handler1);
      dispatcher.on('test', handler2);
      
      dispatcher.off('test');
      
      expect(dispatcher.getListenerCount('test')).toBe(0);
    });

    it('should handle removing non-existent listeners gracefully', () => {
      const handler = vi.fn();
      
      expect(() => dispatcher.off('non-existent')).not.toThrow();
      expect(() => dispatcher.off('test', handler)).not.toThrow();
    });
  });

  describe('emit() method', () => {
    it('should call all listeners for an event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      dispatcher.on('test', handler1);
      dispatcher.on('test', handler2);
      
      dispatcher.emit('test', { data: 'test' });
      
      expect(handler1).toHaveBeenCalledWith({ data: 'test' }, 'test');
      expect(handler2).toHaveBeenCalledWith({ data: 'test' }, 'test');
    });

    it('should return true if event had listeners', () => {
      const handler = vi.fn();
      dispatcher.on('test', handler);
      
      expect(dispatcher.emit('test')).toBe(true);
    });

    it('should return false if event had no listeners', () => {
      expect(dispatcher.emit('test')).toBe(false);
    });

    it('should throw error for invalid event name', () => {
      expect(() => dispatcher.emit('')).toThrow('Event name must be a non-empty string');
      expect(() => dispatcher.emit(123)).toThrow('Event name must be a non-empty string');
    });

    it('should handle errors in handlers gracefully', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      dispatcher.on('test', errorHandler);
      dispatcher.on('test', goodHandler);
      
      expect(() => dispatcher.emit('test')).not.toThrow();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should support async emission', async () => {
      const handler = vi.fn();
      dispatcher.on('test', handler);
      
      dispatcher.emit('test', null, { async: true });
      
      // Handler should be called asynchronously
      expect(handler).not.toHaveBeenCalled();
      
      // Wait for next tick
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Wildcard support', () => {
    it('should match wildcard patterns', () => {
      const handler = vi.fn();
      dispatcher.on('player.*', handler);
      
      dispatcher.emit('player.move');
      dispatcher.emit('player.shoot');
      dispatcher.emit('enemy.move');
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should combine direct and wildcard listeners', () => {
      const directHandler = vi.fn();
      const wildcardHandler = vi.fn();
      
      dispatcher.on('player.move', directHandler);
      dispatcher.on('player.*', wildcardHandler);
      
      dispatcher.emit('player.move');
      
      expect(directHandler).toHaveBeenCalledTimes(1);
      expect(wildcardHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeAllMatching() method', () => {
    it('should remove all listeners matching pattern', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();
      
      dispatcher.on('player.move', handler1);
      dispatcher.on('player.shoot', handler2);
      dispatcher.on('enemy.move', handler3);
      
      dispatcher.removeAllMatching('player.*');
      
      expect(dispatcher.getListenerCount('player.move')).toBe(0);
      expect(dispatcher.getListenerCount('player.shoot')).toBe(0);
      expect(dispatcher.getListenerCount('enemy.move')).toBe(1);
    });
  });

  describe('Event history', () => {
    it('should record events in history', () => {
      dispatcher.emit('test1', { data: 1 });
      dispatcher.emit('test2', { data: 2 });
      
      const history = dispatcher.getEventHistory();
      expect(history.length).toBe(2);
      expect(history[0].eventName).toBe('test1');
      expect(history[1].eventName).toBe('test2');
    });

    it('should limit history size', () => {
      dispatcher.maxHistorySize = 2;
      
      dispatcher.emit('test1');
      dispatcher.emit('test2');
      dispatcher.emit('test3');
      
      const history = dispatcher.getEventHistory();
      expect(history.length).toBe(2);
      expect(history[0].eventName).toBe('test2');
      expect(history[1].eventName).toBe('test3');
    });

    it('should include timestamp in history', () => {
      const beforeEmit = Date.now();
      dispatcher.emit('test');
      const afterEmit = Date.now();
      
      const history = dispatcher.getEventHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(beforeEmit);
      expect(history[0].timestamp).toBeLessThanOrEqual(afterEmit);
    });
  });

  describe('Utility methods', () => {
    it('should return event names', () => {
      dispatcher.on('test1', vi.fn());
      dispatcher.on('test2', vi.fn());
      
      const eventNames = dispatcher.getEventNames();
      expect(eventNames).toContain('test1');
      expect(eventNames).toContain('test2');
    });

    it('should return total listener count', () => {
      dispatcher.on('test1', vi.fn());
      dispatcher.on('test1', vi.fn());
      dispatcher.on('test2', vi.fn());
      
      expect(dispatcher.getTotalListenerCount()).toBe(3);
    });

    it('should validate event names', () => {
      expect(dispatcher.isValidEventName('valid.event')).toBe(true);
      expect(dispatcher.isValidEventName('valid_event')).toBe(true);
      expect(dispatcher.isValidEventName('valid-event')).toBe(true);
      expect(dispatcher.isValidEventName('valid123')).toBe(true);
      
      expect(dispatcher.isValidEventName('')).toBe(false);
      expect(dispatcher.isValidEventName('invalid event')).toBe(false);
      expect(dispatcher.isValidEventName('invalid@event')).toBe(false);
    });

    it('should clear all listeners and history', () => {
      dispatcher.on('test', vi.fn());
      dispatcher.emit('test');
      
      dispatcher.clear();
      
      expect(dispatcher.getTotalListenerCount()).toBe(0);
      expect(dispatcher.getEventHistory().length).toBe(0);
    });
  });

  describe('Debug mode', () => {
    it('should enable/disable debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      dispatcher.setDebugMode(true);
      dispatcher.on('test', vi.fn());
      
      expect(consoleSpy).toHaveBeenCalledWith('[EventDispatcher] Debug mode enabled');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Subscribed to'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory management', () => {
    it('should properly clean up listeners', () => {
      const handler = vi.fn();
      const unsubscribe = dispatcher.on('test', handler);
      
      expect(dispatcher.getListenerCount('test')).toBe(1);
      
      unsubscribe();
      expect(dispatcher.getListenerCount('test')).toBe(0);
    });

    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const handler = vi.fn();
      
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = dispatcher.on('test', handler);
        unsubscribe();
      }
      
      expect(dispatcher.getTotalListenerCount()).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency events efficiently', () => {
      const handler = vi.fn();
      dispatcher.on('high-frequency', handler);
      
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        dispatcher.emit('high-frequency', { frame: i });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(handler).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle many listeners efficiently', () => {
      const handlers = [];
      
      for (let i = 0; i < 100; i++) {
        const handler = vi.fn();
        handlers.push(handler);
        dispatcher.on('test', handler);
      }
      
      const startTime = performance.now();
      dispatcher.emit('test');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });
});
