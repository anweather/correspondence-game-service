import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@games/tic-tac-toe/shared': path.resolve(__dirname, '../games/tic-tac-toe/shared'),
      '@games/tic-tac-toe/engine': path.resolve(__dirname, '../games/tic-tac-toe/engine'),
      '@games/tic-tac-toe/ui': path.resolve(__dirname, '../games/tic-tac-toe/ui'),
      '@games': path.resolve(__dirname, '../games')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true
  }
})
