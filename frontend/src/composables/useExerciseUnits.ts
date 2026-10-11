import { ref } from 'vue'
import { getExercises } from '../api/exercises'
import type { ExerciseUnit } from '../units'

// Unité de chaque exercice du catalogue, chargée une fois et partagée.
// Tant qu'elle n'est pas connue (chargement, hors ligne), un exercice
// est compté en répétitions.
const units = ref<Record<string, ExerciseUnit>>({})
let loading: Promise<void> | null = null

const load = () => {
  loading ??= getExercises()
    .then(catalog => {
      units.value = Object.fromEntries(
        catalog.map(exercise => [exercise.id, exercise.unit ?? 'reps'])
      )
    })
    .catch(error => {
      // Réessayer au prochain appel
      loading = null
      console.warn('Impossible de charger les unités des exercices', error)
    })

  return loading
}

export function useExerciseUnits() {
  load()

  const unitOf = (exerciseId: string | null | undefined): ExerciseUnit =>
    (exerciseId && units.value[exerciseId]) || 'reps'

  return { unitOf }
}
