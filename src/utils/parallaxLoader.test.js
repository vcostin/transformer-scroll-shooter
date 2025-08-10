import { describe, it, expect } from 'vitest'
import loadParallaxSpec from './parallaxLoader.js'

const validSpec = {
  levelId: 'level1_city_above_clouds',
  displayName: 'City Above Clouds',
  parallax: {
    scrollDirection: 'left',
    tileWidth: 1280,
    tileHeight: 720,
    layers: [
      {
        id: 'far_clouds',
        name: 'Far Clouds',
        speed: 0.1,
        zIndex: 10,
        opacity: 1,
        asset: 'assets/backgrounds/city/far_clouds.svg'
      },
      {
        id: 'mid_towers',
        name: 'Stratos Towers',
        speed: 0.35,
        zIndex: 20,
        opacity: 1,
        asset: 'assets/backgrounds/city/stratos_towers.svg'
      },
      {
        id: 'fx_sparks',
        name: 'Foreground FX',
        speed: 1.0,
        zIndex: 50,
        opacity: 0.5,
        asset: 'generated'
      }
    ]
  }
}

describe('loadParallaxSpec', () => {
  it('should normalize and sort layers by zIndex', () => {
    const res = loadParallaxSpec(validSpec)
    expect(res.levelId).toBe(validSpec.levelId)
    expect(res.displayName).toBe(validSpec.displayName)
    expect(res.direction).toBe('left')
    expect(res.tileWidth).toBe(1280)
    expect(res.tileHeight).toBe(720)
    expect(res.layers.length).toBe(3)
    expect(res.layers.map(l => l.id)).toEqual(['far_clouds', 'mid_towers', 'fx_sparks'])
  })

  it('should infer defaults when optional fields are missing', () => {
    const minimal = { parallax: { layers: [{}] } }
    const res = loadParallaxSpec(minimal)
    expect(res.direction).toBe('left')
    expect(res.tileWidth).toBe(1280)
    expect(res.tileHeight).toBe(720)
    expect(res.layers[0]).toMatchObject({ id: 'layer_0', name: 'layer_0', speed: 0.5, opacity: 1 })
  })

  it('should throw on invalid inputs', () => {
    expect(() => loadParallaxSpec(null)).toThrow()
    expect(() => loadParallaxSpec({})).toThrow()
    expect(() => loadParallaxSpec({ parallax: { layers: [] } })).toThrow()
    expect(() => loadParallaxSpec({ parallax: { layers: [null] } })).toThrow()
  })
})
