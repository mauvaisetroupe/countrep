import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'workout_is_authenticated'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref<boolean>(
    localStorage.getItem(STORAGE_KEY) === 'true'
  )

  const setAuthenticated = (status: boolean) => {
    isAuthenticated.value = status
    if (status) {
      localStorage.setItem(STORAGE_KEY, 'true')
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    isAuthenticated,
    setAuthenticated
  }
})