/**
 * Power-up System Unit Tests
 * Comprehensive testing for the Powerup class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Powerup } from '@/systems/powerups.js'

describe('Powerup Class', () => {
  let mockGame
  let mockCtx

  beforeEach(() => {
    // Create mock game object
    mockGame = {
      canvas: { width: 800, height: 600 }
    }

    // Create mock canvas context
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillStyle: '',
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      font: '',
      textAlign: '',
      textBaseline: ''
    }
  })

  describe('Constructor and Initialization', () => {
    it('should create a powerup with default properties', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')

      expect(powerup.game).toBe(mockGame)
      expect(powerup.x).toBe(100)
      expect(powerup.y).toBe(200)
      expect(powerup.type).toBe('health')
      expect(powerup.markedForDeletion).toBe(false)
      expect(powerup.width).toBe(25)
      expect(powerup.height).toBe(25)
      expect(powerup.speed).toBe(80)
      expect(powerup.bobOffset).toBe(0)
      expect(powerup.rotationAngle).toBe(0)
    })

    it('should call setupType during construction', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      
      expect(powerup.color).toBe('#ff0000')
      expect(powerup.symbol).toBe('+')
      expect(powerup.description).toBe('Health Boost')
    })
  })

  describe('setupType Method', () => {
    it('should configure health powerup correctly', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')

      expect(powerup.color).toBe('#ff0000')
      expect(powerup.symbol).toBe('+')
      expect(powerup.description).toBe('Health Boost')
    })

    it('should configure shield powerup correctly', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'shield')

      expect(powerup.color).toBe('#00ffff')
      expect(powerup.symbol).toBe('◇')
      expect(powerup.description).toBe('Energy Shield')
    })

    it('should configure rapidfire powerup correctly', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'rapidfire')

      expect(powerup.color).toBe('#ffff00')
      expect(powerup.symbol).toBe('⟩⟩')
      expect(powerup.description).toBe('Rapid Fire')
    })

    it('should configure multishot powerup correctly', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'multishot')

      expect(powerup.color).toBe('#ff8800')
      expect(powerup.symbol).toBe('※')
      expect(powerup.description).toBe('Multi-Shot')
    })

    it('should configure transform powerup correctly', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'transform')

      expect(powerup.color).toBe('#ff00ff')
      expect(powerup.symbol).toBe('⟲')
      expect(powerup.description).toBe('Transform')
    })

    it('should handle unknown powerup types with defaults', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'unknown')

      expect(powerup.color).toBe('#00ff00')
      expect(powerup.symbol).toBe('?')
      expect(powerup.description).toBe('Unknown')
    })
  })

  describe('update Method', () => {
    it('should move powerup left based on deltaTime', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      const initialX = powerup.x
      const deltaTime = 16.67 // ~60fps

      powerup.update(deltaTime)

      const expectedDistance = powerup.speed * (deltaTime / 1000)
      expect(powerup.x).toBeCloseTo(initialX - expectedDistance)
    })

    it('should update bobbing animation offset', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      const initialBobOffset = powerup.bobOffset
      const deltaTime = 16.67

      powerup.update(deltaTime)

      const expectedBobOffset = initialBobOffset + deltaTime * 0.003
      expect(powerup.bobOffset).toBeCloseTo(expectedBobOffset)
    })

    it('should update rotation angle', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      const initialRotation = powerup.rotationAngle
      const deltaTime = 16.67

      powerup.update(deltaTime)

      const expectedRotation = initialRotation + deltaTime * 0.002
      expect(powerup.rotationAngle).toBeCloseTo(expectedRotation)
    })

    it('should mark powerup for deletion when off screen', () => {
      const powerup = new Powerup(mockGame, -60, 200, 'health') // x < -50

      powerup.update(16.67)

      expect(powerup.markedForDeletion).toBe(true)
    })

    it('should not mark powerup for deletion when still on screen', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')

      powerup.update(16.67)

      expect(powerup.markedForDeletion).toBe(false)
    })

    it('should handle multiple update cycles correctly', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      const deltaTime = 16.67

      // Update multiple times
      powerup.update(deltaTime)
      powerup.update(deltaTime)
      powerup.update(deltaTime)

      // Check that all properties have been updated
      expect(powerup.x).toBeLessThan(100)
      expect(powerup.bobOffset).toBeGreaterThan(0)
      expect(powerup.rotationAngle).toBeGreaterThan(0)
    })
  })

  describe('render Method', () => {
    it('should call appropriate canvas methods for rendering', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')

      powerup.render(mockCtx)

      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
      expect(mockCtx.translate).toHaveBeenCalled()
      expect(mockCtx.rotate).toHaveBeenCalled()
      expect(mockCtx.beginPath).toHaveBeenCalled()
      expect(mockCtx.arc).toHaveBeenCalled()
      expect(mockCtx.fill).toHaveBeenCalledTimes(2) // Background and symbol
    })

    it('should set correct fill style for powerup color', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')

      powerup.render(mockCtx)

      expect(mockCtx.fillStyle).toBe('#ff0000')
    })

    it('should apply bobbing effect to centerY calculation', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      powerup.bobOffset = Math.PI / 2 // Peak of sin wave

      powerup.render(mockCtx)

      const expectedCenterX = 100 + 25 / 2 // x + width/2
      const expectedCenterY = 200 + 25 / 2 + Math.sin(Math.PI / 2) * 3 // y + height/2 + bobbing

      expect(mockCtx.translate).toHaveBeenCalledWith(expectedCenterX, expectedCenterY)
    })

    it('should apply rotation based on rotationAngle', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      powerup.rotationAngle = Math.PI / 4

      powerup.render(mockCtx)

      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 4)
    })

    it('should render different symbols for different powerup types', () => {
      const healthPowerup = new Powerup(mockGame, 100, 200, 'health')
      const shieldPowerup = new Powerup(mockGame, 100, 200, 'shield')

      healthPowerup.render(mockCtx)
      const healthCalls = mockCtx.fillText.mock.calls.length

      // Reset mock
      mockCtx.fillText.mockClear()

      shieldPowerup.render(mockCtx)

      // Both should call fillText for rendering symbols
      expect(healthCalls).toBeGreaterThan(0)
      expect(mockCtx.fillText).toHaveBeenCalled()
    })
  })

  describe('Animation Properties', () => {
    it('should have smooth animation progression', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      const deltaTime = 16.67

      // Track initial values
      const initialBob = powerup.bobOffset
      const initialRotation = powerup.rotationAngle

      // Update and check progression
      powerup.update(deltaTime)

      expect(powerup.bobOffset).toBeGreaterThan(initialBob)
      expect(powerup.rotationAngle).toBeGreaterThan(initialRotation)
    })

    it('should maintain consistent animation speeds', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      const deltaTime = 16.67

      powerup.update(deltaTime)
      const bobAfterOne = powerup.bobOffset
      const rotationAfterOne = powerup.rotationAngle

      powerup.update(deltaTime)
      const bobAfterTwo = powerup.bobOffset
      const rotationAfterTwo = powerup.rotationAngle

      // Check that increments are consistent
      const bobIncrement1 = bobAfterOne - 0
      const bobIncrement2 = bobAfterTwo - bobAfterOne
      const rotationIncrement1 = rotationAfterOne - 0
      const rotationIncrement2 = rotationAfterTwo - rotationAfterOne

      expect(bobIncrement1).toBeCloseTo(bobIncrement2, 5)
      expect(rotationIncrement1).toBeCloseTo(rotationIncrement2, 5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero deltaTime gracefully', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')
      const initialX = powerup.x

      powerup.update(0)

      expect(powerup.x).toBe(initialX)
      expect(powerup.markedForDeletion).toBe(false)
    })

    it('should handle very large deltaTime values', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')

      powerup.update(1000) // 1 second

      expect(powerup.x).toBeLessThan(100)
      expect(powerup.bobOffset).toBeGreaterThan(0)
      expect(powerup.rotationAngle).toBeGreaterThan(0)
    })

    it('should handle negative coordinates', () => {
      const powerup = new Powerup(mockGame, -100, -200, 'health')

      expect(() => powerup.update(16.67)).not.toThrow()
      expect(() => powerup.render(mockCtx)).not.toThrow()
    })

    it('should throw error when render is called with null context', () => {
      const powerup = new Powerup(mockGame, 100, 200, 'health')

      // Should throw when render is called with null context
      expect(() => powerup.render(null)).toThrow()
    })
  })
})
