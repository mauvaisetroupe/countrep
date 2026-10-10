import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'workout_selected_exercise'
const MODE_KEY = 'countrep.homeMode'
const ROUTINE_KEY = 'countrep.selectedRoutine'

// Mode de l'écran d'accueil : un exercice au fil de la journée,
// ou une séance complète
export type HomeMode = 'exercise' | 'routine'

const persist = (key: string, value: string | null) => {
  if (value) {
    localStorage.setItem(key, value)
  } else {
    localStorage.removeItem(key)
  }
}

export const useExerciseStore = defineStore('exercise', () => {
  const selectedExercise = ref<string | null>(
    localStorage.getItem(STORAGE_KEY)
  )

  const mode = ref<HomeMode>(
    localStorage.getItem(MODE_KEY) === 'routine' ? 'routine' : 'exercise'
  )

  const selectedRoutine = ref<string | null>(
    localStorage.getItem(ROUTINE_KEY)
  )

  const setExercise = (name: string | null) => {
    selectedExercise.value = name
    persist(STORAGE_KEY, name)
  }

  const setMode = (value: HomeMode) => {
    mode.value = value
    persist(MODE_KEY, value)
  }

  const setRoutine = (id: string | null) => {
    selectedRoutine.value = id
    persist(ROUTINE_KEY, id)
  }

  return {
    selectedExercise,
    mode,
    selectedRoutine,
    setExercise,
    setMode,
    setRoutine
  }
})
