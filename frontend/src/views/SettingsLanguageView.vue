<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsHeader from '../components/SettingsHeader.vue'
import {
  localePreference,
  setLocalePreference,
  systemLocale,
  type LocalePreference
} from '../i18n'

const { t } = useI18n()

// Les langues gardent leur propre nom, quelle que soit la langue affichée
const options = computed<{ value: LocalePreference, label: string, hint?: string }[]>(() => [
  {
    value: 'system',
    label: t('settings.language.system'),
    hint: t('settings.language.systemHint', {
      language: t(`settings.language.${systemLocale()}`)
    })
  },
  { value: 'fr', label: t('settings.language.fr') },
  { value: 'en', label: t('settings.language.en') }
])
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <SettingsHeader :title="t('settings.language.title')" />

    <main class="mt-6">
      <div
        role="radiogroup"
        :aria-label="t('settings.language.title')"
        class="bg-surface rounded-xl divide-y divide-line overflow-hidden"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="localePreference === option.value"
          class="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-primary-soft transition-colors"
          @click="setLocalePreference(option.value)"
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
            :class="localePreference === option.value ? 'border-primary' : 'border-line-strong'"
          >
            <span
              v-if="localePreference === option.value"
              class="h-2.5 w-2.5 rounded-full bg-primary"
            />
          </span>
        </button>
      </div>
    </main>

  </div>
</template>
