/**
 * Bullet Class Tests
 * Tests for the Bullet entity class functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createBullet, updateBullet, renderBullet, Bullet } from '@/entities/bullet.js'
import { createStateManager } from '@/systems/StateManager.js'

describe('Bullet', () => {
  let stateManager
  let bulletId
  let gameConfig

  beforeEach(() => {
    stateManager = createStateManager()
    gameConfig = {
      width: 800,
      height: 600
    }
  })

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 300, y: 0 },
        type: 'normal',
        friendly: true
      })

      expect(bulletId).toBeDefined()
      expect(typeof bulletId).toBe('string')
      expect(Bullet.getPosition(stateManager, bulletId)).toEqual({ x: 100, y: 200 })
      expect(Bullet.getVelocity(stateManager, bulletId)).toEqual({ x: 300, y: 0 })
      expect(Bullet.getType(stateManager, bulletId)).toBe('normal')
      expect(stateManager.getState(`bullets.${bulletId}.friendly`)).toBe(true)
      expect(Bullet.getOwner(stateManager, bulletId)).toBe('player')
      expect(Bullet.isMarkedForDeletion(stateManager, bulletId)).toBe(false)
    })

    it('should set owner to "enemy" when friendly is false', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: -300, y: 0 },
        type: 'enemy',
        friendly: false
      })

      expect(Bullet.getOwner(stateManager, bulletId)).toBe('enemy')
      expect(stateManager.getState(`bullets.${bulletId}.friendly`)).toBe(false)
    })
  })

  describe('setupType', () => {
    it('should configure normal bullet type correctly', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        type: 'normal',
        friendly: true
      })

      expect(Bullet.getDimensions(stateManager, bulletId)).toEqual({ width: 8, height: 3 })
      expect(Bullet.getDamage(stateManager, bulletId)).toBe(10)
      expect(stateManager.getState(`bullets.${bulletId}.color`)).toBe('#ffff00')
    })

    it('should configure torpedo bullet type correctly', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        type: 'torpedo',
        friendly: true
      })

      expect(Bullet.getDimensions(stateManager, bulletId)).toEqual({ width: 12, height: 4 })
      expect(Bullet.getDamage(stateManager, bulletId)).toBe(15)
      expect(stateManager.getState(`bullets.${bulletId}.color`)).toBe('#00ffff')
    })

    it('should configure cannon bullet type correctly', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        type: 'cannon',
        friendly: true
      })

      expect(Bullet.getDimensions(stateManager, bulletId)).toEqual({ width: 6, height: 6 })
      expect(Bullet.getDamage(stateManager, bulletId)).toBe(20)
      expect(stateManager.getState(`bullets.${bulletId}.color`)).toBe('#ff8800')
    })

    it('should configure laser bullet type correctly', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        type: 'laser',
        friendly: true
      })

      expect(Bullet.getDimensions(stateManager, bulletId)).toEqual({ width: 15, height: 2 })
      expect(Bullet.getDamage(stateManager, bulletId)).toBe(8)
      expect(stateManager.getState(`bullets.${bulletId}.color`)).toBe('#ff00ff')
    })

    it('should configure enemy bullet type correctly', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        type: 'enemy',
        friendly: false
      })

      expect(Bullet.getDimensions(stateManager, bulletId)).toEqual({ width: 6, height: 3 })
      expect(Bullet.getDamage(stateManager, bulletId)).toBe(5)
      expect(stateManager.getState(`bullets.${bulletId}.color`)).toBe('#ff4444')
    })
  })

  describe('update', () => {
    beforeEach(() => {
      bulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 300, y: -100 },
        type: 'normal',
        friendly: true
      })
    })

    it('should update position based on velocity', () => {
      updateBullet(stateManager, bulletId, 100, gameConfig) // 100ms

      const position = Bullet.getPosition(stateManager, bulletId)
      expect(position.x).toBe(130) // 100 + (300 * 0.1)
      expect(position.y).toBe(190) // 200 + (-100 * 0.1)
    })

    it('should mark for deletion when off screen left', () => {
      // Set position far left with leftward velocity
      Bullet.setPosition(stateManager, bulletId, { x: -60, y: 100 })
      Bullet.setVelocity(stateManager, bulletId, { x: -300, y: 0 }) // Moving further left
      updateBullet(stateManager, bulletId, 100, gameConfig)

      expect(Bullet.isMarkedForDeletion(stateManager, bulletId)).toBe(true)
    })

    it('should mark for deletion when off screen right', () => {
      Bullet.setPosition(stateManager, bulletId, { x: gameConfig.width + 60, y: 100 })
      updateBullet(stateManager, bulletId, 100, gameConfig)

      expect(Bullet.isMarkedForDeletion(stateManager, bulletId)).toBe(true)
    })

    it('should mark for deletion when off screen top', () => {
      Bullet.setPosition(stateManager, bulletId, { x: 100, y: -60 })
      updateBullet(stateManager, bulletId, 100, gameConfig)

      expect(Bullet.isMarkedForDeletion(stateManager, bulletId)).toBe(true)
    })

    it('should mark for deletion when off screen bottom', () => {
      // Set position far bottom with downward velocity
      Bullet.setPosition(stateManager, bulletId, { x: 100, y: gameConfig.height + 60 })
      Bullet.setVelocity(stateManager, bulletId, { x: 0, y: 300 }) // Moving further down
      updateBullet(stateManager, bulletId, 100, gameConfig)

      expect(Bullet.isMarkedForDeletion(stateManager, bulletId)).toBe(true)
    })

    it('should not mark for deletion when on screen', () => {
      updateBullet(stateManager, bulletId, 100, gameConfig)

      expect(Bullet.isMarkedForDeletion(stateManager, bulletId)).toBe(false)
    })
  })

  describe('render', () => {
    let mockCtx

    beforeEach(() => {
      bulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 300, y: -100 },
        type: 'normal',
        friendly: true
      })

      mockCtx = {
        fillStyle: '',
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        shadowColor: '',
        shadowBlur: 0
      }
    })

    it('should set fill style to bullet color', () => {
      renderBullet(stateManager, bulletId, mockCtx)

      expect(mockCtx.fillStyle).toBe('#ffff00') // normal bullet color
    })

    it('should render standard bullet as rectangle', () => {
      renderBullet(stateManager, bulletId, mockCtx)

      const position = Bullet.getPosition(stateManager, bulletId)
      const dimensions = Bullet.getDimensions(stateManager, bulletId)
      expect(mockCtx.fillRect).toHaveBeenCalledWith(
        position.x,
        position.y,
        dimensions.width,
        dimensions.height
      )
    })

    it('should render laser bullet with glow effect', () => {
      const laserBulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 300, y: -100 },
        type: 'laser',
        friendly: true
      })

      renderBullet(stateManager, laserBulletId, mockCtx)

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(2) // Main + glow
      expect(mockCtx.shadowColor).toBe('#ff00ff') // laser bullet color
      expect(mockCtx.shadowBlur).toBe(0) // Reset after effect
    })

    it('should render torpedo bullet with trail', () => {
      const torpedoBulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 300, y: -100 },
        type: 'torpedo',
        friendly: true
      })

      renderBullet(stateManager, torpedoBulletId, mockCtx)

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(2) // Main + trail
    })

    it('should render cannon bullet as circle', () => {
      const cannonBulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 300, y: -100 },
        type: 'cannon',
        friendly: true
      })

      renderBullet(stateManager, cannonBulletId, mockCtx)

      const position = Bullet.getPosition(stateManager, cannonBulletId)
      const dimensions = Bullet.getDimensions(stateManager, cannonBulletId)
      expect(mockCtx.beginPath).toHaveBeenCalled()
      expect(mockCtx.arc).toHaveBeenCalledWith(
        position.x + dimensions.width / 2,
        position.y + dimensions.height / 2,
        dimensions.width / 2,
        0,
        Math.PI * 2
      )
      expect(mockCtx.fill).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero velocity', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 0, y: 0 },
        type: 'normal',
        friendly: true
      })
      const initialPosition = Bullet.getPosition(stateManager, bulletId)

      updateBullet(stateManager, bulletId, 100, gameConfig)

      const position = Bullet.getPosition(stateManager, bulletId)
      expect(position.x).toBe(initialPosition.x)
      expect(position.y).toBe(initialPosition.y)
    })

    it('should handle very large delta time', () => {
      bulletId = createBullet(stateManager, {
        position: { x: 100, y: 200 },
        velocity: { x: 300, y: -100 },
        type: 'normal',
        friendly: true
      })

      updateBullet(stateManager, bulletId, 5000, gameConfig) // 5 seconds

      const position = Bullet.getPosition(stateManager, bulletId)
      expect(position.x).toBe(1600) // 100 + (300 * 5)
      expect(position.y).toBe(-300) // 200 + (-100 * 5)
    })

    it('should handle negative coordinates', () => {
      bulletId = createBullet(stateManager, {
        position: { x: -10, y: -20 },
        velocity: { x: 100, y: 100 },
        type: 'normal',
        friendly: true
      })

      updateBullet(stateManager, bulletId, 100, gameConfig)

      const position = Bullet.getPosition(stateManager, bulletId)
      expect(position.x).toBe(0) // -10 + (100 * 0.1)
      expect(position.y).toBe(-10) // -20 + (100 * 0.1)
    })
  })
})
