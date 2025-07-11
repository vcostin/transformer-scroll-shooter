/**
 * Collision Utils Tests - Phase 4 Testing Infrastructure
 * 
 * Tests for collision detection utilities
 */

import { describe, it, expect } from 'vitest'
import * as CollisionUtils from '../src/utils/collision.js'

describe('CollisionUtils', () => {
  describe('checkRectCollision', () => {
    it('should detect collision between overlapping rectangles', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 }
      const rect2 = { x: 5, y: 5, width: 10, height: 10 }
      expect(CollisionUtils.checkRectCollision(rect1, rect2)).toBe(true)
    })

    it('should not detect collision between non-overlapping rectangles', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 }
      const rect2 = { x: 20, y: 20, width: 10, height: 10 }
      expect(CollisionUtils.checkRectCollision(rect1, rect2)).toBe(false)
    })

    it('should handle touching rectangles', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 }
      const rect2 = { x: 10, y: 0, width: 10, height: 10 }
      expect(CollisionUtils.checkRectCollision(rect1, rect2)).toBe(false)
    })

    it('should handle contained rectangles', () => {
      const rect1 = { x: 0, y: 0, width: 20, height: 20 }
      const rect2 = { x: 5, y: 5, width: 5, height: 5 }
      expect(CollisionUtils.checkRectCollision(rect1, rect2)).toBe(true)
    })
  })

  describe('checkCircleCollision', () => {
    it('should detect collision between overlapping circles', () => {
      const circle1 = { x: 0, y: 0, radius: 5 }
      const circle2 = { x: 3, y: 4, radius: 3 }
      expect(CollisionUtils.checkCircleCollision(circle1, circle2)).toBe(true)
    })

    it('should not detect collision between non-overlapping circles', () => {
      const circle1 = { x: 0, y: 0, radius: 5 }
      const circle2 = { x: 20, y: 20, radius: 5 }
      expect(CollisionUtils.checkCircleCollision(circle1, circle2)).toBe(false)
    })

    it('should handle touching circles', () => {
      const circle1 = { x: 0, y: 0, radius: 5 }
      const circle2 = { x: 10, y: 0, radius: 5 }
      // Distance = 10, radius sum = 10, so 10 < 10 is false
      expect(CollisionUtils.checkCircleCollision(circle1, circle2)).toBe(false)
    })

    it('should handle contained circles', () => {
      const circle1 = { x: 0, y: 0, radius: 10 }
      const circle2 = { x: 2, y: 2, radius: 3 }
      expect(CollisionUtils.checkCircleCollision(circle1, circle2)).toBe(true)
    })
  })

  describe('pointInRect', () => {
    it('should detect when point is inside rectangle', () => {
      const rect = { x: 0, y: 0, width: 10, height: 10 }
      expect(CollisionUtils.pointInRect({ x: 5, y: 5 }, rect)).toBe(true)
      expect(CollisionUtils.pointInRect({ x: 0, y: 0 }, rect)).toBe(true)
      expect(CollisionUtils.pointInRect({ x: 9, y: 9 }, rect)).toBe(true)
    })

    it('should not detect when point is outside rectangle', () => {
      const rect = { x: 0, y: 0, width: 10, height: 10 }
      expect(CollisionUtils.pointInRect({ x: 11, y: 11 }, rect)).toBe(false) // Outside boundary
      expect(CollisionUtils.pointInRect({ x: -1, y: 5 }, rect)).toBe(false)
      expect(CollisionUtils.pointInRect({ x: 5, y: -1 }, rect)).toBe(false)
      expect(CollisionUtils.pointInRect({ x: 15, y: 15 }, rect)).toBe(false)
    })

    it('should handle edge cases', () => {
      const rect = { x: 5, y: 5, width: 0, height: 0 }
      // Point at (5,5) with width/height 0: 5 >= 5 && 5 <= 5+0 && 5 >= 5 && 5 <= 5+0 = true
      expect(CollisionUtils.pointInRect({ x: 5, y: 5 }, rect)).toBe(true)
    })
  })

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = { x: 0, y: 0 }
      const point2 = { x: 3, y: 4 }
      expect(CollisionUtils.calculateDistance(point1, point2)).toBe(5)
    })

    it('should handle same point', () => {
      const point1 = { x: 5, y: 5 }
      const point2 = { x: 5, y: 5 }
      expect(CollisionUtils.calculateDistance(point1, point2)).toBe(0)
    })

    it('should handle negative coordinates', () => {
      const point1 = { x: -3, y: -4 }
      const point2 = { x: 0, y: 0 }
      expect(CollisionUtils.calculateDistance(point1, point2)).toBe(5)
    })
  })

  describe('calculateAngle', () => {
    it('should calculate angle between two points', () => {
      const from = { x: 0, y: 0 }
      const to = { x: 1, y: 0 }
      expect(CollisionUtils.calculateAngle(from, to)).toBe(0)
    })

    it('should handle vertical direction', () => {
      const from = { x: 0, y: 0 }
      const to = { x: 0, y: 1 }
      expect(CollisionUtils.calculateAngle(from, to)).toBeCloseTo(Math.PI / 2)
    })
  })

  describe('isWithinBounds', () => {
    it('should detect when object is within bounds', () => {
      const obj = { x: 50, y: 50, width: 10, height: 10 }
      expect(CollisionUtils.isWithinBounds(obj, 800, 600)).toBe(true)
    })

    it('should handle objects outside bounds', () => {
      const obj = { x: 900, y: 700, width: 10, height: 10 }
      expect(CollisionUtils.isWithinBounds(obj, 800, 600)).toBe(false)
    })

    it('should respect margin parameter', () => {
      const obj = { x: -50, y: -50, width: 10, height: 10 }
      expect(CollisionUtils.isWithinBounds(obj, 800, 600, 60)).toBe(true)
      expect(CollisionUtils.isWithinBounds(obj, 800, 600, 40)).toBe(false)
    })
  })
})
