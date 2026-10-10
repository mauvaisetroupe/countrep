import { apiFetch } from '../api/client'
import {
  getLocalDataOwner,
  getTokenExpiry,
  getTokenUserId,
  useAuthStore
} from '../stores/auth'
import { workoutRepository } from '../repositories/workoutRepository'
import { previewRepository } from '../repositories/previewRepository'
import { syncPendingWorkouts } from './sync'

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

// Accorde un texte au nombre de séances : plural(n, 'a', 'ont')
function plural(count: number, one: string, many: string): string {
  return count > 1 ? many : one
}

// À appeler avec le token d'une nouvelle connexion, avant setToken.
// Si les données locales appartiennent à un autre compte, elles sont
// effacées (après confirmation s'il reste des séances non synchronisées,
// qui ne pourraient pas être envoyées sur le bon compte).
// Retourne false si l'utilisateur annule (voir docs/adr/0004).
export async function prepareLocalDataFor(token: string): Promise<boolean> {
  const owner = getLocalDataOwner()
  const userId = getTokenUserId(token)

  // Pas de propriétaire connu (ancienne install) ou même compte : on garde
  if (!owner || owner === userId) {
    return true
  }

  const pendingCount = (await workoutRepository.getPending()).length

  if (
    pendingCount > 0 &&
    !window.confirm(
      `${pendingCount} ${plural(pendingCount, 'séance', 'séances')} d'un autre compte ` +
      `${plural(pendingCount, "n'a", "n'ont")} pas été ` +
      `${plural(pendingCount, 'synchronisée', 'synchronisées')} et ` +
      `${plural(pendingCount, 'sera supprimée', 'seront supprimées')} de cet appareil. Continuer ?`
    )
  ) {
    return false
  }

  await workoutRepository.clearAll()

  return true
}

// Déconnexion qui protège les séances non synchronisées :
// tente d'abord de les envoyer, puis demande confirmation
// s'il en reste. Retourne false si l'utilisateur annule.
export async function logoutSafely(): Promise<boolean> {
  const authStore = useAuthStore()

  await syncPendingWorkouts()

  const pendingCount = (await workoutRepository.getPending()).length

  if (
    pendingCount > 0 &&
    !window.confirm(
      `${pendingCount} ${plural(pendingCount, 'séance', 'séances')} ` +
      `${plural(pendingCount, "n'a", "n'ont")} pas pu être ` +
      `${plural(pendingCount, 'synchronisée', 'synchronisées')} et ` +
      `${plural(pendingCount, 'sera perdue', 'seront perdues')} ` +
      'si tu te déconnectes. Se déconnecter quand même ?'
    )
  ) {
    return false
  }

  // Séance en cours pas encore enregistrée (brouillon local)
  if (
    (await previewRepository.count()) > 0 &&
    !window.confirm(
      "Une séance en cours n'a pas été enregistrée et sera perdue " +
      'si tu te déconnectes. Se déconnecter quand même ?'
    )
  ) {
    return false
  }

  await authStore.logout()

  return true
}
