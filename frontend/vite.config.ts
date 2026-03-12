import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/purify\/api\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Purify - Device Control',
        short_name: 'Purify',
        start_url: '/purify/',
        scope: '/purify/',
        display: 'standalone',
        theme_color: '#1a1a2e',
        background_color: '#0a0a14',
        icons: [
          { src: '/purify/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/purify/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  base: '/purify/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/purify/api': 'http://localhost:8000',
      '/purify/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
