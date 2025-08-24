/**
 * StoryJournal - Persistent Story Log System (POJO + Functional)
 *
 * Provides a comprehensive story journal interface where players can:
 * - Review unlocked chapters and their progression
 * - Read discovery logs and lore entries
 * - Track story timeline and achievements
 * - Access story content on demand
 *
 * Design Principles:
 * - Zero 'this' keywords
 * - Pure functions for state management
 * - Immutable state patterns
 * - Easy testing and mocking
 * - Composition over inheritance
 */

// Default configuration
const DEFAULT_CONFIG = {
  animationDuration: 300,
  maxModalWidth: '800px',
  maxModalHeight: '600px',
  tabs: ['chapters', 'logs', 'timeline']
}

/**
 * Create initial journal state
 */
const createJournalState = (eventDispatcher, stateManager, config = {}) => ({
  eventDispatcher,
  stateManager,
  isVisible: false,
  modal: null,
  currentTab: 'chapters',
  isTransitioning: false,
  config: { ...DEFAULT_CONFIG, ...config },
  // Event handlers will be bound during setup
  boundHandlers: {
    handleKeydown: null,
    handleTabClick: null,
    handleCloseClick: null
  }
})

/**
 * Safe interface method caller - validates interface and calls method
 * @param {Object} iface - Interface object
 * @param {string} methodName - Method name to call
 * @param {...any} args - Arguments to pass to method
 * @returns {any} Method result or null if interface invalid
 */
const safeInterfaceCall = (iface, methodName, ...args) => {
  if (!iface || typeof iface[methodName] !== 'function') {
    console.warn(`StoryJournal: _interface or ${methodName} not available`)
    return null
  }
  return iface[methodName](...args)
}

/**
 * Setup event listeners for journal interactions (side effect function)
 * @param {Object} state - Current journal state
 * @returns {Object} New state with bound handlers
 */
const setupEventListeners = state => {
  // Create bound handlers that access current state through interface
  const boundHandlers = {
    handleKeydown: event => {
      // Get current state through interface to avoid stale closure
      const currentState = state._interfaceMethods.safeGetState()
      if (currentState) {
        handleKeydownEvent(currentState, event)
      }
    },
    handleTabClick: event => {
      const currentState = state._interfaceMethods.safeGetState()
      if (currentState) {
        handleTabClickEvent(currentState, event)
      }
    },
    handleCloseClick: () => {
      state._interfaceMethods.safeClose()
    }
  }

  // Listen for journal open requests
  state.eventDispatcher.on('STORY_JOURNAL_OPEN', () => {
    // Update state through the factory's interface
    state._interfaceMethods.safeOpen()
  })

  // Listen for journal close requests
  state.eventDispatcher.on('STORY_JOURNAL_CLOSE', () => {
    // Update state through the factory's interface
    state._interfaceMethods.safeClose()
  })

  // Listen for keyboard shortcuts
  document.addEventListener('keydown', boundHandlers.handleKeydown)

  return { ...state, boundHandlers }
}

/**
 * Open the story journal (pure state function + side effects)
 * @param {Object} state - Current journal state
 * @returns {Object} New state
 */
const openJournal = state => {
  if (state.isVisible) return state

  const newState = { ...state, isVisible: true }

  // Side effect: Create and show modal
  const modal = createJournalModal(newState)
  renderCurrentTab(newState, modal)

  // Emit journal opened event
  state.eventDispatcher.emit('STORY_JOURNAL_OPENED', {
    timestamp: Date.now(),
    tab: newState.currentTab
  })

  return { ...newState, modal }
}

/**
 * Close the story journal (pure state function + side effects)
 * @param {Object} state - Current journal state
 * @returns {Object} New state
 */
const closeJournal = state => {
  if (!state.isVisible) return state

  // Side effect: Remove modal from DOM
  if (state.modal && state.modal.parentNode) {
    state.modal.style.opacity = '0'
    setTimeout(() => {
      if (state.modal && state.modal.parentNode) {
        state.modal.parentNode.removeChild(state.modal)
      }
    }, state.config.animationDuration)
  }

  // Emit journal closed event
  state.eventDispatcher.emit('STORY_JOURNAL_CLOSED', {
    timestamp: Date.now()
  })

  return { ...state, isVisible: false, modal: null }
}

