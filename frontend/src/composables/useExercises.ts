import { ref } from 'vue'
import {
  getExercises,
  getUserExercises,
  updateUserExercises,
  type ApiExercise,
  type UserExercise
} from '../api/exercises'

const exercises = ref<ApiExercise[]>([])
const userExercises = ref<UserExercise[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useExercises() {

  async function loadExercises() {
    loading.value = true
    error.value = null

    try {
      const [catalog, selected] = await Promise.all([
        getExercises(),
        getUserExercises()
      ])

      exercises.value = catalog
      userExercises.value = selected

    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des exercices'

      throw err

    } finally {
      loading.value = false
    }
  }

  async function saveUserExercises(exerciseIds: string[]) {
    loading.value = true
    error.value = null

    try {
      userExercises.value =
        await updateUserExercises(exerciseIds)

    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'Erreur lors de la sauvegarde des exercices'

      throw err

    } finally {
      loading.value = false
    }
  }

  return {
    exercises,
    userExercises,
    loading,
    error,
    loadExercises,
    saveUserExercises
  }
}