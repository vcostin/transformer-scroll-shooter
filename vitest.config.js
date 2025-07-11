import { defineConfig } from 'vitest/config'
import { readFileSync } from 'fs'

// Read package.json at test time
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineConfig({
  define: {
    // Inject version info at test time (same as build time)
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_NAME__: JSON.stringify('Transformer Scroll Shooter'), // Display name
    __APP_PACKAGE_NAME__: JSON.stringify(packageJson.name), // Package name
    __APP_DESCRIPTION__: JSON.stringify(packageJson.description),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
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
