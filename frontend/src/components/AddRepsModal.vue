<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ExerciseUnit } from '../units'

// Fenêtre de saisie d'une série : heure, nombre de répétitions (ou de
// secondes pour un exercice à la durée), ajout rapide. Utilisée en mode
// exercice et en mode séance.
const props = defineProps<{
  exerciseId: string
  exerciseName: string
  unit?: ExerciseUnit
  date: string
  // Valeur proposée (objectif de la séance), vide sinon
  initialReps?: number | null
}>()

const { t } = useI18n()

const emit = defineEmits<{
  close: []
  save: [payload: { reps: number, time: string }]
}>()

// Heure actuelle au format HH:MM
const getCurrentTime = () => {
  const date = new Date()

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

const repsValue = ref(props.initialReps ? String(props.initialReps) : '')
const time = ref(getCurrentTime())
const imageAvailable = ref(true)

const isDuration = computed(() => props.unit === 'seconds')
const quickValues = computed(() => isDuration.value ? [15, 30, 45, 60] : [5, 10, 15, 20])

const addQuick = (val: number) => {
  repsValue.value = String(val)
}

const save = () => {
  const reps = Number(repsValue.value)

  if (!Number.isInteger(reps) || reps <= 0) {
    return
  }

  emit('save', { reps, time: time.value })
}
</script>

<template>
  <div class="fixed inset-0 bg-overlay backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
    <div class="bg-card w-full max-w-md rounded-t-[32px] sm:rounded-xl p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom duration-200">

      <!-- En-tête de la modale -->
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-bold text-fg">
          {{ t('addReps.title', { name: exerciseName }) }}
        </h3>
        <button @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-surface-alt text-fg-secondary hover:bg-surface-alt">
          ✕
        </button>
      </div>

      <!-- Illustration de l'exercice -->
      <img
        v-if="imageAvailable"
        :src="`/exercises/${exerciseId}.jpg`"
        :alt="t('addReps.illustration', { name: exerciseName })"
        class="w-full h-48 object-contain rounded-xl bg-surface"
        @error="imageAvailable = false"
      />

      <!-- Date sélectionnée -->
      <div class="text-center text-sm text-fg-secondary">
        {{ date }}
      </div>

      <!-- Heure du set -->
      <label class="block">
        <span class="mb-1.5 block text-xs font-semibold text-fg-secondary">
          {{ t('addReps.time') }}
        </span>
        <input
          type="time"
          v-model="time"
          class="w-full rounded-xl bg-surface-alt px-4 py-3 text-lg font-semibold text-fg outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      <!-- Question -->
      <p class="text-sm font-medium text-fg text-center">
        <template v-if="isDuration">
          {{ t('addReps.questionSeconds', { name: exerciseName }) }}
        </template>
        <template v-else>
          {{ t('addReps.questionReps', { name: exerciseName }) }}
        </template>
      </p>

      <!-- Champ de saisie -->
      <label class="block">
        <span class="mb-1.5 block text-xs font-semibold text-fg-secondary">{{ isDuration ? t('addReps.seconds') : t('addReps.count') }}</span>
        <input
          type="number"
          v-model="repsValue"
          :placeholder="t('addReps.placeholder')"
          min="1"
          step="1"
          inputmode="numeric"
          class="w-full rounded-xl bg-surface-alt px-4 py-3 text-lg font-semibold text-fg outline-none focus:ring-2 focus:ring-primary placeholder:text-fg-muted"
        />
      </label>

      <!-- Ajout rapide -->
      <div>
        <span class="text-xs font-semibold text-fg-secondary block mb-2">
          {{ t('addReps.quick') }}
        </span>
        <div class="grid grid-cols-4 gap-2">
          <button v-for="n in quickValues" :key="n" @click="addQuick(n)"
            class="bg-surface-alt py-2.5 rounded-xl text-sm font-semibold text-fg-secondary active:scale-95 transition-all">
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Boutons de validation -->
      <div class="flex gap-3 pt-2">
        <button @click="emit('close')"
          class="flex-1 bg-transparent hover:bg-surface-alt text-fg-secondary font-semibold py-3.5 rounded-xl transition-colors">
          {{ t('common.cancel') }}
        </button>
        <button @click="save"
          class="flex-1 bg-primary hover:bg-primary/90 text-on-primary font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98]">
          {{ t('common.save') }}
        </button>
      </div>

    </div>
  </div>
</template>
