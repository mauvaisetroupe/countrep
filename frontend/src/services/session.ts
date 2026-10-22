import { apiFetch } from '../api/client'
import {
  getLocalDataOwner,
  getTokenExpiry,
  getTokenUserId,
  useAuthStore
} from '../stores/auth'
import { setRepository } from '../repositories/setRepository'
import { previewRepository } from '../repositories/previewRepository'
import { syncPendingSets } from './sync'
import { syncLocalData } from './dataSync'
import { workoutRepository } from '../repositories/workoutRepository'
import { i18n } from '../i18n'
import { deleteAccountOnServer } from './auth'

const t = i18n.global.t

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

// À appeler avec le token d'une nouvelle connexion, avant setToken
// (voir docs/adr/0014). Données sans propriétaire (utilisation sans
// compte) : elles sont rattachées au compte, et la synchro les enverra.
// Données d'un autre compte : effacées, après confirmation s'il reste des
// données non envoyées, qui ne pourraient pas l'être sur le bon compte.
// Retourne false si l'utilisateur annule.
export async function prepareLocalDataFor(token: string): Promise<boolean> {
  const owner = getLocalDataOwner()
  const userId = getTokenUserId(token)

  // Sans propriétaire ou même compte : on garde et on rattache
  if (!owner || owner === userId) {
    return true
  }

  const pendingCount =
    (await setRepository.getPending()).length +
    (await workoutRepository.getPending()).length

  if (
    pendingCount > 0 &&
    !window.confirm(
      t('session.otherAccountPending', pendingCount)
    )
  ) {
    return false
  }

  await setRepository.clearAll()

  return true
}

// Déconnexion (voir docs/adr/0014). Sans effacement, rien n'est perdu :
// les données restent sur l'appareil. Avec effacement, on tente d'abord
// d'envoyer ce qui est en attente, puis on demande confirmation s'il en
// reste. Retourne false si l'utilisateur annule.
export async function logoutSafely({ wipe = false }: { wipe?: boolean } = {}): Promise<boolean> {
  const authStore = useAuthStore()

  if (!wipe) {
    await authStore.logout()
    return true
  }

  await syncPendingSets()
  await syncLocalData()

  const pendingCount = (await setRepository.getPending()).length

  if (
    pendingCount > 0 &&
    !window.confirm(
      t('session.logoutPending', pendingCount)
    )
  ) {
    return false
  }

  // Séance en cours pas encore enregistrée (brouillon local)
  if (
    (await previewRepository.count()) > 0 &&
    !window.confirm(
      t('session.logoutPreview')
    )
  ) {
    return false
  }

  await authStore.logout({ wipe: true })

  return true
}

// Suppression du compte (ADR 0016) : après confirmation, le serveur
// supprime le compte et ses données, puis toute la base locale est
// effacée. Retourne false si l'utilisateur annule ; lève une erreur si
// le serveur n'a pas confirmé (hors ligne) : rien n'est alors effacé.
export async function deleteAccount(): Promise<boolean> {
  if (!window.confirm(t('account.deleteConfirm'))) {
    return false
  }

  await deleteAccountOnServer()
  await useAuthStore().logout({ wipe: true })

  return true
}
