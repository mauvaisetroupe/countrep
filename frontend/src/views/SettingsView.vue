<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { appearancePreference } from '../appearance'
import { localePreference } from '../i18n'

const { t } = useI18n()
const gitHash = __GIT_HASH__

// Menu des réglages, comme Step Challenge : des groupes d'entrées, chacune
// avec sa sous-page et un détail (la valeur actuelle quand il y en a une)
const groups = computed(() => [
  {
    title: t('settings.groups.training'),
    entries: [
      { to: '/settings/exercises', title: t('settings.exercises.title'), detail: t('settings.exercises.description') },
      { to: '/settings/workouts', title: t('settings.workouts.title'), detail: t('settings.workouts.description') }
    ]
  },
  {
    title: t('settings.groups.general'),
    entries: [
      { to: '/settings/account', title: t('settings.account.title'), detail: t('settings.account.description') },
      { to: '/settings/appearance', title: t('settings.appearance.title'), detail: t(`settings.appearance.${appearancePreference.value}`) },
      { to: '/settings/language', title: t('settings.language.title'), detail: t(`settings.language.${localePreference.value}`) }
    ]
  }
])
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <h1 class="page-title">
      {{ t('nav.settings') }}
    </h1>

    <main class="mt-6 space-y-6">

      <section v-for="group in groups" :key="group.title">
        <h2 class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-fg-secondary">
          {{ group.title }}
        </h2>

        <nav class="bg-surface rounded-xl divide-y divide-line overflow-hidden">
          <router-link
            v-for="entry in group.entries"
            :key="entry.to"
            :to="entry.to"
            class="flex items-center gap-3 px-4 py-3.5 active:bg-surface-alt transition-colors"
          >
            <div class="min-w-0 flex-1">
              <p class="text-[15px] font-semibold text-fg">
                {{ entry.title }}
              </p>
              <p class="text-[13px] text-fg-secondary truncate">
                {{ entry.detail }}
              </p>
            </div>

            <span class="text-xl text-fg-muted">›</span>
          </router-link>
        </nav>
      </section>

      <div class="text-center text-xs text-fg-muted">
        {{ t('settings.build', { hash: gitHash }) }}
      </div>

    </main>

  </div>
</template>
