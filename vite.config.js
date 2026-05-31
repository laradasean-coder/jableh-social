import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'emblem.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'دائرة جبلة للشؤون الاجتماعية',
        short_name: 'جبلة',
        description: 'المنصة الرقمية لدائرة جبلة للشؤون الاجتماعية والعمل',
        theme_color: '#0D4A35',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] } }
          }
        ]
      }
    })
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
