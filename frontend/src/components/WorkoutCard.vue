<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration, formatTotals, type ExerciseUnit } from '../units'
import { useI18n } from 'vue-i18n'
import { exerciseName } from '../i18n'

const { t } = useI18n()

// Résumé d'une séance (nom, séries, exercices) : contenu de carte partagé
// par Réglages › Mes séances et l'écran Séance avant démarrage.
// Le parent fournit l'enveloppe (lien, bouton) ; le slot `trailing`
// s'affiche à droite du nom.
const props = defineProps<{
  workout: {
    name: string
    rounds: number
    exercises: { nameFr: string, nameEn?: string, reps: number, unit?: ExerciseUnit }[]
  }
}>()

// Répétitions et secondes sont comptées à part
const perRound = computed(() => ({
  reps: props.workout.exercises
    .filter(exercise => exercise.unit !== 'seconds')
    .reduce((total, exercise) => total + exercise.reps, 0),
  seconds: props.workout.exercises
    .filter(exercise => exercise.unit === 'seconds')
    .reduce((total, exercise) => total + exercise.reps, 0)
}))
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <p class="text-base font-semibold text-gray-800 truncate">
        {{ workout.name }}
      </p>
      <slot name="trailing" />
    </div>

    <p class="mt-1 text-xs text-gray-500">
      {{ t('workoutCard.rounds', workout.rounds) }}
      · {{ t('workoutCard.exercises', workout.exercises.length) }}
      · {{ t('workoutCard.perRound', { total: formatTotals(perRound) }) }}
    </p>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <span
        v-for="(exercise, index) in workout.exercises"
        :key="index"
        class="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs text-amber-800"
      >
        <template v-if="exercise.unit === 'seconds'">
          {{ exerciseName(exercise) }} {{ formatDuration(exercise.reps) }}
        </template>
        <template v-else>
          {{ exercise.reps }} × {{ exerciseName(exercise) }}
        </template>
      </span>
    </div>
  </div>
</template>
