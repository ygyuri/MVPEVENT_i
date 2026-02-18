import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-link',
      '@tiptap/extension-blockquote',
      '@tiptap/extension-image',
      '@tiptap/core',
    ],
    exclude: ['@tiptap/pm'],
    // Pre-bundle deps so dev server starts and HMR stay fast
    force: false,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    chunkSizeWarningLimit: 600,
  },
  esbuild: {
    legalComments: 'none',
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/coverage/**'],
      usePolling: false,
    },
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx'],
    },
    proxy: {
      '/api': {
        // Use server container name in Docker (works from within Docker network)
        // For local dev outside Docker, this will be overridden by axios baseURL
        target: 'http://server:5001',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://server:5001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    // Better handling for browser APIs in tests
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000'
      }
    },
    // Handle dynamic imports and import.meta properly
    server: {
      deps: {
        inline: ['vitest-canvas-mock']
      }
    }
  }
})