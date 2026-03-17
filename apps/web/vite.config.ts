import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // 1. ADD THIS: Pre-bundling Firebase prevents Rollup from trying to
  // "watch" internal ESM files during the production build phase.
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', '@tanstack/react-query'],
  },

  server: {
    proxy: {
      '/api/fitbit-token': {
        target: 'https://api.fitbit.com',
        changeOrigin: true,
        rewrite: () => '/oauth2/token',
      },
      '/api/fitbit': {
        target: 'https://api.fitbit.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/fitbit/, ''),
      },
      '/api/runsignup': {
        target: 'https://runsignup.com/rest',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/runsignup/, ''),
      },
    },
  },

  build: {
    // 2. ADD THIS: Increases stability for Firebase/CommonJS resolution
    commonjsOptions: {
      include: [/firebase/, /node_modules/],
    },
    rollupOptions: {
      // 3. CAUTION: I've simplified manualChunks.
      // Sometimes over-splitting Firebase causes the error you saw.
      output: {
        manualChunks: id => {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase'
            if (id.includes('react')) return 'vendor-react'
            return 'vendor' // Groups other libs to keep it clean
          }
        },
      },
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
