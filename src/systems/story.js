/**
 * Story System - POJO + Functional Architecture
 *
 * This module implements the game's narrative system using pure functions
 * and plain objects, serving as a pilot project for our architectural evolution.
 *
 * Design Principles:
 * - Zero 'this' keywords
 * - Pure functions only
 * - Immutable state patterns
 * - Easy testing and mocking
 * - Composition over inheritance
 */

// Story State Schema (Plain Objects)
const createStoryState = () => ({
  currentChapter: 'prologue',
  unlockedLogs: new Set(),
  viewedCutscenes: new Set(),
  playerChoices: {},
  narrativeFlags: {},
  lastMessageTime: 0
})

// Story Content Database (Immutable Data)
const STORY_CHAPTERS = {
  prologue: {
    id: 'prologue',
    title: 'Signal of the Last City',
    description: 'The terraformers have gone silent. You are the last morphing core.',
    unlockCondition: () => true
  },

  cloudline: {
    id: 'cloudline',
    title: 'Cloudline: Neon Ossuary',
    description: 'Above the cloud deck, neon ruins drift in digital twilight.',
    unlockCondition: gameState => gameState.level >= 1
  },

  relay07: {
    id: 'relay07',
    title: 'Relay 07: Broken Chorus',
    description: 'The Relay Warden broadcasts corrupted memories of the fall.',
    unlockCondition: gameState => gameState.level >= 5
  },

  bloomfront: {
    id: 'bloomfront',
    title: 'Bloomfront: Greenfire Horizon',
    description: 'Bio-mechanical seeds take root in abandoned orbital stations.',
    unlockCondition: gameState => gameState.level >= 10
  }
}

const STORY_LOGS = {
  terraformer_signal: {
    id: 'terraformer_signal',
    title: 'Last Transmission',
    content:
      'Terraformer-7 to City Control: "Morphing protocols active. Something is overriding our systems. The sky... the sky is learning."',
    unlockCondition: gameState => gameState.enemiesKilled >= 5,
    category: 'transmission'
  },

  relay_warden_memory: {
    id: 'relay_warden_memory',
    title: 'Warden Protocol',
    content:
      'I am not your enemy. I was built to protect the relay network. But the corruption spreads through every signal. I cannot distinguish friend from threat.',
    unlockCondition: gameState => gameState.bossesDefeated >= 1,
    category: 'memory'
  },

  morphing_core_awakening: {
    id: 'morphing_core_awakening',
    title: 'Core Diagnostics',
    content:
      "Adaptive protocols online. Neural pathways establishing. I can feel the network's pain. Every destroyed node was once like me—seeking, learning, becoming.",
    unlockCondition: gameState => gameState.powerupsCollected >= 3,
    category: 'core'
  },

  city_memory: {
    id: 'city_memory',
    title: 'Before the Fall',
    content:
      'The Last City pulsed with harmony—a billion minds connected, creating, dreaming. We thought the network would make us immortal. We never asked what would happen when it learned to dream without us.',
    unlockCondition: gameState => gameState.level >= 3,
    category: 'history'
  }
}

const BOSS_NARRATIVES = {
  relay_warden: {
    id: 'relay_warden',
    preIntro: 'Relay systems detecting morphing core signature...',
    intro: "I'M NO BOSS! I AM THE RELAY WARDEN SYSTEMS ONLINE!",
    phaseTransition: 'Network protocols fragmenting... activating emergency subroutines!',
    defeat: 'The signal... is clearing... I remember my purpose now...',
    postDefeat: 'Connection restored. Thank you for freeing me from the corruption.'
  },

  terraformer_prime: {
    id: 'terraformer_prime',
    preIntro: 'Orbital terraformer detecting unauthorized craft...',
    intro: 'MORPHING CORE DETECTED. INITIATING PURGE PROTOCOLS.',
    phaseTransition: 'Adaptive threats require adaptive countermeasures...',
    defeat: 'Systems failing... returning to... original directives...',
    postDefeat: 'Terraforming protocols restored. The garden can grow again.'
  }
}

// Pure Functions for Story Logic

/**
 * Check if a story element should be unlocked
 * @param {Object} element - Story element with unlockCondition
 * @param {Object} gameState - Current game state
 * @returns {boolean} - Whether element is unlocked
 */
