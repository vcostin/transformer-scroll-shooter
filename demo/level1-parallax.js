import ParallaxRenderer from '../src/rendering/ParallaxRenderer.js'
import spec from '../docs/creative/specs/LEVEL1_PARALLAX.json'

const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
const speedSlider = document.getElementById('speed')
const spdVal = document.getElementById('spdVal')

let baseSpeed = Number(speedSlider.value)
spdVal.textContent = baseSpeed

let renderer = new ParallaxRenderer(spec, {
  baseSpeedPxPerSec: baseSpeed,
  viewport: { width: canvas.width, height: canvas.height }
})

speedSlider.addEventListener('input', e => {
  baseSpeed = Number(e.target.value)
  spdVal.textContent = baseSpeed
  renderer = new ParallaxRenderer(spec, {
    baseSpeedPxPerSec: baseSpeed,
    viewport: { width: canvas.width, height: canvas.height }
  })
})

let last = performance.now()
function frame(now) {
  const dt = now - last
  last = now

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  renderer.update(dt)
  renderer.render(ctx)

  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
