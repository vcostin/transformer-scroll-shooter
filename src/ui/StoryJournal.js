/**
 * StoryJournal - Persistent Story Log System
 *
 * Provides a comprehensive story journal interface where players can:
 * - Review unlocked chapters and their progression
 * - Read discovery logs and lore entries
 * - Track story timeline and achievements
 * - Access story content on demand
 */

export class StoryJournal {
  constructor(stateManager) {
    this.stateManager = stateManager
    this.isVisible = false
    this.modal = null
    this.currentTab = 'chapters'
    this.isTransitioning = false

    // Configuration
    this.config = {
      animationDuration: 300,
      maxModalWidth: '800px',
      maxModalHeight: '600px',
      tabs: ['chapters', 'logs', 'timeline']
    }

    // Event dispatcher (using StateManager's event system)
    this.eventDispatcher = stateManager
  }

  /**
   * Setup event listeners for journal interactions
   */
  setupEventListeners() {
    // Bind methods first
    this.handleKeydown = this.handleKeydown.bind(this)
    this.handleTabClick = this.handleTabClick.bind(this)
    this.handleCloseClick = this.handleCloseClick.bind(this)

    // Listen for journal open requests
    this.eventDispatcher.on('STORY_JOURNAL_OPEN', () => {
      this.open()
    })

    // Listen for journal close requests
    this.eventDispatcher.on('STORY_JOURNAL_CLOSE', () => {
      this.close()
    })

    // Listen for keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown)
  }

  /**
   * Open the story journal
   */
  open() {
    if (this.isOpen) return

    this.isOpen = true
    this.createJournalModal()
    this.renderCurrentTab()

    // Emit journal opened event
    this.eventDispatcher.emit('STORY_JOURNAL_OPENED', {
      timestamp: Date.now(),
      tab: this.currentTab
    })
  }

  /**
   * Close the story journal
   */
  close() {
    if (!this.isOpen) return

    this.isOpen = false

    if (this.modal) {
      // Animate out
      this.modal.style.opacity = '0'
      this.modal.style.transform = 'scale(0.9)'

      setTimeout(() => {
        if (this.modal) {
          this.modal.remove()
          this.modal = null
          this.content = null
        }
      }, this.config.animationDuration)
    }

    // Emit journal closed event
    this.eventDispatcher.emit('STORY_JOURNAL_CLOSED', {
      timestamp: Date.now()
    })
  }

  /**
   * Create the journal modal DOM structure
   */
  createJournalModal() {
    // Create modal backdrop
    this.modal = document.createElement('div')
    this.modal.className = 'story-journal-modal'
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 3000;
      opacity: 0;
      transform: scale(0.9);
      transition: all ${this.config.animationDuration}ms ease;
      font-family: 'Arial', sans-serif;
    `

    // Create journal content container
    this.content = document.createElement('div')
    this.content.className = 'story-journal-content'
    this.content.style.cssText = `
      background-color: #1a1a1a;
      border: 2px solid #ffcc00;
      border-radius: 8px;
      max-width: ${this.config.maxModalWidth};
      max-height: ${this.config.maxModalHeight};
      width: 800px;
      height: 600px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      color: #ffffff;
    `

    // Create header
    const header = this.createHeader()
    this.content.appendChild(header)

    // Create tab navigation
    const tabNav = this.createTabNavigation()
    this.content.appendChild(tabNav)

    // Create main content area
    const mainContent = document.createElement('div')
    mainContent.className = 'journal-main-content'
    mainContent.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background-color: #2a2a2a;
    `
    this.content.appendChild(mainContent)

    this.modal.appendChild(this.content)
    document.body.appendChild(this.modal)

    // Animate in
    setTimeout(() => {
      this.modal.style.opacity = '1'
      this.modal.style.transform = 'scale(1)'
    }, 10)

    // Setup click handlers
    this.setupModalEventHandlers()
  }

