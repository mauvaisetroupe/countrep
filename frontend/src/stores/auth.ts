import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const TOKEN_KEY = 'countrep.token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  const isAuthenticated = computed(() => !!token.value)

  const setToken = (newToken: string | null) => {
    token.value = newToken
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  const logout = async () => {
    setToken(null)
    const dbName = 'WorkoutDatabase'
    const deleteRequest = indexedDB.deleteDatabase(dbName)

    deleteRequest.onsuccess = () => {
      console.log('IndexedDB supprimée avec succès lors de la déconnexion.')
    }

    deleteRequest.onerror = () => {
      console.error('Erreur lors de la suppression de la base IndexedDB.')
    }

    deleteRequest.onblocked = () => {
      console.warn('La suppression d\'IndexedDB a été bloquée (connexions ouvertes).')
    }
  }
  
  return {
    token,
    isAuthenticated,
    setToken,
    logout
  }
})