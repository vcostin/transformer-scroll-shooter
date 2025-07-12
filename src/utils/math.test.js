/**
 * Math Utils Tests - Phase 4 Testing Infrastructure
 * 
 * Tests for mathematical utility functions
 */

import { describe, it, expect } from 'vitest'
import * as MathUtils from '@/utils/math.js'

describe('MathUtils', () => {
  describe('clamp', () => {
    it('should clamp values to the specified range', () => {
      expect(MathUtils.clamp(5, 0, 10)).toBe(5)
      expect(MathUtils.clamp(-5, 0, 10)).toBe(0)
      expect(MathUtils.clamp(15, 0, 10)).toBe(10)
      expect(MathUtils.clamp(0, 0, 10)).toBe(0)
      expect(MathUtils.clamp(10, 0, 10)).toBe(10)
    })

    it('should handle edge cases', () => {
      expect(MathUtils.clamp(5, 5, 5)).toBe(5)
      expect(MathUtils.clamp(0, -10, -5)).toBe(-5)
      expect(MathUtils.clamp(-20, -10, -5)).toBe(-10)
    })
  })

  describe('normalize', () => {
    it('should normalize vectors', () => {
      const vector = { x: 3, y: 4 }
      const normalized = MathUtils.normalize(vector)
      expect(normalized.x).toBeCloseTo(0.6)
      expect(normalized.y).toBeCloseTo(0.8)
    })

    it('should handle zero vectors', () => {
      const vector = { x: 0, y: 0 }
      const normalized = MathUtils.normalize(vector)
      expect(normalized.x).toBe(0)
      expect(normalized.y).toBe(0)
    })
  })

  describe('magnitude', () => {
    it('should calculate vector magnitude', () => {
      expect(MathUtils.magnitude({ x: 3, y: 4 })).toBe(5)
      expect(MathUtils.magnitude({ x: 0, y: 0 })).toBe(0)
    })
  })

  describe('lerp', () => {
    it('should interpolate between two values', () => {
      expect(MathUtils.lerp(0, 10, 0.5)).toBe(5)
      expect(MathUtils.lerp(0, 10, 0)).toBe(0)
      expect(MathUtils.lerp(0, 10, 1)).toBe(10)
      expect(MathUtils.lerp(5, 15, 0.5)).toBe(10)
    })

    it('should handle negative values', () => {
      expect(MathUtils.lerp(-10, 10, 0.5)).toBe(0)
      expect(MathUtils.lerp(-5, -3, 0.5)).toBe(-4)
    })
  })

  describe('randomBetween', () => {
    it('should return values within the specified range', () => {
      for (let i = 0; i < 100; i++) {
        const value = MathUtils.randomBetween(5, 15)
        expect(value).toBeGreaterThanOrEqual(5)
        expect(value).toBeLessThanOrEqual(15)
      }
    })

    it('should handle single parameter range', () => {
      for (let i = 0; i < 100; i++) {
        const value = MathUtils.randomBetween(0, 10)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('randomInt', () => {
    it('should return integer values within the specified range', () => {
      for (let i = 0; i < 100; i++) {
        const value = MathUtils.randomInt(1, 6)
        expect(value).toBeGreaterThanOrEqual(1)
        expect(value).toBeLessThanOrEqual(6)
        expect(Number.isInteger(value)).toBe(true)
      }
    })
  })

  describe('degreesToRadians', () => {
    it('should convert degrees to radians', () => {
      expect(MathUtils.degreesToRadians(0)).toBe(0)
      expect(MathUtils.degreesToRadians(90)).toBeCloseTo(Math.PI / 2)
      expect(MathUtils.degreesToRadians(180)).toBeCloseTo(Math.PI)
      expect(MathUtils.degreesToRadians(360)).toBeCloseTo(Math.PI * 2)
    })
  })

  describe('radiansToDegrees', () => {
    it('should convert radians to degrees', () => {
      expect(MathUtils.radiansToDegrees(0)).toBe(0)
      expect(MathUtils.radiansToDegrees(Math.PI / 2)).toBeCloseTo(90)
      expect(MathUtils.radiansToDegrees(Math.PI)).toBeCloseTo(180)
      expect(MathUtils.radiansToDegrees(Math.PI * 2)).toBeCloseTo(360)
    })
  })
})
