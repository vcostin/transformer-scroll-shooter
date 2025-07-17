import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventDispatcher } from './EventDispatcher.js';
import { EffectManager } from './EffectManager.js';
import { EffectContext } from './EffectContext.js';

describe('Side Effects Integration', () => {
  let eventDispatcher;
  let effectManager;

  beforeEach(() => {
    eventDispatcher = new EventDispatcher();
    effectManager = new EffectManager(eventDispatcher);
  });

  afterEach(() => {
    if (effectManager.isRunning) {
      effectManager.stop();
    }
  });

  describe('Basic Integration', () => {
    it('should execute effects when events are emitted', async () => {
      const effectHandler = vi.fn();
      
      // Register effect
      effectManager.effect('test:event', effectHandler);
      
      // Start effect manager
      effectManager.start();
      
      // Emit event
      eventDispatcher.emit('test:event', { data: 'test' });
      
      // Wait for effects to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(effectHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test:event',
          payload: { data: 'test' },
          timestamp: expect.any(Number)
        }),
        expect.any(EffectContext)
      );
    });

    it('should handle wildcard patterns', async () => {
      const effectHandler = vi.fn();
      
      // Register effect with wildcard
      effectManager.effect('player:*', effectHandler);
      effectManager.start();
      
      // Emit matching event
      eventDispatcher.emit('player:moved', { x: 100, y: 200 });
      
      // Wait for effects to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(effectHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'player:moved',
          payload: { x: 100, y: 200 }
        }),
        expect.any(EffectContext)
      );
    });

    it('should handle regex patterns', async () => {
      const effectHandler = vi.fn();
      
      // Register effect with regex
      effectManager.effect(/^enemy:.*/, effectHandler);
      effectManager.start();
      
      // Emit matching event
      eventDispatcher.emit('enemy:spawned', { type: 'basic' });
      
      // Wait for effects to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(effectHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'enemy:spawned',
          payload: { type: 'basic' }
        }),
        expect.any(EffectContext)
      );
    });
  });

  describe('Effect Context Operations', () => {
    it('should handle call operation in effects', async () => {
      const mockApiCall = vi.fn().mockResolvedValue('api result');
      
      const effectHandler = async (action, effects) => {
        const result = await effects.call(mockApiCall, action.payload.id);
        effects.put('api:result', { result });
      };
      
      effectManager.effect('api:request', effectHandler);
      effectManager.start();
      
      // Create promise to wait for result
      const resultPromise = new Promise((resolve) => {
        eventDispatcher.once('api:result', (data) => {
          resolve(data);
        });
      });
      
      // Trigger effect
      eventDispatcher.emit('api:request', { id: 'user123' });
      
      // Wait for result
      const result = await resultPromise;
      expect(result.result).toBe('api result');
      expect(mockApiCall).toHaveBeenCalledWith('user123');
    });

    it('should handle fork operation in effects', async () => {
      const mockTask = vi.fn().mockResolvedValue('task result');
      let effectCompleted = false;
      
      const effectHandler = async (action, effects) => {
        effects.fork(mockTask, action.payload.data);
        effectCompleted = true;
      };
      
      effectManager.effect('task:start', effectHandler);
      effectManager.start();
      
      eventDispatcher.emit('task:start', { data: 'test data' });
      
      // Wait for effect to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(effectCompleted).toBe(true);
      expect(mockTask).toHaveBeenCalledWith('test data');
    });

    it('should handle put operation in effects', async () => {
      const effectHandler = (action, effects) => {
        effects.put('processed:event', {
          originalData: action.payload,
          processedAt: Date.now()
        });
      };
      
      effectManager.effect('raw:event', effectHandler);
      effectManager.start();
      
      // Create promise to wait for processed event
      const processedPromise = new Promise((resolve) => {
        eventDispatcher.once('processed:event', (data) => {
          resolve(data);
        });
      });
      
      // Trigger effect
      eventDispatcher.emit('raw:event', 'raw data');
      
      // Wait for processed event
      const result = await processedPromise;
      expect(result.originalData).toBe('raw data');
      expect(result.processedAt).toBeTypeOf('number');
    });

    it('should handle delay operation in effects', async () => {
      const start = Date.now();
      
      const effectHandler = async (action, effects) => {
        await effects.delay(50);
        effects.put('delayed:event', { elapsed: Date.now() - start });
      };
      
      effectManager.effect('start:delay', effectHandler);
      effectManager.start();
      
      // Create promise to wait for delayed event
      const delayedPromise = new Promise((resolve) => {
        eventDispatcher.once('delayed:event', (data) => {
          resolve(data);
        });
      });
      
      // Trigger effect
      eventDispatcher.emit('start:delay');
      
      // Wait for delayed event
      const result = await delayedPromise;
      expect(result.elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in effects gracefully', async () => {
      const errorHandler = vi.fn();
      
      const effectHandler = () => {
        throw new Error('Effect error');
      };
      
      effectManager.effect('error:test', effectHandler);
      effectManager.start();
      
      // Create promise to wait for error event
      const errorPromise = new Promise((resolve) => {
        eventDispatcher.once('effect:execution:error', (data) => {
          errorHandler(data);
          resolve(data);
        });
      });
      
      // Trigger effect
      eventDispatcher.emit('error:test');
      
      // Wait for error event
      await errorPromise;
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'error:test',
          error: expect.any(Error)
        })
      );
    });

    it('should handle errors in call operations', async () => {
      const errorHandler = vi.fn();
      
      const failingFunction = vi.fn().mockRejectedValue(new Error('Call error'));
      
      const effectHandler = async (action, effects) => {
        try {
          await effects.call(failingFunction);
        } catch (error) {
          effects.put('call:error', { error: error.message });
        }
      };
      
      effectManager.effect('call:test', effectHandler);
      effectManager.start();
      
      // Create promise to wait for call error
      const callErrorPromise = new Promise((resolve) => {
        eventDispatcher.once('call:error', (data) => {
          resolve(data);
        });
      });
      
      // Trigger effect
      eventDispatcher.emit('call:test');
      
      // Wait for call error
      const result = await callErrorPromise;
      expect(result.error).toBe('Call error');
    });

    it('should handle errors in fork operations', async () => {
      const errorHandler = vi.fn();
      
      const failingTask = vi.fn().mockRejectedValue(new Error('Fork error'));
      
      const effectHandler = (action, effects) => {
        effects.fork(failingTask);
      };
      
      effectManager.effect('fork:test', effectHandler);
      effectManager.start();
      
      // Create promise to wait for fork error
      const forkErrorPromise = new Promise((resolve) => {
        eventDispatcher.once('effect:error', (data) => {
          errorHandler(data);
          resolve(data);
        });
      });
      
      // Trigger effect
      eventDispatcher.emit('fork:test');
      
      // Wait for fork error
      await forkErrorPromise;
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fork',
          error: expect.any(Error)
        })
      );
    });
  });

  describe('Priority and Ordering', () => {
    it('should execute effects in priority order', async () => {
      const executionOrder = [];
      
      const effect1 = () => executionOrder.push('effect1');
      const effect2 = () => executionOrder.push('effect2');
      const effect3 = () => executionOrder.push('effect3');
      
      effectManager.effect('priority:test', effect1, { priority: 1 });
      effectManager.effect('priority:test', effect2, { priority: 3 });
      effectManager.effect('priority:test', effect3, { priority: 2 });
      
      effectManager.start();
      
      eventDispatcher.emit('priority:test');
      
      // Wait for effects to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(executionOrder).toEqual(['effect2', 'effect3', 'effect1']);
    });

    it('should handle once effects correctly', async () => {
      const effectHandler = vi.fn();
      
      effectManager.effect('once:test', effectHandler, { once: true });
      effectManager.start();
      
      // Emit event twice
      eventDispatcher.emit('once:test');
      eventDispatcher.emit('once:test');
      
      // Wait for effects to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(effectHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lifecycle Management', () => {
    it('should stop and cleanup properly', () => {
      const effectHandler = vi.fn();
      
      effectManager.effect('test:event', effectHandler);
      effectManager.start();
      
      expect(effectManager.isRunning).toBe(true);
      
      effectManager.stop();
      
      expect(effectManager.isRunning).toBe(false);
      expect(effectManager.runningEffects.size).toBe(0);
      expect(effectManager.forkedEffects.size).toBe(0);
      expect(effectManager.timeouts.size).toBe(0);
    });

    it('should handle game cleanup events', () => {
      const effectHandler = vi.fn();
      
      effectManager.effect('test:event', effectHandler);
      effectManager.start();
      
      // Add some running effects
      effectManager.runningEffects.add(Promise.resolve());
      effectManager.forkedEffects.add(Promise.resolve());
      
      // Emit cleanup event
      eventDispatcher.emit('game:cleanup');
      
      expect(effectManager.runningEffects.size).toBe(0);
      expect(effectManager.forkedEffects.size).toBe(0);
    });
  });
});
