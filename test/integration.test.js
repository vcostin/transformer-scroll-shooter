/**
 * Integration Tests - Phase 4 Testing Infrastructure
 * 
 * Tests that validate the integration between modules
 */

import { describe, it, expect } from 'vitest'
import { GAME_CONSTANTS, GAME_INFO } from '../src/constants/game-constants.js'
import * as CollisionUtils from '../src/utils/collision.js'
import * as MathUtils from '../src/utils/math.js'
import { Player } from '../src/entities/player.js'

describe('Module Integration', () => {
  describe('Constants Integration', () => {
    it('should have all game constants available', () => {
      expect(GAME_CONSTANTS).toBeDefined()
      expect(GAME_INFO).toBeDefined()
    })

    it('should have consistent version format', () => {
      expect(GAME_INFO.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(GAME_INFO.versionMajor).toBeGreaterThan(0)
      expect(GAME_INFO.versionMinor).toBeGreaterThanOrEqual(0)
      expect(GAME_INFO.versionPatch).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Utilities Integration', () => {
    it('should have all math utilities available', () => {
      expect(MathUtils.clamp).toBeDefined()
      expect(MathUtils.lerp).toBeDefined()
      expect(MathUtils.randomBetween).toBeDefined()
      expect(MathUtils.randomInt).toBeDefined()
      expect(MathUtils.degreesToRadians).toBeDefined()
      expect(MathUtils.radiansToDegrees).toBeDefined()
    })

    it('should have all collision utilities available', () => {
      expect(CollisionUtils.checkRectCollision).toBeDefined()
      expect(CollisionUtils.checkCircleCollision).toBeDefined()
      expect(CollisionUtils.pointInRect).toBeDefined()
      expect(CollisionUtils.calculateDistance).toBeDefined()
      expect(CollisionUtils.calculateAngle).toBeDefined()
    })
  })

  describe('Player Integration', () => {
    it('should create player with proper game integration', () => {
      const mockGame = {
        width: 800,
        height: 600,
        ctx: { save: () => {}, restore: () => {} },
        keys: {},
        bullets: [],
        effects: [],
        canvas: { width: 800, height: 600 },
        audio: { playSound: () => {} },
        delta: 16
      }

      const player = new Player(mockGame, 100, 300)
      expect(player).toBeDefined()
      expect(player.game).toBe(mockGame)
      expect(player.x).toBe(100)
      expect(player.y).toBe(300)
    })

    it('should have proper mode system integration', () => {
      const mockGame = {
        width: 800,
        height: 600,
        ctx: { save: () => {}, restore: () => {} },
        keys: {},
        bullets: [],
        effects: [],
        canvas: { width: 800, height: 600 },
        audio: { playSound: () => {} },
        delta: 16
      }

      const player = new Player(mockGame, 100, 300)
      
      // Test mode integration
      expect(player.modes).toEqual(['car', 'scuba', 'boat', 'plane'])
      expect(player.mode).toBe('car')
      expect(player.modeProperties[player.mode]).toBeDefined()
      
      // Test that mode properties are applied
      const currentMode = player.modeProperties[player.mode]
      expect(player.width).toBe(currentMode.width)
      expect(player.height).toBe(currentMode.height)
      expect(player.speed).toBe(currentMode.speed)
    })
  })

  describe('Cross-Module Integration', () => {
    it('should be able to use utils with player', () => {
      const mockGame = {
        width: 800,
        height: 600,
        ctx: { save: () => {}, restore: () => {} },
        keys: {},
        bullets: [],
        effects: [],
        canvas: { width: 800, height: 600 },
        audio: { playSound: () => {} },
        delta: 16
      }

      const player = new Player(mockGame, 100, 300)
      
      // Test using math utils with player
      const clampedX = MathUtils.clamp(player.x, 0, 800)
      expect(clampedX).toBe(100)
      
      // Test using collision utils with player
      const playerRect = { x: player.x, y: player.y, width: player.width, height: player.height }
      const testPoint = { x: player.x + 10, y: player.y + 10 }
      expect(CollisionUtils.pointInRect(testPoint, playerRect)).toBe(true)
    })

    it('should have consistent game constants usage', () => {
      // Test that constants are reasonable for gameplay
      expect(GAME_CONSTANTS.BOSS_LEVEL_INTERVAL).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.ENEMIES_PER_LEVEL).toBeGreaterThan(0)
      expect(GAME_CONSTANTS.PLAYER_LIVES).toBeGreaterThan(0)
      
      // Test that performance limits are reasonable
      expect(GAME_CONSTANTS.MAX_PARTICLES).toBeGreaterThan(10)
      expect(GAME_CONSTANTS.MAX_BULLETS).toBeGreaterThan(10)
      expect(GAME_CONSTANTS.MAX_ENEMIES).toBeGreaterThan(5)
    })
  })

  describe('Module Exports', () => {
    it('should export all expected functions from math utils', () => {
      const mathExports = Object.keys(MathUtils)
      expect(mathExports).toContain('clamp')
      expect(mathExports).toContain('lerp')
      expect(mathExports).toContain('randomBetween')
      expect(mathExports).toContain('randomInt')
      expect(mathExports).toContain('degreesToRadians')
      expect(mathExports).toContain('radiansToDegrees')
      expect(mathExports).toContain('normalize')
      expect(mathExports).toContain('magnitude')
    })

    it('should export all expected functions from collision utils', () => {
      const collisionExports = Object.keys(CollisionUtils)
      expect(collisionExports).toContain('checkRectCollision')
      expect(collisionExports).toContain('checkCircleCollision')
      expect(collisionExports).toContain('pointInRect')
      expect(collisionExports).toContain('calculateDistance')
      expect(collisionExports).toContain('calculateAngle')
      expect(collisionExports).toContain('isWithinBounds')
    })

    it('should export player class properly', () => {
      expect(Player).toBeDefined()
      expect(typeof Player).toBe('function')
      expect(Player.prototype).toBeDefined()
    })
  })
})
