/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Manifest sudah di public/manifest.webmanifest — disable plugin's
      // injection biar tidak duplicate. Plugin generate service worker
      // saja.
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'kalatask-icon.svg',
        'manifest.webmanifest',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Skip Supabase API endpoints — auth tokens + user PII NEVER cached.
        // navigateFallbackDenylist supaya client-side routing handler tidak
        // intercept /auth/* atau /rest/*.
        navigateFallbackDenylist: [/^\/auth\//, /^\/rest\//],
        runtimeCaching: [
          {
            // Static assets dari same-origin (CSS/JS chunks)
            urlPattern: /^\/assets\/.*\.(?:js|css|svg|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kalatask-static',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Google Fonts CSS
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            // Google Fonts WOFF2
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**', 'tests/**/playwright/**'],
  },
});
