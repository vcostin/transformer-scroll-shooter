/**
 * BossDialogue - Boss Encounter Narrative System (POJO + Functional)
 *
 * Provides immersive boss encounter dialogues and narratives
 * with context-aware boss introductions and victory scenes.
 *
 * Design Principles:
 * - Zero 'this' keywords
 * - Pure functions only
 * - Immutable state patterns
 * - Easy testing and mocking
 * - Composition over inheritance
 */

// Default configuration
const DEFAULT_CONFIG = {
  fadeSpeed: 0.03,
  displayDuration: 4000,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  speakerColor: '#ff6666',
  textColor: '#ffffff',
  speakerFont: 'bold 24px Arial',
  textFont: '18px Arial',
  maxTextWidth: 600,
  padding: 40
}

/**
 * Create initial dialogue state
 */
const createDialogueState = (config = {}) => ({
  isActive: false,
  currentDialogue: null,
  fadeAlpha: 0,
  textAlpha: 0,
  animationPhase: 'idle', // 'fadeIn', 'typing', 'display', 'fadeOut'
  displayStartTime: 0,
  typingIndex: 0,
  typingSpeed: 50, // milliseconds per character
  lastTypingTime: 0,
  onComplete: null,
  config: { ...DEFAULT_CONFIG, ...config }
})

/**
 * Show boss dialogue (pure function)
 * @param {Object} state - Current dialogue state
 * @param {Object} dialogueData - Boss dialogue information
 * @param {Function} onComplete - Callback when dialogue completes
 * @param {Object} eventDispatcher - Event dispatcher for notifications
 * @returns {Object} New state
 */
const showDialogue = (state, dialogueData, onComplete = null, eventDispatcher) => {
  if (state.isActive) return state // Prevent overlapping dialogues

  // Emit dialogue start event
  eventDispatcher.emit('BOSS_DIALOGUE_START', {
    speaker: dialogueData.speaker,
    style: dialogueData.style,
    timestamp: Date.now()
  })

  return {
    ...state,
    isActive: true,
    currentDialogue: dialogueData,
    fadeAlpha: 0,
    textAlpha: 0,
    animationPhase: 'fadeIn',
    typingIndex: 0,
    lastTypingTime: Date.now(),
    onComplete
  }
}

/**
 * Update dialogue animation (pure function)
 * @param {Object} state - Current dialogue state
 * @param {number} _deltaTime - Frame delta time
 * @returns {Object} New state
 */
const updateDialogue = (state, _deltaTime) => {
  if (!state.isActive) return state

  const currentTime = Date.now()

  switch (state.animationPhase) {
    case 'fadeIn': {
      const newFadeAlpha = state.fadeAlpha + state.config.fadeSpeed
      if (newFadeAlpha >= 1) {
        return {
          ...state,
          fadeAlpha: 1,
          animationPhase: 'typing',
          textAlpha: 1
        }
      }
      return { ...state, fadeAlpha: newFadeAlpha }
    }

    case 'typing': {
      if (currentTime - state.lastTypingTime >= state.typingSpeed) {
        const newTypingIndex = state.typingIndex + 1
        if (newTypingIndex >= state.currentDialogue.text.length) {
          return {
            ...state,
            typingIndex: newTypingIndex,
            lastTypingTime: currentTime,
            animationPhase: 'display',
            displayStartTime: currentTime
          }
        }
        return {
          ...state,
          typingIndex: newTypingIndex,
          lastTypingTime: currentTime
        }
      }
      return state
    }

    case 'display':
      if (currentTime - state.displayStartTime >= state.config.displayDuration) {
        return { ...state, animationPhase: 'fadeOut' }
      }
      return state

    case 'fadeOut': {
      const newFadeAlpha = state.fadeAlpha - state.config.fadeSpeed
      const newTextAlpha = state.textAlpha - state.config.fadeSpeed
      if (newFadeAlpha <= 0) {
        return {
          ...state,
          fadeAlpha: 0,
          textAlpha: 0,
          animationPhase: 'idle',
          isActive: false,
          _shouldComplete: true
        }
      }
      return {
        ...state,
        fadeAlpha: newFadeAlpha,
        textAlpha: newTextAlpha
      }
    }

    default:
      return state
  }
}

/**
 * Complete dialogue and call callback (side effect function)
 * @param {Object} state - Current dialogue state
 * @param {Object} eventDispatcher - Event dispatcher for notifications
 * @returns {Object} New state
 */
const completeDialogue = (state, eventDispatcher) => {
  // Emit dialogue complete event
  eventDispatcher.emit('BOSS_DIALOGUE_COMPLETE', {
    speaker: state.currentDialogue?.speaker,
    style: state.currentDialogue?.style,
    timestamp: Date.now()
  })

  // Call completion callback
  if (state.onComplete) {
    state.onComplete()
  }

  // Reset state
  return {
    ...state,
    currentDialogue: null,
    onComplete: null,
    _shouldComplete: false
  }
}

