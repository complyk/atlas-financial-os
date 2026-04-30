import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Atlas — Personal Financial OS',
        short_name: 'Atlas',
        theme_color: '#09090B',
        background_color: '#09090B',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-recharts': ['recharts'],
          'vendor-framer': ['framer-motion'],
          'vendor-dexie': ['dexie', 'dexie-react-hooks'],
          'vendor-router': ['react-router-dom'],
        }
      }
    }
  }
})
