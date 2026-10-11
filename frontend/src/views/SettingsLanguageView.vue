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
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <SettingsHeader :title="t('settings.language.title')" />

    <main class="mt-6">
      <div
        role="radiogroup"
        :aria-label="t('settings.language.title')"
        class="bg-white border border-gray-200/80 rounded-3xl shadow-xs divide-y divide-gray-100 overflow-hidden"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="localePreference === option.value"
          class="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-amber-50 transition-colors"
          @click="setLocalePreference(option.value)"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-800">
              {{ option.label }}
            </p>
            <p v-if="option.hint" class="text-xs text-gray-500 truncate">
              {{ option.hint }}
            </p>
          </div>

          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
            :class="localePreference === option.value ? 'border-amber-500' : 'border-gray-300'"
          >
            <span
              v-if="localePreference === option.value"
              class="h-2.5 w-2.5 rounded-full bg-amber-500"
            />
          </span>
        </button>
      </div>
    </main>

  </div>
</template>
