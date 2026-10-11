<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { unitLabel, type ExerciseUnit } from '../units'

// Panneau de choix d'un nombre de répétitions (ou de secondes pour un
// exercice à la durée) : valeurs rapides et − / +, sans clavier.
const props = defineProps<{
  title: string
  value: number
  unit?: ExerciseUnit
}>()

const { t } = useI18n()

const emit = defineEmits<{
  close: []
  confirm: [reps: number]
}>()

const MAX_VALUE = 1000

const isDuration = computed(() => props.unit === 'seconds')
const quickValues = computed(() => isDuration.value
  ? [10, 15, 20, 30, 45, 60, 90, 120]
  : [5, 8, 10, 12, 15, 20, 25, 30])
// En secondes, − / + avancent de 5
const step = computed(() => isDuration.value ? 5 : 1)

const reps = ref(props.value)

const change = (offset: number) => {
  reps.value = Math.min(MAX_VALUE, Math.max(1, reps.value + offset))
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs sm:items-center sm:p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md space-y-5 rounded-t-[32px] border border-amber-100 bg-[#fdf8f5] p-6 shadow-2xl sm:rounded-3xl">

      <div class="flex items-center justify-between gap-3">
        <h3 class="min-w-0 truncate text-lg font-bold text-gray-900">
          {{ title }}
        </h3>
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200/60 text-gray-600"
          :aria-label="t('common.close')"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Valeur et − / + -->
      <div class="flex items-center justify-center gap-6">
        <button
          type="button"
          class="h-14 w-14 rounded-full border border-gray-200 bg-white text-2xl font-semibold text-gray-700 active:scale-95 disabled:opacity-30"
          :disabled="reps <= 1"
          :aria-label="isDuration ? t('picker.lessSeconds') : t('picker.lessReps')"
          @click="change(-step)"
        >
          −
        </button>

        <div class="w-24 text-center">
          <p class="text-5xl font-bold text-gray-900">{{ reps }}</p>
          <p class="text-xs text-gray-500">{{ unitLabel(unit) }}</p>
        </div>

        <button
          type="button"
          class="h-14 w-14 rounded-full border border-gray-200 bg-white text-2xl font-semibold text-gray-700 active:scale-95"
          :aria-label="isDuration ? t('picker.moreSeconds') : t('picker.moreReps')"
          @click="change(step)"
        >
          +
        </button>
      </div>

      <!-- Valeurs rapides -->
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="n in quickValues"
          :key="n"
          type="button"
          class="rounded-xl border py-2.5 text-sm font-semibold shadow-2xs transition-all active:scale-95"
          :class="reps === n
            ? 'border-amber-500 bg-amber-500 text-white'
            : 'border-gray-200/80 bg-white text-gray-700'"
          @click="reps = n"
        >
          {{ n }}
        </button>
      </div>

      <button
        type="button"
        class="w-full rounded-2xl bg-amber-500 py-3.5 font-semibold text-white shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
        @click="emit('confirm', reps)"
      >
        {{ t('common.confirm') }}
      </button>

    </div>
  </div>
</template>
