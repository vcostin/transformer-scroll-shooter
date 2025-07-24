import { defineConfig } from 'vite'
import { createAppDefines } from './config/app-constants.js'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  define: createAppDefines(),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@test': resolve(__dirname, 'test')
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    assetsDir: 'assets',
    copyPublicDir: true
  },
  server: {
    port: 8080,
    open: true
  },
  optimizeDeps: {
    include: []
  },
  base: './',
  assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.ogg', '**/*.png', '**/*.jpg', '**/*.gif'],
  test: {
    // Performance optimizations for vitest
    threads: true,
    isolate: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: false
      }
    },
    // Faster test environment
    environment: 'jsdom',
    // Reduce overhead
    setupFiles: [],
    // Only run tests, don't build
    watch: false,
    // Optimize test discovery
    include: ['**/*.test.js'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.skip.js']
  }
})
