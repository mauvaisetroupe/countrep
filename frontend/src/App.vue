<script setup lang="ts">
import { useRoute } from 'vue-router'
import { needRefresh, updateSW } from './composables/usePwaUpdate'

const route = useRoute()

async function updateApp() {
  await updateSW(true)
}

function dismissUpdate() {
  needRefresh.value = false
}
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] text-gray-900 pb-28 font-sans select-none">
    <router-view />

    <nav
      class="fixed bottom-0 left-0 right-0 bg-[#fdf8f5]/90 backdrop-blur-md border-t border-amber-100/60 px-4 py-3 flex justify-around items-center z-20"
    >
      <!-- Aujourd'hui -->
      <router-link
        to="/today"
        :class="[
          'flex flex-col items-center gap-1 transition-colors',
          route.name === 'today'
            ? 'text-amber-600 font-bold'
            : 'text-gray-400'
        ]"
      >
        <span class="text-xl">📅</span>
        <span class="text-xs">Aujourd'hui</span>
      </router-link>

      <!-- Journal -->
      <router-link
        to="/journal"
        :class="[
          'flex flex-col items-center gap-1 transition-colors',
          route.name === 'journal'
            ? 'text-amber-600 font-bold'
            : 'text-gray-400'
        ]"
      >
        <span class="text-xl">📋</span>
        <span class="text-xs">Journal</span>
      </router-link>

      <!-- Statistiques -->
      <router-link
        to="/stats"
        :class="[
          'flex flex-col items-center gap-1 transition-colors',
          route.name === 'stats'
            ? 'text-amber-600 font-bold'
            : 'text-gray-400'
        ]"
      >
        <span class="text-xl">📊</span>
        <span class="text-xs">Statistiques</span>
      </router-link>

      <!-- Profil -->
      <router-link
        to="/profile"
        :class="[
          'flex flex-col items-center gap-1 transition-colors',
          route.name === 'profile'
            ? 'text-amber-600 font-bold'
            : 'text-gray-400'
        ]"
      >
        <span class="text-xl">👤</span>
        <span class="text-xs">Profil</span>
      </router-link>
    </nav>

    <!-- Notification nouvelle version -->
    <Transition name="update-notification">
      <div
        v-if="needRefresh"
        class="fixed bottom-24 left-4 right-4 z-50"
      >
        <div
          class="mx-auto max-w-md rounded-2xl bg-white border border-amber-100 shadow-lg p-4"
        >
          <div class="flex items-start gap-3">
            <div class="text-2xl">
              🔄
            </div>

            <div class="flex-1">
              <div class="font-semibold text-gray-900">
                Nouvelle version disponible
              </div>

              <div class="text-sm text-gray-500 mt-1">
                Une nouvelle version de CountRep est disponible.
              </div>

              <div class="flex gap-2 mt-3">
                <button
                  type="button"
                  class="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white active:scale-95 transition-transform"
                  @click="updateApp"
                >
                  Mettre à jour
                </button>

                <button
                  type="button"
                  class="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 active:scale-95 transition-transform"
                  @click="dismissUpdate"
                >
                  Plus tard
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