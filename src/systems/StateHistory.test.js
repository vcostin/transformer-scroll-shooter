/**
 * StateHistory Tests
 *
 * Comprehensive test suite for StateHistory module functionality including:
 * - History initialization and state tracking
 * - Undo/redo operations and edge cases
 * - History size limits and trimming
 * - Branching history behavior
 * - Event emission and callback integration
 * - Error handling and validation
 * - Performance and memory management
 *
 * @fileoverview Tests for StateHistory class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StateHistory } from '@/systems/StateHistory.js'

describe('StateHistory', () => {
  let stateHistory
  let mockCallbacks
  let testState1, testState2, testState3

  beforeEach(() => {
    mockCallbacks = {
      onInvalidateCache: vi.fn(),
      onEmitEvent: vi.fn(),
      onUpdateStats: vi.fn()
    }

    stateHistory = new StateHistory(
      {
        maxHistorySize: 100,
        enableHistory: true,
        enableDebug: false,
        enableEvents: true
      },
      mockCallbacks
    )

    testState1 = { player: { health: 100 }, game: { level: 1 } }
    testState2 = { player: { health: 80 }, game: { level: 1 } }
    testState3 = { player: { health: 60 }, game: { level: 2 } }
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with default options', () => {
      const history = new StateHistory()
      expect(history.options.maxHistorySize).toBe(100)
      expect(history.options.enableHistory).toBe(true)
      expect(history.options.enableDebug).toBe(false)
      expect(history.options.enableEvents).toBe(true)
    })

    it('should accept custom options', () => {
      const history = new StateHistory({
        maxHistorySize: 50,
        enableHistory: false,
        enableDebug: true,
        enableEvents: false
      })
      expect(history.options.maxHistorySize).toBe(50)
      expect(history.options.enableHistory).toBe(false)
      expect(history.options.enableDebug).toBe(true)
      expect(history.options.enableEvents).toBe(false)
    })

    it('should initialize empty history', () => {
      expect(stateHistory.history).toEqual([])
      expect(stateHistory.historyIndex).toBe(-1)
    })

    it('should handle missing callbacks gracefully', () => {
      const history = new StateHistory()
      expect(() => history.callbacks.onInvalidateCache()).not.toThrow()
      expect(() => history.callbacks.onEmitEvent()).not.toThrow()
      expect(() => history.callbacks.onUpdateStats()).not.toThrow()
    })
  })

  describe('History Initialization', () => {
    it('should initialize history with current state when enabled', () => {
      stateHistory.initialize(testState1)

      expect(stateHistory.history).toHaveLength(1)
      expect(stateHistory.historyIndex).toBe(0)
      expect(stateHistory.history[0]).toEqual(testState1)
      expect(stateHistory.history[0]).not.toBe(testState1) // Should be cloned
    })

    it('should not initialize history when disabled', () => {
      stateHistory.options.enableHistory = false
      stateHistory.initialize(testState1)

      expect(stateHistory.history).toHaveLength(0)
      expect(stateHistory.historyIndex).toBe(-1)
    })

    it('should call invalidate cache callback on initialization', () => {
      stateHistory.initialize(testState1)
      expect(mockCallbacks.onInvalidateCache).toHaveBeenCalled()
    })
  })

  describe('Adding States to History', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
      mockCallbacks.onInvalidateCache.mockClear()
    })

    it('should add states to history', () => {
      stateHistory.addStateToHistory(testState2)

      expect(stateHistory.history).toHaveLength(2)
      expect(stateHistory.historyIndex).toBe(1)
      expect(stateHistory.history[1]).toEqual(testState2)
    })

    it('should clone states when adding to history', () => {
      stateHistory.addStateToHistory(testState2)

      expect(stateHistory.history[1]).toEqual(testState2)
      expect(stateHistory.history[1]).not.toBe(testState2)
    })

    it('should not add states when history is disabled', () => {
      stateHistory.options.enableHistory = false
      stateHistory.addStateToHistory(testState2)

      expect(stateHistory.history).toHaveLength(1) // Only initial state
    })

    it('should call invalidate cache callback when adding states', () => {
      stateHistory.addStateToHistory(testState2)
      expect(mockCallbacks.onInvalidateCache).toHaveBeenCalled()
    })

    it('should handle branching history correctly', () => {
      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)

      // Go back to middle of history
      stateHistory.undo()
      expect(stateHistory.historyIndex).toBe(1)

      // Add new state (should clear future history)
      const newState = { player: { health: 90 }, game: { level: 1 } }
      stateHistory.addStateToHistory(newState)

      expect(stateHistory.history).toHaveLength(3)
      expect(stateHistory.historyIndex).toBe(2)
      expect(stateHistory.history[2]).toEqual(newState)
    })
  })

  describe('History Size Management', () => {
    beforeEach(() => {
      stateHistory.options.maxHistorySize = 3
      stateHistory.initialize(testState1)
    })

    it('should limit history size', () => {
      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)

      const state4 = { player: { health: 40 }, game: { level: 3 } }
      const state5 = { player: { health: 20 }, game: { level: 4 } }

      stateHistory.addStateToHistory(state4)
      stateHistory.addStateToHistory(state5)

      expect(stateHistory.history).toHaveLength(3)
      expect(stateHistory.historyIndex).toBe(2)
      expect(stateHistory.history[0]).toEqual(testState3)
      expect(stateHistory.history[2]).toEqual(state5)
    })

    it('should adjust history index when trimming', () => {
      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)

      const state4 = { player: { health: 40 }, game: { level: 3 } }
      stateHistory.addStateToHistory(state4)

      // Should have trimmed oldest state and adjusted index
      expect(stateHistory.historyIndex).toBe(2)
      expect(stateHistory.history).toHaveLength(3)
    })
  })

  describe('Undo Operations', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)
    })

    it('should undo to previous state', () => {
      const previousState = stateHistory.undo()

      expect(previousState).toEqual(testState2)
      expect(stateHistory.historyIndex).toBe(1)
      expect(mockCallbacks.onUpdateStats).toHaveBeenCalledWith('historyOperations')
      expect(mockCallbacks.onInvalidateCache).toHaveBeenCalled()
    })

    it('should emit undo event', () => {
      const previousState = stateHistory.undo()

      expect(mockCallbacks.onEmitEvent).toHaveBeenCalledWith('state:undo', {
        state: previousState,
        historyIndex: 1
      })
    })

    it('should not emit undo event when events disabled', () => {
      stateHistory.options.enableEvents = false
      stateHistory.undo()

      expect(mockCallbacks.onEmitEvent).not.toHaveBeenCalled()
    })

    it('should return null when undo is not possible', () => {
      stateHistory.undo() // Back to index 1
      stateHistory.undo() // Back to index 0

      const result = stateHistory.undo() // Should fail
      expect(result).toBeNull()
      expect(stateHistory.historyIndex).toBe(0)
    })

    it('should throw error when history is disabled', () => {
      stateHistory.options.enableHistory = false
      expect(() => stateHistory.undo()).toThrow('History is disabled')
    })

    it('should return cloned state on undo', () => {
      const previousState = stateHistory.undo()
      expect(previousState).toEqual(testState2)
      expect(previousState).not.toBe(testState2)
    })
  })

  describe('Redo Operations', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)
      stateHistory.undo() // Go back to test redo
    })

    it('should redo to next state', () => {
      const nextState = stateHistory.redo()

      expect(nextState).toEqual(testState3)
      expect(stateHistory.historyIndex).toBe(2)
      expect(mockCallbacks.onUpdateStats).toHaveBeenCalledWith('historyOperations')
      expect(mockCallbacks.onInvalidateCache).toHaveBeenCalled()
    })

    it('should emit redo event', () => {
      const nextState = stateHistory.redo()

      expect(mockCallbacks.onEmitEvent).toHaveBeenCalledWith('state:redo', {
        state: nextState,
        historyIndex: 2
      })
    })

    it('should not emit redo event when events disabled', () => {
      stateHistory.options.enableEvents = false
      mockCallbacks.onEmitEvent.mockClear() // Clear previous calls
      stateHistory.redo()

      expect(mockCallbacks.onEmitEvent).not.toHaveBeenCalled()
    })

    it('should return null when redo is not possible', () => {
      stateHistory.redo() // Back to latest state

      const result = stateHistory.redo() // Should fail
      expect(result).toBeNull()
      expect(stateHistory.historyIndex).toBe(2)
    })

    it('should throw error when history is disabled', () => {
      stateHistory.options.enableHistory = false
      expect(() => stateHistory.redo()).toThrow('History is disabled')
    })

    it('should return cloned state on redo', () => {
      const nextState = stateHistory.redo()
      expect(nextState).toEqual(testState3)
      expect(nextState).not.toBe(testState3)
    })
  })

  describe('History Clearing', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)
    })

    it('should clear all history', () => {
      stateHistory.clearHistory()

      expect(stateHistory.history).toHaveLength(0)
      expect(stateHistory.historyIndex).toBe(-1)
      expect(mockCallbacks.onInvalidateCache).toHaveBeenCalled()
    })

    it('should reset undo/redo capabilities after clearing', () => {
      stateHistory.clearHistory()

      expect(stateHistory.canUndo()).toBe(false)
      expect(stateHistory.canRedo()).toBe(false)
    })
  })

  describe('History Capability Checks', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
    })

    it('should correctly check undo capability', () => {
      expect(stateHistory.canUndo()).toBe(false)

      stateHistory.addStateToHistory(testState2)
      expect(stateHistory.canUndo()).toBe(true)
    })

    it('should correctly check redo capability', () => {
      stateHistory.addStateToHistory(testState2)
      expect(stateHistory.canRedo()).toBe(false)

      stateHistory.undo()
      expect(stateHistory.canRedo()).toBe(true)
    })

    it('should return false for capabilities when history disabled', () => {
      stateHistory.options.enableHistory = false
      stateHistory.addStateToHistory(testState2)

      expect(stateHistory.canUndo()).toBe(false)
      expect(stateHistory.canRedo()).toBe(false)
    })
  })

  describe('History Statistics', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
    })

    it('should provide comprehensive history statistics', () => {
      const stats = stateHistory.getHistoryStats()

      expect(stats).toEqual({
        historySize: 2,
        historyIndex: 1,
        canUndo: true,
        canRedo: false,
        maxHistorySize: 100,
        enableHistory: true
      })
    })

    it('should update statistics after operations', () => {
      stateHistory.undo()
      const stats = stateHistory.getHistoryStats()

      expect(stats.historyIndex).toBe(0)
      expect(stats.canUndo).toBe(false)
      expect(stats.canRedo).toBe(true)
    })
  })

  describe('Memory Usage Tracking', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
    })

    it('should calculate memory usage', () => {
      const usage = stateHistory.getHistoryMemoryUsage()
      expect(typeof usage).toBe('number')
      expect(usage).toBeGreaterThan(0)
    })

    it('should increase memory usage with more states', () => {
      const initialUsage = stateHistory.getHistoryMemoryUsage()

      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)

      const finalUsage = stateHistory.getHistoryMemoryUsage()
      expect(finalUsage).toBeGreaterThan(initialUsage)
    })
  })

  describe('Options Management', () => {
    beforeEach(() => {
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
      stateHistory.addStateToHistory(testState3)
    })

    it('should update options', () => {
      stateHistory.updateOptions({
        enableDebug: true,
        enableEvents: false
      })

      expect(stateHistory.options.enableDebug).toBe(true)
      expect(stateHistory.options.enableEvents).toBe(false)
      expect(stateHistory.options.maxHistorySize).toBe(100) // Unchanged
    })

    it('should trim history when maxHistorySize is reduced', () => {
      stateHistory.updateOptions({ maxHistorySize: 2 })

      expect(stateHistory.history).toHaveLength(2)
      expect(stateHistory.historyIndex).toBe(1)
      expect(mockCallbacks.onInvalidateCache).toHaveBeenCalled()
    })

    it('should not trim history when maxHistorySize is increased', () => {
      stateHistory.updateOptions({ maxHistorySize: 200 })

      expect(stateHistory.history).toHaveLength(3)
      expect(stateHistory.historyIndex).toBe(2)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty state gracefully', () => {
      const emptyState = {}
      stateHistory.initialize(emptyState)

      expect(stateHistory.history).toHaveLength(1)
      expect(stateHistory.history[0]).toEqual(emptyState)
    })

    it('should handle null state gracefully', () => {
      stateHistory.initialize(null)

      expect(stateHistory.history).toHaveLength(1)
      expect(stateHistory.history[0]).toBeNull()
    })

    it('should handle complex nested objects', () => {
      const complexState = {
        deeply: {
          nested: {
            object: {
              with: ['arrays', { and: 'objects' }]
            }
          }
        }
      }

      stateHistory.initialize(complexState)
      stateHistory.addStateToHistory(testState2) // Add another state so we can undo
      const retrievedState = stateHistory.undo()

      expect(retrievedState).toEqual(complexState)
      expect(retrievedState).not.toBe(complexState)
    })

    it('should handle maxHistorySize of 1', () => {
      stateHistory.options.maxHistorySize = 1
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)

      expect(stateHistory.history).toHaveLength(1)
      expect(stateHistory.history[0]).toEqual(testState2)
    })

    it('should handle maxHistorySize of 0', () => {
      stateHistory.options.maxHistorySize = 0
      stateHistory.initialize(testState1)

      expect(stateHistory.history).toHaveLength(0)
      expect(stateHistory.historyIndex).toBe(-1)
    })
  })

  describe('Debug Logging', () => {
    beforeEach(() => {
      stateHistory.options.enableDebug = true
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      console.log.mockRestore()
    })

    it('should log undo operations', () => {
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
      stateHistory.undo()

      expect(console.log).toHaveBeenCalledWith('↶ StateHistory: Undo to history index 0')
    })

    it('should log redo operations', () => {
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
      stateHistory.undo()
      stateHistory.redo()

      expect(console.log).toHaveBeenCalledWith('↷ StateHistory: Redo to history index 1')
    })

    it('should log history clearing', () => {
      stateHistory.initialize(testState1)
      stateHistory.clearHistory()

      expect(console.log).toHaveBeenCalledWith('🗑️ StateHistory: History cleared')
    })

    it('should not log when debug is disabled', () => {
      stateHistory.options.enableDebug = false
      stateHistory.initialize(testState1)
      stateHistory.addStateToHistory(testState2)
      stateHistory.undo()

      expect(console.log).not.toHaveBeenCalled()
    })
  })
})
