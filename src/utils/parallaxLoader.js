// Parallax Spec Loader
// Reads a level parallax JSON spec and produces normalized layer configs
// without mutating existing Background behavior. It does not load images; it
// just maps data for the rendering system to consume later.

/**
 * Load and normalize a parallax spec object.
 * Contract:
 * - input: spec object with shape { parallax: { tileWidth, tileHeight, layers: [...] } }
 * - output: { tileWidth, tileHeight, direction, layers: [{ id, name, speed, zIndex, opacity, asset }] }
 * - throws: if required fields are missing or invalid
 */
export function loadParallaxSpec(spec) {
  if (!spec || typeof spec !== 'object') throw new Error('Invalid spec: expected object')
  const px = spec.parallax
  if (!px || typeof px !== 'object') throw new Error('Invalid spec: missing parallax section')

  const direction = px.scrollDirection || 'left'
  const tileWidth = Number(px.tileWidth) || 1280
  const tileHeight = Number(px.tileHeight) || 720

  if (!Array.isArray(px.layers) || px.layers.length === 0) {
    throw new Error('Invalid spec: parallax.layers must be a non-empty array')
  }

  const layers = px.layers.map((layer, idx) => {
    if (!layer || typeof layer !== 'object') throw new Error(`Invalid layer at index ${idx}`)
    const id = layer.id || `layer_${idx}`
    const name = layer.name || id
    const speed = typeof layer.speed === 'number' ? layer.speed : 0.5
    const zIndex = typeof layer.zIndex === 'number' ? layer.zIndex : (idx + 1) * 10
    const opacity = typeof layer.opacity === 'number' ? layer.opacity : 1
    const asset = layer.asset || null

    return { id, name, speed, zIndex, opacity, asset }
  })

  // Ensure stable z-order
  layers.sort((a, b) => a.zIndex - b.zIndex)

  return {
    levelId: spec.levelId || null,
    displayName: spec.displayName || null,
    tileWidth,
    tileHeight,
    direction,
    layers
  }
}

export default loadParallaxSpec

/**
 * Create runtime parallax layer configs from a normalized spec.
 * - normalized: object returned by loadParallaxSpec
 * - options:
 *   - baseSpeedPxPerSec: multiplier for layer.speed (default 100)
 *   - viewport: { width, height } to seed size (optional)
 * Returns an array of layers: {
 *   id, name, zIndex, opacity, asset,
 *   speedPxPerSec, direction, width, height, offsetX
 * }
 */
export function toRuntimeLayers(normalized, options = {}) {
  if (!normalized || !Array.isArray(normalized.layers)) {
    throw new Error('Invalid normalized spec')
  }
  const base = typeof options.baseSpeedPxPerSec === 'number' ? options.baseSpeedPxPerSec : 100
  const direction = normalized.direction || 'left'
  const width = options.viewport?.width ?? normalized.tileWidth ?? 1280
  const height = options.viewport?.height ?? normalized.tileHeight ?? 720

  return normalized.layers.map(l => ({
    id: l.id,
    name: l.name,
    zIndex: l.zIndex,
    opacity: l.opacity,
    asset: l.asset,
    speedPxPerSec: Math.max(0, l.speed * base),
    direction,
    width,
    height,
    offsetX: 0
  }))
}

/**
 * Advance runtime layers by deltaTime (ms). Modifies layer.offsetX to scroll.
 * Wrap logic is left to the renderer; this only accumulates offset.
 */
export function stepRuntimeLayers(layers, deltaTimeMs) {
  if (!Array.isArray(layers)) return
  const t = Math.max(0, deltaTimeMs) / 1000
  for (const layer of layers) {
    const dir = layer.direction || 'left'
    const delta = (layer.speedPxPerSec || 0) * t
    layer.offsetX += dir === 'left' ? -delta : delta
  }
}
