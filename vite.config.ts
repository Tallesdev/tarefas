import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'To-Do List',
        short_name: 'Tarefas',
        description: 'Tarefas, calendário e hábitos',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f7fb',
        theme_color: '#2d7ff9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // dados do Supabase sempre vêm da rede; o app (HTML/JS/CSS) fica em cache
        navigateFallbackDenylist: [/^\/auth/],
      },
    }),
  ],
})
