import { apiFetch } from '../api/client'
import { getTokenExpiry, useAuthStore } from '../stores/auth'

// Le token dure 7 jours ; on le renouvelle dès qu'il a plus d'un jour.
// Un utilisateur qui ouvre l'app au moins une fois par semaine
// n'a donc jamais à se reconnecter (voir docs/adr/0003).
const REFRESH_WHEN_REMAINING_MS = 6 * 24 * 60 * 60 * 1000

let inFlight: Promise<void> | null = null

async function refresh(): Promise<void> {
  const authStore = useAuthStore()

  const response = await apiFetch('/api/auth/refresh', {
    method: 'POST'
  })

  if (!response.ok) {
    // 401 déjà traité par apiFetch ; autre erreur : on réessaiera plus tard
    return
  }

  const { token } = await response.json()
  authStore.setToken(token)
}

// Renouvelle le token s'il approche de l'expiration.
// Silencieux hors ligne : l'échec réseau est ignoré.
export async function ensureFreshToken(): Promise<void> {
  const authStore = useAuthStore()

  const expiry = getTokenExpiry(authStore.token)

  if (expiry === null || expiry <= Date.now()) {
    return
  }

  if (expiry - Date.now() > REFRESH_WHEN_REMAINING_MS) {
    return
  }

  inFlight ??= refresh()
    .catch(error => {
      console.warn('Renouvellement du token impossible (hors ligne ?)', error)
    })
    .finally(() => {
      inFlight = null
    })

  await inFlight
}