/**
 * Create journal modal DOM element (pure DOM function)
 * @param {Object} state - Current journal state
 * @returns {HTMLElement} Modal element
 */
const createJournalModal = state => {
  // Create modal overlay
  const modal = document.createElement('div')
  modal.className = 'story-journal-modal'
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity ${state.config.animationDuration}ms ease;
  `

  // Create modal content
  const content = document.createElement('div')
  content.className = 'journal-content'
  content.style.cssText = `
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #ffcc00;
    border-radius: 10px;
    max-width: ${state.config.maxModalWidth};
    max-height: ${state.config.maxModalHeight};
    width: 90%;
    height: 80%;
    overflow: hidden;
    position: relative;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  `

  // Create header
  const header = createHeader(state)
  content.appendChild(header)

  // Create tab navigation
  const tabNav = createTabNavigation(state)
  content.appendChild(tabNav)

  // Create content area
  const contentArea = document.createElement('div')
  contentArea.className = 'journal-tab-content'
  contentArea.style.cssText = `
    padding: 20px;
    height: calc(100% - 120px);
    overflow-y: auto;
    color: #fff;
    background: rgba(0, 0, 0, 0.2);
  `
  content.appendChild(contentArea)

  modal.appendChild(content)
  document.body.appendChild(modal)

  // Setup event handlers
  setupModalEventHandlers(state, modal)

  // Trigger fade in
  setTimeout(() => {
    modal.style.opacity = '1'
  }, 10)

  return modal
}

/**
 * Create header element (pure DOM function)
 * @param {Object} _state - Current journal state (unused)
 * @returns {HTMLElement} Header element
 */
const createHeader = _state => {
  const header = document.createElement('div')
  header.className = 'journal-header'
  header.style.cssText = `
    padding: 20px;
    border-bottom: 1px solid #ffcc00;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 204, 0, 0.1);
  `

  const title = document.createElement('h2')
  title.textContent = 'Story Journal'
  title.style.cssText = `
    margin: 0;
    color: #ffcc00;
    font-family: 'Arial', sans-serif;
    font-size: 24px;
    font-weight: bold;
  `

  const closeButton = document.createElement('button')
  closeButton.textContent = '×'
  closeButton.className = 'journal-close'
  closeButton.style.cssText = `
    background: none;
    border: 2px solid #ffcc00;
    color: #ffcc00;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
  `

  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = '#ffcc00'
    closeButton.style.color = '#000'
  })

  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'none'
    closeButton.style.color = '#ffcc00'
  })

  header.appendChild(title)
  header.appendChild(closeButton)
  return header
}

/**
 * Create tab navigation (pure DOM function)
 * @param {Object} state - Current journal state
 * @returns {HTMLElement} Tab navigation element
 */
const createTabNavigation = state => {
  const tabNav = document.createElement('div')
  tabNav.className = 'journal-tabs'
  tabNav.style.cssText = `
    display: flex;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid #333;
  `

  state.config.tabs.forEach(tabName => {
    const tab = document.createElement('button')
    tab.className = 'journal-tab'
    tab.dataset.tab = tabName
    tab.textContent = getTabDisplayName(tabName)
    tab.style.cssText = `
      flex: 1;
      padding: 15px;
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      transition: all 0.3s ease;
      border-bottom: 3px solid transparent;
    `

    // Set active tab style
    if (tabName === state.currentTab) {
      tab.style.background = '#ffcc00'
      tab.style.color = '#000'
      tab.style.borderBottomColor = '#ffcc00'
    }

    tabNav.appendChild(tab)
  })

  return tabNav
}

/**
 * Get display name for tab (pure function)
 * @param {string} tabName - Tab name
 * @returns {string} Display name
 */
const getTabDisplayName = tabName => {
  const displayNames = {
    chapters: 'Chapters',
    logs: 'Discovery Logs',
    timeline: 'Timeline'
  }
  return displayNames[tabName] || tabName
}

/**
 * Switch to a different tab (pure function + side effects)
 * @param {Object} state - Current journal state
 * @param {string} tabName - Tab to switch to
 * @returns {Object} New state
 */
const switchTab = (state, tabName) => {
  if (!state.config.tabs.includes(tabName) || state.currentTab === tabName) {
    return state
  }

  const newState = { ...state, currentTab: tabName }

  // Side effects: Update UI
  if (state.modal) {
    updateTabStyles(newState, state.modal)
    renderCurrentTab(newState, state.modal)
  }

  // Emit tab changed event
  state.eventDispatcher.emit('STORY_JOURNAL_TAB_CHANGED', {
    previousTab: state.currentTab,
    currentTab: tabName,
    timestamp: Date.now()
  })

  return newState
}

/**
 * Update tab styles (side effect function)
 * @param {Object} state - Current journal state
 * @param {HTMLElement} modal - Modal element
 */
const updateTabStyles = (state, modal) => {
  const tabs = modal.querySelectorAll('.journal-tab')
  tabs.forEach(tab => {
    const htmlTab = /** @type {HTMLElement} */ (tab)
    const isActive = htmlTab.dataset.tab === state.currentTab
    htmlTab.style.background = isActive ? '#ffcc00' : 'transparent'
    htmlTab.style.color = isActive ? '#000' : '#fff'
    htmlTab.style.borderBottomColor = isActive ? '#ffcc00' : 'transparent'
  })
}

/**
 * Render current tab content (side effect function)
 * @param {Object} state - Current journal state
 * @param {HTMLElement} modal - Modal element
 */
const renderCurrentTab = (state, modal) => {
  const container = /** @type {HTMLElement} */ (modal.querySelector('.journal-tab-content'))
  if (!container) return

  container.innerHTML = ''

  switch (state.currentTab) {
    case 'chapters':
      renderChaptersTab(state, container)
      break
    case 'logs':
      renderLogsTab(state, container)
      break
    case 'timeline':
      renderTimelineTab(state, container)
      break
  }
}

/**
 * Render chapters tab (side effect function)
 * @param {Object} state - Current journal state
 * @param {HTMLElement} container - Container element
 */
const renderChaptersTab = (state, container) => {
  const gameState = getGameState(state)

  container.innerHTML = `
    <h3 style="color: #ffcc00; margin-top: 0;">Story Progress</h3>
    <div class="chapters-grid" style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
      margin-top: 20px;
    ">
    </div>
  `

  const grid = container.querySelector('.chapters-grid')

  // Sample chapter data (would come from story system)
  const chapters = [
    {
      id: 'prologue',
      title: 'Signal of the Last City',
      description: 'The terraformers have gone silent. You are the last morphing core.',
      unlocked: true,
      completed: gameState.level >= 1
    },
    {
      id: 'cloudline',
      title: 'Cloudline: Neon Ossuary',
      description: 'Above the cloud deck, neon ruins drift in digital twilight.',
      unlocked: gameState.level >= 1,
      completed: gameState.level >= 3
    },
    {
      id: 'relay07',
      title: 'Relay 07: Broken Chorus',
      description: 'The Relay Warden awaits in the fractured transmission towers.',
      unlocked: gameState.level >= 3,
      completed: gameState.bossesDefeated >= 1
    }
  ]

  chapters.forEach(chapter => {
    const element = createChapterElement(chapter)
    grid.appendChild(element)
  })
}

/**
 * Create chapter element (pure DOM function)
 * @param {Object} chapter - Chapter data
 * @returns {HTMLElement} Chapter element
 */
const createChapterElement = chapter => {
  const element = document.createElement('div')
  element.className = 'chapter-item'
  element.style.cssText = `
    background: ${chapter.unlocked ? 'rgba(255, 204, 0, 0.1)' : 'rgba(128, 128, 128, 0.1)'};
    border: 1px solid ${chapter.unlocked ? '#ffcc00' : '#666'};
    border-radius: 8px;
    padding: 15px;
    transition: all 0.3s ease;
  `

  const status = chapter.completed
    ? '✓ Completed'
    : chapter.unlocked
      ? '◦ In Progress'
      : '🔒 Locked'

  const statusColor = chapter.completed ? '#00ff00' : chapter.unlocked ? '#ffcc00' : '#666'

  element.innerHTML = `
    <h4 style="color: ${chapter.unlocked ? '#ffcc00' : '#666'}; margin: 0 0 10px 0;">
      ${chapter.title}
    </h4>
    <p style="color: ${chapter.unlocked ? '#fff' : '#999'}; margin: 0 0 10px 0; font-size: 14px;">
      ${chapter.unlocked ? chapter.description : 'Progress further to unlock this chapter.'}
    </p>
    <div style="color: ${statusColor}; font-weight: bold; font-size: 12px;">
      ${status}
    </div>
  `

  if (chapter.unlocked) {
    element.addEventListener('mouseenter', () => {
      element.style.background = 'rgba(255, 204, 0, 0.2)'
      element.style.transform = 'translateY(-2px)'
    })

    element.addEventListener('mouseleave', () => {
      element.style.background = 'rgba(255, 204, 0, 0.1)'
      element.style.transform = 'translateY(0)'
    })
  }

  return element
}

/**
 * Render logs tab (side effect function)
 * @param {Object} state - Current journal state
 * @param {HTMLElement} container - Container element
 */
const renderLogsTab = (state, container) => {
  container.innerHTML = `
    <h3 style="color: #ffcc00; margin-top: 0;">Discovery Logs</h3>
    <p style="color: #aaa;">Lore entries and story fragments you've discovered during your journey.</p>
    <div style="margin-top: 20px; color: #666; text-align: center; padding: 40px;">
      <em>No discovery logs found yet. Explore the world to unlock story content!</em>
    </div>
  `
}

/**
 * Render timeline tab (side effect function)
 * @param {Object} state - Current journal state
 * @param {HTMLElement} container - Container element
 */
const renderTimelineTab = (state, container) => {
  const gameState = getGameState(state)

  container.innerHTML = `
    <h3 style="color: #ffcc00; margin-top: 0;">Mission Timeline</h3>
    <div class="timeline" style="margin-top: 20px;">
      <div class="timeline-item" style="
        padding: 10px 0;
        border-left: 2px solid #ffcc00;
        margin-left: 10px;
        padding-left: 20px;
        margin-bottom: 15px;
        position: relative;
      ">
        <div style="
          position: absolute;
          left: -6px;
          top: 15px;
          width: 10px;
          height: 10px;
          background: #ffcc00;
          border-radius: 50%;
        "></div>
        <h4 style="color: #ffcc00; margin: 0;">Mission Start</h4>
        <p style="color: #aaa; margin: 5px 0; font-size: 14px;">Launched from the Last City</p>
      </div>
      ${
        gameState.level > 1
          ? `
      <div class="timeline-item" style="
        padding: 10px 0;
        border-left: 2px solid #00ff00;
        margin-left: 10px;
        padding-left: 20px;
        margin-bottom: 15px;
        position: relative;
      ">
        <div style="
          position: absolute;
          left: -6px;
          top: 15px;
          width: 10px;
          height: 10px;
          background: #00ff00;
          border-radius: 50%;
        "></div>
        <h4 style="color: #00ff00; margin: 0;">First Contact</h4>
        <p style="color: #aaa; margin: 5px 0; font-size: 14px;">Encountered hostile entities</p>
      </div>`
          : ''
      }
    </div>
  `
}

/**
 * Setup modal event handlers (side effect function)
 * @param {Object} state - Current journal state
 * @param {HTMLElement} modal - Modal element
 */
const setupModalEventHandlers = (state, modal) => {
  // Close button
  const closeButton = modal.querySelector('.journal-close')
  if (closeButton) {
    closeButton.addEventListener('click', state.boundHandlers.handleCloseClick)
  }

  // Tab clicks
  const tabs = modal.querySelectorAll('.journal-tab')
  tabs.forEach(tab => {
    tab.addEventListener('click', state.boundHandlers.handleTabClick)
  })

  // Click outside to close
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      state._interfaceMethods.safeClose()
    }
  })
}

/**
 * Get current game state (pure function)
 * @param {Object} state - Current journal state
 * @returns {Object} Game state
 */
const getGameState = state => ({
  level: state.stateManager.getState('game.level') || 1,
  score: state.stateManager.getState('game.score') || 0,
  bossesDefeated: state.stateManager.getState('game.bossesDefeated') || 0,
  enemiesKilled: state.stateManager.getState('game.enemiesKilled') || 0
})

/**
 * Event handlers (side effect functions)
 */
const handleKeydownEvent = (state, event) => {
  if (!state.isVisible) return

  if (event.key === 'Escape') {
    state._interfaceMethods.safeClose()
  } else if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    nextTab(state)
  } else if (event.key === 'Tab' && event.shiftKey) {
    event.preventDefault()
    previousTab(state)
  }
}

const handleTabClickEvent = (state, event) => {
  const tab = event.target.closest('.journal-tab')
  if (tab && tab.dataset.tab) {
    state._interfaceMethods.safeSwitchTab(tab.dataset.tab)
  }
}

const handleCloseClickEvent = state => {
  state._interfaceMethods.safeClose()
}

/**
 * Switch to next tab (side effect function)
 * @param {Object} state - Current journal state
 */
const nextTab = state => {
  const currentIndex = state.config.tabs.indexOf(state.currentTab)
  const nextIndex = (currentIndex + 1) % state.config.tabs.length
  state._interfaceMethods.safeSwitchTab(state.config.tabs[nextIndex])
}

/**
 * Switch to previous tab (side effect function)
 * @param {Object} state - Current journal state
 */
const previousTab = state => {
  const currentIndex = state.config.tabs.indexOf(state.currentTab)
  const prevIndex = currentIndex === 0 ? state.config.tabs.length - 1 : currentIndex - 1
  state._interfaceMethods.safeSwitchTab(state.config.tabs[prevIndex])
}

/**
 * Check if journal is currently active (pure function)
 * @param {Object} state - Current journal state
 * @returns {boolean} Whether journal is active
 */
const isActive = state => state.isVisible

/**
 * Cleanup resources (side effect function)
 * @param {Object} state - Current journal state
 * @returns {Object} Clean state
 */
const cleanup = state => {
  // Remove event listeners
  if (state.boundHandlers.handleKeydown) {
    document.removeEventListener('keydown', state.boundHandlers.handleKeydown)
  }

  // Close modal
  if (state.modal) {
    const cleanedState = closeJournal(state)
    return {
      ...cleanedState,
      boundHandlers: { handleKeydown: null, handleTabClick: null, handleCloseClick: null }
    }
  }

  return {
    ...state,
    boundHandlers: { handleKeydown: null, handleTabClick: null, handleCloseClick: null }
  }
}

/**
 * Factory function to create StoryJournal instance
 * @param {Object} eventDispatcher - Event dispatcher instance
 * @param {Object} stateManager - State manager instance
 * @param {Object} config - Configuration options
 * @returns {Object} StoryJournal interface
 */
const createStoryJournal = (eventDispatcher, stateManager, config = {}) => {
  let state = createJournalState(eventDispatcher, stateManager, config)

  // Create interface object
  const journalInterface = {
    // Public interface matching original class API
    setupEventListeners: () => {
      state = setupEventListeners(state)
    },

    open: () => {
      state = openJournal(state)
    },

    close: () => {
      state = closeJournal(state)
    },

    switchTab: tabName => {
      state = switchTab(state, tabName)
    },

    get isVisible() {
      return isActive(state)
    },

    get active() {
      return isActive(state)
    },

    cleanup: () => {
      state = cleanup(state)
    },

    // Additional getters for testing/debugging
    getState: () => ({ ...state })
  }

  // Instead of storing interface reference on state (avoids circular reference),
  // create a closure that captures the interface for event handlers
  const createInterfaceMethods = () => ({
    safeGetState: () => safeInterfaceCall(journalInterface, 'getState'),
    safeOpen: () => safeInterfaceCall(journalInterface, 'open'),
    safeClose: () => safeInterfaceCall(journalInterface, 'close'),
    safeSwitchTab: tab => safeInterfaceCall(journalInterface, 'switchTab', tab)
  })

  // Store interface methods instead of interface itself
  state._interfaceMethods = createInterfaceMethods()

  return journalInterface
}

// Export both factory and individual functions for testing
export {
  createStoryJournal,
  createJournalState,
  setupEventListeners,
  openJournal,
  closeJournal,
  createJournalModal,
  createHeader,
  createTabNavigation,
  getTabDisplayName,
  switchTab,
  updateTabStyles,
  renderCurrentTab,
  renderChaptersTab,
  createChapterElement,
  renderLogsTab,
  renderTimelineTab,
  setupModalEventHandlers,
  getGameState,
  handleKeydownEvent,
  handleTabClickEvent,
  handleCloseClickEvent,
  nextTab,
  previousTab,
  isActive,
  cleanup
}

export default createStoryJournal
