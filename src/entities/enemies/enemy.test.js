/**
 * Tests for the Enemy entity using Entity-State architecture
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createEnemy, Enemy } from './enemy.js'
import { ENEMY_EVENTS } from '@/constants/enemy-events.js'
import { createStateManager } from '@/systems/StateManager.js'
import { createMockGameObject } from '@test/game-test-utils.js'

describe('Enemy', () => {
  let mockGame
  let stateManager
  let enemyId

  beforeEach(() => {
    mockGame = createMockGameObject()
    stateManager = createStateManager()
    mockGame.stateManager = stateManager
    mockGame.player = {
      x: 100,
      y: 300,
      width: 40,
      height: 30
    }
  })

  afterEach(() => {
    if (mockGame.effectManager && mockGame.effectManager.isRunning) {
      mockGame.effectManager.stop()
    }
  })

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        700,
        200,
        'fighter'
      )

      const position = Enemy.getPosition(stateManager, enemyId)
      expect(position.x).toBe(700)
      expect(position.y).toBe(200)
      expect(Enemy.getType(stateManager, enemyId)).toBe('fighter')
      expect(Enemy.isMarkedForDeletion(stateManager, enemyId)).toBe(false)
      expect(Enemy.getShootTimer(stateManager, enemyId)).toBe(0)
      expect(Enemy.getMoveTimer(stateManager, enemyId)).toBe(0)
      expect(Enemy.getTargetY(stateManager, enemyId)).toBe(200)
    })

    it('should call setupType during construction', () => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        700,
        200,
        'bomber'
      )

      const dimensions = Enemy.getDimensions(stateManager, enemyId)
      expect(dimensions.width).toBe(45)
      expect(dimensions.height).toBe(35)
      expect(Enemy.getMaxHealth(stateManager, enemyId)).toBe(40)
      expect(Enemy.getHealth(stateManager, enemyId)).toBe(40)
      expect(Enemy.getSpeed(stateManager, enemyId)).toBe(60)
      expect(Enemy.getDamage(stateManager, enemyId)).toBe(25)
      expect(Enemy.getPoints(stateManager, enemyId)).toBe(25)
      expect(Enemy.getColor(stateManager, enemyId)).toBe('#ff8844')
    })
  })

  describe('setupType', () => {
    it('should configure fighter type correctly', () => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        0,
        0,
        'fighter'
      )

      const dimensions = Enemy.getDimensions(stateManager, enemyId)
      expect(dimensions.width).toBe(30)
      expect(dimensions.height).toBe(20)
      expect(Enemy.getMaxHealth(stateManager, enemyId)).toBe(20)
      expect(Enemy.getHealth(stateManager, enemyId)).toBe(20)
      expect(Enemy.getSpeed(stateManager, enemyId)).toBe(100)
      expect(Enemy.getDamage(stateManager, enemyId)).toBe(15)
      expect(Enemy.getPoints(stateManager, enemyId)).toBe(10)
      expect(Enemy.getColor(stateManager, enemyId)).toBe('#ff4444')
      expect(Enemy.getShootRate(stateManager, enemyId)).toBe(2000)
      expect(Enemy.getBulletSpeed(stateManager, enemyId)).toBe(200)
    })

    it('should configure bomber type correctly', () => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        0,
        0,
        'bomber'
      )

      const dimensions = Enemy.getDimensions(stateManager, enemyId)
      expect(dimensions.width).toBe(45)
      expect(dimensions.height).toBe(35)
      expect(Enemy.getMaxHealth(stateManager, enemyId)).toBe(40)
      expect(Enemy.getHealth(stateManager, enemyId)).toBe(40)
      expect(Enemy.getSpeed(stateManager, enemyId)).toBe(60)
      expect(Enemy.getDamage(stateManager, enemyId)).toBe(25)
      expect(Enemy.getPoints(stateManager, enemyId)).toBe(25)
      expect(Enemy.getColor(stateManager, enemyId)).toBe('#ff8844')
      expect(Enemy.getShootRate(stateManager, enemyId)).toBe(3000)
      expect(Enemy.getBulletSpeed(stateManager, enemyId)).toBe(150)
    })

    it('should configure scout type correctly', () => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        0,
        0,
        'scout'
      )

      const dimensions = Enemy.getDimensions(stateManager, enemyId)
      expect(dimensions.width).toBe(20)
      expect(dimensions.height).toBe(15)
      expect(Enemy.getMaxHealth(stateManager, enemyId)).toBe(10)
      expect(Enemy.getHealth(stateManager, enemyId)).toBe(10)
      expect(Enemy.getSpeed(stateManager, enemyId)).toBe(180)
      expect(Enemy.getDamage(stateManager, enemyId)).toBe(10)
      expect(Enemy.getPoints(stateManager, enemyId)).toBe(5)
      expect(Enemy.getColor(stateManager, enemyId)).toBe('#44ff44')
      expect(Enemy.getShootRate(stateManager, enemyId)).toBe(1500)
      expect(Enemy.getBulletSpeed(stateManager, enemyId)).toBe(250)
    })

    it('should configure boss type correctly', () => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        0,
        0,
        'boss'
      )

      const dimensions = Enemy.getDimensions(stateManager, enemyId)
      expect(dimensions.width).toBe(80)
      expect(dimensions.height).toBe(60)
      expect(Enemy.getMaxHealth(stateManager, enemyId)).toBe(200)
      expect(Enemy.getHealth(stateManager, enemyId)).toBe(200)
      expect(Enemy.getSpeed(stateManager, enemyId)).toBe(50)
      expect(Enemy.getDamage(stateManager, enemyId)).toBe(50)
      expect(Enemy.getPoints(stateManager, enemyId)).toBe(500)
      expect(Enemy.getColor(stateManager, enemyId)).toBe('#ff0000')
      expect(Enemy.getShootRate(stateManager, enemyId)).toBe(1000)
      expect(Enemy.getBulletSpeed(stateManager, enemyId)).toBe(300)
    })

    it('should default to fighter type for unknown types', () => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        0,
        0,
        'unknown'
      )

      const dimensions = Enemy.getDimensions(stateManager, enemyId)
      expect(dimensions.width).toBe(30)
      expect(dimensions.height).toBe(20)
      expect(Enemy.getType(stateManager, enemyId)).toBe('fighter') // Default case sets type to 'fighter'
      expect(Enemy.getMaxHealth(stateManager, enemyId)).toBe(20) // But stats default to fighter
    })
  })

  describe('Event-Driven Architecture', () => {
    beforeEach(() => {
      enemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        700,
        200,
        'fighter'
      )
    })

    it('should emit ENEMY_CREATED event on construction', () => {
      const eventSpy = vi.spyOn(mockGame.eventDispatcher, 'emit')
      const newEnemyId = createEnemy(
        stateManager,
        mockGame.eventDispatcher,
        mockGame.effectManager,
        800,
        300,
        'bomber'
      )

      expect(eventSpy).toHaveBeenCalledWith(
        ENEMY_EVENTS.ENEMY_CREATED,
        expect.objectContaining({
          enemyId: newEnemyId,
          type: 'bomber'
        })
      )
    })
  })
})
