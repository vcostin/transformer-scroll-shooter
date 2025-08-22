/**
 * ChapterTransition - Cinematic Story Transitions
 *
 * Provides full-screen cinematic transitions for story chapters
 * with fade effects and atmospheric presentation.
 */

export class ChapterTransition {
  constructor(canvas, eventDispatcher) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.eventDispatcher = eventDispatcher

    // Animation state
    this.isActive = false
    this.fadeAlpha = 0
    this.animationPhase = 'idle' // 'fadeIn', 'display', 'fadeOut'
    this.displayStartTime = 0
    this.animationStartTime = 0

    // Transition data
    this.transitionData = null

    // Configuration
    this.config = {
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
  }

  /**
   * Show chapter transition
   * @param {Object} chapterData - Chapter information
   * @param {string} chapterData.title - Chapter title
   * @param {string} chapterData.description - Chapter description
   * @param {Function} onComplete - Callback when transition completes
   */
  showTransition(chapterData, onComplete = null) {
    if (this.isActive) return // Prevent overlapping transitions

    this.isActive = true
    this.transitionData = chapterData
    this.fadeAlpha = 0
    this.animationPhase = 'fadeIn'
    this.animationStartTime = Date.now()
    this.onComplete = onComplete

    // Emit transition start event
    this.eventDispatcher.emit('CHAPTER_TRANSITION_START', {
      chapter: chapterData.title,
      timestamp: Date.now()
    })
  }

  /**
   * Update transition animation
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
          this.animationPhase = 'display'
          this.displayStartTime = currentTime
        }
        break

      case 'display':
        if (currentTime - this.displayStartTime >= this.config.displayDuration) {
          this.animationPhase = 'fadeOut'
        }
        break

      case 'fadeOut':
        this.fadeAlpha -= this.config.fadeSpeed
        if (this.fadeAlpha <= 0) {
          this.fadeAlpha = 0
          this.animationPhase = 'idle'
          this.isActive = false
          this.completeTransition()
        }
        break
    }
  }

  /**
   * Render transition overlay
   */
  render() {
    if (!this.isActive || !this.transitionData) return

    this.ctx.save()

    // Full screen overlay background
    this.ctx.fillStyle = this.config.backgroundColor.replace(
      '0.9',
      (this.fadeAlpha * 0.9).toString()
    )
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Calculate center positions
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    // Chapter title
    this.ctx.fillStyle = this.config.titleColor.replace(')', `, ${this.fadeAlpha})`)
    if (!this.config.titleColor.includes('rgba')) {
      this.ctx.fillStyle = this.hexToRgba(this.config.titleColor, this.fadeAlpha)
    }
    this.ctx.font = this.config.titleFont
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    // Add text shadow effect
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
    this.ctx.shadowBlur = 4
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2

    this.ctx.fillText(this.transitionData.title, centerX, centerY + this.config.titleY)

    // Chapter description
    this.ctx.fillStyle = this.hexToRgba(this.config.descriptionColor, this.fadeAlpha)
    this.ctx.font = this.config.descriptionFont
    this.ctx.shadowBlur = 2

    // Handle multi-line descriptions
    const description = this.transitionData.description || ''
    const maxWidth = this.canvas.width * 0.8
    const lines = this.wrapText(description, maxWidth)

    lines.forEach((line, index) => {
      this.ctx.fillText(line, centerX, centerY + this.config.descriptionY + index * 30)
    })

    // Add decorative elements
    this.renderDecorations(centerX, centerY)

    this.ctx.restore()
  }

  /**
   * Render decorative elements
   */
  renderDecorations(centerX, centerY) {
    const alpha = this.fadeAlpha

    // Top and bottom lines
    this.ctx.strokeStyle = this.hexToRgba('#ffcc00', alpha * 0.6)
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([10, 5])

    // Top line
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - 200, centerY - 120)
    this.ctx.lineTo(centerX + 200, centerY - 120)
    this.ctx.stroke()

    // Bottom line
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - 200, centerY + 120)
    this.ctx.lineTo(centerX + 200, centerY + 120)
    this.ctx.stroke()

    this.ctx.setLineDash([]) // Reset line dash
  }

  /**
   * Complete transition and call callback
   */
  completeTransition() {
    // Emit transition complete event
    this.eventDispatcher.emit('CHAPTER_TRANSITION_COMPLETE', {
      chapter: this.transitionData?.title,
      timestamp: Date.now()
    })

    // Call completion callback
    if (this.onComplete) {
      this.onComplete()
    }

    // Reset state
    this.transitionData = null
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
   * Convert hex color to rgba with alpha
   */
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  /**
   * Check if transition is currently active
   */
  get active() {
    return this.isActive
  }

  /**
   * Force complete current transition
   */
  forceComplete() {
    if (this.isActive) {
      this.animationPhase = 'fadeOut'
      this.fadeAlpha = 0.1 // Will complete on next update
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isActive = false
    this.transitionData = null
    this.onComplete = null
  }
}

export default ChapterTransition
