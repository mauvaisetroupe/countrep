import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'workout_selected_exercise'

export const useExerciseStore = defineStore('exercise', () => {
  const selectedExercise = ref<string | null>(
    localStorage.getItem(STORAGE_KEY)
  )

  const setExercise = (name: string | null) => {
    selectedExercise.value = name
    if (name) {
      localStorage.setItem(STORAGE_KEY, name)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    selectedExercise,
    setExercise
  }
})