import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

// Read package.json at build time
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineConfig({
  root: '.',
  define: {
    // Inject version info at build time
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_NAME__: JSON.stringify('Transformer Scroll Shooter'), // Display name
    __APP_PACKAGE_NAME__: JSON.stringify(packageJson.name), // Package name
    __APP_DESCRIPTION__: JSON.stringify(packageJson.description),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
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
