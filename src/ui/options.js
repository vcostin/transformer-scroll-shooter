/**
 * Options Menu System - Event-Driven Version
 * Handles game settings and configuration UI with event integration
 */

import { UI_EVENTS, UI_STATE_KEYS, MENU_TYPES } from '@/constants/ui-events.js'

/**
 * Create an OptionsMenu instance using factory function pattern
 * @param {Object} game - Game instance
 * @param {Object} eventDispatcher - Event dispatcher instance
 * @param {Object} stateManager - State manager instance
 * @returns {OptionsMenu} OptionsMenu instance
 */
export function createOptionsMenu(game, eventDispatcher, stateManager) {
  return new OptionsMenu(game, eventDispatcher, stateManager)
}

export class OptionsMenu {
  constructor(game, eventDispatcher, stateManager) {
    // Validate required dependencies
    if (!eventDispatcher) {
      throw new Error("OptionsMenu: 'eventDispatcher' is required and cannot be null or undefined.")
    }

    if (!stateManager) {
      throw new Error("OptionsMenu: 'stateManager' is required and cannot be null or undefined.")
    }

    this.game = game
    this.eventDispatcher = eventDispatcher
    this.stateManager = stateManager
    this.effectManager = game.effectManager
    this.isOpen = false
    this.selectedOption = 0

    // Setup effects-based event handling
    this.setupEffects()

    // Initialize options configuration
    this.initializeOptions()

    // Create UI overlay
    this.overlay = null
    this.createOverlay()

    // Request load settings
    this.eventDispatcher.emit(UI_EVENTS.SETTINGS_LOAD)
  }

  /**
   * Initialize options configuration
   */
  initializeOptions() {
    this.options = [
      {
        name: 'Master Volume',
        type: 'slider',
        value: () => this.game.audio.masterVolume,
        setValue: val => {
          const oldValue = this.game.audio.masterVolume
          // Update underlying property before calling setter
          this.game.audio.masterVolume = val
          this.game.audio.setMasterVolume(val)
          this.emitSettingChanged('masterVolume', val, oldValue)
        },
        min: 0,
        max: 1,
        step: 0.1
      },
      {
        name: 'Sound Effects',
        type: 'slider',
        value: () => this.game.audio.sfxVolume,
        setValue: val => {
          const oldValue = this.game.audio.sfxVolume
          this.game.audio.sfxVolume = val
          this.game.audio.setSfxVolume(val)
          this.emitSettingChanged('sfxVolume', val, oldValue)
        },
        min: 0,
        max: 1,
        step: 0.1
      },
      {
        name: 'Music Volume',
        type: 'slider',
        value: () => this.game.audio.musicVolume,
        setValue: val => {
          const oldValue = this.game.audio.musicVolume
          this.game.audio.musicVolume = val
          this.game.audio.setMusicVolume(val)
          this.emitSettingChanged('musicVolume', val, oldValue)
        },
        min: 0,
        max: 1,
        step: 0.1
      },
      {
        name: 'Audio Enabled',
        type: 'toggle',
        value: () => this.game.audio.enabled,
        setValue: val => {
          const oldValue = this.game.audio.enabled
          this.game.audio.enabled = val
          this.game.audio.setEnabled(val)
          this.emitSettingChanged('audioEnabled', val, oldValue)
        }
      },
      {
        name: 'Show FPS',
        type: 'toggle',
        value: () => this.game.showFPS,
        setValue: val => {
          const oldValue = this.game.showFPS
          this.game.showFPS = val
          this.emitSettingChanged('showFPS', val, oldValue)
        }
      },
      {
        name: 'Difficulty',
        type: 'select',
        value: () => this.game.difficulty,
        setValue: val => {
          const oldValue = this.game.difficulty
          this.game.difficulty = val
          this.emitSettingChanged('difficulty', val, oldValue)
        },
        options: ['Easy', 'Normal', 'Hard', 'Extreme']
      }
    ]
  }

  /**
   * Setup effects-based event handling using EffectManager
   */
  setupEffects() {
    // Settings management effects
    this.effectManager.effect(UI_EVENTS.SETTINGS_LOADED, action => {
      const settings = action.payload
      // Apply loaded settings
      this.options.forEach(option => {
        const key = option.name.toLowerCase().replace(/\s+/g, '')
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
          const newVal = settings[key]
          option.setValue(newVal)
        }
      })
    })

    // Menu control effects
    this.effectManager.effect(UI_EVENTS.MENU_OPENED, action => {
      const data = action.payload
      if (data.menuType === MENU_TYPES.OPTIONS) {
        this.open()
      }
    })

    this.effectManager.effect(UI_EVENTS.MENU_CLOSED, action => {
      const data = action.payload
      if (data.menuType === MENU_TYPES.OPTIONS) {
        this.close()
      }
    })

