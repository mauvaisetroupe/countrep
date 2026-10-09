import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const TOKEN_KEY = 'countrep.token'

// Date d'expiration du JWT en ms, ou null si illisible
export function getTokenExpiry(token: string | null): number | null {
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))

    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function isTokenValid(token: string | null): boolean {
  const expiry = getTokenExpiry(token)

  return expiry !== null && expiry > Date.now()
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))

  // Vrai quand le serveur a refusé le token : l'utilisateur doit
  // se reconnecter, les données locales sont conservées.
  const sessionExpired = ref(!!token.value && !isTokenValid(token.value))

  const isAuthenticated = computed(() => isTokenValid(token.value))

  const setToken = (newToken: string | null) => {
    token.value = newToken
    sessionExpired.value = false
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  // Ne touche pas à IndexedDB : les workouts en attente
  // seront synchronisés après reconnexion.
  const markSessionExpired = () => {
    setToken(null)
    sessionExpired.value = true
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
    sessionExpired,
    setToken,
    markSessionExpired,
    logout
  }
})