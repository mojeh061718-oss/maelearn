import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Deployed at https://<owner>.github.io/maelearn/
export default defineConfig({
  base: '/maelearn/',
  define: { __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,webmanifest,mp3,woff2}'],
        // Everything is precached; no runtime network requests (BLUEPRINT §10).
        navigateFallback: '/maelearn/index.html',
      },
      manifest: {
        name: "Maelie's Learning Hub",
        short_name: 'Maelie',
        description: 'Pre-K learning activities for Maelie',
        start_url: '/maelearn/',
        scope: '/maelearn/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#FFF8E7',
        theme_color: '#FF6B6B',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
