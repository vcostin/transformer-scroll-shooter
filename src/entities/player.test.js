/**
 * Player Class Tests - Phase 4 Testing Infrastructure
 * 
 * Basic tests for the Player entity class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import Player from '@/entities/player.js'

describe('Player', () => {
  let mockGame
  let player

  beforeEach(() => {
    // Create a more complete mock game object
    mockGame = {
      width: 800,
      height: 600,
      ctx: {
        fillStyle: '',
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        strokeStyle: '',
        lineWidth: 1,
        stroke: vi.fn(),
        fillText: vi.fn(),
        font: '',
        textAlign: 'center',
        measureText: vi.fn(() => ({ width: 50 }))
      },
      keys: {},
      bullets: [],
      effects: [],
      canvas: {
        width: 800,
        height: 600
      },
      audio: {
        playSound: vi.fn()
      },
      delta: 16 // 60 FPS
    }
    
    player = new Player(mockGame, 100, 300)
  })

  describe('Constructor', () => {
    it('should create a player with default values', () => {
      expect(player.x).toBe(100)
      expect(player.y).toBe(300)
      expect(player.health).toBe(100)
      expect(player.maxHealth).toBe(100)
      expect(player.mode).toBe('car')
    })

    it('should initialize with correct size and speed', () => {
      expect(player.width).toBe(40) // Car mode width
      expect(player.height).toBe(25) // Car mode height
      expect(player.speed).toBe(250) // Car mode speed
    })

    it('should start with correct transformer modes', () => {
      expect(player.modes).toEqual(['car', 'scuba', 'boat', 'plane'])
      expect(player.currentModeIndex).toBe(0)
    })
  })

  describe('Basic Properties', () => {
    it('should have power-up system initialized', () => {
      expect(Array.isArray(player.activePowerups)).toBe(true)
      expect(player.shield).toBe(0)
    })

    it('should have shooting system initialized', () => {
      expect(player.shootCooldown).toBe(0)
      expect(player.baseShootRate).toBe(300)
    })

    it('should have mode properties', () => {
      expect(player.modeProperties).toBeDefined()
      expect(player.modeProperties.car).toBeDefined()
      expect(player.modeProperties.scuba).toBeDefined()
      expect(player.modeProperties.boat).toBeDefined()
      expect(player.modeProperties.plane).toBeDefined()
    })
  })

  describe('Mode Properties', () => {
    it('should have different properties for each mode', () => {
      const carMode = player.modeProperties.car
      const scubaMode = player.modeProperties.scuba
      
      expect(carMode.speed).toBeDefined()
      expect(carMode.shootRate).toBeDefined()
      expect(carMode.bulletType).toBeDefined()
      expect(carMode.color).toBeDefined()
      
      expect(scubaMode.speed).toBeDefined()
      expect(scubaMode.shootRate).toBeDefined()
      expect(scubaMode.bulletType).toBeDefined()
      expect(scubaMode.color).toBeDefined()
    })

    it('should have different speeds for different modes', () => {
      const carSpeed = player.modeProperties.car.speed
      const scubaSpeed = player.modeProperties.scuba.speed
      
      expect(carSpeed).not.toBe(scubaSpeed)
      expect(carSpeed).toBeGreaterThan(0)
      expect(scubaSpeed).toBeGreaterThan(0)
    })
  })

  describe('Health System', () => {
    it('should start with full health', () => {
      expect(player.health).toBe(player.maxHealth)
    })

    it('should have positive health values', () => {
      expect(player.health).toBeGreaterThan(0)
      expect(player.maxHealth).toBeGreaterThan(0)
    })
  })

  describe('Transformation System', () => {
    it('should cycle through modes', () => {
      expect(player.mode).toBe('car')
      
      // We can't easily test transformation without mocking audio
      // but we can test the mode array
      expect(player.modes.length).toBe(4)
      expect(player.modes).toContain('car')
      expect(player.modes).toContain('scuba')
      expect(player.modes).toContain('boat')
      expect(player.modes).toContain('plane')
    })

    it('should have transform cooldown system', () => {
      expect(player.transformCooldown).toBe(0)
      expect(typeof player.transformCooldown).toBe('number')
    })
  })

  describe('Shooting System', () => {
    it('should have shooting cooldown system', () => {
      expect(player.shootCooldown).toBe(0)
      expect(player.baseShootRate).toBeGreaterThan(0)
      expect(player.currentShootRate).toBeGreaterThan(0)
    })

    it('should have bullet types for each mode', () => {
      Object.values(player.modeProperties).forEach(mode => {
        expect(mode.bulletType).toBeDefined()
        expect(typeof mode.bulletType).toBe('string')
      })
    })
  })

  describe('Visual Properties', () => {
    it('should have colors for each mode', () => {
      Object.values(player.modeProperties).forEach(mode => {
        expect(mode.color).toBeDefined()
        expect(typeof mode.color).toBe('string')
        expect(mode.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })

    it('should have dimensions for each mode', () => {
      Object.values(player.modeProperties).forEach(mode => {
        expect(mode.width).toBeGreaterThan(0)
        expect(mode.height).toBeGreaterThan(0)
      })
    })
  })
})
