import type { ApiExercise } from './api/exercises'
import exercises from './data/exercises.json'

// Catalogue d'exercices embarqué (ADR 0014) : disponible sans connexion
// ni réseau. Généré par scripts/update-catalog.mjs, trié par nom affiché
// à l'usage.
export const CATALOG: ApiExercise[] = exercises as ApiExercise[]

const byId = new Map(CATALOG.map(exercise => [exercise.id, exercise]))

export const catalogExercise = (exerciseId: string): ApiExercise | undefined =>
  byId.get(exerciseId)
