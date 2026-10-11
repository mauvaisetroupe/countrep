<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const gitHash = __GIT_HASH__

// Entrées du menu des réglages : une sous-page chacune
const items = computed(() => [
  {
    to: '/settings/exercises',
    icon: '🏋️',
    title: t('settings.exercises.title'),
    description: t('settings.exercises.description')
  },
  {
    to: '/settings/workouts',
    icon: '📋',
    title: t('settings.workouts.title'),
    description: t('settings.workouts.description')
  },
  {
    to: '/settings/language',
    icon: '🌐',
    title: t('settings.language.title'),
    description: t('settings.language.description')
  },
  {
    to: '/settings/account',
    icon: '🔒',
    title: t('settings.account.title'),
    description: t('settings.account.description')
  }
])
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <h1 class="page-title">
      {{ t('nav.settings') }}
    </h1>

    <main class="mt-6">

      <nav class="bg-white border border-gray-200/80 rounded-3xl shadow-xs divide-y divide-gray-100 overflow-hidden">
        <router-link
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-5 py-4 active:bg-amber-50 transition-colors"
        >
          <div class="w-10 h-10 shrink-0 rounded-full bg-amber-100 flex items-center justify-center">
            {{ item.icon }}
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-800">
              {{ item.title }}
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ item.description }}
            </p>
          </div>

          <span class="text-xl text-gray-300">›</span>
        </router-link>
      </nav>

      <div class="mt-8 text-center text-xs text-gray-400">
        {{ t('settings.build', { hash: gitHash }) }}
      </div>

    </main>

  </div>
</template>
