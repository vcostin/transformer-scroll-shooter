/**
 * ChapterTransition - Cinematic Story Transitions (POJO + Functional)
 *
 * Provides full-screen cinematic transitions for story chapters
 * with fade effects and atmospheric presentation.
 *
 * Design Principles:
 * - Zero 'this' keywords
 * - Pure funct/**
 * Force complete current transition (pure function)Immutable state patterns
 * - Easy testing and mocking
 * - Composition over inheritance
 */

import { applyAlphaToColor } from '../utils/colorUtils.js'

// Default configuration
const DEFAULT_CONFIG = {
  fadeSpeed: 0.02,
  displayDuration: 4000, // 4 seconds
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  titleColor: '#ffcc00',
  descriptionColor: '#ffffff',
  titleFont: 'bold 48px Arial',
  descriptionFont: '24px Arial',
  titleY: -50,
  descriptionY: 50
}

/**
 * Create initial transition state
 */
const createTransitionState = (config = {}) => ({
  isActive: false,
  fadeAlpha: 0,
  animationPhase: 'idle', // 'fadeIn', 'display', 'fadeOut'
  displayStartTime: 0,
  animationStartTime: 0,
  transitionData: null,
  onComplete: null,
  config: { ...DEFAULT_CONFIG, ...config }
})

/**
 * Show chapter transition (pure function)
 * @param {Object} state - Current transition state
 * @param {Object} chapterData - Chapter information
 * @param {Function} onComplete - Callback when transition completes
 * @param {Object} eventDispatcher - Event dispatcher for notifications
 * @returns {Object} New state
 */
const showTransition = (state, chapterData, onComplete = null, eventDispatcher) => {
  if (state.isActive) return state // Prevent overlapping transitions

  // Emit transition start event
  eventDispatcher.emit('CHAPTER_TRANSITION_START', {
    chapter: chapterData.title,
    timestamp: Date.now()
  })

  return {
    ...state,
    isActive: true,
    transitionData: chapterData,
    fadeAlpha: 0,
    animationPhase: 'fadeIn',
    animationStartTime: Date.now(),
    onComplete
  }
}

/**
 * Update transition animation (pure function)
 * @param {Object} state - Current transition state
 * @param {number} _deltaTime - Frame delta time
 * @returns {Object} New state
 */
const updateTransition = (state, _deltaTime) => {
  if (!state.isActive) return state

  const currentTime = Date.now()

  switch (state.animationPhase) {
    case 'fadeIn': {
      const newFadeAlpha = state.fadeAlpha + state.config.fadeSpeed
      if (newFadeAlpha >= 1) {
        return {
          ...state,
          fadeAlpha: 1,
          animationPhase: 'display',
          displayStartTime: currentTime
        }
      }
      return { ...state, fadeAlpha: newFadeAlpha }
    }

    case 'display':
      if (currentTime - state.displayStartTime >= state.config.displayDuration) {
        return { ...state, animationPhase: 'fadeOut' }
      }
      return state

    case 'fadeOut': {
      const newFadeAlpha = state.fadeAlpha - state.config.fadeSpeed
      if (newFadeAlpha <= 0) {
        return {
          ...state,
          fadeAlpha: 0,
          animationPhase: 'idle',
          isActive: false,
          _shouldComplete: true
        }
      }
      return { ...state, fadeAlpha: newFadeAlpha }
    }

    default:
      return state
  }
}

/**
 * Complete transition and call callback (side effect function)
 * @param {Object} state - Current transition state
 * @param {Object} eventDispatcher - Event dispatcher for notifications
 * @returns {Object} New state
 */
const completeTransition = (state, eventDispatcher) => {
  // Emit transition complete event
  eventDispatcher.emit('CHAPTER_TRANSITION_COMPLETE', {
    chapter: state.transitionData?.title,
    timestamp: Date.now()
  })

  // Call completion callback
  if (state.onComplete) {
    state.onComplete()
  }

  // Reset state
  return {
    ...state,
    transitionData: null,
    onComplete: null,
    _shouldComplete: false
  }
}

