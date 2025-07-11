module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/version.js',
    '!js/vendor/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  globals: {
    'GAME_CONSTANTS': {
      'BOSS_LEVEL_INTERVAL': 5,
      'ENEMIES_PER_LEVEL': 10,
      'BOSS_BONUS_SCORE': 1000,
      'BOSS_HEALTH_RESTORE': 25,
      'MESSAGE_DURATION': {
        'BOSS': 3000,
        'VICTORY': 2000,
        'INFO': 2000
      },
      'MAX_MESSAGES': 3
    }
  }
};
