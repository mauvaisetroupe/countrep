import { useAuthStore } from '../stores/auth'

export const API_URL = import.meta.env.VITE_API_URL || ''

// fetch authentifié vers l'API.
// Un 401 signifie que le serveur refuse le token : la session est
// marquée expirée (sans effacer les données locales) et l'UI
// redirige vers la connexion.
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const authStore = useAuthStore()

  const headers = new Headers(init.headers)

  if (authStore.token) {
    headers.set('Authorization', `Bearer ${authStore.token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers
  })

  if (response.status === 401 && authStore.token) {
    authStore.markSessionExpired()
  }

  return response
}
