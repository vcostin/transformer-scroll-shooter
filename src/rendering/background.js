/**
 * Background Rendering System - ES Module Version
 * Handles parallax scrolling backgrounds with multiple layers
 */

export class Background {
  constructor(game) {
    this.game = game
    this.layers = []
    this.stars = []

    this.createLayers()
    this.createStars()
  }

  createLayers() {
    // Layer 1: Far mountains/cityscape
    this.layers.push({
      name: 'farBackground',
      speed: 20,
      color: '#1a1a2e',
      elements: this.generateMountains(5, 0.3),
      y: this.game.height * 0.7
    })

    // Layer 2: Mid-ground buildings
    this.layers.push({
      name: 'midBackground',
      speed: 40,
      color: '#16213e',
      elements: this.generateBuildings(8, 0.5),
      y: this.game.height * 0.6
    })

    // Layer 3: Foreground structures
    this.layers.push({
      name: 'nearBackground',
      speed: 80,
      color: '#0e3460',
      elements: this.generateStructures(12, 0.8),
      y: this.game.height * 0.8
    })

    // Layer 4: Clouds
    this.layers.push({
      name: 'clouds',
      speed: 15,
      color: '#444466',
      elements: this.generateClouds(6),
      y: this.game.height * 0.2
    })
  }

  createStars() {
    // Create twinkling stars
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.game.width * 2,
        y: Math.random() * this.game.height * 0.6,
        size: Math.random() * 2 + 1,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 10 + 5
      })
    }
  }

  generateMountains(count, opacity) {
    const mountains = []
    const segmentWidth = (this.game.width * 2) / count

    for (let i = 0; i < count; i++) {
      mountains.push({
        x: i * segmentWidth,
        width: segmentWidth + 50,
        height: Math.random() * 100 + 50,
        opacity: opacity
      })
    }

    return mountains
  }

  generateBuildings(count, opacity) {
    const buildings = []
    const segmentWidth = (this.game.width * 2) / count

    for (let i = 0; i < count; i++) {
      buildings.push({
        x: i * segmentWidth + Math.random() * 20,
        width: Math.random() * 40 + 30,
        height: Math.random() * 120 + 80,
        opacity: opacity,
        windows: this.generateWindows()
      })
    }

    return buildings
  }

  generateStructures(count, opacity) {
    const structures = []
    const segmentWidth = (this.game.width * 2) / count

    for (let i = 0; i < count; i++) {
      structures.push({
        x: i * segmentWidth + Math.random() * 30,
        width: Math.random() * 50 + 40,
        height: Math.random() * 150 + 100,
        opacity: opacity,
        details: this.generateStructureDetails()
      })
    }

    return structures
  }

  generateClouds(count) {
    const clouds = []
    const segmentWidth = (this.game.width * 2) / count

    for (let i = 0; i < count; i++) {
      clouds.push({
        x: i * segmentWidth + Math.random() * 100,
        y: Math.random() * this.game.height * 0.3,
        width: Math.random() * 80 + 60,
        height: Math.random() * 30 + 20,
        opacity: Math.random() * 0.3 + 0.1
      })
    }

    return clouds
  }

  generateWindows() {
    const windows = []
    const windowCount = Math.floor(Math.random() * 8) + 4

    for (let i = 0; i < windowCount; i++) {
      windows.push({
        x: Math.random() * 0.8 + 0.1,
        y: Math.random() * 0.8 + 0.1,
        width: 0.05,
        height: 0.08,
        lit: Math.random() > 0.3
      })
    }

    return windows
  }

  generateStructureDetails() {
    return {
      antennas: Math.random() > 0.5,
      lights: Math.random() > 0.5
    }
  }

  update(deltaTime) {
    const timeMultiplier = deltaTime / 1000

    // Update layer positions
    this.layers.forEach(layer => {
      layer.elements.forEach(element => {
        element.x -= layer.speed * timeMultiplier

        // Wrap around
        if (element.x + (element.width || 100) < 0) {
          element.x = this.game.width + Math.random() * 200
        }
      })
    })

    // Update stars
    this.stars.forEach(star => {
      star.x -= star.speed * timeMultiplier
      star.twinkle += deltaTime * 0.01

      // Wrap around
      if (star.x < 0) {
        star.x = this.game.width + Math.random() * 100
      }
    })
  }

  render(ctx) {
    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, this.game.height)
    gradient.addColorStop(0, '#0a0a1a')
    gradient.addColorStop(0.7, '#1a1a2e')
    gradient.addColorStop(1, '#2a2a3e')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.game.width, this.game.height)

    // Render stars
    this.renderStars(ctx)

    // Render layers from back to front
    this.layers.forEach(layer => {
      this.renderLayer(ctx, layer)
    })
  }

  renderStars(ctx) {
    ctx.save()
    this.stars.forEach(star => {
      const alpha = Math.sin(star.twinkle) * 0.5 + 0.5
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(star.x, star.y, star.size, star.size)
    })
    ctx.restore()
  }

  renderLayer(ctx, layer) {
    ctx.save()

    layer.elements.forEach(element => {
      if (layer.name === 'farBackground') {
        this.renderMountain(ctx, element, layer)
      } else if (layer.name === 'midBackground') {
        this.renderBuilding(ctx, element, layer)
      } else if (layer.name === 'nearBackground') {
        this.renderStructure(ctx, element, layer)
      } else if (layer.name === 'clouds') {
        this.renderCloud(ctx, element, layer)
      }
    })

    ctx.restore()
  }

  renderMountain(ctx, mountain, layer) {
    ctx.globalAlpha = mountain.opacity
    ctx.fillStyle = layer.color
    ctx.fillRect(mountain.x, layer.y, mountain.width, mountain.height)
  }

  renderBuilding(ctx, building, layer) {
    ctx.globalAlpha = building.opacity
    ctx.fillStyle = layer.color
    ctx.fillRect(building.x, layer.y, building.width, building.height)

    // Render windows
    building.windows.forEach(window => {
      if (window.lit) {
        ctx.fillStyle = '#ffff88'
        ctx.fillRect(
          building.x + window.x * building.width,
          layer.y + window.y * building.height,
          window.width * building.width,
          window.height * building.height
        )
      }
    })
  }

  renderStructure(ctx, structure, layer) {
    ctx.globalAlpha = structure.opacity
    ctx.fillStyle = layer.color
    ctx.fillRect(structure.x, layer.y, structure.width, structure.height)

    // Add details
    if (structure.details.antennas) {
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(structure.x + structure.width / 2, layer.y)
      ctx.lineTo(structure.x + structure.width / 2, layer.y - 20)
      ctx.stroke()
    }

    if (structure.details.lights) {
      ctx.fillStyle = '#ff4444'
      ctx.fillRect(structure.x + structure.width / 2 - 2, layer.y - 18, 4, 4)
    }
  }

  renderCloud(ctx, cloud, layer) {
    ctx.globalAlpha = cloud.opacity
    ctx.fillStyle = layer.color

    // Simple cloud shape
    ctx.beginPath()
    ctx.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2)
    ctx.arc(cloud.x + cloud.width / 3, cloud.y, cloud.width / 3, 0, Math.PI * 2)
    ctx.arc(cloud.x + (cloud.width * 2) / 3, cloud.y, cloud.width / 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Default export
export default Background
