<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsHeader from '../components/SettingsHeader.vue'
import {
  appearancePreference,
  setAppearancePreference,
  type AppearancePreference
} from '../appearance'

const { t } = useI18n()

const options = computed<{ value: AppearancePreference, label: string, hint?: string }[]>(() => [
  { value: 'system', label: t('settings.appearance.system'), hint: t('settings.appearance.systemHint') },
  { value: 'light', label: t('settings.appearance.light') },
  { value: 'dark', label: t('settings.appearance.dark') }
])
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <SettingsHeader :title="t('settings.appearance.title')" />

    <main class="mt-6">
      <div
        role="radiogroup"
        :aria-label="t('settings.appearance.title')"
        class="bg-surface rounded-xl divide-y divide-line overflow-hidden"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="appearancePreference === option.value"
          class="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-primary-soft transition-colors"
          @click="setAppearancePreference(option.value)"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-fg">
              {{ option.label }}
            </p>
            <p v-if="option.hint" class="text-xs text-fg-secondary truncate">
              {{ option.hint }}
            </p>
          </div>

          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
            :class="appearancePreference === option.value ? 'border-primary' : 'border-line-strong'"
          >
            <span
              v-if="appearancePreference === option.value"
              class="h-2.5 w-2.5 rounded-full bg-primary"
            />
          </span>
        </button>
      </div>
    </main>

  </div>
</template>
