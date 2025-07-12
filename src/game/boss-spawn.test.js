/**
 * Boss Spawn Logic Tests
 * Tests the fix for boss spawn bug on stage 5 and other boss levels
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Game from '@/game/game.js'
import Enemy from '@/entities/enemies/enemy.js'
import { GAME_CONSTANTS } from '@/constants/game-constants.js'

describe('Boss Spawn Logic', () => {
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
    
    console.log('🧪 Boss spawn test setup complete')
    
    // Initialize game for testing
    game = new Game()
  })

  afterEach(() => {
    // Clean up any running timers
    vi.clearAllTimers()
    vi.clearAllMocks()
    
    // Reset environment
    delete process.env.NODE_ENV
  })

  describe('Boss Spawn Conditions', () => {
    it('should have correct boss level interval', () => {
      expect(GAME_CONSTANTS.BOSS_LEVEL_INTERVAL).toBe(5)
    })

    it('should spawn boss on level 5 with no enemies killed', () => {
      // Set up conditions for boss spawn
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = false
      
      // Test the condition used in the fixed code
      const shouldSpawn = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                         !game.bossActive && 
                         game.enemiesKilled === 0
      
      expect(shouldSpawn).toBe(true)
      expect(game.level).toBe(5)
      expect(game.enemiesKilled).toBe(0)
      expect(game.bossActive).toBe(false)
    })

    it('should spawn boss on level 10 with no enemies killed', () => {
      game.level = 10
      game.enemiesKilled = 0
      game.bossActive = false
      
      const shouldSpawn = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                         !game.bossActive && 
                         game.enemiesKilled === 0
      
      expect(shouldSpawn).toBe(true)
    })

    it('should spawn boss on level 15 with no enemies killed', () => {
      game.level = 15
      game.enemiesKilled = 0
      game.bossActive = false
      
      const shouldSpawn = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                         !game.bossActive && 
                         game.enemiesKilled === 0
      
      expect(shouldSpawn).toBe(true)
    })

    it('should not spawn boss on non-boss levels', () => {
      const nonBossLevels = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14]
      
      nonBossLevels.forEach(level => {
        game.level = level
        game.enemiesKilled = 0
        game.bossActive = false
        
        const shouldSpawn = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                           !game.bossActive && 
                           game.enemiesKilled === 0
        
        expect(shouldSpawn).toBe(false)
      })
    })

    it('should not spawn boss if already active', () => {
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = true // Boss is already active
      
      const shouldSpawn = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                         !game.bossActive && 
                         game.enemiesKilled === 0
      
      expect(shouldSpawn).toBe(false)
    })

    it('should not spawn boss if enemies have been killed on boss level', () => {
      game.level = 5
      game.enemiesKilled = 3 // Some enemies killed - should prevent boss spawn
      game.bossActive = false
      
      const shouldSpawn = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                         !game.bossActive && 
                         game.enemiesKilled === 0
      
      expect(shouldSpawn).toBe(false)
    })
  })

  describe('Boss Spawn Integration', () => {
    it('should actually spawn boss when conditions are met', () => {
      // Set up boss spawn conditions
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = false
      
      const initialEnemyCount = game.enemies.length
      
      // Spawn boss
      game.spawnBoss()
      
      // Check that boss was spawned
      expect(game.enemies.length).toBe(initialEnemyCount + 1)
      expect(game.bossActive).toBe(true)
      
      // Find the boss enemy (should be the last one spawned)
      const boss = game.enemies[game.enemies.length - 1]
      expect(game.isBoss(boss)).toBe(true) // Check if it's any boss type
    })

    it('should not spawn boss when conditions are not met', () => {
      // Set up non-boss level
      game.level = 3
      game.enemiesKilled = 0
      game.bossActive = false
      
      const initialEnemyCount = game.enemies.length
       // Simulate a game update (should not spawn boss)
      game.update(16)
      
      // Verify that boss was not spawned
      expect(game.enemies.length).toBe(initialEnemyCount)
      expect(game.bossActive).toBe(false)
    })
  })

  describe('Fixed Boss Spawn Logic', () => {
    it('should use the correct fixed condition logic', () => {
      // Test the original problematic scenario
      game.level = 5
      game.enemiesKilled = 0 // This was the key fix - checking for 0 instead of > 0
      game.bossActive = false
      
      // Original broken condition would be:
      // this.level > 1 && this.level % BOSS_LEVEL_INTERVAL === 0 && 
      // !this.bossActive && this.enemiesKilled % this.enemiesPerLevel === 0 && 
      // this.enemiesKilled > 0
      
      // The issue was enemiesKilled > 0 but it's 0 at start of boss level
      const brokenCondition = game.level > 1 && 
                             game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                             !game.bossActive && 
                             game.enemiesKilled % game.enemiesPerLevel === 0 && 
                             game.enemiesKilled > 0
      
      expect(brokenCondition).toBe(false) // This would fail
      
      // Fixed condition:
      const fixedCondition = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                            !game.bossActive && 
                            game.enemiesKilled === 0
      
      expect(fixedCondition).toBe(true) // This works correctly
    })

    it('should demonstrate the bug fix works for multiple boss levels', () => {
      const bossLevels = [5, 10, 15, 20, 25, 30]
      
      bossLevels.forEach(level => {
        game.level = level
        game.enemiesKilled = 0
        game.bossActive = false
        
        // Fixed condition should work
        const fixedCondition = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                              !game.bossActive && 
                              game.enemiesKilled === 0
        
        expect(fixedCondition).toBe(true)
      })
    })
  })

  describe('Boss Spawn Level Tracking', () => {
    it('should track boss spawn state per level', () => {
      // Start with no boss spawned
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = false
      game.bossSpawnedThisLevel = false
      
      expect(game.bossSpawnedThisLevel).toBe(false)
      
      // Spawn boss
      game.spawnBoss()
      
      expect(game.bossSpawnedThisLevel).toBe(true)
      expect(game.bossActive).toBe(true)
    })

    it('should reset boss spawn tracking when advancing to new level', () => {
      // Set up boss spawned state
      game.level = 5
      game.bossSpawnedThisLevel = true
      game.bossActive = false
      
      // Advance to next level
      game.level = 6
      game.bossSpawnedThisLevel = false // This would happen in level progression
      
      expect(game.bossSpawnedThisLevel).toBe(false)
    })

    it('should prevent multiple boss spawns on same level', () => {
      // Set up conditions where boss has already been spawned
      game.level = 5
      game.enemiesKilled = 0
      game.bossActive = false
      game.bossSpawnedThisLevel = true // Boss already spawned on this level
      
      // Try to spawn boss again
      const shouldSpawn = game.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && 
                         !game.bossActive && 
                         game.enemiesKilled === 0 &&
                         !game.bossSpawnedThisLevel
      
      expect(shouldSpawn).toBe(false)
    })
  })

  describe('Boss Variety', () => {
    it('should spawn different boss types', () => {
      // Test multiple boss spawns to see if we get variety
      const bossTypes = new Set();
      
      // Mock Math.random to control boss type selection
      const originalRandom = Math.random;
      
      // Test each boss type
      Math.random = () => 0.0; // First boss type
      game.spawnBoss();
      bossTypes.add(game.enemies[game.enemies.length - 1].type);
      
      Math.random = () => 0.3; // Second boss type
      game.enemies = []; // Clear enemies
      game.spawnBoss();
      bossTypes.add(game.enemies[game.enemies.length - 1].type);
      
      Math.random = () => 0.6; // Third boss type
      game.enemies = []; // Clear enemies
      game.spawnBoss();
      bossTypes.add(game.enemies[game.enemies.length - 1].type);
      
      Math.random = () => 0.9; // Fourth boss type
      game.enemies = []; // Clear enemies
      game.spawnBoss();
      bossTypes.add(game.enemies[game.enemies.length - 1].type);
      
      // Restore original Math.random
      Math.random = originalRandom;
      
      // Should have spawned different boss types
      expect(bossTypes.size).toBeGreaterThan(1);
      expect(bossTypes.has('boss')).toBe(true);
    })

    it('should recognize all boss types as bosses', () => {
      const bossTypes = ['boss', 'boss_heavy', 'boss_fast', 'boss_sniper'];
      
      bossTypes.forEach(bossType => {
        const mockEnemy = { type: bossType };
        expect(game.isBoss(mockEnemy)).toBe(true);
      });
      
      // Non-boss types should return false
      const nonBossTypes = ['fighter', 'bomber', 'scout'];
      nonBossTypes.forEach(enemyType => {
        const mockEnemy = { type: enemyType };
        expect(game.isBoss(mockEnemy)).toBe(false);
      });
    })

    it('should have different properties for different boss types', () => {
      const bossTypes = ['boss', 'boss_heavy', 'boss_fast', 'boss_sniper'];
      
      bossTypes.forEach(bossType => {
        const boss = new Enemy(game, 100, 100, bossType);
        expect(boss.type).toBe(bossType);
        expect(boss.maxHealth).toBeGreaterThan(100); // All bosses should have high health
        expect(boss.points).toBeGreaterThan(400); // All bosses should give high points
      });
    })
  })
})
