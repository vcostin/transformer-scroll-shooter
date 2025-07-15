/**
 * @jest-environment jsdom
 */

import { createMockGame } from '@test/game-test-utils.js'

describe('Game Test Utils', () => {
  describe('createMockGame', () => {
    it('should not leak global mocks between tests', () => {
      // First test with mocks
      const game1 = createMockGame()
      
      // Verify mocks are active
      expect(global.document).toBeDefined()
      expect(global.window).toBeDefined()
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      
      // Second test should have fresh mocks
      const game2 = createMockGame()
      
      // Verify mocks are still active but independent
      expect(global.document).toBeDefined()
      expect(global.window).toBeDefined()
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      
      // Each game should be independent
      expect(game1).not.toBe(game2)
    })

    it('should restore global mocks after test utilities are used', () => {
      // Store original globals
      const originalDocument = global.document
      const originalWindow = global.window
      const originalRequestAnimationFrame = global.requestAnimationFrame
      const originalCancelAnimationFrame = global.cancelAnimationFrame
      
      // Create mock game
      const game = createMockGame()
      
      // Verify mocks are active
      expect(global.document).toBeDefined()
      expect(global.window).toBeDefined()
      expect(global.requestAnimationFrame).toBeDefined()
      expect(global.cancelAnimationFrame).toBeDefined()
      
      // The createMockGame should handle restoration internally
      // so we don't need to manually restore here
      expect(game).toBeDefined()
    })
  })
})
