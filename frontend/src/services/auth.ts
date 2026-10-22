import { SocialLogin } from '@capgo/capacitor-social-login'
import { apiFetch, API_URL } from '../api/client'
import { i18n } from '../i18n'

const t = i18n.global.t

// Connexion par compte Google (ADR 0013) : le même appel dans le
// navigateur (Google Identity Services) et dans l'application Android
// (Credential Manager), grâce au plugin. Le jeton d'identité obtenu est
// vérifié par le serveur, qui ouvre la session de l'application.

const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined

let initialized: Promise<void> | null = null

// Le plugin charge la bibliothèque Google de façon asynchrone : on
// l'initialise une seule fois, au premier besoin
const ensureInitialized = () => {
  if (!WEB_CLIENT_ID) {
    return Promise.reject(new Error(t('auth.googleNotConfigured')))
  }

  // Sur le web, le plugin ouvre une popup OAuth qui revient sur
  // `redirectUrl` (par défaut l'adresse de la page, qui varie : /login,
  // /settings/account) : on fixe la racine, seule URI de redirection
  // déclarée dans le client Web Google. L'application, chargée dans la
  // popup, importe le plugin qui transmet le jeton et ferme la popup.
  initialized ??= SocialLogin.initialize({
    google: {
      webClientId: WEB_CLIENT_ID,
      mode: 'online',
      redirectUrl: `${window.location.origin}/`
    }
  }).catch(error => {
    initialized = null
    throw error
  })

  return initialized
}

// Ouvre la connexion Google et renvoie le jeton d'identité, ou null si
// l'utilisateur a annulé
async function googleIdToken(): Promise<string | null> {
  await ensureInitialized()

  const response = await SocialLogin.login({ provider: 'google', options: {} })
  const result = response.result

  if (result.responseType !== 'online' || !result.idToken) {
    return null
  }

  return result.idToken
}

// Connexion (ou création du compte) : renvoie le token de session de
// l'application, ou null si l'utilisateur a annulé
export async function signInWithGoogle(): Promise<string | null> {
  const idToken = await googleIdToken()
  if (!idToken) return null

  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  })

  if (!response.ok) {
    throw new Error(t('auth.googleFailed'))
  }

  const { token } = await response.json() as { token: string }
  return token
}

export interface AccountProfile {
  name: string
}

export async function getProfile(): Promise<AccountProfile | null> {
  const response = await apiFetch('/api/auth/me')
  return response.ok ? response.json() : null
}

// Supprime le compte et toutes ses données sur le serveur (ADR 0016)
export async function deleteAccountOnServer(): Promise<void> {
  const response = await apiFetch('/api/auth/me', { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(t('account.deleteFailed'))
  }
}
