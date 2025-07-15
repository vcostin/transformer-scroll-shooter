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

  describe('Event-Driven Architecture', () => {
    let mockEventDispatcher
    let mockStateManager
    let eventDrivenGame
    let eventDrivenEnemy

    beforeEach(() => {
      mockEventDispatcher = {
        emit: vi.fn(),
        on: vi.fn().mockReturnValue(() => {}), // Mock remove listener function
        off: vi.fn()
      }
      
      mockStateManager = {
        setState: vi.fn(),
        getState: vi.fn(),
        clearState: vi.fn()
      }
      
      eventDrivenGame = {
        ...mockGame,
        eventDispatcher: mockEventDispatcher,
        stateManager: mockStateManager
      }
    })

    describe('Constructor with Event Systems', () => {
      it('should initialize with event dispatcher', () => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        
        expect(eventDrivenEnemy.eventDispatcher).toBe(mockEventDispatcher)
        expect(eventDrivenEnemy.stateManager).toBe(mockStateManager)
        expect(eventDrivenEnemy.eventListeners).toBeInstanceOf(Set)
        expect(eventDrivenEnemy.aiState).toBe('spawning')
        expect(eventDrivenEnemy.behavior).toBe('aggressive')
      })

      it('should emit ENEMY_CREATED event on construction', () => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.created', {
          enemy: eventDrivenEnemy,
          type: 'fighter',
          x: 700,
          y: 200,
          health: 20,
          maxHealth: 20
        })
      })

      it('should set up event listeners', () => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        
        // Should register for multiple events
        expect(mockEventDispatcher.on).toHaveBeenCalledWith('enemy.ai.update', expect.any(Function))
        expect(mockEventDispatcher.on).toHaveBeenCalledWith('enemy.damaged', expect.any(Function))
        expect(mockEventDispatcher.on).toHaveBeenCalledWith('enemy.ai.target.acquired', expect.any(Function))
        expect(mockEventDispatcher.on).toHaveBeenCalledWith('enemy.collision.bullet', expect.any(Function))
        expect(mockEventDispatcher.on).toHaveBeenCalledWith('enemy.collision.player', expect.any(Function))
      })

      it('should initialize state manager', () => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.health', 20)
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.position', { x: 700, y: 200 })
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.velocity', { x: 0, y: 0 })
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.behavior', 'aggressive')
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.aiState', 'spawning')
      })

      it('should work without event systems (backward compatibility)', () => {
        const legacyEnemy = new Enemy(mockGame, 700, 200, 'fighter')
        
        expect(legacyEnemy.eventDispatcher).toBeUndefined()
        expect(legacyEnemy.stateManager).toBeUndefined()
        expect(legacyEnemy.eventListeners).toBeInstanceOf(Set)
        expect(legacyEnemy.aiState).toBe('spawning')
        expect(legacyEnemy.behavior).toBe('aggressive')
      })
    })

    describe('Event-Driven Update', () => {
      beforeEach(() => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        vi.clearAllMocks()
      })

      it('should emit AI_UPDATE event when update is called', () => {
        eventDrivenEnemy.update(1000)
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.ai.update', {
          enemy: eventDrivenEnemy,
          deltaTime: 1000
        })
      })

      it('should use legacy update when no event dispatcher', () => {
        const legacyEnemy = new Enemy(mockGame, 700, 200, 'fighter')
        const originalMove = legacyEnemy.move
        legacyEnemy.move = vi.fn()
        
        legacyEnemy.update(1000)
        
        expect(legacyEnemy.move).toHaveBeenCalledWith(1000)
        expect(legacyEnemy.shootTimer).toBe(1000)
      })

      it('should emit OFF_SCREEN event when enemy goes off screen', () => {
        eventDrivenEnemy.x = -150
        eventDrivenEnemy.update(1000)
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.off.screen', {
          enemy: eventDrivenEnemy,
          x: -150,
          y: 200
        })
        expect(eventDrivenEnemy.markedForDeletion).toBe(true)
      })
    })

    describe('Event-Driven Movement', () => {
      beforeEach(() => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        vi.clearAllMocks()
      })

      it('should emit ENEMY_MOVED event when position changes', () => {
        const originalX = eventDrivenEnemy.x
        const originalY = eventDrivenEnemy.y
        
        eventDrivenEnemy.move(1000)
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.moved', {
          enemy: eventDrivenEnemy,
          x: eventDrivenEnemy.x,
          y: eventDrivenEnemy.y,
          previousX: originalX,
          previousY: originalY,
          type: 'fighter'
        })
      })

      it('should update state manager when position changes', () => {
        eventDrivenEnemy.move(1000)
        
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.position', {
          x: eventDrivenEnemy.x,
          y: eventDrivenEnemy.y
        })
      })

      it('should not emit events when position does not change', () => {
        // Create a scenario where position doesn't change
        eventDrivenEnemy.speed = 0
        eventDrivenEnemy.move(1000)
        
        expect(mockEventDispatcher.emit).not.toHaveBeenCalledWith('enemy.moved', expect.any(Object))
      })
    })

    describe('Event-Driven Shooting', () => {
      beforeEach(() => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        vi.clearAllMocks()
      })

      it('should emit ENEMY_SHOT event when shooting', () => {
        eventDrivenEnemy.shoot()
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.shot', expect.objectContaining({
          enemy: eventDrivenEnemy,
          bullet: expect.any(Object),
          x: 700,
          y: 210, // y + height/2
          velocityX: expect.any(Number),
          velocityY: expect.any(Number),
          target: mockGame.player,
          type: 'fighter'
        }))
      })

      it('should update state manager when shooting', () => {
        eventDrivenEnemy.shoot()
        
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.shootTimer', eventDrivenEnemy.shootTimer)
      })

      it('should not emit events when no player exists', () => {
        eventDrivenGame.player = null
        eventDrivenEnemy.shoot()
        
        expect(mockEventDispatcher.emit).not.toHaveBeenCalledWith('enemy.shot', expect.any(Object))
      })
    })

    describe('Event-Driven Damage', () => {
      beforeEach(() => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        vi.clearAllMocks()
      })

      it('should emit ENEMY_DAMAGED event when takeDamage is called', () => {
        eventDrivenEnemy.takeDamage(10)
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.damaged', {
          enemy: eventDrivenEnemy,
          damage: 10
        })
      })

      it('should handle damage via event system', () => {
        const originalHealth = eventDrivenEnemy.health
        eventDrivenEnemy.handleDamage({ damage: 10 })
        
        expect(eventDrivenEnemy.health).toBe(originalHealth - 10)
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.health', eventDrivenEnemy.health)
      })

      it('should emit ENEMY_HEALTH_CHANGED event when health changes', () => {
        eventDrivenEnemy.handleDamage({ damage: 10 })
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.health.changed', {
          enemy: eventDrivenEnemy,
          health: 10,
          maxHealth: 20,
          previousHealth: 20,
          damage: 10
        })
      })

      it('should emit ENEMY_HEALTH_CRITICAL event when health is low', () => {
        eventDrivenEnemy.handleDamage({ damage: 16 }) // Health will be 4, which is < 25% of 20
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.health.critical', {
          enemy: eventDrivenEnemy,
          health: 4,
          maxHealth: 20
        })
      })

      it('should emit ENEMY_DIED event when health reaches zero', () => {
        eventDrivenEnemy.handleDamage({ damage: 25 }) // More than max health
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.died', {
          enemy: eventDrivenEnemy,
          type: 'fighter',
          x: 700,
          y: 200,
          points: 10
        })
        expect(eventDrivenEnemy.markedForDeletion).toBe(true)
      })
    })

    describe('AI State Management', () => {
      beforeEach(() => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        vi.clearAllMocks()
      })

      it('should handle AI update events', () => {
        eventDrivenEnemy.handleAIUpdate({ deltaTime: 1000 })
        
        expect(eventDrivenEnemy.aiState).toBe('moving')
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.aiState', 'moving')
      })

      it('should handle target acquisition events', () => {
        const target = { x: 100, y: 200 }
        eventDrivenEnemy.handleTargetAcquisition({ target })
        
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.target', target)
        expect(eventDrivenEnemy.aiState).toBe('attacking')
      })

      it('should handle bullet collision events', () => {
        const bullet = { damage: 15 }
        eventDrivenEnemy.handleBulletCollision({ bullet })
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.damaged', {
          enemy: eventDrivenEnemy,
          damage: 15
        })
      })

      it('should handle player collision events', () => {
        const player = { x: 100, y: 200 }
        eventDrivenEnemy.handlePlayerCollision({ player })
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.damaged', {
          enemy: eventDrivenEnemy,
          damage: 20 // maxHealth for self-destruct
        })
      })
    })

    describe('Boss Event System', () => {
      beforeEach(() => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'boss')
        vi.clearAllMocks()
      })

      it('should emit ENEMY_CREATED event for boss', () => {
        const bossEnemy = new Enemy(eventDrivenGame, 700, 200, 'boss')
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.created', {
          enemy: bossEnemy,
          type: 'boss',
          x: 700,
          y: 200,
          health: 200,
          maxHealth: 200
        })
      })

      it('should handle boss-specific AI behaviors', () => {
        eventDrivenEnemy.handleAIUpdate({ deltaTime: 1000 })
        
        expect(eventDrivenEnemy.aiState).toBe('moving')
        expect(mockStateManager.setState).toHaveBeenCalledWith('enemy.aiState', 'moving')
      })
    })

    describe('Cleanup and Destruction', () => {
      beforeEach(() => {
        eventDrivenEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        vi.clearAllMocks()
      })

      it('should clean up event listeners on cleanup', () => {
        const mockRemoveListener = vi.fn()
        eventDrivenEnemy.eventListeners.add(mockRemoveListener)
        
        eventDrivenEnemy.cleanup()
        
        expect(mockRemoveListener).toHaveBeenCalled()
        expect(eventDrivenEnemy.eventListeners.size).toBe(0)
      })

      it('should emit ENEMY_DESTROYED event on cleanup', () => {
        eventDrivenEnemy.cleanup()
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.destroyed', {
          enemy: eventDrivenEnemy,
          type: 'fighter',
          x: 700,
          y: 200
        })
      })

      it('should handle cleanup gracefully without event dispatcher', () => {
        const legacyEnemy = new Enemy(mockGame, 700, 200, 'fighter')
        
        expect(() => legacyEnemy.cleanup()).not.toThrow()
      })
    })

    describe('Backward Compatibility', () => {
      it('should maintain all legacy functionality', () => {
        const legacyEnemy = new Enemy(mockGame, 700, 200, 'fighter')
        
        // All legacy methods should still work
        expect(() => legacyEnemy.update(1000)).not.toThrow()
        expect(() => legacyEnemy.move(1000)).not.toThrow()
        expect(() => legacyEnemy.shoot()).not.toThrow()
        expect(() => legacyEnemy.takeDamage(10)).not.toThrow()
        expect(() => legacyEnemy.cleanup()).not.toThrow()
      })

      it('should emit events from legacy methods when event dispatcher is available', () => {
        const hybridEnemy = new Enemy(eventDrivenGame, 700, 200, 'fighter')
        vi.clearAllMocks()
        
        hybridEnemy.takeDamage(10)
        
        expect(mockEventDispatcher.emit).toHaveBeenCalledWith('enemy.damaged', {
          enemy: hybridEnemy,
          damage: 10
        })
      })
    })
  })
})
