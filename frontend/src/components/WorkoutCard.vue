<script setup lang="ts">
import { computed } from 'vue'

// Résumé d'une séance (nom, séries, exercices) : contenu de carte partagé
// par Réglages › Mes séances et l'écran Séance avant démarrage.
// Le parent fournit l'enveloppe (lien, bouton) ; le slot `trailing`
// s'affiche à droite du nom.
const props = defineProps<{
  workout: {
    name: string
    rounds: number
    exercises: { nameFr: string, reps: number }[]
  }
}>()

const repsPerRound = computed(() =>
  props.workout.exercises.reduce((total, exercise) => total + exercise.reps, 0)
)
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
      {{ workout.rounds }} {{ workout.rounds > 1 ? 'séries' : 'série' }}
      · {{ workout.exercises.length }}
      {{ workout.exercises.length > 1 ? 'exercices' : 'exercice' }}
      · {{ repsPerRound }} reps par série
    </p>

    <div class="mt-3 flex flex-wrap gap-1.5">
      <span
        v-for="(exercise, index) in workout.exercises"
        :key="index"
        class="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs text-amber-800"
      >
        {{ exercise.reps }} × {{ exercise.nameFr }}
      </span>
    </div>
  </div>
</template>
