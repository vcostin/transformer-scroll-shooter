/**
 * Story System Tests - POJO + Functional Architecture
 *
 * Tests demonstrating pure function testing patterns
 * and immutable state validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createStoryState,
  STORY_CHAPTERS,
  STORY_LOGS,
  BOSS_NARRATIVES,
  isUnlocked,
  getAvailableLogs,
  getCurrentChapter,
  getBossNarrative,
  updateStoryProgress,
  markLogAsViewed,
  getStoryContent
} from '@/systems/story.js'

describe('Story System - POJO + Functional Architecture', () => {
  let mockGameState
  let mockStoryState

  beforeEach(() => {
    mockGameState = {
      level: 1,
      enemiesKilled: 0,
      bossesDefeated: 0,
      powerupsCollected: 0
    }

    mockStoryState = createStoryState()
  })

  describe('State Creation', () => {
    it('should create initial story state as plain object', () => {
      const state = createStoryState()

      expect(state).toEqual({
        currentChapter: 'prologue',
        unlockedLogs: expect.any(Set),
        viewedCutscenes: expect.any(Set),
        playerChoices: {},
        narrativeFlags: {},
        lastMessageTime: 0
      })

      // Verify it's a plain object (no prototype methods)
      expect(Object.getPrototypeOf(state)).toBe(Object.prototype)
    })

    it('should have empty collections initially', () => {
      const state = createStoryState()

      expect(state.unlockedLogs.size).toBe(0)
      expect(state.viewedCutscenes.size).toBe(0)
      expect(Object.keys(state.playerChoices)).toHaveLength(0)
    })
  })

  describe('Pure Function: isUnlocked', () => {
    it('should return true for elements without unlock conditions', () => {
      const element = { id: 'test' }
      const result = isUnlocked(element, mockGameState)
      expect(result).toBe(true)
    })

    it('should evaluate unlock conditions correctly', () => {
      const element = {
        id: 'test',
        unlockCondition: gameState => gameState.level >= 5
      }

      expect(isUnlocked(element, { level: 3 })).toBe(false)
      expect(isUnlocked(element, { level: 5 })).toBe(true)
      expect(isUnlocked(element, { level: 7 })).toBe(true)
    })

    it('should be pure function (no side effects)', () => {
      const element = {
        unlockCondition: gameState => gameState.level >= 5
      }
      const originalGameState = { level: 3 }
      const gameStateCopy = { ...originalGameState }

      isUnlocked(element, gameStateCopy)

      expect(gameStateCopy).toEqual(originalGameState)
    })
  })

  describe('Pure Function: getAvailableLogs', () => {
    it('should return unlocked logs not yet viewed', () => {
      const gameState = {
        level: 5,
        enemiesKilled: 10,
        powerupsCollected: 5
      }

      const viewedLogs = new Set(['city_memory'])
      const availableLogs = getAvailableLogs(gameState, viewedLogs)

      expect(availableLogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'terraformer_signal' }),
          expect.objectContaining({ id: 'morphing_core_awakening' })
        ])
      )

      expect(availableLogs.find(log => log.id === 'city_memory')).toBeUndefined()
    })

    it('should return empty array when no logs are unlocked', () => {
      const gameState = { level: 1, enemiesKilled: 0, powerupsCollected: 0 }
      const availableLogs = getAvailableLogs(gameState)

      expect(availableLogs).toHaveLength(0)
    })

    it('should not mutate input parameters', () => {
      const gameState = { level: 5, enemiesKilled: 10 }
      const viewedLogs = new Set(['test'])
      const originalSize = viewedLogs.size

      getAvailableLogs(gameState, viewedLogs)

      expect(viewedLogs.size).toBe(originalSize)
      expect(gameState.level).toBe(5)
    })
  })

  describe('Pure Function: getCurrentChapter', () => {
    it('should return latest unlocked chapter', () => {
      const gameState = { level: 7 }
      const chapter = getCurrentChapter(gameState)

      expect(chapter).toEqual(
        expect.objectContaining({
          id: 'relay07',
          title: 'Relay 07: Broken Chorus'
        })
      )
    })

    it('should return prologue for new game', () => {
      const gameState = { level: 0 } // Level 0 to ensure prologue
      const chapter = getCurrentChapter(gameState)

      expect(chapter).toEqual(
        expect.objectContaining({
          id: 'prologue',
          title: 'Signal of the Last City'
        })
      )
    })

    it('should handle edge cases gracefully', () => {
      const gameState = { level: 0 }
      const chapter = getCurrentChapter(gameState)

      expect(chapter).toEqual(expect.objectContaining({ id: 'prologue' }))
    })
  })

  describe('Pure Function: getBossNarrative', () => {
    it('should return correct narrative for valid boss and event', () => {
      const narrative = getBossNarrative('relay_warden', 'intro')
      expect(narrative).toBe("I'M NO BOSS! I AM THE RELAY WARDEN SYSTEMS ONLINE!")
    })

    it('should return null for invalid boss type', () => {
      const narrative = getBossNarrative('nonexistent_boss', 'intro')
      expect(narrative).toBeNull()
    })

    it('should return null for invalid event', () => {
      const narrative = getBossNarrative('relay_warden', 'nonexistent_event')
      expect(narrative).toBeNull()
    })

    it('should handle all relay warden events', () => {
      expect(getBossNarrative('relay_warden', 'preIntro')).toBeTruthy()
      expect(getBossNarrative('relay_warden', 'intro')).toBeTruthy()
      expect(getBossNarrative('relay_warden', 'phaseTransition')).toBeTruthy()
      expect(getBossNarrative('relay_warden', 'defeat')).toBeTruthy()
      expect(getBossNarrative('relay_warden', 'postDefeat')).toBeTruthy()
    })
  })

  describe('Pure Function: updateStoryProgress', () => {
    it('should return new state without mutating original', () => {
      const originalState = createStoryState()
      const gameState = { level: 5, enemiesKilled: 10 }

      const newState = updateStoryProgress(originalState, gameState)

      expect(newState).not.toBe(originalState)
      expect(originalState.currentChapter).toBe('prologue')
      expect(newState.currentChapter).toBe('relay07')
    })

    it('should update chapter based on game progress', () => {
      const storyState = createStoryState()
      const gameState = { level: 8 }

      const newState = updateStoryProgress(storyState, gameState)

      expect(newState.currentChapter).toBe('relay07')
    })

    it('should add newly unlocked logs', () => {
      const storyState = createStoryState()
      const gameState = { level: 5, enemiesKilled: 10, powerupsCollected: 5 }

      const newState = updateStoryProgress(storyState, gameState)

      expect(newState.unlockedLogs.size).toBeGreaterThan(0)
      expect(newState.unlockedLogs.has('terraformer_signal')).toBe(true)
    })

    it('should update lastMessageTime', () => {
      const storyState = createStoryState()
      const before = Date.now()

      const newState = updateStoryProgress(storyState, mockGameState)

      expect(newState.lastMessageTime).toBeGreaterThanOrEqual(before)
    })
  })

  describe('Pure Function: markLogAsViewed', () => {
    it('should return new state with log marked as viewed', () => {
      const storyState = createStoryState()
      const logId = 'test_log'

      const newState = markLogAsViewed(storyState, logId)

      expect(newState).not.toBe(storyState)
      expect(newState.viewedCutscenes.has(logId)).toBe(true)
      expect(storyState.viewedCutscenes.has(logId)).toBe(false)
    })

    it('should preserve other state properties', () => {
      const storyState = {
        ...createStoryState(),
        currentChapter: 'test_chapter',
        narrativeFlags: { test: true }
      }

      const newState = markLogAsViewed(storyState, 'test_log')

      expect(newState.currentChapter).toBe('test_chapter')
      expect(newState.narrativeFlags.test).toBe(true)
    })
  })

  describe('Pure Function: getStoryContent', () => {
    it('should return title card content for level start', () => {
      const gameState = { level: 5 }
      const storyState = createStoryState()

      const content = getStoryContent(gameState, storyState, 'levelStart')

      expect(content).toEqual({
        type: 'title_card',
        title: 'Relay 07: Broken Chorus',
        description: expect.any(String),
        duration: 3000,
        cutsceneKey: 'chapter_relay07'
      })
    })

    it('should return log notification when new logs available', () => {
      const gameState = { level: 3, enemiesKilled: 10 }
      const storyState = createStoryState()

      const content = getStoryContent(gameState, storyState, 'newLogAvailable')

      expect(content).toEqual({
        type: 'log_notification',
        message: expect.stringContaining('New memory fragment unlocked'),
        duration: 2000
      })
    })

    it('should return null for unknown context', () => {
      const content = getStoryContent(mockGameState, mockStoryState, 'unknown_context')
      expect(content).toBeNull()
    })

    it('should return null when no content available', () => {
      const gameState = { level: 1, enemiesKilled: 0 }
      const storyState = createStoryState()

      const content = getStoryContent(gameState, storyState, 'newLogAvailable')
      expect(content).toBeNull()
    })
  })

  describe('Immutability Validation', () => {
    it('should not mutate STORY_CHAPTERS', () => {
      const originalKeys = Object.keys(STORY_CHAPTERS)
      getCurrentChapter({ level: 10 })
      expect(Object.keys(STORY_CHAPTERS)).toEqual(originalKeys)
    })

    it('should not mutate STORY_LOGS', () => {
      const originalKeys = Object.keys(STORY_LOGS)
      getAvailableLogs({ level: 10, enemiesKilled: 10 })
      expect(Object.keys(STORY_LOGS)).toEqual(originalKeys)
    })

    it('should not mutate BOSS_NARRATIVES', () => {
      const originalNarrative = BOSS_NARRATIVES.relay_warden.intro
      getBossNarrative('relay_warden', 'intro')
      expect(BOSS_NARRATIVES.relay_warden.intro).toBe(originalNarrative)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete story progression workflow', () => {
      let storyState = createStoryState()
      const gameState = {
        level: 5,
        enemiesKilled: 10,
        powerupsCollected: 5, // Increased to ensure logs unlock
        bossesDefeated: 1
      }

      // Update story progress
      storyState = updateStoryProgress(storyState, gameState)

      // Check current chapter
      const chapter = getCurrentChapter(gameState)
      expect(chapter.id).toBe('relay07')

      // Get available logs - should have some unlocked now
      const logs = getAvailableLogs(gameState, new Set()) // Empty viewed set
      expect(logs.length).toBeGreaterThan(0)

      // Mark a log as viewed
      if (logs.length > 0) {
        storyState = markLogAsViewed(storyState, logs[0].id)
        expect(storyState.viewedCutscenes.has(logs[0].id)).toBe(true)
      }

      // Get story content
      const content = getStoryContent(gameState, storyState, 'levelStart')
      expect(content.type).toBe('title_card')
    })

    it('should maintain referential transparency', () => {
      const gameState1 = { level: 5 }
      const gameState2 = { level: 5 }

      const result1 = getCurrentChapter(gameState1)
      const result2 = getCurrentChapter(gameState2)

      expect(result1).toEqual(result2)
    })
  })

  describe('Architecture Validation', () => {
    it('should use zero "this" keywords', () => {
      // This test ensures we're following POJO + functional patterns
      const sourceCode = `
        ${isUnlocked.toString()}
        ${getAvailableLogs.toString()}
        ${getCurrentChapter.toString()}
        ${getBossNarrative.toString()}
        ${updateStoryProgress.toString()}
        ${markLogAsViewed.toString()}
        ${getStoryContent.toString()}
      `

      expect(sourceCode).not.toMatch(/\bthis\b/)
    })

    it('should return plain objects for all state', () => {
      const state = createStoryState()
      expect(Object.getPrototypeOf(state)).toBe(Object.prototype)

      const updatedState = updateStoryProgress(state, mockGameState)
      expect(Object.getPrototypeOf(updatedState)).toBe(Object.prototype)
    })

    it('should be easily testable without mocking', () => {
      // All functions can be tested with simple inputs/outputs
      const result = isUnlocked({ unlockCondition: () => true }, {})
      expect(result).toBe(true)

      const narrative = getBossNarrative('relay_warden', 'intro')
      expect(typeof narrative).toBe('string')
    })
  })
})