  /**
   * Create journal header
   */
  createHeader() {
    const header = document.createElement('div')
    header.className = 'journal-header'
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #444;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #333;
    `

    const title = document.createElement('h2')
    title.textContent = 'Signal Archive - Last City Memory Core'
    title.style.cssText = `
      margin: 0;
      color: #ffcc00;
      font-size: 24px;
    `

    const closeButton = document.createElement('button')
    closeButton.textContent = '×'
    closeButton.className = 'journal-close-btn'
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: #ffffff;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    closeButton.addEventListener('click', () => this.close())

    header.appendChild(title)
    header.appendChild(closeButton)

    return header
  }

  /**
   * Create tab navigation
   */
  createTabNavigation() {
    const tabNav = document.createElement('div')
    tabNav.className = 'journal-tab-nav'
    tabNav.style.cssText = `
      display: flex;
      border-bottom: 1px solid #444;
      background-color: #333;
    `

    this.config.tabs.forEach(tabName => {
      const tab = document.createElement('button')
      tab.textContent = this.getTabDisplayName(tabName)
      tab.className = `journal-tab ${tabName === this.currentTab ? 'active' : ''}`
      tab.dataset.tab = tabName
      tab.style.cssText = `
        padding: 15px 25px;
        background: ${tabName === this.currentTab ? '#ffcc00' : 'transparent'};
        color: ${tabName === this.currentTab ? '#000' : '#fff'};
        border: none;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
      `

      tab.addEventListener('click', () => this.switchTab(tabName))
      tabNav.appendChild(tab)
    })

    return tabNav
  }

  /**
   * Get display name for tab
   */
  getTabDisplayName(tabName) {
    const displayNames = {
      chapters: 'Story Chapters',
      logs: 'Discovery Logs',
      timeline: 'Timeline'
    }
    return displayNames[tabName] || tabName
  }

  /**
   * Switch to a different tab
   */
  switchTab(tabName) {
    if (this.currentTab === tabName) return

    this.currentTab = tabName
    this.updateTabStyles()
    this.renderCurrentTab()

    // Emit tab change event
    this.eventDispatcher.emit('STORY_JOURNAL_TAB_CHANGED', {
      tab: tabName,
      timestamp: Date.now()
    })
  }

  /**
   * Update tab styles to reflect current selection
   */
  updateTabStyles() {
    const tabs = this.modal.querySelectorAll('.journal-tab')
    tabs.forEach(tab => {
      const htmlTab = /** @type {HTMLElement} */ (tab)
      const isActive = htmlTab.dataset.tab === this.currentTab
      htmlTab.style.background = isActive ? '#ffcc00' : 'transparent'
      htmlTab.style.color = isActive ? '#000' : '#fff'
      htmlTab.className = `journal-tab ${isActive ? 'active' : ''}`
    })
  }

  /**
   * Render content for current tab
   */
  renderCurrentTab() {
    const mainContent = this.content.querySelector('.journal-main-content')
    if (!mainContent) return

    mainContent.innerHTML = ''

    switch (this.currentTab) {
      case 'chapters':
        this.renderChaptersTab(mainContent)
        break
      case 'logs':
        this.renderLogsTab(mainContent)
        break
      case 'timeline':
        this.renderTimelineTab(mainContent)
        break
    }
  }

  /**
   * Render chapters tab content
   */
  renderChaptersTab(container) {
    const storyState = this.stateManager.getState('story')
    const gameState = this.getGameState()

    const title = document.createElement('h3')
    title.textContent = 'Story Chapters'
    title.style.cssText = 'color: #ffcc00; margin-bottom: 20px;'
    container.appendChild(title)

    // Get current chapter info from story system
    const currentChapter = storyState?.currentChapter || 'prologue'

    const chapterList = document.createElement('div')
    chapterList.className = 'chapter-list'

    // Mock chapter data - in real implementation, this would come from story system
    const chapters = [
      {
        id: 'prologue',
        title: 'Signal of the Last City',
        description: 'The terraformers have gone silent. You are the last morphing core.',
        unlocked: true,
        current: currentChapter === 'prologue'
      },
      {
        id: 'cloudline',
        title: 'Cloudline: Neon Ossuary',
        description: 'Above the cloud deck, neon ruins drift in digital twilight.',
        unlocked: gameState.level >= 2,
        current: currentChapter === 'cloudline'
      },
      {
        id: 'relay07',
        title: 'Relay-07: Broken Chorus',
        description: 'The relay stations echo with fragmented signals.',
        unlocked: gameState.bossesDefeated >= 1,
        current: currentChapter === 'relay07'
      }
    ]

    chapters.forEach(chapter => {
      const chapterElement = this.createChapterElement(chapter)
      chapterList.appendChild(chapterElement)
    })

    container.appendChild(chapterList)
  }

  /**
   * Create a chapter element
   */
  createChapterElement(chapter) {
    const element = document.createElement('div')
    element.className = 'chapter-item'
    element.style.cssText = `
      padding: 15px;
      margin-bottom: 15px;
      border: 1px solid ${chapter.current ? '#ffcc00' : '#555'};
      border-radius: 4px;
      background-color: ${chapter.current ? 'rgba(255, 204, 0, 0.1)' : 'transparent'};
      opacity: ${chapter.unlocked ? '1' : '0.5'};
      cursor: ${chapter.unlocked ? 'pointer' : 'default'};
    `

    const title = document.createElement('h4')
    title.textContent = chapter.title
    title.style.cssText = `
      margin: 0 0 10px 0;
      color: ${chapter.current ? '#ffcc00' : '#ffffff'};
    `

    const description = document.createElement('p')
    description.textContent = chapter.description
    description.style.cssText = `
      margin: 0;
      color: #cccccc;
      font-size: 14px;
    `

    const status = document.createElement('div')
    status.textContent = chapter.current
      ? 'Current Chapter'
      : chapter.unlocked
        ? 'Unlocked'
        : 'Locked'
    status.style.cssText = `
      margin-top: 10px;
      font-size: 12px;
      color: ${chapter.current ? '#ffcc00' : chapter.unlocked ? '#00ff00' : '#888'};
    `

    element.appendChild(title)
    element.appendChild(description)
    element.appendChild(status)

    return element
  }

  /**
   * Render logs tab content
   */
  renderLogsTab(container) {
    const title = document.createElement('h3')
    title.textContent = 'Discovery Logs'
    title.style.cssText = 'color: #ffcc00; margin-bottom: 20px;'
    container.appendChild(title)

    const description = document.createElement('p')
    description.textContent =
      "Memory fragments unlock as you progress through the city. Each log reveals pieces of the story behind the Last City's fall."
    description.style.cssText = 'color: #cccccc; margin-bottom: 20px;'
    container.appendChild(description)

    // TODO: Implement actual log display from story system
    const placeholder = document.createElement('div')
    placeholder.textContent = 'Logs will be populated based on story progress...'
    placeholder.style.cssText = 'color: #888; font-style: italic;'
    container.appendChild(placeholder)
  }

  /**
   * Render timeline tab content
   */
  renderTimelineTab(container) {
    const title = document.createElement('h3')
    title.textContent = 'Story Timeline'
    title.style.cssText = 'color: #ffcc00; margin-bottom: 20px;'
    container.appendChild(title)

    const gameState = this.getGameState()

    const stats = document.createElement('div')
    stats.className = 'timeline-stats'
    stats.innerHTML = `
      <div style="margin-bottom: 15px;">
        <strong style="color: #ffcc00;">Progress Statistics:</strong>
      </div>
      <div style="margin-bottom: 10px;">Current Level: <span style="color: #00ff00;">${gameState.level}</span></div>
      <div style="margin-bottom: 10px;">Bosses Defeated: <span style="color: #ff6666;">${gameState.bossesDefeated}</span></div>
      <div style="margin-bottom: 10px;">Powerups Collected: <span style="color: #ffcc00;">${gameState.powerupsCollected}</span></div>
      <div style="margin-bottom: 20px;">Current Chapter: <span style="color: #ffffff;">${gameState.currentChapter}</span></div>
    `

    container.appendChild(stats)

    // TODO: Implement actual timeline events
    const placeholder = document.createElement('div')
    placeholder.textContent = 'Timeline events will be populated based on story progress...'
    placeholder.style.cssText = 'color: #888; font-style: italic;'
    container.appendChild(placeholder)
  }

  /**
   * Setup modal event handlers
   */
  setupModalEventHandlers() {
    // Click outside to close
    this.modal.addEventListener('click', e => {
      if (e.target === this.modal) {
        this.close()
      }
    })
  }

  /**
   * Get current game state for journal display
   */
  getGameState() {
    return {
      level: this.stateManager.getState('game.level') || 1,
      bossesDefeated: this.stateManager.getState('game.bossesDefeated') || 0,
      powerupsCollected: this.stateManager.getState('game.powerupsCollected') || 0,
      currentChapter: this.stateManager.getState('story.currentChapter') || 'prologue'
    }
  }

  /**
   * Check if journal is currently open
   */
  get active() {
    return this.isOpen
  }

  /**
   * Handle keyboard input
   */
  handleKeydown(event) {
    if (!this.isVisible) return

    if (event.key === 'Escape') {
      this.close()
    } else if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      this.nextTab()
    } else if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault()
      this.previousTab()
    }
  }

  /**
   * Handle tab click events
   */
  handleTabClick(event) {
    const tab = event.target.closest('.journal-tab')
    if (tab && tab.dataset.tab) {
      this.switchTab(tab.dataset.tab)
    }
  }

  /**
   * Handle close button click
   */
  handleCloseClick() {
    this.close()
  }

  /**
   * Switch to next tab
   */
  nextTab() {
    const currentIndex = this.config.tabs.indexOf(this.currentTab)
    const nextIndex = (currentIndex + 1) % this.config.tabs.length
    this.switchTab(this.config.tabs[nextIndex])
  }

  /**
   * Switch to previous tab
   */
  previousTab() {
    const currentIndex = this.config.tabs.indexOf(this.currentTab)
    const prevIndex = currentIndex === 0 ? this.config.tabs.length - 1 : currentIndex - 1
    this.switchTab(this.config.tabs[prevIndex])
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.close()

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeydown)
  }
}

export default StoryJournal
