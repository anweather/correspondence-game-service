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
      '@games/connect-four/shared': path.resolve(__dirname, '../games/connect-four/shared'),
      '@games/connect-four/engine': path.resolve(__dirname, '../games/connect-four/engine'),
      '@games/connect-four/ui': path.resolve(__dirname, '../games/connect-four/ui'),
      '@games': path.resolve(__dirname, '../games'),
      // Ensure React is resolved from web-client's node_modules for game components
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
      // Ensure testing libraries are resolved from web-client's node_modules
      '@testing-library/react': path.resolve(__dirname, './node_modules/@testing-library/react'),
      '@testing-library/jest-dom': path.resolve(__dirname, './node_modules/@testing-library/jest-dom')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
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
    css: true,
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '../games/**/ui/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '../games/**/engine/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ]
  }
})
