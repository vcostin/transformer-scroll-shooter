/**
 * Enemy Class Tests
 * Tests for the Enemy entity class functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import Enemy from '@/entities/enemies/enemy.js'

describe('Enemy', () => {
  let mockGame
  let enemy

  beforeEach(() => {
    mockGame = {
      width: 800,
      height: 600,
      ctx: {
        fillStyle: '',
        fillRect: vi.fn(),
        strokeStyle: '',
        strokeRect: vi.fn(),
        lineWidth: 0,
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn()
      },
      player: {
        x: 100,
        y: 300,
        width: 40,
        height: 30
      },
      addBullet: vi.fn(),
      addEffect: vi.fn()
    }
  })

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
      
      expect(enemy.game).toBe(mockGame)
      expect(enemy.x).toBe(700)
      expect(enemy.y).toBe(200)
      expect(enemy.type).toBe('fighter')
      expect(enemy.markedForDeletion).toBe(false)
      expect(enemy.shootTimer).toBe(0)
      expect(enemy.moveTimer).toBe(0)
      expect(enemy.targetY).toBe(200)
    })

    it('should call setupType during construction', () => {
      enemy = new Enemy(mockGame, 700, 200, 'bomber')
      
      expect(enemy.width).toBe(45)
      expect(enemy.height).toBe(35)
      expect(enemy.maxHealth).toBe(40)
      expect(enemy.health).toBe(40)
      expect(enemy.speed).toBe(60)
      expect(enemy.damage).toBe(25)
      expect(enemy.points).toBe(25)
      expect(enemy.color).toBe('#ff8844')
    })
  })

  describe('setupType', () => {
    it('should configure fighter type correctly', () => {
      enemy = new Enemy(mockGame, 0, 0, 'fighter')
      
      expect(enemy.width).toBe(30)
      expect(enemy.height).toBe(20)
      expect(enemy.maxHealth).toBe(20)
      expect(enemy.health).toBe(20)
      expect(enemy.speed).toBe(100)
      expect(enemy.damage).toBe(15)
      expect(enemy.points).toBe(10)
      expect(enemy.color).toBe('#ff4444')
      expect(enemy.shootRate).toBe(2000)
      expect(enemy.bulletSpeed).toBe(200)
    })

    it('should configure bomber type correctly', () => {
      enemy = new Enemy(mockGame, 0, 0, 'bomber')
      
      expect(enemy.width).toBe(45)
      expect(enemy.height).toBe(35)
      expect(enemy.maxHealth).toBe(40)
      expect(enemy.health).toBe(40)
      expect(enemy.speed).toBe(60)
      expect(enemy.damage).toBe(25)
      expect(enemy.points).toBe(25)
      expect(enemy.color).toBe('#ff8844')
      expect(enemy.shootRate).toBe(3000)
      expect(enemy.bulletSpeed).toBe(150)
    })

    it('should configure scout type correctly', () => {
      enemy = new Enemy(mockGame, 0, 0, 'scout')
      
      expect(enemy.width).toBe(20)
      expect(enemy.height).toBe(15)
      expect(enemy.maxHealth).toBe(10)
      expect(enemy.health).toBe(10)
      expect(enemy.speed).toBe(180)
      expect(enemy.damage).toBe(10)
      expect(enemy.points).toBe(5)
      expect(enemy.color).toBe('#44ff44')
      expect(enemy.shootRate).toBe(1500)
      expect(enemy.bulletSpeed).toBe(250)
    })

    it('should configure boss type correctly', () => {
      enemy = new Enemy(mockGame, 0, 0, 'boss')
      
      expect(enemy.width).toBe(80)
      expect(enemy.height).toBe(60)
      expect(enemy.maxHealth).toBe(200)
      expect(enemy.health).toBe(200)
      expect(enemy.speed).toBe(50)
      expect(enemy.damage).toBe(50)
      expect(enemy.points).toBe(500)
      expect(enemy.color).toBe('#ff0000')
      expect(enemy.shootRate).toBe(1000)
      expect(enemy.bulletSpeed).toBe(300)
    })

    it('should default to fighter type for unknown types', () => {
      enemy = new Enemy(mockGame, 0, 0, 'unknown')
      
      expect(enemy.type).toBe('fighter')
      expect(enemy.width).toBe(30)
      expect(enemy.height).toBe(20)
      expect(enemy.maxHealth).toBe(20)
    })
  })

  describe('update', () => {
    beforeEach(() => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
    })

    it('should update shoot timer', () => {
      enemy.update(500)
      
      expect(enemy.shootTimer).toBe(500)
    })

    it('should trigger shooting when shoot timer exceeds shoot rate', () => {
      const shootSpy = vi.spyOn(enemy, 'shoot')
      enemy.shootTimer = 1900
      
      enemy.update(200) // Total: 2100ms > 2000ms shootRate
      
      expect(shootSpy).toHaveBeenCalled()
      expect(enemy.shootTimer).toBe(0)
    })

    it('should mark for deletion when off screen left', () => {
      enemy.x = -150
      enemy.update(100)
      
      expect(enemy.markedForDeletion).toBe(true)
    })

    it('should mark for deletion when health reaches zero', () => {
      enemy.health = 0
      enemy.update(100)
      
      expect(enemy.markedForDeletion).toBe(true)
    })

    it('should not mark for deletion when on screen with health', () => {
      enemy.x = 400
      enemy.health = 20
      enemy.update(100)
      
      expect(enemy.markedForDeletion).toBe(false)
    })
  })

  describe('move', () => {
    beforeEach(() => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
    })

    it('should move fighter towards player horizontally', () => {
      const initialX = enemy.x
      enemy.move(1000) // 1 second
      
      expect(enemy.x).toBeLessThan(initialX)
      expect(enemy.x).toBe(initialX - 100) // speed = 100
    })

    it('should move fighter towards player vertically', () => {
      enemy.y = 400 // Player at 300, enemy at 400
      enemy.move(1000)
      
      expect(enemy.y).toBeLessThan(400) // Should move towards player
    })

    it('should move bomber straight left', () => {
      enemy = new Enemy(mockGame, 700, 200, 'bomber')
      const initialX = enemy.x
      const initialY = enemy.y
      
      enemy.move(1000)
      
      expect(enemy.x).toBe(initialX - 60) // bomber speed = 60
      expect(enemy.y).toBe(initialY) // No vertical movement
    })

    it('should move scout with erratic pattern', () => {
      enemy = new Enemy(mockGame, 700, 200, 'scout')
      const initialX = enemy.x
      
      enemy.move(1000)
      
      expect(enemy.x).toBe(initialX - 180) // scout speed = 180
      // Vertical movement depends on target calculation
    })

    it('should move boss with tracking behavior', () => {
      enemy = new Enemy(mockGame, 700, 200, 'boss')
      const initialX = enemy.x
      
      enemy.move(1000)
      
      expect(enemy.x).toBe(initialX - 25) // boss speed = 50 * 0.5
      // Should track player vertically
    })

    it('should update scout target after timer expires', () => {
      enemy = new Enemy(mockGame, 700, 200, 'scout')
      enemy.moveTimer = 1100 // > 1000ms threshold
      
      const initialTargetY = enemy.targetY
      enemy.move(100)
      
      expect(enemy.moveTimer).toBe(0)
      // targetY should be updated (random value)
    })
  })

  describe('shoot', () => {
    beforeEach(() => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
    })

    it('should create bullet aimed at player', () => {
      enemy.shoot()
      
      expect(mockGame.addBullet).toHaveBeenCalledWith(
        expect.objectContaining({
          game: mockGame,
          x: enemy.x,
          y: enemy.y + enemy.height / 2,
          friendly: false
        })
      )
    })

    it('should calculate correct bullet velocity towards player', () => {
      enemy.shoot()
      
      const bulletCall = mockGame.addBullet.mock.calls[0][0]
      expect(bulletCall.velocityX).toBeLessThan(0) // Moving left towards player
      expect(bulletCall.velocityY).toBeGreaterThan(0) // Moving down towards player (enemy at y=200, player at y=300)
    })

    it('should not shoot when player distance is zero', () => {
      enemy.x = mockGame.player.x
      enemy.y = mockGame.player.y
      
      enemy.shoot()
      
      expect(mockGame.addBullet).not.toHaveBeenCalled()
    })
  })

  describe('takeDamage', () => {
    beforeEach(() => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
    })

    it('should reduce health by damage amount', () => {
      enemy.takeDamage(10)
      
      expect(enemy.health).toBe(10) // Started at 20
    })

    it('should call cleanup when health reaches zero', () => {
      const cleanupSpy = vi.spyOn(enemy, 'cleanup')
      enemy.takeDamage(20)
      
      expect(enemy.health).toBe(0)
      expect(cleanupSpy).toHaveBeenCalled()
    })

    it('should not call cleanup when health is above zero', () => {
      const cleanupSpy = vi.spyOn(enemy, 'cleanup')
      enemy.takeDamage(10)
      
      expect(enemy.health).toBe(10)
      expect(cleanupSpy).not.toHaveBeenCalled()
    })

    it('should handle damage exceeding health', () => {
      enemy.takeDamage(50)
      
      expect(enemy.health).toBe(-30)
    })
  })

  describe('render', () => {
    beforeEach(() => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
    })

    it('should set fill style to enemy color', () => {
      enemy.render(mockGame.ctx)
      
      expect(mockGame.ctx.fillStyle).toBe(enemy.color)
    })

    it('should call appropriate draw method based on type', () => {
      const drawFighterSpy = vi.spyOn(enemy, 'drawFighter')
      enemy.render(mockGame.ctx)
      
      expect(drawFighterSpy).toHaveBeenCalledWith(mockGame.ctx)
    })

    it('should draw health bar when damaged', () => {
      enemy.health = 10 // Less than maxHealth (20)
      const drawHealthBarSpy = vi.spyOn(enemy, 'drawHealthBar')
      
      enemy.render(mockGame.ctx)
      
      expect(drawHealthBarSpy).toHaveBeenCalledWith(mockGame.ctx)
    })

    it('should not draw health bar when at full health', () => {
      enemy.health = enemy.maxHealth
      const drawHealthBarSpy = vi.spyOn(enemy, 'drawHealthBar')
      
      enemy.render(mockGame.ctx)
      
      expect(drawHealthBarSpy).not.toHaveBeenCalled()
    })
  })

  describe('drawHealthBar', () => {
    beforeEach(() => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
      enemy.health = 10 // Half health
    })

    it('should draw background bar', () => {
      enemy.drawHealthBar(mockGame.ctx)
      
      // Check that fillStyle was set to background color at some point
      expect(mockGame.ctx.fillRect).toHaveBeenCalledWith(
        enemy.x, enemy.y - 8, enemy.width, 3
      )
    })

    it('should draw health bar proportional to health', () => {
      enemy.drawHealthBar(mockGame.ctx)
      
      // Health is 10/20 = 50%
      expect(mockGame.ctx.fillRect).toHaveBeenCalledWith(
        enemy.x, enemy.y - 8, enemy.width * 0.5, 3
      )
    })

    it('should use green color for high health', () => {
      enemy.health = 15 // 75% health
      enemy.drawHealthBar(mockGame.ctx)
      
      expect(mockGame.ctx.fillStyle).toBe('#00ff00')
    })

    it('should use yellow color for medium health', () => {
      enemy.health = 8 // 40% health
      enemy.drawHealthBar(mockGame.ctx)
      
      expect(mockGame.ctx.fillStyle).toBe('#ffff00')
    })

    it('should use red color for low health', () => {
      enemy.health = 2 // 10% health
      enemy.drawHealthBar(mockGame.ctx)
      
      expect(mockGame.ctx.fillStyle).toBe('#ff0000')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small delta time', () => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
      const initialX = enemy.x
      
      enemy.move(1) // 1ms
      
      expect(enemy.x).toBe(initialX - 0.1) // Very small movement
    })

    it('should handle zero delta time', () => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
      const initialX = enemy.x
      const initialY = enemy.y
      
      enemy.move(0)
      
      expect(enemy.x).toBe(initialX)
      expect(enemy.y).toBe(initialY)
    })

    it('should handle missing player reference', () => {
      enemy = new Enemy(mockGame, 700, 200, 'fighter')
      mockGame.player = null
      
      // Should not throw error but handle gracefully
      expect(() => enemy.update(1000)).not.toThrow()
    })
  })
})
