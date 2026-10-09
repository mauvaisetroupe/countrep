import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'

const TOKEN_KEY = 'countrep.token'

// Compte auquel appartiennent les données locales (IndexedDB)
const OWNER_KEY = 'countrep.owner'

function decodeTokenPayload(
  token: string | null
): { userId?: string, exp?: number } | null {
  if (!token) return null

  try {
    // Le payload JWT est en base64url
    const base64 = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

// Date d'expiration du JWT en ms, ou null si illisible
export function getTokenExpiry(token: string | null): number | null {
  const exp = decodeTokenPayload(token)?.exp

  return exp ? exp * 1000 : null
}

export function getTokenUserId(token: string | null): string | null {
  return decodeTokenPayload(token)?.userId ?? null
}

export function getLocalDataOwner(): string | null {
  return localStorage.getItem(OWNER_KEY)
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

      const userId = getTokenUserId(newToken)
      if (userId) {
        localStorage.setItem(OWNER_KEY, userId)
      }
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

  // Efface le token et toutes les données locales.
  // Passer par services/session.ts#logoutSafely, qui protège
  // les séances non synchronisées.
  const logout = async () => {
    setToken(null)
    localStorage.removeItem(OWNER_KEY)

    try {
      // Dexie ferme proprement ses connexions avant de supprimer,
      // et la base se rouvre au prochain accès (nouvelle connexion).
      await db.delete({ disableAutoOpen: false })
    } catch (error) {
      console.error('Erreur lors de la suppression de la base IndexedDB.', error)
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