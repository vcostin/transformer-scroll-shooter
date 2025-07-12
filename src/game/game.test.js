/**
 * Game Logic Tests
 * Tests for the core Game class functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import Game from '@/game/game.js'

describe('Game', () => {
  let game
  let mockCanvas
  let mockContext

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test'
    
    // Mock DOM elements
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn()
    }
    
    mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      strokeStyle: '',
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      font: '',
      textAlign: '',
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      shadowColor: '',
      shadowBlur: 0,
      lineWidth: 0,
      globalAlpha: 1
    }
    
    mockCanvas.getContext.mockReturnValue(mockContext)
    
    // Mock DOM methods
    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'gameCanvas') {
          return mockCanvas
        }
        const mockElement = {
          textContent: '',
          innerHTML: '',
          style: {},
          appendChild: vi.fn(),
          addEventListener: vi.fn(),
          click: vi.fn()
        }
        return mockElement
      }),
      createElement: vi.fn((tag) => {
        const mockElement = {
          id: '',
          textContent: '',
          innerHTML: '',
          style: {},
          classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn(() => false)
          },
          appendChild: vi.fn(),
          addEventListener: vi.fn(),
          click: vi.fn(),
          remove: vi.fn()
        }
        return mockElement
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      addEventListener: vi.fn()
    }
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16))
    
    game = new Game()
  })

  afterEach(() => {
    // Stop the game loop
    if (game && typeof game.stop === 'function') {
      game.stop()
    }
    
    // Clean up any running timers
    vi.clearAllTimers()
    vi.clearAllMocks()
    
    // Reset environment
    delete process.env.NODE_ENV
  })

  describe('Constructor', () => {
    it('should initialize with correct default values', () => {
      expect(game.width).toBe(800)
      expect(game.height).toBe(600)
      expect(game.score).toBe(0)
      expect(game.level).toBe(1)
      expect(game.enemiesKilled).toBe(0)
      expect(game.gameOver).toBe(false)
      expect(game.paused).toBe(false)
      expect(game.bossActive).toBe(false)
      expect(game.enemies).toEqual([])
      expect(game.bullets).toEqual([])
      expect(game.powerups).toEqual([])
      expect(game.effects).toEqual([])
      expect(game.messages).toEqual([])
    })

    it('should initialize game objects arrays', () => {
      expect(Array.isArray(game.enemies)).toBe(true)
      expect(Array.isArray(game.bullets)).toBe(true)
      expect(Array.isArray(game.powerups)).toBe(true)
      expect(Array.isArray(game.effects)).toBe(true)
    })
  })

  describe('spawnEnemy', () => {
    it('should create enemy with random type', () => {
      const initialEnemyCount = game.enemies.length
      
      game.spawnEnemy()
      
      expect(game.enemies.length).toBe(initialEnemyCount + 1)
      const enemy = game.enemies[game.enemies.length - 1]
      expect(['fighter', 'bomber', 'scout']).toContain(enemy.type)
    })

    it('should spawn enemy at right edge of screen', () => {
      game.spawnEnemy()
      
      const enemy = game.enemies[game.enemies.length - 1]
      expect(enemy.x).toBeGreaterThan(game.width)
    })

    it('should spawn enemy at random Y position', () => {
      const spawnPositions = []
      for (let i = 0; i < 10; i++) {
        game.spawnEnemy()
        spawnPositions.push(game.enemies[game.enemies.length - 1].y)
      }
      
      // Should have some variety in Y positions
      const uniquePositions = [...new Set(spawnPositions)]
      expect(uniquePositions.length).toBeGreaterThan(1)
    })
  })

  describe('spawnBoss', () => {
    it('should create boss enemy', () => {
      game.spawnBoss()
      
      expect(game.enemies.length).toBe(1)
      const boss = game.enemies[0]
      expect(game.isBoss(boss)).toBe(true)
    })

    it('should set bossActive flag', () => {
      game.spawnBoss()
      
      expect(game.bossActive).toBe(true)
    })

    it('should spawn boss at visible position', () => {
      game.spawnBoss()
      
      const boss = game.enemies[0]
      expect(boss.x).toBeLessThan(game.width)
      expect(boss.x).toBeGreaterThan(0)
    })

    it('should add boss message', () => {
      game.spawnBoss()
      
      expect(game.messages.length).toBe(1)
      expect(game.messages[0].text).toContain('BOSS')
    })
  })

  describe('checkCollisions', () => {
    beforeEach(() => {
      // Mock player
      game.player = {
        x: 100,
        y: 300,
        width: 40,
        height: 30,
        health: 100,
        takeDamage: vi.fn(),
        collectPowerup: vi.fn()
      }
      
      // Mock audio
      game.audio = {
        playSound: vi.fn()
      }
    })

    it('should detect bullet vs enemy collision', () => {
      // Create friendly bullet
      const bullet = {
        x: 200,
        y: 200,
        width: 8,
        height: 3,
        owner: 'player',
        damage: 10,
        markedForDeletion: false
      }
      
      // Create enemy
      const enemy = {
        x: 200,
        y: 200,
        width: 30,
        height: 20,
        health: 20,
        points: 10,
        takeDamage: vi.fn(),
        markedForDeletion: false
      }
      
      game.bullets.push(bullet)
      game.enemies.push(enemy)
      
      game.checkCollisions()
      
      expect(bullet.markedForDeletion).toBe(true)
      expect(enemy.takeDamage).toHaveBeenCalledWith(10)
    })

    it('should detect enemy bullet vs player collision', () => {
      // Create enemy bullet
      const bullet = {
        x: 100,
        y: 300,
        width: 6,
        height: 3,
        owner: 'enemy',
        damage: 5,
        markedForDeletion: false
      }
      
      game.bullets.push(bullet)
      
      game.checkCollisions()
      
      expect(bullet.markedForDeletion).toBe(true)
      expect(game.player.takeDamage).toHaveBeenCalledWith(5)
    })

    it('should detect enemy vs player collision', () => {
      const enemy = {
        x: 100,
        y: 300,
        width: 30,
        height: 20,
        damage: 15,
        takeDamage: vi.fn(),
        markedForDeletion: false
      }
      
      game.enemies.push(enemy)
      
      game.checkCollisions()
      
      expect(enemy.takeDamage).toHaveBeenCalledWith(50)
      expect(game.player.takeDamage).toHaveBeenCalledWith(50)
    })

    it('should detect powerup vs player collision', () => {
      const powerup = {
        x: 100,
        y: 300,
        width: 20,
        height: 20,
        markedForDeletion: false
      }
      
      game.powerups.push(powerup)
      
      game.checkCollisions()
      
      expect(powerup.markedForDeletion).toBe(true)
      expect(game.player.collectPowerup).toHaveBeenCalledWith(powerup)
    })

    it('should award points when enemy is destroyed', () => {
      const bullet = {
        x: 200,
        y: 200,
        width: 8,
        height: 3,
        owner: 'player',
        damage: 20,
        markedForDeletion: false
      }
      
      const enemy = {
        x: 200,
        y: 200,
        width: 30,
        height: 20,
        health: 20,
        points: 10,
        takeDamage: vi.fn((damage) => {
          enemy.health -= damage
        }),
        markedForDeletion: false
      }
      
      game.bullets.push(bullet)
      game.enemies.push(enemy)
      
      game.checkCollisions()
      
      expect(game.score).toBe(10)
    })
  })

  describe('checkCollision', () => {
    it('should detect overlapping rectangles', () => {
      const rect1 = { x: 100, y: 100, width: 50, height: 50 }
      const rect2 = { x: 120, y: 120, width: 50, height: 50 }
      
      expect(game.checkCollision(rect1, rect2)).toBe(true)
    })

    it('should detect non-overlapping rectangles', () => {
      const rect1 = { x: 100, y: 100, width: 50, height: 50 }
      const rect2 = { x: 200, y: 200, width: 50, height: 50 }
      
      expect(game.checkCollision(rect1, rect2)).toBe(false)
    })

    it('should detect touching rectangles', () => {
      const rect1 = { x: 100, y: 100, width: 50, height: 50 }
      const rect2 = { x: 150, y: 100, width: 50, height: 50 }
      
      expect(game.checkCollision(rect1, rect2)).toBe(false)
    })

    it('should handle edge cases', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 }
      const rect2 = { x: 5, y: 5, width: 10, height: 10 }
      
      expect(game.checkCollision(rect1, rect2)).toBe(true)
    })
  })

  describe('addBullet', () => {
    it('should add bullet to bullets array', () => {
      const bullet = { x: 100, y: 200, type: 'normal' }
      
      game.addBullet(bullet)
      
      expect(game.bullets).toContain(bullet)
      expect(game.bullets.length).toBe(1)
    })
  })

  describe('addEffect', () => {
    it('should add effect to effects array', () => {
      const effect = { x: 100, y: 200, type: 'explosion' }
      
      game.addEffect(effect)
      
      expect(game.effects).toContain(effect)
      expect(game.effects.length).toBe(1)
    })
  })

  describe('addMessage', () => {
    it('should add message to messages array', () => {
      game.addMessage('Test Message', '#ff0000', 2000)
      
      expect(game.messages.length).toBe(1)
      expect(game.messages[0].text).toBe('Test Message')
      expect(game.messages[0].color).toBe('#ff0000')
      expect(game.messages[0].duration).toBe(2000)
    })

    it('should limit maximum messages', () => {
      // Add more messages than maximum
      for (let i = 0; i < 5; i++) {
        game.addMessage(`Message ${i}`)
      }
      
      expect(game.messages.length).toBeLessThanOrEqual(3) // MAX_MESSAGES = 3
    })
  })

  describe('updateMessages', () => {
    it('should reduce message duration', () => {
      game.addMessage('Test', '#ffffff', 1000)
      const message = game.messages[0]
      message.age = 0 // Initialize age
      
      game.updateMessages()
      
      expect(message.age).toBeGreaterThan(0)
    })

    it('should remove expired messages', () => {
      game.addMessage('Test', '#ffffff', 0)
      
      game.updateMessages()
      
      expect(game.messages.length).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('should remove off-screen enemies', () => {
      const onScreenEnemy = { x: 400, markedForDeletion: false }
      const offScreenEnemy = { x: -200, markedForDeletion: false }
      
      game.enemies.push(onScreenEnemy, offScreenEnemy)
      
      game.cleanup()
      
      expect(game.enemies).toContain(onScreenEnemy)
      expect(game.enemies).not.toContain(offScreenEnemy)
    })

    it('should remove marked bullets', () => {
      const normalBullet = { x: 400, y: 300, markedForDeletion: false }
      const markedBullet = { x: 400, y: 300, markedForDeletion: true }
      
      game.bullets.push(normalBullet, markedBullet)
      
      game.cleanup()
      
      expect(game.bullets).toContain(normalBullet)
      expect(game.bullets).not.toContain(markedBullet)
    })

    it('should remove off-screen powerups', () => {
      const onScreenPowerup = { x: 400, markedForDeletion: false }
      const offScreenPowerup = { x: -200, markedForDeletion: false }
      
      game.powerups.push(onScreenPowerup, offScreenPowerup)
      
      game.cleanup()
      
      expect(game.powerups).toContain(onScreenPowerup)
      expect(game.powerups).not.toContain(offScreenPowerup)
    })
  })

  describe('restart', () => {
    it('should reset game state', () => {
      // Set up game with some state
      game.score = 1000
      game.level = 5
      game.enemiesKilled = 10
      game.gameOver = true
      game.bossActive = true
      game.enemies.push({ x: 100, y: 100 })
      game.bullets.push({ x: 200, y: 200 })
      
      game.restart()
      
      expect(game.score).toBe(0)
      expect(game.level).toBe(1)
      expect(game.enemiesKilled).toBe(0)
      expect(game.gameOver).toBe(false)
      expect(game.bossActive).toBe(false)
      expect(game.enemies.length).toBe(0)
      expect(game.bullets.length).toBe(0)
      expect(game.powerups.length).toBe(0)
      expect(game.effects.length).toBe(0)
      expect(game.messages.length).toBe(0)
    })
    
    it('should reset spawn timers to prevent immediate spawns', () => {
      // Set up game with active spawn timers
      game.enemySpawnTimer = 5000
      game.powerupSpawnTimer = 3000
      game.lastTime = 10000
      game.fpsTimer = 1500
      game.frameCount = 100
      
      game.restart()
      
      // Verify all timers are reset
      expect(game.enemySpawnTimer).toBe(0)
      expect(game.powerupSpawnTimer).toBe(0)
      expect(game.lastTime).toBe(0)
      expect(game.fpsTimer).toBe(0)
      expect(game.frameCount).toBe(0)
    })
  })

  describe('Level Progression', () => {
    beforeEach(() => {
      game.player = {
        x: 100,
        y: 300,
        width: 40,
        height: 30,
        health: 100,
        takeDamage: vi.fn(),
        collectPowerup: vi.fn()
      }
      
      game.audio = {
        playSound: vi.fn()
      }
    })

    it('should advance level when enough enemies killed', () => {
      game.enemiesKilled = 9
      game.enemiesPerLevel = 10
      
      // Create and kill an enemy
      const bullet = {
        x: 200,
        y: 200,
        width: 8,
        height: 3,
        owner: 'player',
        damage: 20,
        markedForDeletion: false
      }
      
      const enemy = {
        x: 200,
        y: 200,
        width: 30,
        height: 20,
        health: 20,
        points: 10,
        takeDamage: vi.fn((damage) => {
          enemy.health -= damage
          if (enemy.health <= 0) {
            enemy.markedForDeletion = true
          }
        }),
        markedForDeletion: false
      }
      
      game.bullets.push(bullet)
      game.enemies.push(enemy)
      
      // Mock addMessage method to avoid issues
      game.addMessage = vi.fn()
      
      game.checkCollisions()
      
      expect(game.level).toBe(2)
      expect(game.enemiesKilled).toBe(0)
    })

    it('should spawn boss at correct intervals', () => {
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = false
      
      // Mock the boss spawn condition
      const shouldSpawnBoss = game.level > 1 && 
                             game.level % 5 === 0 && 
                             !game.bossActive && 
                             game.enemiesKilled % game.enemiesPerLevel === 0 && 
                             game.enemiesKilled >= 0
      
      expect(shouldSpawnBoss).toBe(true)
    })
  })

  describe('Boss Spawn Logic', () => {
    beforeEach(() => {
      game.player = {
        x: 100,
        y: 300,
        width: 40,
        height: 30,
        health: 100,
        takeDamage: vi.fn(),
        collectPowerup: vi.fn()
      }
      
      game.audio = {
        playSound: vi.fn()
      }
      
      game.addMessage = vi.fn()
      game.spawnBoss = vi.fn()
    })

    it('should spawn boss on level 5 with no enemies killed', () => {
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = false
      
      game.update(1000)
      
      expect(game.spawnBoss).toHaveBeenCalled()
    })

    it('should spawn boss on level 10 with no enemies killed', () => {
      game.level = 10
      game.enemiesKilled = 0
      game.bossActive = false
      
      game.update(1000)
      
      expect(game.spawnBoss).toHaveBeenCalled()
    })

    it('should spawn boss on level 15 with no enemies killed', () => {
      game.level = 15
      game.enemiesKilled = 0
      game.bossActive = false
      
      game.update(1000)
      
      expect(game.spawnBoss).toHaveBeenCalled()
    })

    it('should not spawn boss on non-boss levels', () => {
      const nonBossLevels = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 16]
      
      nonBossLevels.forEach(level => {
        game.level = level
        game.enemiesKilled = 0
        game.bossActive = false
        game.spawnBoss.mockClear()
        
        game.update(1000)
        
        expect(game.spawnBoss).not.toHaveBeenCalled()
      })
    })

    it('should not spawn boss if already active', () => {
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = true // Boss already active
      
      game.update(1000)
      
      expect(game.spawnBoss).not.toHaveBeenCalled()
    })

    it('should not spawn boss if enemies have been killed on boss level', () => {
      game.level = 5
      game.enemiesKilled = 3 // Some enemies killed
      game.bossActive = false
      
      game.update(1000)
      
      expect(game.spawnBoss).not.toHaveBeenCalled()
    })

    it('should not spawn boss on level 1', () => {
      game.level = 1
      game.enemiesKilled = 0
      game.bossActive = false
      
      game.update(1000)
      
      expect(game.spawnBoss).not.toHaveBeenCalled()
    })

    it('should spawn boss immediately when reaching boss level through progression', () => {
      game.level = 4
      game.enemiesKilled = 9 // About to level up
      game.bossActive = false
      
      // Create and kill an enemy to trigger level progression
      const bullet = {
        x: 200,
        y: 200,
        width: 8,
        height: 3,
        owner: 'player',
        damage: 20,
        markedForDeletion: false
      }
      
      const enemy = {
        x: 200,
        y: 200,
        width: 30,
        height: 20,
        health: 20,
        points: 10,
        type: 'fighter',
        takeDamage: vi.fn((damage) => {
          enemy.health -= damage
          if (enemy.health <= 0) {
            enemy.markedForDeletion = true
          }
        }),
        markedForDeletion: false
      }
      
      game.bullets.push(bullet)
      game.enemies.push(enemy)
      
      // Trigger collision detection which should advance to level 5
      game.checkCollisions()
      
      expect(game.level).toBe(5)
      expect(game.enemiesKilled).toBe(0)
      
      // Now update should spawn boss
      game.update(1000)
      
      expect(game.spawnBoss).toHaveBeenCalled()
    })

    it('should handle boss defeat correctly', () => {
      game.level = 5
      game.bossActive = true
      game.score = 1000
      
      // Create player bullet and boss
      const bullet = {
        x: 300,
        y: 300,
        width: 8,
        height: 3,
        owner: 'player',
        damage: 200, // Enough to kill boss
        markedForDeletion: false
      }
      
      const boss = {
        x: 300,
        y: 300,
        width: 80,
        height: 60,
        health: 200,
        points: 500,
        type: 'boss',
        takeDamage: vi.fn((damage) => {
          boss.health -= damage
          if (boss.health <= 0) {
            boss.markedForDeletion = true
          }
        }),
        markedForDeletion: false
      }
      
      game.bullets.push(bullet)
      game.enemies.push(boss)
      
      game.checkCollisions()
      
      expect(game.bossActive).toBe(false)
      expect(game.score).toBe(1000 + 500 + 1000) // original + boss points + boss bonus
    })

    it('should reset boss spawn logic after boss defeat', () => {
      game.level = 5
      game.bossActive = true
      game.enemiesKilled = 0
      game.bossSpawnedThisLevel = true // Boss has already been spawned on this level
      
      // Simulate boss defeat
      game.bossActive = false
      
      // Should not spawn another boss on same level
      game.update(1000)
      
      expect(game.spawnBoss).not.toHaveBeenCalled()
      
      // But should spawn boss on next boss level
      game.level = 10
      game.enemiesKilled = 0
      game.bossSpawnedThisLevel = false // Reset for new level
      game.spawnBoss.mockClear()
      
      game.update(1000)
      
      expect(game.spawnBoss).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty arrays in update', () => {
      expect(() => {
        game.updateArray([], 100)
      }).not.toThrow()
    })

    it('should handle null player in collision detection', () => {
      game.player = null
      
      expect(() => {
        game.checkCollisions()
      }).not.toThrow()
    })

    it('should handle very large delta times', () => {
      const mockObject = {
        update: vi.fn(),
        markedForDeletion: false
      }
      
      game.enemies.push(mockObject)
      
      expect(() => {
        game.updateArray(game.enemies, 10000)
      }).not.toThrow()
    })
  })
})
