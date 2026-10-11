<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { dateLocale } from '../i18n'

// Jour choisi (YYYY-MM-DD), ‹ › pour la veille et le lendemain, sans
// dépasser aujourd'hui. Un appui sur la date émet `open` (le parent
// ouvre un calendrier pour sauter plus loin).
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  open: []
}>()

const { t, locale } = useI18n()

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const toDate = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}

const todayKey = () => toKey(new Date())

const shift = (days: number) => {
  const date = toDate(props.modelValue)
  date.setDate(date.getDate() + days)
  emit('update:modelValue', toKey(date))
}

const isToday = computed(() => props.modelValue === todayKey())

const label = computed(() => {
  void locale.value
  if (isToday.value) return t('calendar.today')

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (props.modelValue === toKey(yesterday)) return t('journal.yesterday')

  const weekday = new Intl.DateTimeFormat(dateLocale(), { weekday: 'long' }).format(toDate(props.modelValue))
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
})

const date = computed(() => {
  void locale.value
  return new Intl.DateTimeFormat(dateLocale(), { day: 'numeric', month: 'long' }).format(toDate(props.modelValue))
})
</script>

<template>
  <div class="flex items-center justify-between">
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-fg-secondary"
      :aria-label="t('stats.previousDay')"
      @click="shift(-1)"
    >
      ‹
    </button>

    <button
      type="button"
      class="rounded-xl px-4 py-1 text-center active:bg-surface-alt"
      :aria-label="t('dayNavigator.pick')"
      @click="emit('open')"
    >
      <p class="text-base font-semibold text-fg">
        {{ label }} <span class="text-xs text-fg-muted">▾</span>
      </p>
      <p class="text-xs text-fg-secondary">{{ date }}</p>
    </button>

    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-fg-secondary disabled:opacity-30"
      :disabled="isToday"
      :aria-label="t('stats.nextDay')"
      @click="shift(1)"
    >
      ›
    </button>
  </div>
</template>
