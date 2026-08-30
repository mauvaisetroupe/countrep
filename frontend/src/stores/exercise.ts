import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'workout_selected_exercise'

export const useExerciseStore = defineStore('exercise', () => {
  // Récupère l'exercice stocké ou prend 'Push-ups' par défaut
  const selectedExercise = ref<string>(
    localStorage.getItem(STORAGE_KEY) || 'Push-ups'
  )

  const setExercise = (name: string) => {
    selectedExercise.value = name
    localStorage.setItem(STORAGE_KEY, name)
  }

  return {
    selectedExercise,
    setExercise
  }
})  