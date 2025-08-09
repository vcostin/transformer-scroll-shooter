/**
 * Unit tests for Effects System
 * Tests particle effects, explosions, and other visual effects
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  Effect,
  Explosion,
  PowerupEffect,
  MuzzleFlash,
  TrailEffect,
  TransformEffect
} from '@/rendering/effects.js'

// Mock Canvas Context
const createMockContext = () => ({
  save: vi.fn(),
  restore: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  globalAlpha: 1,
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1
})

// Mock Game object
const createMockGame = () => ({
  canvas: { width: 800, height: 600 },
  ctx: createMockContext()
})

describe('Effects System', () => {
  let mockGame
  let mockCtx

  beforeEach(() => {
    mockGame = createMockGame()
    mockCtx = mockGame.ctx
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Effect Base Class', () => {
    it('should initialize with correct properties', () => {
      const effect = new Effect(mockGame, 100, 200)

      expect(effect.game).toBe(mockGame)
      expect(effect.x).toBe(100)
      expect(effect.y).toBe(200)
      expect(effect.markedForDeletion).toBe(false)
      expect(effect.age).toBe(0)
      expect(effect.maxAge).toBe(1000)
    })

    it('should update age and mark for deletion when expired', () => {
      const effect = new Effect(mockGame, 100, 200)
      effect.maxAge = 500

      effect.update(400)
      expect(effect.age).toBe(400)
      expect(effect.markedForDeletion).toBe(false)

      effect.update(200)
      expect(effect.age).toBe(600)
      expect(effect.markedForDeletion).toBe(true)
    })

    it('should not render anything in base class', () => {
      const effect = new Effect(mockGame, 100, 200)

      effect.render(mockCtx)

      // Base class render does nothing
      expect(mockCtx.save).not.toHaveBeenCalled()
      expect(mockCtx.restore).not.toHaveBeenCalled()
    })
  })

  describe('Explosion Effect', () => {
    it('should initialize with default medium size', () => {
      const explosion = new Explosion(mockGame, 150, 250)

      expect(explosion.size).toBe('medium')
      expect(explosion.maxAge).toBe(800)
      expect(explosion.particleCount).toBe(12)
      expect(explosion.maxRadius).toBe(35)
      expect(explosion.particles.length).toBe(12)
    })

    it('should initialize with small size properties', () => {
      const explosion = new Explosion(mockGame, 150, 250, 'small')

      expect(explosion.size).toBe('small')
      expect(explosion.maxAge).toBe(500)
      expect(explosion.particleCount).toBe(8)
      expect(explosion.maxRadius).toBe(20)
      expect(explosion.particles.length).toBe(8)
    })

    it('should initialize with large size properties', () => {
      const explosion = new Explosion(mockGame, 150, 250, 'large')

      expect(explosion.size).toBe('large')
      expect(explosion.maxAge).toBe(1200)
      expect(explosion.particleCount).toBe(20)
      expect(explosion.maxRadius).toBe(50)
      expect(explosion.particles.length).toBe(20)
    })

    it('should create particles with correct properties', () => {
      const explosion = new Explosion(mockGame, 150, 250, 'small')

      expect(explosion.particles.length).toBe(8)
      explosion.particles.forEach(particle => {
        expect(particle.x).toBe(150)
        expect(particle.y).toBe(250)
        expect(particle.vx).toBeTypeOf('number')
        expect(particle.vy).toBeTypeOf('number')
        expect(particle.life).toBeGreaterThan(0)
        expect(particle.maxLife).toBe(particle.life)
        expect(particle.size).toBeGreaterThan(0)
        expect(['#ff4444', '#ff8844']).toContain(particle.color)
      })
    })

    it('should update particles with physics', () => {
      const explosion = new Explosion(mockGame, 150, 250, 'small')
      const initialParticle = { ...explosion.particles[0] }

      explosion.update(100)

      const updatedParticle = explosion.particles[0]
      expect(updatedParticle.x).not.toBe(initialParticle.x)
      expect(updatedParticle.y).not.toBe(initialParticle.y)
      expect(updatedParticle.life).toBeLessThan(initialParticle.life)
    })

    it('should remove dead particles', () => {
      const explosion = new Explosion(mockGame, 150, 250, 'small')
      const initialCount = explosion.particles.length

      // Age particles significantly
      explosion.particles.forEach(particle => {
        particle.life = -1 // Make them all dead
      })

      explosion.update(100)

      expect(explosion.particles.length).toBe(0)
      expect(explosion.markedForDeletion).toBe(true)
    })

    it('should render particles with correct canvas operations', () => {
      const explosion = new Explosion(mockGame, 150, 250, 'small')

      explosion.render(mockCtx)

      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(explosion.particles.length)
    })
  })

  describe('PowerupEffect', () => {
    it('should initialize with default properties', () => {
      const effect = new PowerupEffect(mockGame, 100, 200)

      expect(effect.color).toBe('#00ff00')
      expect(effect.maxAge).toBe(1000)
      expect(effect.radius).toBe(0)
      expect(effect.maxRadius).toBe(30)
    })

    it('should initialize with custom color', () => {
      const effect = new PowerupEffect(mockGame, 100, 200, '#ff0000')

      expect(effect.color).toBe('#ff0000')
    })

    it('should update radius based on age', () => {
      const effect = new PowerupEffect(mockGame, 100, 200)

      effect.update(500) // Half of maxAge
      expect(effect.radius).toBeCloseTo(30, 0) // Should be at max radius

      effect.update(500) // Full age
      expect(effect.radius).toBeCloseTo(0, 0) // Should be back to 0
    })

    it('should render with correct canvas operations', () => {
      const effect = new PowerupEffect(mockGame, 100, 200)
      effect.update(250)

      effect.render(mockCtx)

      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
      expect(mockCtx.beginPath).toHaveBeenCalled()
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 200, effect.radius, 0, Math.PI * 2)
      expect(mockCtx.stroke).toHaveBeenCalled()
    })
  })

  describe('MuzzleFlash', () => {
    it('should initialize with default properties', () => {
      const flash = new MuzzleFlash(mockGame, 300, 400)

      expect(flash.angle).toBe(0)
      expect(flash.maxAge).toBe(100)
      expect(flash.length).toBe(20)
      expect(flash.width).toBe(8)
    })

    it('should initialize with custom angle', () => {
      const flash = new MuzzleFlash(mockGame, 300, 400, Math.PI / 2)

      expect(flash.angle).toBe(Math.PI / 2)
    })

    it('should update size based on age', () => {
      const flash = new MuzzleFlash(mockGame, 300, 400)

      flash.update(50) // Half of maxAge
      expect(flash.length).toBe(10) // Half of original
      expect(flash.width).toBe(4) // Half of original

      flash.update(50) // Full age
      expect(flash.length).toBe(0)
      expect(flash.width).toBe(0)
    })

    it('should render with correct transformations', () => {
      const flash = new MuzzleFlash(mockGame, 300, 400, Math.PI / 4)

      flash.render(mockCtx)

      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
      expect(mockCtx.translate).toHaveBeenCalledWith(300, 400)
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 4)
      expect(mockCtx.fillRect).toHaveBeenCalled()
    })
  })

  describe('TrailEffect', () => {
    it('should initialize with default properties', () => {
      const trail = new TrailEffect(mockGame, 50, 75)

      expect(trail.color).toBe('#ffffff')
      expect(trail.maxAge).toBe(300)
      expect(trail.size).toBe(4)
    })

    it('should initialize with custom color', () => {
      const trail = new TrailEffect(mockGame, 50, 75, '#ff00ff')

      expect(trail.color).toBe('#ff00ff')
    })

    it('should update size based on age', () => {
      const trail = new TrailEffect(mockGame, 50, 75)

      trail.update(150) // Half of maxAge
      expect(trail.size).toBe(2) // Half of original

      trail.update(150) // Full age
      expect(trail.size).toBe(0)
    })

    it('should render with correct canvas operations', () => {
      const trail = new TrailEffect(mockGame, 50, 75)

      trail.render(mockCtx)

      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
      expect(mockCtx.fillRect).toHaveBeenCalledWith(
        50 - trail.size / 2,
        75 - trail.size / 2,
        trail.size,
        trail.size
      )
    })
  })

  describe('TransformEffect', () => {
    it('should initialize with particles and rings', () => {
      const transform = new TransformEffect(mockGame, 400, 500)

      expect(transform.maxAge).toBe(1000)
      expect(transform.particles.length).toBe(15)
      expect(transform.rings.length).toBe(3)
    })

    it('should create particles with correct properties', () => {
      const transform = new TransformEffect(mockGame, 400, 500)

      transform.particles.forEach(particle => {
        expect(particle.x).toBeTypeOf('number')
        expect(particle.y).toBeTypeOf('number')
        expect(particle.vx).toBeTypeOf('number')
        expect(particle.vy).toBeTypeOf('number')
        expect(particle.life).toBe(1)
        expect(particle.size).toBeGreaterThan(0)
        expect(['#00ffff', '#0088ff']).toContain(particle.color)
      })
    })

    it('should create rings with correct properties', () => {
      const transform = new TransformEffect(mockGame, 400, 500)

      transform.rings.forEach((ring, index) => {
        expect(ring.radius).toBe(0)
        expect(ring.maxRadius).toBe(60 + index * 20)
        expect(ring.life).toBe(1)
        expect(ring.speed).toBe(100 + index * 30)
        expect(ring.color).toBe('#00aaff')
      })
    })

    it('should update particles and rings', () => {
      const transform = new TransformEffect(mockGame, 400, 500)
      const initialParticleCount = transform.particles.length
      const initialRingCount = transform.rings.length
      const initialRing = { ...transform.rings[0] }

      transform.update(200) // Use 200ms delta time

      // Check that we still have particles after update
      expect(transform.particles.length).toBeGreaterThan(0)

      const updatedRing = transform.rings[0]

      // Check that ring radius increased and life decreased
      expect(updatedRing.radius).toBeGreaterThan(initialRing.radius)
      expect(updatedRing.life).toBeLessThan(initialRing.life)

      // Check that particles have velocity (they should be moving)
      const hasMovingParticles = transform.particles.some(
        p => Math.abs(p.vx) > 0 || Math.abs(p.vy) > 0
      )
      expect(hasMovingParticles).toBe(true)
    })

    it('should remove dead particles and rings', () => {
      const transform = new TransformEffect(mockGame, 400, 500)

      // Kill all particles and rings
      transform.particles.forEach(particle => {
        particle.life = -1
      })
      transform.rings.forEach(ring => {
        ring.life = -1
      })

      transform.update(100)

      expect(transform.particles.length).toBe(0)
      expect(transform.rings.length).toBe(0)
      expect(transform.markedForDeletion).toBe(true)
    })

    it('should render rings and particles', () => {
      const transform = new TransformEffect(mockGame, 400, 500)

      transform.render(mockCtx)

      expect(mockCtx.save).toHaveBeenCalled()
      expect(mockCtx.restore).toHaveBeenCalled()
      expect(mockCtx.beginPath).toHaveBeenCalledTimes(transform.rings.length)
      expect(mockCtx.arc).toHaveBeenCalledTimes(transform.rings.length)
      expect(mockCtx.stroke).toHaveBeenCalledTimes(transform.rings.length)
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(transform.particles.length)
    })
  })
})
