/**
 * State Schema - Defines the structure and validation rules for game state
 *
 * This schema defines:
 * - The complete game state structure
 * - Default values for all state properties
 * - Validation rules for type checking
 * - Nested state path definitions
 */

/**
 * Default game state structure
 */
export const DEFAULT_STATE = {
  // Game-wide settings and status
  game: {
    status: 'menu', // 'menu', 'playing', 'paused', 'gameOver'
    level: 1,
    score: 0,
    highScore: 0,
    lives: 3,
    time: 0,
    paused: false,
    debug: false,
    settings: {
      difficulty: 'normal', // 'easy', 'normal', 'hard', 'nightmare'
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      fullscreen: false
    }
  },

  // Player entity state
  player: {
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    shield: 0,
    maxShield: 100,
    experience: 0,
    level: 1,
    alive: true,
    invulnerable: false,
    invulnerabilityTime: 0,
    weapon: {
      type: 'basic',
      damage: 10,
      fireRate: 300,
      lastFired: 0,
      ammo: -1, // -1 for unlimited
      maxAmmo: -1
    },
    powerups: [],
    stats: {
      enemiesKilled: 0,
      bulletsShot: 0,
      accuracy: 0,
      damageDealt: 0,
      damageTaken: 0,
      powerupsCollected: 0,
      timePlayed: 0
    }
  },

  // Enemy system state
  enemies: {
    active: [],
    spawning: true,
    spawnRate: 1000,
    lastSpawn: 0,
    maxEnemies: 10,
    totalSpawned: 0,
    totalKilled: 0,
    bossActive: false,
    nextBossLevel: 5
  },

  // Bullet system state
  bullets: {
    player: [],
    enemy: [],
    maxBullets: 100
  },

  // Powerup system state
  powerups: {
    active: [],
    spawnRate: 15000,
    lastSpawn: 0,
    maxPowerups: 3,
    availableTypes: ['health', 'shield', 'weapon', 'speed', 'damage']
  },

  // UI state
  ui: {
    activeMenu: null, // 'main', 'pause', 'gameOver', 'settings', 'highScores'
    showHUD: true,
    showDebug: false,
    notifications: [],
    modal: {
      visible: false,
      type: null,
      data: null
    }
  },

  // Audio system state
  audio: {
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    currentMusic: null,
    musicPlaying: false,
    soundsEnabled: true,
    activeSounds: []
  },

  // Effects and visual state
  effects: {
    particles: [],
    explosions: [],
    backgroundSpeed: 1,
    screenShake: {
      intensity: 0,
      duration: 0,
      remaining: 0
    }
  },

  // Performance and debug state
  performance: {
    fps: 60,
    frameTime: 16.67,
    updateTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    entityCount: 0
  }
}

/**
 * State validation schema
 * Defines the expected types and validation rules for each state property
 */