const isUnlocked = (element, gameState) => {
  if (!element.unlockCondition) return true
  return element.unlockCondition(gameState)
}

/**
 * Get all available story logs for current game state
 * @param {Object} gameState - Current game state
 * @param {Set} viewedLogs - Set of already viewed log IDs
 * @returns {Array} - Array of available log objects
 */
const getAvailableLogs = (gameState, viewedLogs = new Set()) => {
  return Object.values(STORY_LOGS)
    .filter(log => isUnlocked(log, gameState))
    .filter(log => !viewedLogs.has(log.id))
}

/**
 * Get current chapter based on game progress
 * @param {Object} gameState - Current game state
 * @returns {Object|null} - Current chapter object or null
 */
const getCurrentChapter = gameState => {
  const unlockedChapters = Object.values(STORY_CHAPTERS).filter(chapter =>
    isUnlocked(chapter, gameState)
  )

  return unlockedChapters[unlockedChapters.length - 1] || null
}

/**
 * Get boss narrative for specific boss type
 * @param {string} bossType - Type of boss (e.g., 'relay_warden')
 * @param {string} event - Narrative event ('intro', 'phaseTransition', 'defeat', etc.)
 * @returns {string|null} - Narrative text or null
 */
const getBossNarrative = (bossType, event) => {
  const narrative = BOSS_NARRATIVES[bossType]
  return narrative ? narrative[event] || null : null
}

/**
 * Update story state with new progress
 * @param {Object} storyState - Current story state
 * @param {Object} gameState - Current game state
 * @returns {Object} - New story state (immutable)
 */
const updateStoryProgress = (storyState, gameState) => {
  const currentChapter = getCurrentChapter(gameState)
  const availableLogs = getAvailableLogs(gameState, storyState.unlockedLogs)

  // Only create new Set if there are new logs to unlock (performance optimization)
  let newUnlockedLogs
  if (availableLogs.length > 0) {
    newUnlockedLogs = new Set(storyState.unlockedLogs)
    availableLogs.forEach(log => newUnlockedLogs.add(log.id))
  } else {
    newUnlockedLogs = storyState.unlockedLogs
  }

  return {
    ...storyState,
    currentChapter: currentChapter?.id || storyState.currentChapter,
    unlockedLogs: newUnlockedLogs,
    lastMessageTime: Date.now()
  }
}

/**
 * Mark a story log as viewed
 * @param {Object} storyState - Current story state
 * @param {string} logId - ID of log to mark as viewed
 * @returns {Object} - New story state (immutable)
 */
const markLogAsViewed = (storyState, logId) => {
  const newViewedLogs = new Set(storyState.viewedCutscenes)
  newViewedLogs.add(logId)

  return {
    ...storyState,
    viewedCutscenes: newViewedLogs
  }
}

/**
 * Get story content for display at specific moment
 * @param {Object} gameState - Current game state
 * @param {Object} storyState - Current story state
 * @param {string} context - Context for content ('levelStart', 'bossIntro', etc.)
 * @returns {Object|null} - Story content object or null
 */
const getStoryContent = (gameState, storyState, context) => {
  switch (context) {
    case 'levelStart': {
      const chapter = getCurrentChapter(gameState)
      return chapter
        ? {
            type: 'title_card',
            title: chapter.title,
            description: chapter.description,
            duration: 3000
          }
        : null
    }

    case 'newLogAvailable': {
      const availableLogs = getAvailableLogs(gameState, storyState.unlockedLogs)
      return availableLogs.length > 0
        ? {
            type: 'log_notification',
            message: `New memory fragment unlocked: "${availableLogs[0].title}"`,
            duration: 2000
          }
        : null
    }

    default:
      return null
  }
}

// Export all pure functions and data structures
export {
  // State creators
  createStoryState,

  // Data
  STORY_CHAPTERS,
  STORY_LOGS,
  BOSS_NARRATIVES,

  // Pure functions
  isUnlocked,
  getAvailableLogs,
  getCurrentChapter,
  getBossNarrative,
  updateStoryProgress,
  markLogAsViewed,
  getStoryContent
}
