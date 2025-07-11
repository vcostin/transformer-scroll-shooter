/**
 * Bullet Class Tests
 * Tests for the Bullet entity class functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import Bullet from '../src/entities/bullet.js'

describe('Bullet', () => {
  let mockGame
  let bullet

  beforeEach(() => {
    mockGame = {
      width: 800,
      height: 600,
      ctx: {
        fillStyle: '',
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        shadowColor: '',
        shadowBlur: 0
      },
      addBullet: vi.fn(),
      addEffect: vi.fn()
    }
  })

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      bullet = new Bullet(mockGame, 100, 200, 300, 0, 'player', true)
      
      expect(bullet.game).toBe(mockGame)
      expect(bullet.x).toBe(100)
      expect(bullet.y).toBe(200)
      expect(bullet.velocityX).toBe(300)
      expect(bullet.velocityY).toBe(0)
      expect(bullet.type).toBe('player')
      expect(bullet.friendly).toBe(true)
      expect(bullet.owner).toBe('player')
      expect(bullet.markedForDeletion).toBe(false)
    })

    it('should set owner to "enemy" when friendly is false', () => {
      bullet = new Bullet(mockGame, 100, 200, -300, 0, 'enemy', false)
      
      expect(bullet.owner).toBe('enemy')
      expect(bullet.friendly).toBe(false)
    })
  })

  describe('setupType', () => {
    it('should configure normal bullet type correctly', () => {
      bullet = new Bullet(mockGame, 0, 0, 0, 0, 'normal', true)
      
      expect(bullet.width).toBe(8)
      expect(bullet.height).toBe(3)
      expect(bullet.damage).toBe(10)
      expect(bullet.color).toBe('#ffff00')
    })

    it('should configure torpedo bullet type correctly', () => {
      bullet = new Bullet(mockGame, 0, 0, 0, 0, 'torpedo', true)
      
      expect(bullet.width).toBe(12)
      expect(bullet.height).toBe(4)
      expect(bullet.damage).toBe(15)
      expect(bullet.color).toBe('#00ffff')
    })

    it('should configure cannon bullet type correctly', () => {
      bullet = new Bullet(mockGame, 0, 0, 0, 0, 'cannon', true)
      
      expect(bullet.width).toBe(6)
      expect(bullet.height).toBe(6)
      expect(bullet.damage).toBe(20)
      expect(bullet.color).toBe('#ff8800')
    })

    it('should configure laser bullet type correctly', () => {
      bullet = new Bullet(mockGame, 0, 0, 0, 0, 'laser', true)
      
      expect(bullet.width).toBe(15)
      expect(bullet.height).toBe(2)
      expect(bullet.damage).toBe(8)
      expect(bullet.color).toBe('#ff00ff')
    })

    it('should configure enemy bullet type correctly', () => {
      bullet = new Bullet(mockGame, 0, 0, 0, 0, 'enemy', false)
      
      expect(bullet.width).toBe(6)
      expect(bullet.height).toBe(3)
      expect(bullet.damage).toBe(5)
      expect(bullet.color).toBe('#ff4444')
    })
  })

  describe('update', () => {
    beforeEach(() => {
      bullet = new Bullet(mockGame, 100, 200, 300, -100, 'normal', true)
    })

    it('should update position based on velocity', () => {
      bullet.update(100) // 100ms
      
      expect(bullet.x).toBe(130) // 100 + (300 * 0.1)
      expect(bullet.y).toBe(190) // 200 + (-100 * 0.1)
    })

    it('should mark for deletion when off screen left', () => {
      bullet.x = -60 // Less than -50 threshold
      bullet.velocityX = 0 // No movement
      bullet.update(100)
      
      expect(bullet.markedForDeletion).toBe(true)
    })

    it('should mark for deletion when off screen right', () => {
      bullet.x = mockGame.width + 60
      bullet.update(100)
      
      expect(bullet.markedForDeletion).toBe(true)
    })

    it('should mark for deletion when off screen top', () => {
      bullet.y = -60
      bullet.update(100)
      
      expect(bullet.markedForDeletion).toBe(true)
    })

    it('should mark for deletion when off screen bottom', () => {
      bullet.y = mockGame.height + 60 // Greater than height + 50 threshold
      bullet.velocityY = 0 // No movement
      bullet.update(100)
      
      expect(bullet.markedForDeletion).toBe(true)
    })

    it('should not mark for deletion when on screen', () => {
      bullet.x = 400
      bullet.y = 300
      bullet.update(100)
      
      expect(bullet.markedForDeletion).toBe(false)
    })
  })

  describe('render', () => {
    beforeEach(() => {
      bullet = new Bullet(mockGame, 100, 200, 300, -100, 'normal', true)
    })

    it('should set fill style to bullet color', () => {
      bullet.render(mockGame.ctx)
      
      expect(mockGame.ctx.fillStyle).toBe(bullet.color)
    })

    it('should render standard bullet as rectangle', () => {
      bullet.render(mockGame.ctx)
      
      expect(mockGame.ctx.fillRect).toHaveBeenCalledWith(
        bullet.x, bullet.y, bullet.width, bullet.height
      )
    })

    it('should render laser bullet with glow effect', () => {
      bullet.type = 'laser'
      bullet.render(mockGame.ctx)
      
      expect(mockGame.ctx.fillRect).toHaveBeenCalledTimes(2) // Main + glow
      expect(mockGame.ctx.shadowColor).toBe(bullet.color)
      expect(mockGame.ctx.shadowBlur).toBe(0) // Reset after effect
    })

    it('should render torpedo bullet with trail', () => {
      bullet.type = 'torpedo'
      bullet.render(mockGame.ctx)
      
      expect(mockGame.ctx.fillRect).toHaveBeenCalledTimes(2) // Main + trail
    })

    it('should render cannon bullet as circle', () => {
      bullet.type = 'cannon'
      bullet.render(mockGame.ctx)
      
      expect(mockGame.ctx.beginPath).toHaveBeenCalled()
      expect(mockGame.ctx.arc).toHaveBeenCalledWith(
        bullet.x + bullet.width/2, 
        bullet.y + bullet.height/2, 
        bullet.width/2, 
        0, 
        Math.PI * 2
      )
      expect(mockGame.ctx.fill).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero velocity', () => {
      bullet = new Bullet(mockGame, 100, 200, 0, 0, 'normal', true)
      const initialX = bullet.x
      const initialY = bullet.y
      
      bullet.update(100)
      
      expect(bullet.x).toBe(initialX)
      expect(bullet.y).toBe(initialY)
    })

    it('should handle very large delta time', () => {
      bullet = new Bullet(mockGame, 100, 200, 300, -100, 'normal', true)
      
      bullet.update(5000) // 5 seconds
      
      expect(bullet.x).toBe(1600) // 100 + (300 * 5)
      expect(bullet.y).toBe(-300) // 200 + (-100 * 5)
    })

    it('should handle negative coordinates', () => {
      bullet = new Bullet(mockGame, -10, -20, 100, 100, 'normal', true)
      
      bullet.update(100)
      
      expect(bullet.x).toBe(0) // -10 + (100 * 0.1)
      expect(bullet.y).toBe(-10) // -20 + (100 * 0.1)
    })
  })
})