/**
 * Render dialogue overlay (pure canvas operations)
 * @param {Object} state - Current dialogue state
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
const renderDialogue = (state, ctx, canvas) => {
  if (!state.isActive || !state.currentDialogue) return

  ctx.save()

  // Dialogue panel background
  const panelHeight = 150
  const panelY = canvas.height - panelHeight - 20

  ctx.fillStyle = state.config.backgroundColor.replace('0.7', (state.fadeAlpha * 0.7).toString())
  ctx.fillRect(20, panelY, canvas.width - 40, panelHeight)

  // Panel border
  ctx.strokeStyle = getColorWithAlpha(state.config.speakerColor, state.fadeAlpha)
  ctx.lineWidth = 2
  ctx.strokeRect(20, panelY, canvas.width - 40, panelHeight)

  // Speaker name
  ctx.fillStyle = getColorWithAlpha(state.config.speakerColor, state.textAlpha)
  ctx.font = state.config.speakerFont
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(state.currentDialogue.speaker, 40, panelY + 20)

  // Dialogue text (with typing effect)
  ctx.fillStyle = getColorWithAlpha(state.config.textColor, state.textAlpha)
  ctx.font = state.config.textFont

  const displayText =
    state.animationPhase === 'typing'
      ? state.currentDialogue.text.substring(0, state.typingIndex)
      : state.currentDialogue.text

  // Wrap and render text
  const lines = wrapText(ctx, displayText, state.config.maxTextWidth)
  lines.forEach((line, index) => {
    ctx.fillText(line, 40, panelY + 55 + index * 22)
  })

  // Add style-specific decorations
  renderStyleDecorations(ctx, canvas, state, panelY, panelHeight)

  ctx.restore()
}

/**
 * Render style-specific decorations (pure function)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} state - Current dialogue state
 * @param {number} panelY - Panel Y position
 * @param {number} panelHeight - Panel height
 */
const renderStyleDecorations = (ctx, canvas, state, panelY, panelHeight) => {
  const style = state.currentDialogue.style
  const alpha = state.fadeAlpha

  switch (style) {
    case 'introduction':
      // Warning indicators for boss introductions
      ctx.fillStyle = getColorWithAlpha('#ff0000', alpha * 0.5)
      ctx.fillRect(20, panelY - 5, canvas.width - 40, 5)
      break

    case 'victory':
      // Victory glow effect
      ctx.fillStyle = getColorWithAlpha('#00ff00', alpha * 0.3)
      ctx.fillRect(20, panelY + panelHeight, canvas.width - 40, 5)
      break

    case 'taunt': {
      // Pulsing red effect for taunts
      const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7
      ctx.fillStyle = getColorWithAlpha('#ff6666', alpha * pulse * 0.2)
      ctx.fillRect(20, panelY, canvas.width - 40, panelHeight)
      break
    }
  }
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
 * Get color with alpha applied (pure function)
 * @param {string} color - Color string
 * @param {number} alpha - Alpha value
 * @returns {string} Color with alpha applied
 */
const getColorWithAlpha = (color, alpha) => {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color.replace(/[\d.]+\)$/, `${alpha})`)
}

/**
 * Skip current dialogue (pure function)
 * @param {Object} state - Current dialogue state
 * @returns {Object} New state
 */
const skipDialogue = state => {
  if (!state.isActive) return state

  if (state.animationPhase === 'typing') {
    // Complete typing immediately
    return {
      ...state,
      typingIndex: state.currentDialogue.text.length,
      animationPhase: 'display',
      displayStartTime: Date.now()
    }
  } else if (state.animationPhase === 'display') {
    // Skip to fade out
    return { ...state, animationPhase: 'fadeOut' }
  }

  return state
}

/**
 * Check if dialogue is currently active (pure function)
 * @param {Object} state - Current dialogue state
 * @returns {boolean} Whether dialogue is active
 */
const isActive = state => state.isActive

/**
 * Cleanup resources (pure function)
 * @param {Object} state - Current dialogue state
 * @returns {Object} Clean state
 */
const cleanup = state => ({
  ...state,
  isActive: false,
  currentDialogue: null,
  onComplete: null
})

/**
 * Factory function to create BossDialogue instance
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} eventDispatcher - Event dispatcher
 * @param {Object} config - Configuration options
 * @returns {Object} BossDialogue interface
 */
const createBossDialogue = (canvas, eventDispatcher, config = {}) => {
  let state = createDialogueState(config)
  const ctx = canvas.getContext('2d')

  return {
    // Public interface matching original class API
    showDialogue: (dialogueData, onComplete = null) => {
      state = showDialogue(state, dialogueData, onComplete, eventDispatcher)
    },

    update: deltaTime => {
      const newState = updateDialogue(state, deltaTime)

      // Handle completion side effect
      if (newState._shouldComplete) {
        state = completeDialogue(newState, eventDispatcher)
      } else {
        state = newState
      }
    },

    render: () => {
      renderDialogue(state, ctx, canvas)
    },

    get active() {
      return isActive(state)
    },

    skip: () => {
      state = skipDialogue(state)
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
  createBossDialogue,
  createDialogueState,
  showDialogue,
  updateDialogue,
  completeDialogue,
  renderDialogue,
  renderStyleDecorations,
  wrapText,
  getColorWithAlpha,
  skipDialogue,
  isActive,
  cleanup
}

export default createBossDialogue