    // Navigation effects
    this.effectManager.effect(UI_EVENTS.MENU_NAVIGATION, action => {
      const data = action.payload
      if (this.isOpen) {
        this.handleNavigation(data)
      }
    })
  }

  /**
   * Emit setting changed event
   */
  emitSettingChanged(setting, value, oldValue) {
    this.eventDispatcher.emit(UI_EVENTS.SETTING_CHANGED, {
      setting,
      value,
      oldValue,
      source: 'options'
    })

    // Update state manager
    const stateKey = this.getStateKeyForSetting(setting)
    if (stateKey) {
      this.stateManager.setState(stateKey, value)
    }
  }

  /**
   * Get state key for setting
   */
  getStateKeyForSetting(setting) {
    const mappings = {
      masterVolume: UI_STATE_KEYS.MASTER_VOLUME,
      sfxVolume: UI_STATE_KEYS.SFX_VOLUME,
      musicVolume: UI_STATE_KEYS.MUSIC_VOLUME,
      audioEnabled: UI_STATE_KEYS.AUDIO_ENABLED,
      showFPS: UI_STATE_KEYS.SHOW_FPS,
      difficulty: UI_STATE_KEYS.DIFFICULTY
    }

    return mappings[setting] || null
  }

  /**
   * Handle navigation events
   */
  handleNavigation(data) {
    const { direction, action } = data

    switch (direction) {
      case 'up':
        this.selectedOption = Math.max(0, this.selectedOption - 1)
        this.updateDisplay()
        break
      case 'down':
        this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1)
        this.updateDisplay()
        break
    }

    if (action === 'select') {
      this.selectCurrentOption()
    }
  }

  /**
   * Select current option
   */
  selectCurrentOption() {
    this.eventDispatcher.emit(UI_EVENTS.MENU_OPTION_SELECTED, {
      optionIndex: this.selectedOption,
      option: this.options[this.selectedOption]
    })
  }

  createOverlay() {
    // Create overlay div for options menu
    this.overlay = document.createElement('div')
    this.overlay.id = 'optionsOverlay'
    this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: none;
            z-index: 1000;
            font-family: 'Courier New', monospace;
            color: white;
        `

    const content = document.createElement('div')
    content.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #1a1a2e;
            padding: 30px;
            border-radius: 10px;
            border: 2px solid #00ffff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
            min-width: 400px;
        `

    content.innerHTML = `
            <h2 style="text-align: center; margin-top: 0; color: #00ffff;">Game Options</h2>
            <div id="optionsContent"></div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="closeOptions" style="
                    background-color: #00ffff;
                    color: #1a1a2e;
                    border: none;
                    padding: 10px 20px;
                    font-family: 'Courier New', monospace;
                    font-size: 16px;
                    cursor: pointer;
                    border-radius: 5px;
                ">Close</button>
            </div>
        `

    this.overlay.appendChild(content)

    // Safely append to document.body (handle test environment)
    if (document?.body?.appendChild) {
      document.body.appendChild(this.overlay)
    }

    // Setup close button with event emission
    document.getElementById('closeOptions').addEventListener('click', () => {
      this.eventDispatcher.emit(UI_EVENTS.BUTTON_CLICKED, {
        buttonId: 'closeOptions',
        source: 'options'
      })
      this.close()
    })
  }

  open() {
    // Prevent recursion - if already open, don't open again
    if (this.isOpen) {
      return
    }

    this.isOpen = true
    this.overlay.style.display = 'block'

    // Debug logging if available
    if (window.gameDebugLogger) {
      window.gameDebugLogger.log('OPTIONS_MENU_OPEN', {
        wasGamePaused: this.game.paused,
        wasUserPaused: this.game.userPaused,
        isOpen: this.isOpen
      })
    }

    // Emit menu opened event
    this.eventDispatcher.emit(UI_EVENTS.MENU_OPENED, {
      menuType: MENU_TYPES.OPTIONS,
      source: 'options'
    })

    // Update state
    this.stateManager.setState(UI_STATE_KEYS.MENU_OPEN, true)
    this.stateManager.setState(UI_STATE_KEYS.MENU_TYPE, MENU_TYPES.OPTIONS)

    // Use proper pause method instead of directly setting paused property
    if (typeof this.game.pauseGame === 'function') {
      this.game.pauseGame()
    } else {
      // Fallback for tests or environments without pauseGame method
      this.game.paused = true
    }

    console.log('OptionsMenu.open() - After pause:', this.game.paused, this.game.userPaused)

    // Emit game pause event for EffectManager and other systems
    this.eventDispatcher.emit('game:pause', {
      source: 'options_menu'
    })

    this.updateDisplay()
  }

  close() {
    // Prevent recursion - if already closed, don't close again
    if (!this.isOpen) {
      return
    }

    this.isOpen = false
    this.overlay.style.display = 'none'

    // Debug logging if available
    if (window.gameDebugLogger) {
      window.gameDebugLogger.log('OPTIONS_MENU_CLOSE', {
        wasGamePaused: this.game.paused,
        wasUserPaused: this.game.userPaused,
        isOpen: this.isOpen
      })
    }

    // Emit menu closed event
    this.eventDispatcher.emit(UI_EVENTS.MENU_CLOSED, {
      menuType: MENU_TYPES.OPTIONS,
      source: 'options'
    })

    // Update state
    this.stateManager.setState(UI_STATE_KEYS.MENU_OPEN, false)
    this.stateManager.setState(UI_STATE_KEYS.MENU_TYPE, null)

    // Use safe resume method that respects priority system
    if (typeof this.game.resumeGame === 'function') {
      this.game.resumeGame()
    } else {
      // Fallback for tests or environments without resumeGame method
      this.game.paused = false
    }

    console.log('OptionsMenu.close() - After resume:', this.game.paused, this.game.userPaused)

    // Emit game resume event for EffectManager and other systems
    // Note: resumeGame() already emits this, but keeping for explicit system coordination
    this.eventDispatcher.emit('game:resume', {
      source: 'options_menu'
    })

    this.saveSettings()
  }

  updateDisplay() {
    const content = document.getElementById('optionsContent')
    content.innerHTML = ''

    this.options.forEach((option, index) => {
      const optionDiv = document.createElement('div')
      optionDiv.style.cssText = `
                margin: 15px 0;
                padding: 10px;
                background-color: ${index === this.selectedOption ? '#333' : 'transparent'};
                border-radius: 5px;
            `

      const label = document.createElement('label')
      label.textContent = option.name
      label.style.cssText = `
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            `

      optionDiv.appendChild(label)

      if (option.type === 'slider') {
        /** @type {HTMLInputElement} */
        const slider = document.createElement('input')
        slider.type = 'range'
        slider.min = String(option.min)
        slider.max = String(option.max)
        slider.step = String(option.step)
        slider.value = option.value()
        slider.style.cssText = `
                    width: 100%;
                    accent-color: #00ffff;
                `

        const valueDisplay = document.createElement('span')
        valueDisplay.textContent = Math.round(option.value() * 100) + '%'
        valueDisplay.style.cssText = `
                    margin-left: 10px;
                    color: #00ffff;
                `

        slider.addEventListener('input', e => {
          const value = parseFloat(/** @type {HTMLInputElement} */ (e.target).value)
          option.setValue(value)
          valueDisplay.textContent = Math.round(value * 100) + '%'
        })

        optionDiv.appendChild(slider)
        optionDiv.appendChild(valueDisplay)
      } else if (option.type === 'toggle') {
        /** @type {HTMLInputElement} */
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.checked = option.value()
        checkbox.style.cssText = `
                    accent-color: #00ffff;
                    margin-right: 10px;
                `

        checkbox.addEventListener('change', e => {
          option.setValue(/** @type {HTMLInputElement} */ (e.target).checked)
        })

        optionDiv.appendChild(checkbox)
      } else if (option.type === 'select') {
        /** @type {HTMLSelectElement} */
        const select = document.createElement('select')
        select.style.cssText = `
                    width: 100%;
                    background-color: #333;
                    color: white;
                    border: 1px solid #00ffff;
                    padding: 5px;
                    font-family: 'Courier New', monospace;
                `

        option.options.forEach(optionValue => {
          const optionElement = document.createElement('option')
          optionElement.value = optionValue
          optionElement.textContent = optionValue
          optionElement.selected = option.value() === optionValue
          select.appendChild(optionElement)
        })

        select.addEventListener('change', e => {
          option.setValue(/** @type {HTMLSelectElement} */ (e.target).value)
        })

        optionDiv.appendChild(select)
      }

      content.appendChild(optionDiv)
    })
  }

  handleInput(keyCode) {
    if (!this.isOpen) return false

    switch (keyCode) {
      case 'Escape':
        this.close()
        return true

      case 'ArrowUp':
        this.selectedOption = Math.max(0, this.selectedOption - 1)
        this.updateDisplay()
        return true

      case 'ArrowDown':
        this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1)
        this.updateDisplay()
        return true

      case 'Enter':
        this.selectCurrentOption()
        return true
    }

    return false
  }

  saveSettings() {
    const settings = {}

    this.options.forEach(option => {
      const key = option.name.toLowerCase().replace(/\s+/g, '')
      settings[key] = option.value()
    })

    this.eventDispatcher.emit(UI_EVENTS.SETTINGS_SAVE, settings)
  }

  /**
   * Load settings from localStorage and apply
   */
  loadSettings() {
    let data = {}
    try {
      const raw = localStorage.getItem('gameSettings')
      data = raw ? JSON.parse(raw) : {}
    } catch (e) {
      console.warn('Could not load settings:', e)
      data = {}
    }
    // Apply loaded settings
    this.options.forEach(option => {
      const key = option.name.toLowerCase().replace(/\s+/g, '')
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        option.setValue(data[key])
      }
    })
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    /** @type {Set<Function>} */
    this.eventListeners = this.eventListeners || new Set()
    this.eventListeners.forEach(listener => {
      if (listener && typeof listener === 'function') {
        listener()
      }
    })
    this.eventListeners.clear()
  }
}

// Default export
export default OptionsMenu
