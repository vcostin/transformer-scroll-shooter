/**
 * StateUtils Tests
 * Comprehensive test suite for StateUtils utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  getValueByPath,
  setValueByPath,
  deepClone,
  deepEqual,
  resolveReference,
  splitPath,
  joinPath,
  isValidPath,
  getParentPath,
  getPathLeaf
} from '@/systems/StateUtils.js'

describe('StateUtils', () => {
  describe('getValueByPath', () => {
    const testObj = {
      player: {
        position: { x: 100, y: 200 },
        health: 80,
        name: 'Hero'
      },
      game: {
        score: 1500,
        level: 3
      },
      array: [1, 2, { nested: 'value' }]
    }

    it('should get value by simple path', () => {
      expect(getValueByPath(testObj, 'game.score')).toBe(1500)
      expect(getValueByPath(testObj, 'player.health')).toBe(80)
    })

    it('should get value by nested path', () => {
      expect(getValueByPath(testObj, 'player.position.x')).toBe(100)
      expect(getValueByPath(testObj, 'player.position.y')).toBe(200)
    })

    it('should get entire objects', () => {
      expect(getValueByPath(testObj, 'player.position')).toEqual({ x: 100, y: 200 })
      expect(getValueByPath(testObj, 'player')).toEqual({
        position: { x: 100, y: 200 },
        health: 80,
        name: 'Hero'
      })
    })

    it('should return undefined for non-existent paths', () => {
      expect(getValueByPath(testObj, 'nonexistent')).toBeUndefined()
      expect(getValueByPath(testObj, 'player.nonexistent')).toBeUndefined()
      expect(getValueByPath(testObj, 'player.position.z')).toBeUndefined()
    })

    it('should handle null and undefined safely', () => {
      const objWithNulls = { a: null, b: { c: undefined } }
      expect(getValueByPath(objWithNulls, 'a')).toBeNull()
      expect(getValueByPath(objWithNulls, 'b.c')).toBeUndefined()
      expect(getValueByPath(objWithNulls, 'a.x')).toBeUndefined()
    })
  })

  describe('setValueByPath', () => {
    it('should set value by simple path', () => {
      const obj = { player: { health: 100 } }
      const result = setValueByPath(obj, 'player.health', 80)

      expect(result.player.health).toBe(80)
      expect(obj.player.health).toBe(100) // Original unchanged
    })

    it('should set value by nested path', () => {
      const obj = { player: { position: { x: 0, y: 0 } } }
      const result = setValueByPath(obj, 'player.position.x', 100)

      expect(result.player.position.x).toBe(100)
      expect(result.player.position.y).toBe(0)
      expect(obj.player.position.x).toBe(0) // Original unchanged
    })

    it('should create new nested structure for missing paths', () => {
      const obj = {}
      const result = setValueByPath(obj, 'player.position.x', 100)

      expect(result.player.position.x).toBe(100)
      expect(obj).toEqual({}) // Original unchanged
    })

    it('should merge objects when merge=true', () => {
      const obj = { player: { position: { x: 0, y: 0 }, health: 100 } }
      const result = setValueByPath(obj, 'player.position', { x: 50 }, true)

      expect(result.player.position).toEqual({ x: 50, y: 0 })
      expect(result.player.health).toBe(100)
    })

    it('should replace objects when merge=false (default)', () => {
      const obj = { player: { position: { x: 0, y: 0 }, health: 100 } }
      const result = setValueByPath(obj, 'player.position', { x: 50 })

      expect(result.player.position).toEqual({ x: 50 })
      expect(result.player.health).toBe(100)
    })
  })

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42)
      expect(deepClone('hello')).toBe('hello')
      expect(deepClone(true)).toBe(true)
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
    })

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }]
      const cloned = deepClone(arr)

      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[2]).not.toBe(arr[2])
    })

    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } }
      const cloned = deepClone(obj)

      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.b).not.toBe(obj.b)
    })

    it('should clone dates', () => {
      const date = new Date('2025-01-01')
      const cloned = deepClone(date)

      expect(cloned).toEqual(date)
      expect(cloned).not.toBe(date)
      expect(cloned instanceof Date).toBe(true)
    })

    it('should handle nested structures', () => {
      const complex = {
        arr: [1, { nested: 'value' }],
        obj: { deep: { value: 42 } },
        date: new Date('2025-01-01')
      }
      const cloned = deepClone(complex)

      expect(cloned).toEqual(complex)
      expect(cloned).not.toBe(complex)
      expect(cloned.arr).not.toBe(complex.arr)
      expect(cloned.obj.deep).not.toBe(complex.obj.deep)
      expect(cloned.date).not.toBe(complex.date)
    })
  })

  describe('deepEqual', () => {
    it('should compare primitive values', () => {
      expect(deepEqual(42, 42)).toBe(true)
      expect(deepEqual('hello', 'hello')).toBe(true)
      expect(deepEqual(true, true)).toBe(true)
      expect(deepEqual(null, null)).toBe(true)
      expect(deepEqual(undefined, undefined)).toBe(true)

      expect(deepEqual(42, 43)).toBe(false)
      expect(deepEqual('hello', 'world')).toBe(false)
      expect(deepEqual(true, false)).toBe(false)
      expect(deepEqual(null, undefined)).toBe(false)
    })

    it('should compare arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true)

      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
    })

    it('should compare objects', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
      expect(deepEqual({ a: { b: 2 } }, { a: { b: 2 } })).toBe(true)

      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })

    it('should handle mixed types', () => {
      expect(deepEqual([], {})).toBe(false)
      expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
      expect(deepEqual(42, '42')).toBe(false)
    })
  })

  describe('resolveReference', () => {
    const state = {
      player: { maxHealth: 100 },
      game: {
        difficulty: 'normal',
        settings: { difficulty: 'hard' }
      }
    }

    it('should return non-string values unchanged', () => {
      expect(resolveReference(42, 'test', state)).toBe(42)
      expect(resolveReference(null, 'test', state)).toBe(null)
      expect(resolveReference({ a: 1 }, 'test', state)).toEqual({ a: 1 })
    })

    it('should resolve string references starting with $', () => {
      expect(resolveReference('$player.maxHealth', 'test', state)).toBe(100)
      expect(resolveReference('$game.difficulty', 'test', state)).toBe('normal')
    })

    it('should return non-reference strings unchanged', () => {
      expect(resolveReference('normal', 'test', state)).toBe('normal')
      expect(resolveReference('hello', 'test', state)).toBe('hello')
    })

    it('should resolve schema-style references relative to parent path', () => {
      expect(resolveReference('maxHealth', 'player.health', state)).toBe(100)
      // For game.settings.volume path, resolve 'difficulty' to game.settings.difficulty
      expect(resolveReference('difficulty', 'game.settings.volume', state)).toBe('hard')
    })

    it('should return original string for unresolvable references', () => {
      expect(resolveReference('$nonexistent', 'test', state)).toBe('$nonexistent')
      expect(resolveReference('$player.nonexistent', 'test', state)).toBe('$player.nonexistent')
      expect(resolveReference('nonexistent', 'player.health', state)).toBe('nonexistent')
    })
  })

  describe('path utilities', () => {
    describe('splitPath', () => {
      it('should split dot-notation paths', () => {
        expect(splitPath('player.position.x')).toEqual(['player', 'position', 'x'])
        expect(splitPath('game.score')).toEqual(['game', 'score'])
        expect(splitPath('simple')).toEqual(['simple'])
      })
    })

    describe('joinPath', () => {
      it('should join path parts with dots', () => {
        expect(joinPath(['player', 'position', 'x'])).toBe('player.position.x')
        expect(joinPath(['game', 'score'])).toBe('game.score')
        expect(joinPath(['simple'])).toBe('simple')
      })
    })

    describe('isValidPath', () => {
      it('should validate paths', () => {
        expect(isValidPath('player.health')).toBe(true)
        expect(isValidPath('simple')).toBe(true)

        expect(isValidPath('')).toBe(false)
        expect(isValidPath(null)).toBe(false)
        expect(isValidPath(undefined)).toBe(false)
        expect(isValidPath(42)).toBe(false)
      })
    })

    describe('getParentPath', () => {
      it('should get parent paths', () => {
        expect(getParentPath('player.position.x')).toBe('player.position')
        expect(getParentPath('game.score')).toBe('game')
        expect(getParentPath('simple')).toBe('')
      })
    })

    describe('getPathLeaf', () => {
      it('should get path leaf', () => {
        expect(getPathLeaf('player.position.x')).toBe('x')
        expect(getPathLeaf('game.score')).toBe('score')
        expect(getPathLeaf('simple')).toBe('simple')
      })
    })
  })
})
