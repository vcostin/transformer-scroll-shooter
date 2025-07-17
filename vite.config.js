import { defineConfig } from 'vite'
import { createAppDefines } from './config/app-constants.js'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  define: createAppDefines(),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
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
  assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.ogg', '**/*.png', '**/*.jpg', '**/*.gif']
})
