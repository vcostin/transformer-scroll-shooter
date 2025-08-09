/**
 * Game Constants Tests - Phase 4 Testing Infrastructure
 *
 * Tests for game configuration constants
 */

import { describe, it, expect } from 'vitest'
import { GAME_CONSTANTS, GAME_INFO } from '@/constants/game-constants.js'

describe('Game Constants', () => {
  describe('GAME_CONSTANTS', () => {
    it('should have boss configuration', () => {
      expect(GAME_CONSTANTS.BOSS_LEVEL_INTERVAL).toBe(5)
      expect(GAME_CONSTANTS.ENEMIES_PER_LEVEL).toBe(10)
      expect(GAME_CONSTANTS.BOSS_BONUS_SCORE).toBe(1000)
      expect(GAME_CONSTANTS.BOSS_HEALTH_RESTORE).toBe(25)
    })

    it('should have message system configuration', () => {
      expect(GAME_CONSTANTS.MESSAGE_DURATION).toBeDefined()
      expect(GAME_CONSTANTS.MESSAGE_DURATION.BOSS).toBe(3000)
      expect(GAME_CONSTANTS.MESSAGE_DURATION.VICTORY).toBe(2000)
      expect(GAME_CONSTANTS.MESSAGE_DURATION.INFO).toBe(2000)
      expect(GAME_CONSTANTS.MAX_MESSAGES).toBe(3)
    })

    it('should have game mechanics configuration', () => {
      expect(GAME_CONSTANTS.PLAYER_LIVES).toBe(3)
      expect(GAME_CONSTANTS.POWERUP_SPAWN_RATE).toBe(0.1)
    })

    it('should have performance settings', () => {
      expect(GAME_CONSTANTS.MAX_PARTICLES).toBe(100)
      expect(GAME_CONSTANTS.MAX_BULLETS).toBe(50)
      expect(GAME_CONSTANTS.MAX_ENEMIES).toBe(20)
    })
  })

  describe('GAME_INFO', () => {
    it('should have version information', () => {
      expect(GAME_INFO.version).toBeDefined()
      expect(typeof GAME_INFO.version).toBe('string')
      expect(GAME_INFO.version).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('should have game information', () => {
      expect(GAME_INFO.name).toBeDefined()
      expect(GAME_INFO.name).toContain('Transformer')
      expect(GAME_INFO.description).toBeDefined()
      expect(GAME_INFO.author).toBeDefined()
    })

    it('should have build information', () => {
      expect(GAME_INFO.buildDate).toBeDefined()
      expect(typeof GAME_INFO.buildDate).toBe('string')
    })

    it('should have computed properties', () => {
      expect(GAME_INFO.fullTitle).toBeDefined()
      expect(GAME_INFO.fullTitle).toContain('Transformer')
      expect(GAME_INFO.shortVersion).toBeDefined()
      expect(GAME_INFO.buildInfo).toBeDefined()
    })

    it('should have welcome message', () => {
      expect(GAME_INFO.welcomeMessage).toBeDefined()
      expect(Array.isArray(GAME_INFO.welcomeMessage)).toBe(true)
      expect(GAME_INFO.welcomeMessage.length).toBeGreaterThan(0)
    })
  })

  describe('Constant Validation', () => {
    it('should have reasonable numeric values', () => {
      expect(GAME_CONSTANTS.BOSS_LEVEL_INTERVAL).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.ENEMIES_PER_LEVEL).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.BOSS_BONUS_SCORE).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.PLAYER_LIVES).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.POWERUP_SPAWN_RATE).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.POWERUP_SPAWN_RATE).toBeLessThan(1)
    })

    it('should have reasonable performance limits', () => {
      expect(GAME_CONSTANTS.MAX_PARTICLES).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.MAX_BULLETS).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.MAX_ENEMIES).toBeGreaterThan(0)
    })

    it('should have valid message durations', () => {
      Object.values(GAME_CONSTANTS.MESSAGE_DURATION).forEach(duration => {
        expect(duration).toBeGreaterThan(0)
        expect(duration).toBeLessThan(10000) // Less than 10 seconds
      })
    })
  })
})
