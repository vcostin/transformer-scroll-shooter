/**
 * BossDialogue - Boss Encounter Narrative System
 *
 * Provides immersive boss encounter dialogues and narratives
 * with context-aware boss introductions and victory scenes.
 */

export class BossDialogue {
  constructor(canvas, eventDispatcher) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.eventDispatcher = eventDispatcher

    // Dialogue state
    this.isActive = false
    this.currentDialogue = null
    this.fadeAlpha = 0
    this.textAlpha = 0
    this.animationPhase = 'idle' // 'fadeIn', 'typing', 'display', 'fadeOut'
    this.displayStartTime = 0
    this.typingIndex = 0
    this.typingSpeed = 50 // milliseconds per character
    this.lastTypingTime = 0

    // Configuration
    this.config = {
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
  }

  /**
   * Show boss dialogue
   * @param {Object} dialogueData - Boss dialogue information
   * @param {string} dialogueData.speaker - Who is speaking
   * @param {string} dialogueData.text - Dialogue text
   * @param {string} dialogueData.style - Dialogue style ('introduction', 'victory', 'taunt')
   * @param {Function} onComplete - Callback when dialogue completes
   */
  showDialogue(dialogueData, onComplete = null) {
    if (this.isActive) return // Prevent overlapping dialogues

    this.isActive = true
    this.currentDialogue = dialogueData
    this.fadeAlpha = 0
    this.textAlpha = 0
    this.animationPhase = 'fadeIn'
    this.typingIndex = 0
    this.lastTypingTime = Date.now()
    this.onComplete = onComplete

    // Emit dialogue start event
    this.eventDispatcher.emit('BOSS_DIALOGUE_START', {
      speaker: dialogueData.speaker,
      style: dialogueData.style,
      timestamp: Date.now()
    })
  }

  /**
   * Update dialogue animation
   * @param {number} _deltaTime - Frame delta time
   */
  update(_deltaTime) {
    if (!this.isActive) return

    const currentTime = Date.now()

    switch (this.animationPhase) {
      case 'fadeIn':
        this.fadeAlpha += this.config.fadeSpeed
        if (this.fadeAlpha >= 1) {
          this.fadeAlpha = 1
          this.animationPhase = 'typing'
          this.textAlpha = 1
        }
        break

      case 'typing':
        if (currentTime - this.lastTypingTime >= this.typingSpeed) {
          this.typingIndex++
          this.lastTypingTime = currentTime

          if (this.typingIndex >= this.currentDialogue.text.length) {
            this.animationPhase = 'display'
            this.displayStartTime = currentTime
          }
        }
        break

      case 'display':
        if (currentTime - this.displayStartTime >= this.config.displayDuration) {
          this.animationPhase = 'fadeOut'
        }
        break

      case 'fadeOut':
        this.fadeAlpha -= this.config.fadeSpeed
        this.textAlpha -= this.config.fadeSpeed
        if (this.fadeAlpha <= 0) {
          this.fadeAlpha = 0
          this.textAlpha = 0
          this.animationPhase = 'idle'
          this.isActive = false
          this.completeDialogue()
        }
        break
    }
  }

  /**
   * Render dialogue overlay
   */
  render() {
    if (!this.isActive || !this.currentDialogue) return

    this.ctx.save()

    // Dialogue panel background
    const panelHeight = 150
    const panelY = this.canvas.height - panelHeight - 20

    this.ctx.fillStyle = this.config.backgroundColor.replace(
      '0.7',
      (this.fadeAlpha * 0.7).toString()
    )
    this.ctx.fillRect(20, panelY, this.canvas.width - 40, panelHeight)

    // Panel border
    this.ctx.strokeStyle = this.getColorWithAlpha(this.config.speakerColor, this.fadeAlpha)
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(20, panelY, this.canvas.width - 40, panelHeight)

    // Speaker name
    this.ctx.fillStyle = this.getColorWithAlpha(this.config.speakerColor, this.textAlpha)
    this.ctx.font = this.config.speakerFont
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(this.currentDialogue.speaker, 40, panelY + 20)

    // Dialogue text (with typing effect)
    this.ctx.fillStyle = this.getColorWithAlpha(this.config.textColor, this.textAlpha)
    this.ctx.font = this.config.textFont

    const displayText =
      this.animationPhase === 'typing'
        ? this.currentDialogue.text.substring(0, this.typingIndex)
        : this.currentDialogue.text

    // Wrap and render text
    const lines = this.wrapText(displayText, this.config.maxTextWidth)
    lines.forEach((line, index) => {
      this.ctx.fillText(line, 40, panelY + 55 + index * 22)
    })

    // Add style-specific decorations
    this.renderStyleDecorations(panelY, panelHeight)

    this.ctx.restore()
  }

  /**
   * Render style-specific decorations
   */
  renderStyleDecorations(panelY, panelHeight) {
    const style = this.currentDialogue.style
    const alpha = this.fadeAlpha

    switch (style) {
      case 'introduction':
        // Warning indicators for boss introductions
        this.ctx.fillStyle = this.getColorWithAlpha('#ff0000', alpha * 0.5)
        this.ctx.fillRect(20, panelY - 5, this.canvas.width - 40, 5)
        break

      case 'victory':
        // Victory glow effect
        this.ctx.fillStyle = this.getColorWithAlpha('#00ff00', alpha * 0.3)
        this.ctx.fillRect(20, panelY + panelHeight, this.canvas.width - 40, 5)
        break

      case 'taunt': {
        // Pulsing red effect for taunts
        const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7
        this.ctx.fillStyle = this.getColorWithAlpha('#ff6666', alpha * pulse * 0.2)
        this.ctx.fillRect(20, panelY, this.canvas.width - 40, panelHeight)
        break
      }
    }
  }

  /**
   * Complete dialogue and call callback
   */
  completeDialogue() {
    // Emit dialogue complete event
    this.eventDispatcher.emit('BOSS_DIALOGUE_COMPLETE', {
      speaker: this.currentDialogue?.speaker,
      style: this.currentDialogue?.style,
      timestamp: Date.now()
    })

    // Call completion callback
    if (this.onComplete) {
      this.onComplete()
    }

    // Reset state
    this.currentDialogue = null
    this.onComplete = null
  }

  /**
   * Wrap text to fit within max width
   */
  wrapText(text, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const metrics = this.ctx.measureText(testLine)

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
   * Get color with alpha applied
   */
  getColorWithAlpha(color, alpha) {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    return color.replace(/[\d.]+\)$/, `${alpha})`)
  }

  /**
   * Check if dialogue is currently active
   */
  get active() {
    return this.isActive
  }

  /**
   * Skip current dialogue (for user input)
   */
  skip() {
    if (this.isActive) {
      if (this.animationPhase === 'typing') {
        // Complete typing immediately
        this.typingIndex = this.currentDialogue.text.length
        this.animationPhase = 'display'
        this.displayStartTime = Date.now()
      } else if (this.animationPhase === 'display') {
        // Skip to fade out
        this.animationPhase = 'fadeOut'
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isActive = false
    this.currentDialogue = null
    this.onComplete = null
  }
}

export default BossDialogue
