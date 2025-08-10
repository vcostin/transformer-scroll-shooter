import { describe, it, expect, vi, beforeEach } from 'vitest'
import ParallaxRenderer, { computeTiledPositions } from './ParallaxRenderer.js'
import level1 from '../../docs/creative/specs/LEVEL1_PARALLAX.json'

function makeCtx(width = 1280, height = 720) {
  const calls = []
  const ctx = {
    canvas: { width, height },
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn((img, sx, sy, sw, sh, dx, dy, dw, dh) => {
      calls.push({ img, sx, sy, sw, sh, dx, dy, dw, dh })
    }),
    set globalAlpha(v) {
      this._ga = v
    },
    get globalAlpha() {
      return this._ga
    }
  }
  return { ctx, calls }
}

describe('ParallaxRenderer', () => {
  it('loads LEVEL1 spec and sorts 5 layers with expected speeds', () => {
    const pr = new ParallaxRenderer(level1, {
      baseSpeedPxPerSec: 100,
      viewport: { width: 1280, height: 720 }
    })
    expect(pr.runtimeLayers).toHaveLength(5)
    // Sorted by zIndex ascending
    expect(pr.runtimeLayers.map(l => l.id)).toEqual([
      'far_clouds',
      'mid_towers',
      'mid_billboards',
      'near_overpass',
      'fx_sparks'
    ])
    // Speeds are speed * base
    const speeds = pr.runtimeLayers.map(l => l.speedPxPerSec)
    expect(speeds).toEqual([10, 35, 50, 75, 100])
  })

  it('computeTiledPositions returns two positions covering width', () => {
    const [a, b] = computeTiledPositions(30, 200)
    expect(b - a).toBe(200)
    // offset wraps correctly
    const [c, d] = computeTiledPositions(-10, 200)
    expect(d - c).toBe(200)
  })

  it('update steps offsets and render draws two tiles per asset layer when images loaded', () => {
    const pr = new ParallaxRenderer(level1, {
      baseSpeedPxPerSec: 100,
      viewport: { width: 1280, height: 720 }
    })
    const { ctx, calls } = makeCtx()

    // Step half a second
    pr.update(500)

    // Force images to be present in cache and complete without touching global.Image
    for (const l of pr.runtimeLayers) {
      if (l.asset && l.asset !== 'generated') {
        const fake = {
          complete: true,
          naturalWidth: 1280,
          naturalHeight: 720,
          width: 1280,
          height: 720
        }
        pr.images.map.set(l.asset, fake)
      }
    }

    pr.render(ctx)

    // Should draw two tiles for each of the 4 image-backed layers (fx_sparks is generated)
    const imgLayerCount = pr.runtimeLayers.filter(l => l.asset && l.asset !== 'generated').length
    expect(calls.length).toBe(imgLayerCount * 2)

    // Verify offsets moved positive (right direction by default in spec)
    const offsets = pr.runtimeLayers.map(l => l.offsetX)
    // far_clouds should move by +5 (0.5s * 10px/s)
    expect(offsets[0]).toBeCloseTo(5, 3)
  })
})
