import { ref } from 'vue'
import { getExercises, type ApiExercise } from '../api/exercises'
import type { ExerciseUnit } from '../units'

// Catalogue des exercices (unité, noms), chargé une fois et partagé.
// Tant qu'il n'est pas connu (chargement, hors ligne), un exercice est
// compté en répétitions et désigné par son identifiant.
const units = ref<Record<string, ExerciseUnit>>({})
const catalog = ref<Record<string, ApiExercise>>({})
let loading: Promise<void> | null = null

const load = () => {
  loading ??= getExercises()
    .then(exercises => {
      units.value = Object.fromEntries(
        exercises.map(exercise => [exercise.id, exercise.unit ?? 'reps'])
      )
      catalog.value = Object.fromEntries(
        exercises.map(exercise => [exercise.id, exercise])
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

  const exerciseOf = (exerciseId: string): ApiExercise | undefined =>
    catalog.value[exerciseId]

  return { unitOf, exerciseOf }
}
