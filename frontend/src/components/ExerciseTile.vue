<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount, type ExerciseUnit } from '../units'

// Tuile d'un exercice de séance : le fond se remplit comme une jauge
// au fil des séries faites (vert quand toutes sont faites).
const props = defineProps<{
  name: string
  reps: number
  unit?: ExerciseUnit
  done: number
  rounds: number
  // Séance pas encore démarrée : visible mais pas cliquable
  disabled?: boolean
}>()

const complete = computed(() => props.done >= props.rounds)
const fill = computed(() => `${Math.min(props.done / props.rounds, 1) * 100}%`)
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="relative flex h-24 w-full flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left transition-transform enabled:active:scale-[0.97] disabled:opacity-60"
    :class="complete ? 'border-green-400 bg-white' : disabled ? 'border-gray-200 bg-white' : 'border-amber-300 bg-white'"
  >
    <!-- Jauge -->
    <div
      class="absolute inset-y-0 left-0 transition-[width] duration-300"
      :class="complete ? 'bg-green-200' : 'bg-amber-200'"
      :style="{ width: fill }"
    />

    <p class="relative text-sm font-semibold leading-tight text-gray-900 line-clamp-2">
      {{ name }}
    </p>

    <div class="relative flex items-end justify-between gap-1">
      <span class="text-xs text-gray-600">
        {{ formatAmount(reps, unit) }}
      </span>
      <span
        class="text-base font-bold"
        :class="complete ? 'text-green-700' : 'text-amber-800'"
      >
        {{ complete ? '✓ ' : '' }}{{ done }}/{{ rounds }}
      </span>
    </div>
  </button>
</template>
