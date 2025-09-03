/**
 * UIManager - Central UI Management System
 * Coordinates all UI components and handles event-driven interactions
 */

import { UI_EVENTS, UI_STATE_KEYS } from '@/constants/ui-events.js'
import MenuSystem from '@/ui/MenuSystem.js'
import InputHandler from '@/ui/InputHandler.js'
import DisplayManager from '@/ui/DisplayManager.js'

/**
 * Create a UIManager instance using factory function pattern
 * @param {Object} game - Game instance
 * @param {Object} eventDispatcher - Event dispatcher instance
 * @param {Object} stateManager - State manager instance
 * @returns {Object} UIManager instance
 */
export function createUIManager(game, eventDispatcher, stateManager) {
  // UI components
  let menuSystem = null
  let inputHandler = null
  let displayManager = null

  // UI state
  let isInitialized = false
  let currentFocus = null
  let inputBuffer = []
  let lastInputTime = 0

  /**
   * Initialize UI components
   */
  function initializeComponents() {
    // Initialize menu system
    menuSystem = new MenuSystem(game, eventDispatcher, stateManager)

    // Initialize input handler
    inputHandler = new InputHandler(eventDispatcher, stateManager)

    // Initialize display manager if canvas available
    if (game && game.canvas) {
      displayManager = new DisplayManager(game.canvas, eventDispatcher, stateManager)
    } else {
      displayManager = null
    }
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    if (!eventDispatcher) return

    // Game state events
    eventDispatcher.on(UI_EVENTS.GAME_STARTED, () => {
      handleGameStarted()
    })

    eventDispatcher.on(UI_EVENTS.GAME_PAUSED, () => {
      handleGamePaused()
    })

    eventDispatcher.on(UI_EVENTS.GAME_RESUMED, () => {
      handleGameResumed()
    })

    eventDispatcher.on(UI_EVENTS.GAME_ENDED, () => {
      handleGameEnded()
    })

    // UI state events
    eventDispatcher.on(UI_EVENTS.MENU_OPENED, data => {
      handleMenuOpened(data)
    })

    eventDispatcher.on(UI_EVENTS.MENU_CLOSED, data => {
      handleMenuClosed(data)
    })

    eventDispatcher.on(UI_EVENTS.NOTIFICATION_CREATED, data => {
      handleNotificationCreated(data)
    })

    // Input events
    eventDispatcher.on(UI_EVENTS.INPUT_ACTION, data => {
      handleInputAction(data)
    })

    // Display events
    eventDispatcher.on(UI_EVENTS.HUD_UPDATED, data => {
      handleHUDUpdate(data)
    })

    eventDispatcher.on(UI_EVENTS.DISPLAY_STATE_CHANGED, data => {
      handleDisplayStateChanged(data)
    })
  }

  /**
   * Set up system integration
   */
  function setupSystemIntegration() {
    // Set up cross-component communication
    setupMenuInputIntegration()
    setupDisplayNotificationIntegration()
    setupStateManagementIntegration()
  }

  /**
   * Set up menu and input integration
   */
  function setupMenuInputIntegration() {
    // Handle menu navigation through input
    eventDispatcher.on(UI_EVENTS.MENU_NAVIGATION, data => {
      if (menuSystem) {
        menuSystem.handleNavigation(data)
      }
    })

    // Handle menu toggle requests
    eventDispatcher.on(UI_EVENTS.MENU_TOGGLE_REQUESTED, data => {
      if (menuSystem) {
        menuSystem.toggleMenu(data.menuType)
      }
    })

    // Handle menu open/close requests
    eventDispatcher.on(UI_EVENTS.MENU_OPEN_REQUESTED, data => {
      if (menuSystem) {
        menuSystem.openMenu(data.menuType, data.options)
      }
    })

    eventDispatcher.on(UI_EVENTS.MENU_CLOSE_REQUESTED, data => {
      if (menuSystem) {
        menuSystem.closeMenu(data.menuType)
      }
    })
  }

  /**
   * Set up display and notification integration
   */
  function setupDisplayNotificationIntegration() {
    // Handle display updates
    eventDispatcher.on(UI_EVENTS.FPS_TOGGLED, () => {
      if (displayManager) {
        displayManager.showFPS = !displayManager.showFPS
      }
    })

    eventDispatcher.on(UI_EVENTS.DEBUG_TOGGLED, () => {
      if (displayManager) {
        displayManager.showDebug = !displayManager.showDebug
      }
    })

    // Handle notification requests
    eventDispatcher.on(UI_EVENTS.NOTIFICATION_REQUESTED, data => {
      if (displayManager) {
        displayManager.createNotification(data.message, data.type, data.duration)
      }
    })
  }

  /**
   * Set up state management integration
   */
  function setupStateManagementIntegration() {
    // Subscribe to state changes
    if (stateManager) {
      stateManager.subscribe(UI_STATE_KEYS.MENU_OPEN, isOpen => {
        handleMenuStateChange(isOpen)
      })

      stateManager.subscribe(UI_STATE_KEYS.GAME_PAUSED, isPaused => {
        handlePauseStateChange(isPaused)
      })

      stateManager.subscribe(UI_STATE_KEYS.SHOW_FPS, showFPS => {
        handleFPSDisplayChange(showFPS)
      })

      stateManager.subscribe(UI_STATE_KEYS.SHOW_DEBUG, showDebug => {
        handleDebugDisplayChange(showDebug)
      })
    }
  }

  /**
   * Handle game started
   */
  function handleGameStarted() {
    if (displayManager) {
      displayManager.resetDisplay()
      displayManager.createNotification('Game Started!', 'success', 2000)
    }
  }

  /**
   * Handle game paused
   */
  function handleGamePaused() {
    if (displayManager) {
      displayManager.showPauseOverlay()
    }
  }

  /**
   * Handle game resumed
   */
  function handleGameResumed() {
    if (displayManager) {
      displayManager.hidePauseOverlay()
    }
  }

  /**
   * Handle game ended
   */
  function handleGameEnded() {
    if (displayManager) {
      displayManager.createNotification('Game Over!', 'error', 3000)
    }
  }

  /**
   * Handle menu opened
   */
  function handleMenuOpened(data) {
    // Emit state change events
    eventDispatcher.emit(UI_EVENTS.STATE_CHANGED, {
      key: UI_STATE_KEYS.MENU_OPEN,
      value: true
    })
    eventDispatcher.emit(UI_EVENTS.STATE_CHANGED, {
      key: UI_STATE_KEYS.MENU_TYPE,
      value: data.menuType
    })

    // Show notification
    if (displayManager) {
      displayManager.createNotification(`${data.menuType} menu opened`, 'info', 1000)
    }
  }

  /**
   * Handle menu closed
   */
  function handleMenuClosed(data) {
    // Emit state change events
    eventDispatcher.emit(UI_EVENTS.STATE_CHANGED, {
      key: UI_STATE_KEYS.MENU_OPEN,
      value: false
    })
    eventDispatcher.emit(UI_EVENTS.STATE_CHANGED, {
      key: UI_STATE_KEYS.MENU_TYPE,
      value: null
    })

    // Show notification
    if (displayManager) {
      displayManager.createNotification(`${data.menuType} menu closed`, 'info', 1000)
    }
  }

  /**
   * Handle notification created
   */
  function handleNotificationCreated(data) {
    console.log('Notification created:', data)
  }

  /**
   * Handle input action
   */
  function handleInputAction(data) {
    // Log input for debugging
    console.log('Input action:', data)

    // Update last input time
    lastInputTime = Date.now()
  }

  /**
   * Handle HUD update
   */
  function handleHUDUpdate(data) {
    // Update display manager
    if (displayManager) {
      displayManager.updateHUDElement(data.element, data.value)
    }
  }

  /**
   * Handle display state changed
   */
  function handleDisplayStateChanged(data) {
    console.log('Display state changed:', data)
  }

  /**
   * Handle menu state change
   */
  function handleMenuStateChange(isOpen) {
    currentFocus = isOpen ? 'menu' : 'game'
  }

  /**
   * Handle pause state change
   */
  function handlePauseStateChange(isPaused) {
    if (isPaused) {
      handleGamePaused()
    } else {
      handleGameResumed()
    }
  }

  /**
   * Handle FPS display change
   */
  function handleFPSDisplayChange(showFPS) {
    if (displayManager) {
      displayManager.showFPS = showFPS
    }
  }

  /**
   * Handle debug display change
   */
  function handleDebugDisplayChange(showDebug) {
    if (displayManager) {
      displayManager.showDebug = showDebug
    }
  }

  /**
   * Update UI system
   */
  function update(deltaTime) {
    // Update display manager
    if (displayManager) {
      displayManager.render(deltaTime)
    }

    // Update input buffer
    updateInputBuffer()

    // Update component states
    updateComponentStates()
  }

  /**
   * Update input buffer
   */
  function updateInputBuffer() {
    if (inputHandler) {
      inputBuffer = inputHandler.getInputBuffer()
    }
  }

  /**
   * Update component states
   */
  function updateComponentStates() {
    // Update menu system state
    if (menuSystem) {
      const menuState = menuSystem.getCurrentMenuState()
      stateManager.setState(UI_STATE_KEYS.MENU_OPEN, menuState.isAnyMenuOpen)
      stateManager.setState(UI_STATE_KEYS.MENU_TYPE, menuState.currentMenu)
    }

    // Update display state
    if (displayManager) {
      const displayState = displayManager.getDisplayState()
      stateManager.setState(UI_STATE_KEYS.SHOW_FPS, displayState.showFPS)
      stateManager.setState(UI_STATE_KEYS.SHOW_DEBUG, displayState.showDebug)
    }
  }

  /**
   * Get UI state
   */
  function getUIState() {
    return {
      isInitialized,
      currentFocus,
      lastInputTime,
      menuState: menuSystem ? menuSystem.getCurrentMenuState() : null,
      displayState: displayManager ? displayManager.getDisplayState() : null,
      inputBuffer: inputBuffer.length
    }
  }

  /**
   * Show notification
   */
  function showNotification(message, type = 'info', duration = 3000) {
    if (displayManager) {
      return displayManager.createNotification(message, type, duration)
    }
    return null
  }

  /**
   * Update HUD element
   */
  function updateHUD(element, value) {
    if (displayManager) {
      displayManager.updateHUD(element, value)
    }
  }

  /**
   * Open menu
   */
  function openMenu(menuType, options = {}) {
    if (menuSystem) {
      menuSystem.openMenu(menuType, options)
    }
  }

  /**
   * Close menu
   */
  function closeMenu(menuType) {
    if (menuSystem) {
      menuSystem.closeMenu(menuType)
    }
  }

  /**
   * Toggle menu
   */
  function toggleMenu(menuType) {
    if (menuSystem) {
      menuSystem.toggleMenu(menuType)
    }
  }

  /**
   * Get input state
   */
  function getInputState() {
    if (inputHandler) {
      return {
        keyMappings: inputHandler.getKeyMappings(),
        mousePosition: inputHandler.getMousePosition(),
        inputBuffer: inputHandler.getInputBuffer()
      }
    }
    return null
  }

  /**
   * Set key mapping
   */
  function setKeyMapping(key, action) {
    if (inputHandler) {
      inputHandler.setKeyMapping(key, action)
    }
  }

  /**
   * Check if action is active
   */
  function isActionActive(action) {
    if (inputHandler) {
      return inputHandler.isActionActive(action)
    }
    return false
  }

  /**
   * Cleanup UI system
   */
  function cleanup() {
    // Cleanup components
    if (menuSystem) {
      menuSystem.cleanup()
    }

    if (inputHandler) {
      inputHandler.cleanup()
    }

    if (displayManager) {
      displayManager.cleanup()
    }

    // Clear state
    isInitialized = false
    currentFocus = null
    inputBuffer.length = 0

    // Emit cleanup event
    eventDispatcher.emit(UI_EVENTS.UI_CLEANUP, {
      timestamp: Date.now()
    })
  }

  /**
   * Initialize UI manager
   */
  function initialize() {
    setupEventListeners()
    initializeComponents()
    setupSystemIntegration()
    isInitialized = true

    // Emit initialization event
    eventDispatcher.emit(UI_EVENTS.UI_INITIALIZED, {
      timestamp: Date.now()
    })
  }

  // Initialize UI system
  initialize()

  // Return public interface
  return {
    // State getters
    get isInitialized() {
      return isInitialized
    },
    get currentFocus() {
      return currentFocus
    },
    get inputBuffer() {
      return [...inputBuffer]
    },
    get lastInputTime() {
      return lastInputTime
    },

    // Component getters (with setters for testing)
    get menuSystem() {
      return menuSystem
    },
    set menuSystem(value) {
      menuSystem = value
    },
    get inputHandler() {
      return inputHandler
    },
    set inputHandler(value) {
      inputHandler = value
    },
    get displayManager() {
      return displayManager
    },
    set displayManager(value) {
      displayManager = value
    },

    // Public methods
    initialize,
    update,
    getUIState,
    showNotification,
    updateHUD,
    openMenu,
    closeMenu,
    toggleMenu,
    getInputState,
    setKeyMapping,
    isActionActive,
    cleanup,

    // Event handlers (for testing)
    handleGameStarted,
    handleGamePaused,
    handleGameResumed,
    handleGameEnded,
    handleMenuOpened,
    handleMenuClosed,
    handleNotificationCreated,
    handleInputAction,
    handleHUDUpdate,
    handleDisplayStateChanged,
    handleMenuStateChange,
    handlePauseStateChange,
    handleFPSDisplayChange,
    handleDebugDisplayChange
  }
}

// Legacy class wrapper for backward compatibility
export class UIManager {
  constructor(game, eventDispatcher, stateManager) {
    // Delegate to factory function
    const instance = createUIManager(game, eventDispatcher, stateManager)

    // Copy all properties and methods to this instance
    Object.assign(this, instance)
  }
}

export default UIManager
