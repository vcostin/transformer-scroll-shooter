import { defineConfig } from 'vite'
import { createAppDefines } from './config/app-constants.js'

export default defineConfig({
  root: '.',
  define: createAppDefines(),
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
