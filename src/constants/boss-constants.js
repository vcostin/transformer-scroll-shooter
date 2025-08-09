/**
 * Boss-related constants shared across the application
 */

// Boss type definitions - centralized to avoid duplication
export const BOSS_TYPES = ['boss', 'boss_heavy', 'boss_fast', 'boss_sniper']

// Boss message mappings
export const BOSS_MESSAGES = {
  boss: 'BOSS APPROACHING!',
  boss_heavy: 'HEAVY ASSAULT BOSS INCOMING!',
  boss_fast: 'FAST ATTACK BOSS DETECTED!',
  boss_sniper: 'SNIPER BOSS TARGETING YOU!'
}

// Boss configuration data structure
export const BOSS_CONFIGS = {
  boss: {
    width: 80,
    height: 60,
    maxHealth: 200,
    speed: 50,
    damage: 50,
    points: 500,
    color: '#ff0000',
    shootRate: 1000,
    bulletSpeed: 300
  },
  boss_heavy: {
    width: 100,
    height: 80,
    maxHealth: 300,
    speed: 30,
    damage: 75,
    points: 750,
    color: '#8B0000',
    shootRate: 800,
    bulletSpeed: 250
  },
  boss_fast: {
    width: 70,
    height: 50,
    maxHealth: 150,
    speed: 80,
    damage: 40,
    points: 600,
    color: '#FF6600',
    shootRate: 600,
    bulletSpeed: 350
  },
  boss_sniper: {
    width: 90,
    height: 70,
    maxHealth: 250,
    speed: 40,
    damage: 80,
    points: 800,
    color: '#9400D3',
    shootRate: 1500,
    bulletSpeed: 400
  }
}
