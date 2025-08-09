/**
 * StateSubscriptions Tests
 *
 * Comprehensive test suite for StateSubscriptions module functionality including:
 * - Subscription creation and management
 * - Unsubscribe operations and performance
 * - Path-based subscription triggering
 * - Deep watching for nested changes
 * - Error handling and callback safety
 * - Statistics and debugging utilities
 * - Performance and memory management
 *
 * @fileoverview Tests for StateSubscriptions class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StateSubscriptions } from '@/systems/StateSubscriptions.js'

describe('StateSubscriptions', () => {
  let stateSubscriptions
  let mockCallbacks
  let mockState

  beforeEach(() => {
    mockState = {
      player: {
        health: 100,
        position: { x: 10, y: 20 },
        inventory: { items: ['sword', 'potion'] }
      },
      game: {
        level: 1,
        score: 0
      }
    }

    mockCallbacks = {
      onGetState: vi.fn(path => {
        if (!path) return mockState
        return path.split('.').reduce((obj, key) => obj?.[key], mockState)
      })
    }

    stateSubscriptions = new StateSubscriptions(
      {
        enableDebug: false
      },
      mockCallbacks
    )
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default options', () => {
      const subscriptions = new StateSubscriptions()
      expect(subscriptions.options.enableDebug).toBe(false)
      expect(subscriptions.subscriptions.size).toBe(0)
      expect(subscriptions.subscriptionIndex.size).toBe(0)
    })

    it('should accept custom options', () => {
      const subscriptions = new StateSubscriptions({
        enableDebug: true
      })
      expect(subscriptions.options.enableDebug).toBe(true)
    })

    it('should handle missing callbacks gracefully', () => {
      const subscriptions = new StateSubscriptions()
      expect(() => subscriptions.callbacks.onGetState()).not.toThrow()
    })

    it('should initialize empty subscription collections', () => {
      expect(stateSubscriptions.subscriptions).toBeInstanceOf(Map)
      expect(stateSubscriptions.subscriptionIndex).toBeInstanceOf(Map)
      expect(stateSubscriptions.subscriptions.size).toBe(0)
      expect(stateSubscriptions.subscriptionIndex.size).toBe(0)
    })
  })

  describe('Subscribe Method', () => {
    it('should create a subscription and return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = stateSubscriptions.subscribe('player.health', callback)

      expect(typeof unsubscribe).toBe('function')
      expect(stateSubscriptions.subscriptions.has('player.health')).toBe(true)
      expect(stateSubscriptions.subscriptions.get('player.health')).toHaveLength(1)
    })

    it('should throw error for invalid callback', () => {
      expect(() => {
        stateSubscriptions.subscribe('player.health', 'not a function')
      }).toThrow('Callback must be a function')
    })

    it('should support immediate callback option', () => {
      const callback = vi.fn()
      stateSubscriptions.subscribe('player.health', callback, { immediate: true })

      expect(callback).toHaveBeenCalledWith(100, undefined, 'player.health')
    })

    it('should create unique subscription IDs', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = stateSubscriptions.subscribe('player.health', callback1)
      const unsubscribe2 = stateSubscriptions.subscribe('player.health', callback2)

      const subscriptions = stateSubscriptions.subscriptions.get('player.health')
      expect(subscriptions[0].id).not.toBe(subscriptions[1].id)
    })

    it('should handle multiple subscriptions to same path', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      stateSubscriptions.subscribe('player.health', callback1)
      stateSubscriptions.subscribe('player.health', callback2)
      stateSubscriptions.subscribe('player.health', callback3)

      expect(stateSubscriptions.subscriptions.get('player.health')).toHaveLength(3)
    })

    it('should store subscription options correctly', () => {
      const callback = vi.fn()
      stateSubscriptions.subscribe('player.health', callback, {
        immediate: true,
        deep: false
      })

      const subscription = stateSubscriptions.subscriptions.get('player.health')[0]
      expect(subscription.options.immediate).toBe(true)
      expect(subscription.options.deep).toBe(false)
    })

    it('should use default subscription options', () => {
      const callback = vi.fn()
      stateSubscriptions.subscribe('player.health', callback)

      const subscription = stateSubscriptions.subscriptions.get('player.health')[0]
      expect(subscription.options.immediate).toBe(false)
      expect(subscription.options.deep).toBe(true)
    })
  })

  describe('Unsubscribe Method', () => {
    it('should remove subscription successfully', () => {
      const callback = vi.fn()
      const unsubscribe = stateSubscriptions.subscribe('player.health', callback)

      expect(stateSubscriptions.subscriptions.has('player.health')).toBe(true)

      const result = unsubscribe()
      expect(result).toBe(true)
      expect(stateSubscriptions.subscriptions.has('player.health')).toBe(false)
    })

    it('should return false for non-existent subscription', () => {
      const result = stateSubscriptions.unsubscribe('non-existent-id')
      expect(result).toBe(false)
    })

    it('should maintain index integrity after unsubscribe', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      const unsubscribe1 = stateSubscriptions.subscribe('player.health', callback1)
      const unsubscribe2 = stateSubscriptions.subscribe('player.health', callback2)
      const unsubscribe3 = stateSubscriptions.subscribe('player.health', callback3)

      // Remove middle subscription
      unsubscribe2()

      const subscriptions = stateSubscriptions.subscriptions.get('player.health')
      expect(subscriptions).toHaveLength(2)

      // Verify integrity
      const integrity = stateSubscriptions.validateIntegrity()
      expect(integrity.isValid).toBe(true)
    })

    it('should clean up empty subscription paths', () => {
      const callback = vi.fn()
      const unsubscribe = stateSubscriptions.subscribe('player.health', callback)

      unsubscribe()
      expect(stateSubscriptions.subscriptions.has('player.health')).toBe(false)
    })

    it('should handle unsubscribe from returned function', () => {
      const callback = vi.fn()
      const unsubscribe = stateSubscriptions.subscribe('player.health', callback)

      expect(typeof unsubscribe).toBe('function')
      const result = unsubscribe()
      expect(result).toBe(true)
    })

    it('should perform O(1) unsubscribe using index optimization', () => {
      const callbacks = Array.from({ length: 100 }, () => vi.fn())
      const unsubscribers = callbacks.map(cb => stateSubscriptions.subscribe('player.health', cb))

      // Remove subscriptions in random order
      const indicesToRemove = [50, 25, 75, 10, 90]
      indicesToRemove.forEach(index => {
        const result = unsubscribers[index]()
        expect(result).toBe(true)
      })

      const remainingCount = 100 - indicesToRemove.length
      expect(stateSubscriptions.subscriptions.get('player.health')).toHaveLength(remainingCount)
    })
  })

  describe('Trigger Subscriptions', () => {
    it('should trigger direct path subscriptions', () => {
      const callback = vi.fn()
      stateSubscriptions.subscribe('player.health', callback)

      stateSubscriptions.triggerSubscriptions('player.health', 80, 100)

      expect(callback).toHaveBeenCalledWith(80, 100, 'player.health')
    })

    it('should trigger multiple subscriptions for same path', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      stateSubscriptions.subscribe('player.health', callback1)
      stateSubscriptions.subscribe('player.health', callback2)
      stateSubscriptions.subscribe('player.health', callback3)

      stateSubscriptions.triggerSubscriptions('player.health', 80, 100)

      expect(callback1).toHaveBeenCalledWith(80, 100, 'player.health')
      expect(callback2).toHaveBeenCalledWith(80, 100, 'player.health')
      expect(callback3).toHaveBeenCalledWith(80, 100, 'player.health')
    })

    it('should trigger parent subscriptions for deep watching', () => {
      const parentCallback = vi.fn()
      stateSubscriptions.subscribe('player', parentCallback, { deep: true })

      // Update nested property
      mockState.player.health = 80
      stateSubscriptions.triggerSubscriptions('player.health', 80, 100)

      expect(parentCallback).toHaveBeenCalledWith(mockState.player, undefined, 'player')
    })

    it('should not trigger parent subscriptions when deep watching is disabled', () => {
      const parentCallback = vi.fn()
      stateSubscriptions.subscribe('player', parentCallback, { deep: false })

      stateSubscriptions.triggerSubscriptions('player.health', 80, 100)

      expect(parentCallback).not.toHaveBeenCalled()
    })

    it('should handle nested path subscriptions correctly', () => {
      const positionCallback = vi.fn()
      const playerCallback = vi.fn()

      stateSubscriptions.subscribe('player.position', positionCallback)
      stateSubscriptions.subscribe('player', playerCallback, { deep: true })

      // Update deeply nested property
      mockState.player.position.x = 15
      stateSubscriptions.triggerSubscriptions('player.position.x', 15, 10)

      expect(positionCallback).toHaveBeenCalledWith(
        mockState.player.position,
        undefined,
        'player.position'
      )
      expect(playerCallback).toHaveBeenCalledWith(mockState.player, undefined, 'player')
    })

    it('should handle non-existent paths gracefully', () => {
      const callback = vi.fn()
      stateSubscriptions.subscribe('player.health', callback)

      // Trigger subscription for different path
      stateSubscriptions.triggerSubscriptions('game.level', 2, 1)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      const normalCallback = vi.fn()

      // Mock console.error to prevent error output in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      stateSubscriptions.subscribe('player.health', errorCallback)
      stateSubscriptions.subscribe('player.health', normalCallback)

      stateSubscriptions.triggerSubscriptions('player.health', 80, 100)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("StateSubscriptions callback error for 'player.health'"),
        expect.any(Error)
      )
      expect(normalCallback).toHaveBeenCalledWith(80, 100, 'player.health')

      consoleSpy.mockRestore()
    })

    it('should handle errors in immediate callbacks', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Immediate callback error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      stateSubscriptions.subscribe('player.health', errorCallback, { immediate: true })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle errors in parent subscription callbacks', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Parent callback error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      stateSubscriptions.subscribe('player', errorCallback, { deep: true })
      stateSubscriptions.triggerSubscriptions('player.health', 80, 100)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Statistics and Utilities', () => {
    beforeEach(() => {
      // Create some test subscriptions
      stateSubscriptions.subscribe('player.health', vi.fn())
      stateSubscriptions.subscribe('player.health', vi.fn())
      stateSubscriptions.subscribe('player.position', vi.fn())
      stateSubscriptions.subscribe('game.level', vi.fn())
    })

    it('should provide comprehensive subscription statistics', () => {
      const stats = stateSubscriptions.getSubscriptionStats()

      expect(stats.totalSubscriptions).toBe(4)
      expect(stats.pathCount).toBe(3)
      expect(stats.indexSize).toBe(4)
      expect(stats.subscriptionsByPath).toHaveLength(3)
    })

    it('should check if path has subscriptions', () => {
      expect(stateSubscriptions.hasSubscriptions('player.health')).toBe(true)
      expect(stateSubscriptions.hasSubscriptions('player.mana')).toBe(false)
    })

    it('should return all subscription paths', () => {
      const paths = stateSubscriptions.getSubscriptionPaths()
      expect(paths).toContain('player.health')
      expect(paths).toContain('player.position')
      expect(paths).toContain('game.level')
      expect(paths).toHaveLength(3)
    })

    it('should return subscriptions for specific path', () => {
      const healthSubs = stateSubscriptions.getSubscriptionsForPath('player.health')
      expect(healthSubs).toHaveLength(2)

      const nonExistentSubs = stateSubscriptions.getSubscriptionsForPath('non.existent')
      expect(nonExistentSubs).toHaveLength(0)
    })

    it('should find subscription by ID', () => {
      const callback = vi.fn()
      const unsubscribe = stateSubscriptions.subscribe('test.path', callback)

      const subscriptions = stateSubscriptions.getSubscriptionsForPath('test.path')
      const subscriptionId = subscriptions[0].id

      const found = stateSubscriptions.getSubscriptionById(subscriptionId)
      expect(found).toBeTruthy()
      expect(found.path).toBe('test.path')
      expect(found.callback).toBe(callback)
    })

    it('should return null for non-existent subscription ID', () => {
      const found = stateSubscriptions.getSubscriptionById('non-existent-id')
      expect(found).toBeNull()
    })
  })

  describe('Clear All Subscriptions', () => {
    beforeEach(() => {
      stateSubscriptions.subscribe('player.health', vi.fn())
      stateSubscriptions.subscribe('player.position', vi.fn())
      stateSubscriptions.subscribe('game.level', vi.fn())
    })

    it('should clear all subscriptions', () => {
      expect(stateSubscriptions.subscriptions.size).toBeGreaterThan(0)
      expect(stateSubscriptions.subscriptionIndex.size).toBeGreaterThan(0)

      stateSubscriptions.clearAll()

      expect(stateSubscriptions.subscriptions.size).toBe(0)
      expect(stateSubscriptions.subscriptionIndex.size).toBe(0)
    })

    it('should reset statistics after clearing', () => {
      stateSubscriptions.clearAll()

      const stats = stateSubscriptions.getSubscriptionStats()
      expect(stats.totalSubscriptions).toBe(0)
      expect(stats.pathCount).toBe(0)
      expect(stats.indexSize).toBe(0)
    })
  })

  describe('Options Management', () => {
    it('should update options', () => {
      expect(stateSubscriptions.options.enableDebug).toBe(false)

      stateSubscriptions.updateOptions({ enableDebug: true })

      expect(stateSubscriptions.options.enableDebug).toBe(true)
    })

    it('should preserve existing options when updating', () => {
      stateSubscriptions.updateOptions({ newOption: 'test' })

      expect(stateSubscriptions.options.enableDebug).toBe(false)
      expect(stateSubscriptions.options.newOption).toBe('test')
    })
  })

  describe('Debug Logging', () => {
    beforeEach(() => {
      stateSubscriptions.options.enableDebug = true
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      console.log.mockRestore()
    })

    it('should log subscription creation', () => {
      const callback = vi.fn()
      stateSubscriptions.subscribe('player.health', callback)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("StateSubscriptions: Subscribed to 'player.health'"),
        expect.any(Object)
      )
    })

    it('should log unsubscribe operations', () => {
      const callback = vi.fn()
      const unsubscribe = stateSubscriptions.subscribe('player.health', callback)
      console.log.mockClear()

      unsubscribe()

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("StateSubscriptions: Unsubscribed from 'player.health'"),
        expect.any(String)
      )
    })

    it('should log clear all operations', () => {
      stateSubscriptions.clearAll()

      expect(console.log).toHaveBeenCalledWith('🗑️ StateSubscriptions: All subscriptions cleared')
    })

    it('should not log when debug is disabled', () => {
      stateSubscriptions.options.enableDebug = false
      const callback = vi.fn()

      stateSubscriptions.subscribe('player.health', callback)

      expect(console.log).not.toHaveBeenCalled()
    })
  })

  describe('Integrity Validation', () => {
    it('should validate integrity of empty subscriptions', () => {
      const integrity = stateSubscriptions.validateIntegrity()

      expect(integrity.isValid).toBe(true)
      expect(integrity.issues).toHaveLength(0)
      expect(integrity.validSubscriptions).toBe(0)
    })

    it('should validate integrity with subscriptions', () => {
      stateSubscriptions.subscribe('player.health', vi.fn())
      stateSubscriptions.subscribe('player.position', vi.fn())
      stateSubscriptions.subscribe('game.level', vi.fn())

      const integrity = stateSubscriptions.validateIntegrity()

      expect(integrity.isValid).toBe(true)
      expect(integrity.issues).toHaveLength(0)
      expect(integrity.validSubscriptions).toBe(3)
      expect(integrity.totalIndexed).toBe(3)
      expect(integrity.totalSubscriptions).toBe(3)
    })

    it('should maintain integrity after unsubscribe operations', () => {
      const unsubscribe1 = stateSubscriptions.subscribe('player.health', vi.fn())
      const unsubscribe2 = stateSubscriptions.subscribe('player.health', vi.fn())
      const unsubscribe3 = stateSubscriptions.subscribe('player.position', vi.fn())

      unsubscribe2() // Remove middle subscription

      const integrity = stateSubscriptions.validateIntegrity()
      expect(integrity.isValid).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    it('should handle large number of subscriptions efficiently', () => {
      const startTime = performance.now()
      const callbacks = []

      // Create 1000 subscriptions
      for (let i = 0; i < 1000; i++) {
        const callback = vi.fn()
        callbacks.push(callback)
        stateSubscriptions.subscribe(`path.${i}`, callback)
      }

      const subscribeTime = performance.now() - startTime
      expect(subscribeTime).toBeLessThan(100) // Should complete in under 100ms

      // Trigger all subscriptions
      const triggerStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        stateSubscriptions.triggerSubscriptions(`path.${i}`, `value${i}`, `oldValue${i}`)
      }
      const triggerTime = performance.now() - triggerStart
      expect(triggerTime).toBeLessThan(50) // Should complete in under 50ms
    })

    it('should perform efficient O(1) unsubscribe operations', () => {
      const unsubscribers = []

      // Create many subscriptions
      for (let i = 0; i < 100; i++) {
        const unsubscribe = stateSubscriptions.subscribe('test.path', vi.fn())
        unsubscribers.push(unsubscribe)
      }

      const startTime = performance.now()

      // Unsubscribe all (should be O(1) per operation)
      unsubscribers.forEach(unsub => unsub())

      const totalTime = performance.now() - startTime
      expect(totalTime).toBeLessThan(10) // Should be very fast
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty path subscriptions', () => {
      const callback = vi.fn()
      const unsubscribe = stateSubscriptions.subscribe('', callback)

      stateSubscriptions.triggerSubscriptions('', 'value', 'oldValue')
      expect(callback).toHaveBeenCalledWith('value', 'oldValue', '')

      const result = unsubscribe()
      expect(result).toBe(true)
    })

    it('should handle single character paths', () => {
      const callback = vi.fn()
      stateSubscriptions.subscribe('a', callback)

      stateSubscriptions.triggerSubscriptions('a', 'value', 'oldValue')
      expect(callback).toHaveBeenCalledWith('value', 'oldValue', 'a')
    })

    it('should handle very long paths', () => {
      const longPath = 'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z'
      const callback = vi.fn()

      stateSubscriptions.subscribe(longPath, callback)
      stateSubscriptions.triggerSubscriptions(longPath, 'value', 'oldValue')

      expect(callback).toHaveBeenCalledWith('value', 'oldValue', longPath)
    })

    it('should handle special characters in paths', () => {
      const specialPath = 'path.with-dash.and_underscore.and123numbers'
      const callback = vi.fn()

      stateSubscriptions.subscribe(specialPath, callback)
      stateSubscriptions.triggerSubscriptions(specialPath, 'value', 'oldValue')

      expect(callback).toHaveBeenCalledWith('value', 'oldValue', specialPath)
    })
  })
})