export const STATE_SCHEMA = {
  game: {
    status: { type: 'string', enum: ['menu', 'playing', 'paused', 'gameOver'] },
    level: { type: 'number', min: 1, max: 999 },
    score: { type: 'number', min: 0 },
    highScore: { type: 'number', min: 0 },
    lives: { type: 'number', min: 0, max: 99 },
    time: { type: 'number', min: 0 },
    paused: { type: 'boolean' },
    debug: { type: 'boolean' },
    settings: {
      difficulty: { type: 'string', enum: ['easy', 'normal', 'hard', 'nightmare'] },
      soundEnabled: { type: 'boolean' },
      musicEnabled: { type: 'boolean' },
      volume: { type: 'number', min: 0, max: 1 },
      fullscreen: { type: 'boolean' }
    }
  },

  player: {
    position: {
      x: { type: 'number' },
      y: { type: 'number' }
    },
    velocity: {
      x: { type: 'number' },
      y: { type: 'number' }
    },
    health: { type: 'number', min: 0, max: 'maxHealth' },
    maxHealth: { type: 'number', min: 1 },
    energy: { type: 'number', min: 0, max: 'maxEnergy' },
    maxEnergy: { type: 'number', min: 1 },
    shield: { type: 'number', min: 0, max: 'maxShield' },
    maxShield: { type: 'number', min: 0 },
    experience: { type: 'number', min: 0 },
    level: { type: 'number', min: 1, max: 99 },
    alive: { type: 'boolean' },
    invulnerable: { type: 'boolean' },
    invulnerabilityTime: { type: 'number', min: 0 },
    weapon: {
      type: { type: 'string' },
      damage: { type: 'number', min: 0 },
      fireRate: { type: 'number', min: 1 },
      lastFired: { type: 'number', min: 0 },
      ammo: { type: 'number', min: -1 },
      maxAmmo: { type: 'number', min: -1 }
    },
    powerups: { type: 'array' },
    stats: {
      enemiesKilled: { type: 'number', min: 0 },
      bulletsShot: { type: 'number', min: 0 },
      accuracy: { type: 'number', min: 0, max: 100 },
      damageDealt: { type: 'number', min: 0 },
      damageTaken: { type: 'number', min: 0 },
      powerupsCollected: { type: 'number', min: 0 },
      timePlayed: { type: 'number', min: 0 }
    }
  },

  enemies: {
    active: { type: 'array' },
    spawning: { type: 'boolean' },
    spawnRate: { type: 'number', min: 100 },
    lastSpawn: { type: 'number', min: 0 },
    maxEnemies: { type: 'number', min: 1 },
    totalSpawned: { type: 'number', min: 0 },
    totalKilled: { type: 'number', min: 0 },
    bossActive: { type: 'boolean' },
    nextBossLevel: { type: 'number', min: 1 }
  },

  bullets: {
    player: { type: 'array' },
    enemy: { type: 'array' },
    maxBullets: { type: 'number', min: 1 }
  },

  powerups: {
    active: { type: 'array' },
    spawnRate: { type: 'number', min: 1000 },
    lastSpawn: { type: 'number', min: 0 },
    maxPowerups: { type: 'number', min: 0 },
    availableTypes: { type: 'array' }
  },

  ui: {
    activeMenu: { type: 'string', nullable: true },
    showHUD: { type: 'boolean' },
    showDebug: { type: 'boolean' },
    notifications: { type: 'array' },
    modal: {
      visible: { type: 'boolean' },
      type: { type: 'string', nullable: true },
      data: { type: 'any', nullable: true }
    }
  },

  audio: {
    masterVolume: { type: 'number', min: 0, max: 1 },
    musicVolume: { type: 'number', min: 0, max: 1 },
    sfxVolume: { type: 'number', min: 0, max: 1 },
    currentMusic: { type: 'string', nullable: true },
    musicPlaying: { type: 'boolean' },
    soundsEnabled: { type: 'boolean' },
    activeSounds: { type: 'array' }
  },

  effects: {
    particles: { type: 'array' },
    explosions: { type: 'array' },
    backgroundSpeed: { type: 'number', min: 0 },
    screenShake: {
      intensity: { type: 'number', min: 0 },
      duration: { type: 'number', min: 0 },
      remaining: { type: 'number', min: 0 }
    }
  },

  performance: {
    fps: { type: 'number', min: 0 },
    frameTime: { type: 'number', min: 0 },
    updateTime: { type: 'number', min: 0 },
    renderTime: { type: 'number', min: 0 },
    memoryUsage: { type: 'number', min: 0 },
    entityCount: { type: 'number', min: 0 }
  }
}

/**
 * State path utilities
 * Helper functions for working with nested state paths
 */
export const STATE_PATHS = {
  // Game paths
  GAME_STATUS: 'game.status',
  GAME_LEVEL: 'game.level',
  GAME_SCORE: 'game.score',
  GAME_HIGH_SCORE: 'game.highScore',
  GAME_LIVES: 'game.lives',
  GAME_PAUSED: 'game.paused',

  // Player paths
  PLAYER_POSITION: 'player.position',
  PLAYER_POSITION_X: 'player.position.x',
  PLAYER_POSITION_Y: 'player.position.y',
  PLAYER_HEALTH: 'player.health',
  PLAYER_ENERGY: 'player.energy',
  PLAYER_SHIELD: 'player.shield',
  PLAYER_ALIVE: 'player.alive',
  PLAYER_WEAPON: 'player.weapon',
  PLAYER_STATS: 'player.stats',

  // Enemy paths
  ENEMIES_ACTIVE: 'enemies.active',
  ENEMIES_SPAWNING: 'enemies.spawning',
  ENEMIES_BOSS_ACTIVE: 'enemies.bossActive',

  // UI paths
  UI_ACTIVE_MENU: 'ui.activeMenu',
  UI_SHOW_HUD: 'ui.showHUD',
  UI_SHOW_DEBUG: 'ui.showDebug',
  UI_MODAL: 'ui.modal',

  // Audio paths
  AUDIO_MASTER_VOLUME: 'audio.masterVolume',
  AUDIO_MUSIC_PLAYING: 'audio.musicPlaying',
  AUDIO_SOUNDS_ENABLED: 'audio.soundsEnabled'
}

/**
 * Get validation rules for a specific state path
 * @param {string} path - Dot-notation path to state property
 * @returns {Object|null} Validation rules or null if not found
 */
export function getValidationRules(path) {
  const parts = path.split('.')
  let current = STATE_SCHEMA

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return null
    }
  }

  return current && typeof current === 'object' && 'type' in current ? current : null
}

/**
 * Get default value for a specific state path
 * @param {string} path - Dot-notation path to state property
 * @returns {*} Default value or undefined if not found
 */
export function getDefaultValue(path) {
  const parts = path.split('.')
  let current = DEFAULT_STATE

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }

  return current
}
