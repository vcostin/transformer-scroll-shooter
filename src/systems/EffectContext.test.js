import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createEffectContext } from '@/systems/EffectContext.js'

describe('EffectContext', () => {
  let effectContext
  let mockEffectManager
  let mockEventDispatcher

  beforeEach(() => {
    // Use fake timers for all timing-related operations
    vi.useFakeTimers()
    // Create mock dependencies
    mockEffectManager = {
      trackForkedEffect: vi.fn(),
      trackTimeout: vi.fn()
    }

    mockEventDispatcher = {
      emit: vi.fn().mockReturnValue(true),
      once: vi.fn().mockReturnValue(() => {})
    }

    effectContext = createEffectContext(mockEffectManager, mockEventDispatcher)
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Restore real timers after each test
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should initialize with correct dependencies', () => {
      expect(effectContext.effectManager).toBe(mockEffectManager)
      expect(effectContext.eventDispatcher).toBe(mockEventDispatcher)
      expect(effectContext.cancelToken).toEqual({ cancelled: false })
    })
  })

  describe('call()', () => {
    it('should call async function and return result', async () => {
      const mockFn = vi.fn().mockResolvedValue('test result')

      const result = await effectContext.call(mockFn, 'arg1', 'arg2')

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(result).toBe('test result')
    })

    it('should call sync function and return result', async () => {
      const mockFn = vi.fn().mockReturnValue('sync result')

      const result = await effectContext.call(mockFn, 'arg1')

      expect(mockFn).toHaveBeenCalledWith('arg1')
      expect(result).toBe('sync result')
    })

    it('should throw error if first argument is not a function', async () => {
      await expect(effectContext.call('not a function')).rejects.toThrow(
        'call() requires a function as first argument'
      )
    })

    it('should throw error if effect is cancelled', async () => {
      effectContext.cancel()

      await expect(effectContext.call(() => {})).rejects.toThrow('Effect was cancelled')
    })

    it('should emit error event and re-throw on function error', async () => {
      const error = new Error('Test error')
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(effectContext.call(mockFn, 'arg1')).rejects.toThrow('Test error')

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('effect:error', {
        type: 'call',
        function: mockFn.name,
        args: ['arg1'],
        error,
        timestamp: expect.any(Number)
      })
    })

    it('should handle anonymous function names in error events', async () => {
      const error = new Error('Test error')
      const mockFn = vi.fn().mockRejectedValue(error)
      Object.defineProperty(mockFn, 'name', { value: '' })

      await expect(effectContext.call(mockFn)).rejects.toThrow('Test error')

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('effect:error', {
        type: 'call',
        function: 'anonymous',
        args: [],
        error,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('fork()', () => {
    it('should execute function asynchronously and return immediately', async () => {
      const mockFn = vi.fn().mockResolvedValue('forked result')

      const result = effectContext.fork(mockFn, 'arg1', 'arg2')

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(mockEffectManager.trackForkedEffect).toHaveBeenCalledWith(expect.any(Promise))
      expect(result).toBeInstanceOf(Promise)
    })

    it('should throw error if first argument is not a function', () => {
      expect(() => effectContext.fork('not a function')).toThrow(
        'fork() requires a function as first argument'
      )
    })

    it('should return resolved promise if effect is cancelled', async () => {
      effectContext.cancel()

      const result = await effectContext.fork(() => {})

      expect(result).toBeUndefined()
    })

    it('should emit error event but not re-throw on function error', async () => {
      const error = new Error('Fork error')
      const mockFn = vi.fn().mockRejectedValue(error)

      await effectContext.fork(mockFn, 'arg1')

      // Wait for the forked promise to complete using fake timers
      vi.advanceTimersByTime(0)
      await Promise.resolve()

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('effect:error', {
        type: 'fork',
        function: mockFn.name,
        args: ['arg1'],
        error,
        timestamp: expect.any(Number)
      })
    })
  })

  describe('put()', () => {
    it('should emit event and return result', () => {
      const result = effectContext.put('test:event', { data: 'test' }, { async: true })

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith(
        'test:event',
        { data: 'test' },
        { async: true }
      )
      expect(result).toBe(true)
    })

    it('should emit event with default data and options', () => {
      effectContext.put('test:event')

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('test:event', null, {})
    })

    it('should throw error if event name is not a string', () => {
      expect(() => effectContext.put(123)).toThrow(
        'put() requires a non-empty string as event name'
      )
    })

    it('should throw error if event name is empty', () => {
      expect(() => effectContext.put('')).toThrow('put() requires a non-empty string as event name')
    })

    it('should return false if effect is cancelled', () => {
      effectContext.cancel()

      const result = effectContext.put('test:event')

      expect(result).toBe(false)
      expect(mockEventDispatcher.emit).not.toHaveBeenCalled()
    })
  })

  describe('take()', () => {
    it('should wait for event and resolve with data', async () => {
      const eventData = { test: 'data' }
      mockEventDispatcher.once.mockImplementation((eventName, handler) => {
        // Use fake timer instead of real setTimeout
        setTimeout(() => handler(eventData), 10)
        return () => {}
      })

      const resultPromise = effectContext.take('test:event')

      // Fast-forward time to trigger the event
      vi.advanceTimersByTime(10)

      const result = await resultPromise

      expect(result).toBe(eventData)
      expect(mockEventDispatcher.once).toHaveBeenCalledWith('test:event', expect.any(Function))
    })

    it('should throw error if event name is not a string', () => {
      expect(() => effectContext.take(123)).toThrow(
        'take() requires a non-empty string as event name'
      )
    })

    it('should throw error if event name is empty', () => {
      expect(() => effectContext.take('')).toThrow(
        'take() requires a non-empty string as event name'
      )
    })

    it('should reject if effect is cancelled', async () => {
      effectContext.cancel()

      await expect(effectContext.take('test:event')).rejects.toThrow('Effect was cancelled')
    })

    it('should timeout if specified', async () => {
      mockEventDispatcher.once.mockReturnValue(() => {})

      const takePromise = effectContext.take('test:event', 100)

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(100)

      await expect(takePromise).rejects.toThrow(
        "take() timeout after 100ms waiting for 'test:event'"
      )
    })

    it('should not timeout if event arrives before timeout', async () => {
      const eventData = { test: 'data' }
      mockEventDispatcher.once.mockImplementation((eventName, handler) => {
        setTimeout(() => handler(eventData), 50)
        return () => {}
      })

      const takePromise = effectContext.take('test:event', 100)

      // Fast-forward time to trigger event (before timeout)
      vi.advanceTimersByTime(50)

      const result = await takePromise

      expect(result).toBe(eventData)
    })
  })

  describe('select()', () => {
    it('should emit state request event and return null', () => {
      const result = effectContext.select('user.name')

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('state:request', { path: 'user.name' })
      expect(result).toBeNull()
    })

    it('should emit state request without path', () => {
      effectContext.select()

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('state:request', { path: null })
    })

    it('should return null if effect is cancelled', () => {
      effectContext.cancel()

      const result = effectContext.select('test.path')

      expect(result).toBeNull()
      expect(mockEventDispatcher.emit).not.toHaveBeenCalled()
    })
  })

  describe('delay()', () => {
    it('should resolve after specified milliseconds', async () => {
      const delayPromise = effectContext.delay(100)

      // Initially should not be resolved
      let resolved = false
      delayPromise.then(() => {
        resolved = true
      })

      // Fast-forward time by 50ms - should not resolve yet
      vi.advanceTimersByTime(50)
      await Promise.resolve() // Allow promises to settle
      expect(resolved).toBe(false)

      // Fast-forward time by another 50ms - should now resolve
      vi.advanceTimersByTime(50)
      await Promise.resolve()
      expect(resolved).toBe(true)

      // trackTimeout is not called during tests to avoid interference with fake timers
      expect(mockEffectManager.trackTimeout).not.toHaveBeenCalled()
    })

    it('should throw error if ms is not a number', () => {
      expect(() => effectContext.delay('not a number')).toThrow(
        'delay() requires a non-negative number'
      )
    })

    it('should throw error if ms is negative', () => {
      expect(() => effectContext.delay(-100)).toThrow('delay() requires a non-negative number')
    })

    it('should resolve immediately if effect is cancelled', async () => {
      effectContext.cancel()

      const result = await effectContext.delay(100)

      expect(result).toBeUndefined()
      // Should not have created a timeout since it was cancelled
      expect(mockEffectManager.trackTimeout).not.toHaveBeenCalled()
    })

    it('should handle zero delay correctly', async () => {
      const delayPromise = effectContext.delay(0)

      // Should resolve immediately with 0 delay
      vi.advanceTimersByTime(0)
      await expect(delayPromise).resolves.toBeUndefined()

      // trackTimeout is not called during tests to avoid interference with fake timers
      expect(mockEffectManager.trackTimeout).not.toHaveBeenCalled()
    })
  })

  describe('cancel()', () => {
    it('should set cancelled flag to true', () => {
      expect(effectContext.isCancelled()).toBe(false)

      effectContext.cancel()

      expect(effectContext.isCancelled()).toBe(true)
    })
  })

  describe('isCancelled()', () => {
    it('should return false initially', () => {
      expect(effectContext.isCancelled()).toBe(false)
    })

    it('should return true after cancel is called', () => {
      effectContext.cancel()

      expect(effectContext.isCancelled()).toBe(true)
    })
  })

  describe('race()', () => {
    it('should return the first effect to complete', async () => {
      const effects = {
        fast: Promise.resolve('fast result'),
        slow: new Promise(resolve => setTimeout(() => resolve('slow result'), 100))
      }

      const result = await effectContext.race(effects)

      expect(result).toEqual({ winner: 'fast', result: 'fast result' })
    })

    it('should throw error if effects is not an object', async () => {
      await expect(effectContext.race('not an object')).rejects.toThrow(
        'race() requires an object with effects'
      )
    })

    it('should throw error if effects object is empty', async () => {
      await expect(effectContext.race({})).rejects.toThrow('race() requires at least one effect')
    })

    it('should return resolved promise if effect is cancelled', async () => {
      effectContext.cancel()

      const result = await effectContext.race({
        test: Promise.resolve('test result')
      })

      expect(result).toBeUndefined()
    })

    it('should emit error event and re-throw on effect error', async () => {
      const effects = {
        failing: Promise.reject(new Error('Test error'))
      }

      await expect(effectContext.race(effects)).rejects.toThrow('Test error')

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('effect:error', {
        type: 'race',
        effects: ['failing'],
        error: expect.any(Error),
        timestamp: expect.any(Number)
      })
    })

    it('should handle mixed promise types', async () => {
      const effects = {
        immediate: 'immediate result',
        promise: Promise.resolve('promise result'),
        delayed: new Promise(resolve => setTimeout(() => resolve('delayed result'), 50))
      }

      const result = await effectContext.race(effects)

      expect(result.winner).toBe('immediate')
      expect(result.result).toBe('immediate result')
    })
  })

  describe('all()', () => {
    it('should wait for all effects to complete with object input', async () => {
      const effects = {
        first: Promise.resolve('first result'),
        second: Promise.resolve('second result')
      }

      const result = await effectContext.all(effects)

      expect(result).toEqual({
        first: 'first result',
        second: 'second result'
      })
    })

    it('should wait for all effects to complete with array input', async () => {
      const effects = [Promise.resolve('first result'), Promise.resolve('second result')]

      const result = await effectContext.all(effects)

      expect(result).toEqual(['first result', 'second result'])
    })

    it('should throw error if effects is not an object or array', async () => {
      await expect(effectContext.all('not an object')).rejects.toThrow(
        'all() requires an object or array with effects'
      )
    })

    it('should return empty object for empty object input', async () => {
      const result = await effectContext.all({})

      expect(result).toEqual({})
    })

    it('should return empty array for empty array input', async () => {
      const result = await effectContext.all([])

      expect(result).toEqual([])
    })

    it('should return resolved promise if effect is cancelled', async () => {
      effectContext.cancel()

      const result = await effectContext.all({
        test: Promise.resolve('test result')
      })

      expect(result).toBeUndefined()
    })

    it('should emit error event and re-throw on effect error', async () => {
      const effects = {
        working: Promise.resolve('working result'),
        failing: Promise.reject(new Error('Test error'))
      }

      await expect(effectContext.all(effects)).rejects.toThrow('Test error')

      expect(mockEventDispatcher.emit).toHaveBeenCalledWith('effect:error', {
        type: 'all',
        effects: ['working', 'failing'],
        error: expect.any(Error),
        timestamp: expect.any(Number)
      })
    })

    it('should handle mixed promise types', async () => {
      const effects = {
        immediate: 'immediate result',
        promise: Promise.resolve('promise result')
      }

      const result = await effectContext.all(effects)

      expect(result).toEqual({
        immediate: 'immediate result',
        promise: 'promise result'
      })
    })
  })
})
