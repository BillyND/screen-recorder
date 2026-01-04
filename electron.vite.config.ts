import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        external: ['electron']
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: '../../dist/renderer'
    },
    plugins: [react()],
    base: './', // Critical for Windows file:// protocol
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer')
      }
    }
  }
})
