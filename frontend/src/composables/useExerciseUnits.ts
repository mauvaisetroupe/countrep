import type { ApiExercise } from '../api/exercises'
import { catalogExercise } from '../catalog'
import type { ExerciseUnit } from '../units'

// Unité et noms d'un exercice, d'après le catalogue embarqué (ADR 0014).
// Un exercice inconnu du catalogue est compté en répétitions.
export function useExerciseUnits() {
  const unitOf = (exerciseId: string | null | undefined): ExerciseUnit =>
    (exerciseId && catalogExercise(exerciseId)?.unit) || 'reps'

  const exerciseOf = (exerciseId: string): ApiExercise | undefined =>
    catalogExercise(exerciseId)

  return { unitOf, exerciseOf }
}
