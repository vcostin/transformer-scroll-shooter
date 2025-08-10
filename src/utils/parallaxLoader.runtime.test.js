import { describe, it, expect } from 'vitest'
import loadParallaxSpec, { toRuntimeLayers, stepRuntimeLayers } from './parallaxLoader.js'

const spec = {
  parallax: {
    scrollDirection: 'left',
    tileWidth: 800,
    tileHeight: 600,
    layers: [
      { id: 'a', name: 'A', speed: 0.2, zIndex: 10, opacity: 1, asset: 'a.svg' },
      { id: 'b', name: 'B', speed: 0.8, zIndex: 20, opacity: 1, asset: 'b.svg' }
    ]
  }
}

describe('parallax runtime adapter', () => {
  it('creates runtime layers with pixel speeds and dimensions', () => {
    const normalized = loadParallaxSpec(spec)
    const runtime = toRuntimeLayers(normalized, {
      baseSpeedPxPerSec: 120,
      viewport: { width: 1024, height: 512 }
    })
    expect(runtime).toHaveLength(2)
    expect(runtime[0]).toMatchObject({
      id: 'a',
      speedPxPerSec: 24,
      width: 1024,
      height: 512,
      direction: 'left'
    })
    expect(runtime[1]).toMatchObject({ id: 'b', speedPxPerSec: 96 })
  })

  it('steps offsets based on delta time and direction', () => {
    const normalized = loadParallaxSpec(spec)
    const runtime = toRuntimeLayers(normalized, { baseSpeedPxPerSec: 100 })
    stepRuntimeLayers(runtime, 500) // 0.5s
    // left direction moves negative
    expect(runtime[0].offsetX).toBeCloseTo(-10, 3) // 0.2 * 100 * 0.5
    expect(runtime[1].offsetX).toBeCloseTo(-40, 3)
  })
})
