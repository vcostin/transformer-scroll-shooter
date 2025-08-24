/**
 * Shared migration configuration for analysis tools
 * Centralizes migrated files list to avoid duplication
 */

export const MIGRATED_FILES = [
  'src/entities/bullet.js',
  'src/entities/player.js',
  'src/entities/enemies/enemy.js',
  'src/game/game.js',
  'src/ui/StoryJournal.js',
  'src/ui/ChapterTransition.js',
  'src/ui/BossDialogue.js',
  'src/utils/colorUtils.js'
]

export const TOOL_FILES = ['tools/**', 'test/**', 'tests/**', 'coverage/**', 'demo/**']

export const LEGACY_FILES = ['src/legacy/', 'docs/archive/']
