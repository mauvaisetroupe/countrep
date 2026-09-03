import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'workout_selected_exercise'

export const useExerciseStore = defineStore('exercise', () => {
  const selectedExercise = ref<string | null>(
    localStorage.getItem(STORAGE_KEY)
  )

  const setExercise = (id: string | null) => {
    selectedExercise.value = id

    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    selectedExercise,
    setExercise
  }
})