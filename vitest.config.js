import { defineConfig } from 'vitest/config'
import { createAppDefines } from './config/app-constants.js'
import { resolve } from 'path'

export default defineConfig({
  define: createAppDefines(),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,ts}', 'test/integration.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'docs/',
        'js/', // Legacy files
        'test/',
        'config/',
        '**/*.config.js',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    }
  }
})
