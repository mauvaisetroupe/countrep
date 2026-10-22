import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const gitHash = execSync('git rev-parse --short HEAD').toString().trim()

console.log('GIT HASH:', gitHash)

function getGitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),

    VitePWA({
      // Pas de service worker dans l'application Capacitor : elle se met
      // à jour par le Store (ADR 0015). Le plugin reste chargé pour que
      // `virtual:pwa-register` existe, mais son enregistrement est inactif.
      disable: mode === 'android',
      registerType: 'prompt',
      manifest: {
        id: '/',
        name: 'CountRep',
        short_name: 'CountRep',
        description: 'Track your daily repetitions',

        // Écran de démarrage Android : fond bleu et icône (ADR 0010).
        // La barre d'état suit ensuite le thème (meta theme-color).
        theme_color: '#1389FC',
        background_color: '#1389FC',

        display: 'standalone',
        start_url: '/',
        scope: '/',

        // Générées par icons/export-app-icons.py depuis le SVG maître
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/monochrome-512.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' }
        ]
      }
    })
  ],

  define: {
    __GIT_HASH__: JSON.stringify(getGitHash())
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/',
  server: {
    host: true
  }
}))