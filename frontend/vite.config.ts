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
export default defineConfig({
  plugins: [
    vue(),

    VitePWA({
      registerType: 'prompt',
      manifest: {
        id: '/',
        name: 'CountRep',
        short_name: 'CountRep',
        description: 'Track your daily repetitions',

        theme_color: '#fdf8f5',
        background_color: '#fdf8f5',

        display: 'standalone',
        start_url: '/',
        scope: '/',

        icons: [
          {
            src: '/launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
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
})