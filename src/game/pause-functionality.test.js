/**
 * Comprehensive Pause Functionality Tests
 * Tests both P key pause and ESC options menu pause behavior
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createGame } from './game.js'
import { OptionsMenu } from '@/ui/options.js'

describe('Pause Functionality Tests', () => {
  let game
  let mockCanvas
  let mockContext

  beforeEach(() => {
    // Mock canvas and context
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      closePath: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      font: '16px Arial',
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top'
    }

    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      width: 800,
      height: 600,
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    // Mock DOM elements
    global.document = {
      getElementById: vi.fn(id => {
        if (id === 'gameCanvas') return mockCanvas
        if (id === 'optionsContent') return { innerHTML: '', appendChild: vi.fn() }
        if (id === 'closeOptions') return { addEventListener: vi.fn() }
        return {
          style: {},
          addEventListener: vi.fn(),
          appendChild: vi.fn(),
          innerHTML: ''
        }
      }),
      createElement: vi.fn(() => ({
        style: {},
        addEventListener: vi.fn(),
        appendChild: vi.fn(),
        type: '',
        min: '',
        max: '',
        value: '',
        checked: false,
        textContent: '',
        innerHTML: ''
      })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }

    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      requestAnimationFrame: vi.fn(cb => {
        setTimeout(cb, 16)
        return 1 // return a number ID
      }),
      cancelAnimationFrame: vi.fn()
    }

    // Create game instance
    game = createGame()
  })

  afterEach(() => {
    if (game && typeof game.cleanup === 'function') {
      game.cleanup()
    }
    vi.clearAllMocks()
  })

  describe('P Key Pause Functionality', () => {
    it('should pause the game when P key is pressed and game is running', () => {
      // Arrange
      expect(game.paused).toBe(false)
      expect(game.userPaused).toBe(false)

      // Act - simulate P key press
      const keyEvent = { code: 'KeyP', preventDefault: vi.fn() }
      game.handleKeyDown(keyEvent)

      // Assert
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)
    })

    it('should resume the game when P key is pressed and game is paused', () => {
      // Arrange - pause the game first
      game.pauseGame()
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)

      // Act - simulate P key press again
      const keyEvent = { code: 'KeyP', preventDefault: vi.fn() }
      game.handleKeyDown(keyEvent)

      // Assert
      expect(game.paused).toBe(false)
      expect(game.userPaused).toBe(false)
    })

    it('should emit GAME_PAUSE event when pauseGame() is called', () => {
      // Arrange
      const pauseEventSpy = vi.fn()
      game.eventDispatcher.on('game:pause', pauseEventSpy)

      // Act
      game.pauseGame()

      // Assert
      expect(pauseEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      )
    })

    it('should emit GAME_RESUME event when resumeGame() is called', () => {
      // Arrange
      game.pauseGame() // pause first
      const resumeEventSpy = vi.fn()
      game.eventDispatcher.on('game:resume', resumeEventSpy)

      // Act
      game.resumeGame()

      // Assert
      expect(resumeEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      )
    })
  })

  describe('Options Menu Pause Functionality', () => {
    let optionsMenu

    beforeEach(() => {
      // Create options menu instance
      optionsMenu = new OptionsMenu(game, game.eventDispatcher, game.stateManager)
    })

    it('should pause the game when options menu is opened', () => {
      // Arrange
      expect(game.paused).toBe(false)
      expect(game.userPaused).toBe(false)

      // Act
      optionsMenu.open()

      // Assert
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)
      expect(optionsMenu.isOpen).toBe(true)
    })

    it('should resume the game when options menu is closed', () => {
      // Arrange - open menu first
      optionsMenu.open()
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)

      // Act
      optionsMenu.close()

      // Assert
      expect(game.paused).toBe(false)
      expect(game.userPaused).toBe(false)
      expect(optionsMenu.isOpen).toBe(false)
    })

    it('should pause game when ESC key is pressed and menu is closed', () => {
      // Arrange
      expect(optionsMenu.isOpen).toBe(false)
      expect(game.paused).toBe(false)

      // Act - simulate ESC key press
      const keyEvent = { code: 'Escape', preventDefault: vi.fn() }
      game.handleKeyDown(keyEvent)

      // Assert
      expect(optionsMenu.isOpen).toBe(true)
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)
    })

    it('should close menu and resume game when ESC key is pressed and menu is open', () => {
      // Arrange - open menu first
      optionsMenu.open()
      expect(optionsMenu.isOpen).toBe(true)
      expect(game.paused).toBe(true)

      // Act - simulate ESC key press again
      const keyEvent = { code: 'Escape', preventDefault: vi.fn() }
      game.handleKeyDown(keyEvent)

      // Assert
      expect(optionsMenu.isOpen).toBe(false)
      expect(game.paused).toBe(false)
      expect(game.userPaused).toBe(false)
    })

    it('should NOT resume game automatically during updateDisplay', () => {
      // Arrange - pause game through options menu
      optionsMenu.open()
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)

      // Act - call updateDisplay (this should NOT resume the game)
      optionsMenu.updateDisplay()

      // Assert - game should still be paused
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)
      expect(optionsMenu.isOpen).toBe(true)
    })

    it('should emit UI events when menu opens and closes', () => {
      // Arrange
      const menuOpenedSpy = vi.fn()
      const menuClosedSpy = vi.fn()
      game.eventDispatcher.on('ui:menu_opened', menuOpenedSpy)
      game.eventDispatcher.on('ui:menu_closed', menuClosedSpy)

      // Act - open menu
      optionsMenu.open()

      // Assert
      expect(menuOpenedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          menuType: 'options',
          source: 'options'
        })
      )

      // Act - close menu
      optionsMenu.close()

      // Assert
      expect(menuClosedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          menuType: 'options',
          source: 'options'
        })
      )
    })
  })

  describe('System vs User Pause Distinction', () => {
    it('should set userPaused=false during chapter transitions (system pause)', () => {
      // Arrange
      const mockContent = {
        title: 'Chapter 1',
        description: 'Test chapter',
        cutsceneKey: 'test_cutscene'
      }

      // Act - trigger chapter transition (system pause)
      game.showChapterTransition(mockContent)

      // Assert - game is paused but not user-paused
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(false)
    })

    it('should only show pause overlay when userPaused=true', () => {
      // Test case 1: User pause should show overlay
      game.pauseGame()
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)

      // Mock render call and check if pause indicator would be rendered
      const shouldShowPauseIndicator = game.userPaused && !game.gameOver
      expect(shouldShowPauseIndicator).toBe(true)

      // Test case 2: System pause should NOT show overlay
      game.resumeGame()
      // Simulate system pause (like chapter transition)
      game.paused = true // system sets this directly
      game.userPaused = false // but doesn't set userPaused

      const shouldNotShowPauseIndicator = game.userPaused && !game.gameOver
      expect(shouldNotShowPauseIndicator).toBe(false)
    })

    it('should properly handle mixed pause states', () => {
      // Scenario: Chapter transition pauses game, then user presses P

      // Step 1: System pause (chapter transition)
      game.paused = true
      game.userPaused = false
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(false)

      // Step 2: User presses P while system-paused
      const keyEvent = { code: 'KeyP', preventDefault: vi.fn() }
      game.handleKeyDown(keyEvent)

      // Should now be user-paused (P toggles, so paused->userPaused, !paused->paused)
      expect(game.paused).toBe(false) // P key toggles the pause state
      expect(game.userPaused).toBe(false) // resumeGame() was called
    })
  })

  describe('Game Loop Pause Behavior', () => {
    it('should skip update() when game is paused', () => {
      // Arrange - mock the update method to track calls
      const originalUpdate = game.update
      game.update = vi.fn(originalUpdate)

      // Pause the game
      game.pauseGame()

      // Act - simulate game loop iteration
      game.gameLoop(16) // simulate 16ms frame time

      // Assert - update should not be called when paused
      expect(game.update).not.toHaveBeenCalled()
    })

    it('should call update() when game is not paused', () => {
      // Arrange - mock the update method to track calls
      const originalUpdate = game.update
      game.update = vi.fn(originalUpdate)

      // Ensure game is not paused
      game.resumeGame()

      // Act - simulate game loop iteration
      game.gameLoop(16) // simulate 16ms frame time

      // Assert - update should be called when not paused
      expect(game.update).toHaveBeenCalledWith(expect.any(Number))
    })

    it('should always call render() regardless of pause state', () => {
      // Arrange - mock the render method to track calls
      const originalRender = game.render
      game.render = vi.fn(originalRender)

      // Test paused state
      game.pauseGame()
      game.gameLoop(16)
      expect(game.render).toHaveBeenCalled()

      // Reset and test unpaused state
      game.render.mockReset()
      game.resumeGame()
      game.gameLoop(16)
      expect(game.render).toHaveBeenCalled()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle pauseGame() when already paused', () => {
      // Arrange
      game.pauseGame()
      expect(game.paused).toBe(true)

      // Act - pause again
      game.pauseGame()

      // Assert - should remain paused
      expect(game.paused).toBe(true)
      expect(game.userPaused).toBe(true)
    })

    it('should handle resumeGame() when already resumed', () => {
      // Arrange
      game.resumeGame()
      expect(game.paused).toBe(false)

      // Act - resume again
      game.resumeGame()

      // Assert - should remain resumed
      expect(game.paused).toBe(false)
      expect(game.userPaused).toBe(false)
    })

    it('should handle options menu operations when game object is invalid', () => {
      // Arrange - create options menu with mock game that doesn't have pause methods
      const mockGameWithoutMethods = {
        paused: false,
        eventDispatcher: game.eventDispatcher,
        stateManager: game.stateManager,
        audio: { masterVolume: 1 }
      }

      const optionsMenu = new OptionsMenu(
        mockGameWithoutMethods,
        game.eventDispatcher,
        game.stateManager
      )

      // Act & Assert - should not throw errors
      expect(() => optionsMenu.open()).not.toThrow()
      expect(() => optionsMenu.close()).not.toThrow()
    })
  })
})
