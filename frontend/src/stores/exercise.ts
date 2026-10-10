import { ref } from 'vue'
import { defineStore } from 'pinia'

const EXERCISE_KEY = 'countrep.selectedExercise'
const MODE_KEY = 'countrep.homeMode'
const WORKOUT_KEY = 'countrep.selectedWorkout'

// Anciennes clés et valeurs (avant le renommage de l'ADR 0006),
// reprises une fois puis supprimées
const LEGACY_EXERCISE_KEY = 'workout_selected_exercise'
const LEGACY_WORKOUT_KEY = 'countrep.selectedRoutine'
const LEGACY_WORKOUT_MODE = 'routine'

// Mode de l'écran d'accueil : un exercice au fil de la journée,
// ou une séance complète
export type HomeMode = 'exercise' | 'workout'

const persist = (key: string, value: string | null) => {
  if (value) {
    localStorage.setItem(key, value)
  } else {
    localStorage.removeItem(key)
  }
}

const migrateKey = (legacyKey: string, key: string) => {
  const legacy = localStorage.getItem(legacyKey)

  if (legacy !== null) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, legacy)
    }
    localStorage.removeItem(legacyKey)
  }
}

migrateKey(LEGACY_EXERCISE_KEY, EXERCISE_KEY)
migrateKey(LEGACY_WORKOUT_KEY, WORKOUT_KEY)
localStorage.removeItem('countrep.routinesCache')

export const useExerciseStore = defineStore('exercise', () => {
  const selectedExercise = ref<string | null>(
    localStorage.getItem(EXERCISE_KEY)
  )

  const storedMode = localStorage.getItem(MODE_KEY)
  const mode = ref<HomeMode>(
    storedMode === 'workout' || storedMode === LEGACY_WORKOUT_MODE ? 'workout' : 'exercise'
  )

  const selectedWorkout = ref<string | null>(
    localStorage.getItem(WORKOUT_KEY)
  )

  const setExercise = (id: string | null) => {
    selectedExercise.value = id
    persist(EXERCISE_KEY, id)
  }

  const setMode = (value: HomeMode) => {
    mode.value = value
    persist(MODE_KEY, value)
  }

  const setWorkout = (id: string | null) => {
    selectedWorkout.value = id
    persist(WORKOUT_KEY, id)
  }

  return {
    selectedExercise,
    mode,
    selectedWorkout,
    setExercise,
    setMode,
    setWorkout
  }
})
