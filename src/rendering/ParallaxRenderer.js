// ParallaxRenderer: draw parallax layers from a level spec with tiled scroll
// Non-invasive: does not alter existing Background system; consumers can choose which to use.

import loadParallaxSpec, { toRuntimeLayers, stepRuntimeLayers } from '../utils/parallaxLoader.js'

/**
 * Compute base X positions to tile a strip of width w with an offset.
 * Returns two positions so drawing at x and x + w covers the viewport horizontally.
 */
export function computeTiledPositions(offsetX, w) {
  const width = Math.max(1, w | 0)
  // Normalize offset to [0, width)
  const n = ((offsetX % width) + width) % width
  const base = -n
  return [base, base + width]
}

/**
 * Simple in-memory image cache. In tests (jsdom), images won't actually load;
 * the renderer will skip drawing until complete is true.
 */
class ImageCache {
  constructor() {
    this.map = new Map()
  }

  get(src) {
    if (!src) return null
    if (this.map.has(src)) return this.map.get(src)
    const img = new Image()
    img.src = src
    this.map.set(src, img)
    return img
  }
}

export default class ParallaxRenderer {
  /**
   * @param {object} spec - Level parallax spec (object)
   * @param {object} options - { baseSpeedPxPerSec, viewport: {width,height} }
   */
  constructor(spec, options = {}) {
    this.normalized = loadParallaxSpec(spec)
    this.runtimeLayers = toRuntimeLayers(this.normalized, options)
    // Sort by zIndex just in case
    this.runtimeLayers.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    this.images = new ImageCache()
  }

  /** Advance layers based on delta time (ms) */
  update(deltaTimeMs) {
    stepRuntimeLayers(this.runtimeLayers, deltaTimeMs)
  }

  /**
   * Render all layers with tiled images.
   * Only draws layers with asset !== 'generated' and loaded images.
   */
  render(ctx) {
    for (const layer of this.runtimeLayers) {
      if (!layer.asset || layer.asset === 'generated') continue
      const img = this.images.get(layer.asset)
      if (!img || !img.complete) continue

      const [x1, x2] = computeTiledPositions(layer.offsetX, layer.width)
      const y = 0 // full-height strip; assets should encode their own parallax horizon
      const w = layer.width
      const h = layer.height

      ctx.save()
      ctx.globalAlpha = layer.opacity ?? 1
      // Draw two tiles to cover the screen; if viewport wider than one tile,
      // consumers can draw more, but this meets MVP (tile width == viewport width).
      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        x1,
        y,
        w,
        h
      )
      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        x2,
        y,
        w,
        h
      )
      ctx.restore()
    }
  }
}
