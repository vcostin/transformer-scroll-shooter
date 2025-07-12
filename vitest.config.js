import { defineConfig } from 'vitest/config'
import { createAppDefines } from './config/app-constants.js'

export default defineConfig({
  define: createAppDefines(),
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'docs/',
        'js/', // Legacy files
        'test/',
        '**/*.config.js',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    }
  }
})
