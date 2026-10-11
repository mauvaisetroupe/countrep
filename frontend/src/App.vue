<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { needRefresh, updateSW } from './composables/usePwaUpdate'
import { ensureFreshToken } from './services/session'
import NavIcon from './components/NavIcon.vue'

const { t } = useI18n()
const route = useRoute()

const tabs = [
  { to: '/today', icon: 'log', label: 'nav.log' },
  { to: '/journal', icon: 'journal', label: 'nav.journal' },
  { to: '/stats', icon: 'stats', label: 'nav.stats' },
  { to: '/settings', icon: 'settings', label: 'nav.settings' }
] as const

// Les sous-pages des réglages gardent l'onglet Réglages actif
const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

// Une PWA reste souvent ouverte en arrière-plan :
// on renouvelle aussi le token au retour au premier plan.
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    ensureFreshToken()
  }
}

onMounted(() => {
  ensureFreshToken()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

async function updateApp() {
  await updateSW(true)
}

function dismissUpdate() {
  needRefresh.value = false
}
</script>

<template>
  <div class="min-h-screen bg-background text-fg pb-28 font-sans select-none">
    <router-view />

    <!-- Barre de navigation Material 3, comme Step Challenge : pastille
         derrière l'icône de l'onglet actif -->
    <nav
      v-if="route.name !== 'login'"
      class="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t border-line bg-background pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]"
    >
      <router-link
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex min-w-16 flex-col items-center gap-1"
      >
        <span
          class="flex h-8 w-16 items-center justify-center rounded-full transition-colors"
          :class="isActive(tab.to) ? 'bg-primary-soft text-primary' : 'text-fg-secondary'"
        >
          <NavIcon :name="tab.icon" class="h-6 w-6" />
        </span>
        <span
          class="text-xs"
          :class="isActive(tab.to) ? 'font-semibold text-primary' : 'font-medium text-fg-secondary'"
        >
          {{ t(tab.label) }}
        </span>
      </router-link>
    </nav>

    <!-- Notification nouvelle version -->
    <Transition name="update-notification">
      <div
        v-if="needRefresh"
        class="fixed bottom-24 left-4 right-4 z-50"
      >
        <div
          class="mx-auto max-w-md rounded-xl bg-surface shadow-lg p-4"
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">
              🔄
            </div>

            <div class="flex-1">
              <div class="font-semibold text-fg">
                {{ t('update.title') }}
              </div>

              <div class="text-sm text-fg-secondary mt-1">
                {{ t('update.body') }}
              </div>

              <div class="flex gap-2 mt-3">
                <button
                  type="button"
                  class="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary active:scale-95 transition-transform"
                  @click="updateApp"
                >
                  {{ t('update.apply') }}
                </button>

                <button
                  type="button"
                  class="rounded-xl px-4 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-alt active:scale-95 transition-transform"
                  @click="dismissUpdate"
                >
                  {{ t('update.later') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.update-notification-enter-active,
.update-notification-leave-active {
  transition: all 0.25s ease;
}

.update-notification-enter-from,
.update-notification-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>