/**
 * Render transition overlay (pure canvas operations)
 * @param {Object} state - Current transition state
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
const renderTransition = (state, ctx, canvas) => {
  if (!state.isActive || !state.transitionData) return

  ctx.save()

  // Full screen overlay background
  ctx.fillStyle = state.config.backgroundColor.replace('0.9', (state.fadeAlpha * 0.9).toString())
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Calculate center positions
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2

  // Chapter title
  ctx.fillStyle = applyAlphaToColor(state.config.titleColor, state.fadeAlpha)
  ctx.font = state.config.titleFont
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Add text shadow effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 2
  ctx.shadowOffsetY = 2

  ctx.fillText(state.transitionData.title, centerX, centerY + state.config.titleY)

  // Chapter description
  ctx.fillStyle = applyAlphaToColor(state.config.descriptionColor, state.fadeAlpha)
  ctx.font = state.config.descriptionFont
  ctx.shadowBlur = 2

  // Handle multi-line descriptions
  const description = state.transitionData.description || ''
  const maxWidth = canvas.width * 0.8
  const lines = wrapText(ctx, description, maxWidth)

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, centerY + state.config.descriptionY + index * 30)
  })

  // Add decorative elements
  renderDecorations(ctx, centerX, centerY, state.fadeAlpha)

  ctx.restore()
}

/**
 * Render decorative elements (pure function)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} alpha - Alpha value for decorations
 */
const renderDecorations = (ctx, centerX, centerY, alpha) => {
  // Top and bottom lines
  ctx.strokeStyle = applyAlphaToColor('#ffcc00', alpha * 0.6)
  ctx.lineWidth = 2
  ctx.setLineDash([10, 5])

  // Top line
  ctx.beginPath()
  ctx.moveTo(centerX - 200, centerY - 120)
  ctx.lineTo(centerX + 200, centerY - 120)
  ctx.stroke()

  // Bottom line
  ctx.beginPath()
  ctx.moveTo(centerX - 200, centerY + 120)
  ctx.lineTo(centerX + 200, centerY + 120)
  ctx.stroke()

  ctx.setLineDash([]) // Reset line dash
}

/**
 * Wrap text to fit within max width (pure function)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width
 * @returns {Array<string>} Array of wrapped lines
 */
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * Force complete current transition (pure function)
 * @param {Object} state - Current transition state
 * @returns {Object} New state
 */
const forceComplete = state => {
  if (state.isActive) {
    return {
      ...state,
      animationPhase: 'fadeOut',
      fadeAlpha: 0.1 // Will complete on next update
    }
  }
  return state
}

/**
 * Check if transition is currently active (pure function)
 * @param {Object} state - Current transition state
 * @returns {boolean} Whether transition is active
 */
const isActive = state => state.isActive

/**
 * Cleanup resources (pure function)
 * @param {Object} state - Current transition state
 * @returns {Object} Clean state
 */
const cleanup = state => ({
  ...state,
  isActive: false,
  transitionData: null,
  onComplete: null
})

/**
 * Factory function to create ChapterTransition instance
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} eventDispatcher - Event dispatcher
 * @param {Object} config - Configuration options
 * @returns {Object} ChapterTransition interface
 */
const createChapterTransition = (canvas, eventDispatcher, config = {}) => {
  let state = createTransitionState(config)
  const ctx = canvas.getContext('2d')

  return {
    // Public interface matching original class API
    showTransition: (chapterData, onComplete = null) => {
      state = showTransition(state, chapterData, onComplete, eventDispatcher)
    },

    update: deltaTime => {
      const newState = updateTransition(state, deltaTime)

      // Handle completion side effect
      if (newState._shouldComplete) {
        state = completeTransition(newState, eventDispatcher)
      } else {
        state = newState
      }
    },

    render: () => {
      renderTransition(state, ctx, canvas)
    },

    get active() {
      return isActive(state)
    },

    forceComplete: () => {
      state = forceComplete(state)
    },

    cleanup: () => {
      state = cleanup(state)
    },

    // Additional getters for testing/debugging
    getState: () => ({ ...state })
  }
}

// Export both factory and individual functions for testing
export {
  createChapterTransition,
  createTransitionState,
  showTransition,
  updateTransition,
  completeTransition,
  renderTransition,
  renderDecorations,
  wrapText,
  forceComplete,
  isActive,
  cleanup
}

export default createChapterTransition
