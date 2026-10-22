<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { loginUser } from '../services/auth'
import { signInWithGoogle } from '../services/googleAuth'
import { prepareLocalDataFor } from '../services/session'
import { setRepository } from '../repositories/setRepository'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const username = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()

// Sets saisis localement mais pas encore envoyées au serveur
const pendingCount = ref(0)

onMounted(async () => {
  pendingCount.value = (await setRepository.getPending()).length
})

// Session de l'application obtenue : données locales rattachées au
// compte (ADR 0014), puis retour à l'application
const adopt = async (token: string) => {
  if (!(await prepareLocalDataFor(token))) {
    error.value = t('login.cancelled')
    return
  }
  authStore.setToken(token)
  router.push({ name: 'today' })
}

const handleGoogle = async () => {
  loading.value = true
  error.value = ''

  try {
    const token = await signInWithGoogle()
    if (token) await adopt(token)
  } catch (err: any) {
    error.value = err.message || t('login.loginError')
  } finally {
    loading.value = false
  }
}

const handleLogin = async () => {
  if (!username.value.trim()) return
  loading.value = true
  error.value = ''

  try {
    const verification = await loginUser(username.value)
    await adopt(verification.token)
  } catch (err: any) {
    error.value = err.message || t('login.loginError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">
    <!-- Logo de l'application (icons/app-icon-foreground.svg) -->
    <div class="flex items-center gap-3">
      <img src="/icons/icon-192.png" alt="" class="h-12 w-12 rounded-xl" />
      <p class="text-xl font-bold text-fg">CountRep</p>
    </div>

    <h1 class="mt-8 page-title">
      {{ t('login.title') }}
    </h1>
    <main class="mt-6 space-y-4">
      <!-- Connexion par compte Google (ADR 0013) -->
      <section class="bg-surface rounded-xl p-5">
        <p class="text-sm text-fg-secondary">
          {{ t('login.googleIntro') }}
        </p>

        <!-- Session expirée -->
        <div
          v-if="authStore.sessionExpired"
          class="mt-4 rounded-xl bg-primary-soft p-3 text-sm text-primary"
        >
          {{ t('login.expired') }}
          <template v-if="pendingCount > 0">
            {{ t('login.pendingKept', pendingCount) }}
          </template>
        </div>

        <button
          type="button"
          :disabled="loading"
          class="mt-5 flex w-full items-center justify-center gap-3 rounded-xl border border-line-strong bg-card py-3.5 font-semibold text-fg transition-all active:scale-[0.98] disabled:opacity-50"
          @click="handleGoogle"
        >
          <!-- Logo « G » de Google -->
          <svg viewBox="0 0 48 48" class="h-5 w-5" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {{ loading ? t('common.loading') : t('login.google') }}
        </button>

        <p v-if="error" class="mt-3 text-sm text-danger">
          {{ error }}
        </p>
      </section>

      <!-- Ancienne connexion par passkey : seulement pour associer un
           compte existant à Google, avant le retrait des passkeys -->
      <details class="rounded-xl bg-surface p-5">
        <summary class="cursor-pointer text-sm font-semibold text-fg-secondary">
          {{ t('login.passkeyLegacy') }}
        </summary>

        <p class="mt-3 text-sm text-fg-secondary">
          {{ t('login.passkeyLegacyHint') }}
        </p>

        <input
          id="username"
          v-model="username"
          type="text"
          :placeholder="t('login.username')"
          autocomplete="username"
          class="mt-4 w-full bg-surface-alt border border-transparent rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
          @keyup.enter="handleLogin"
        />

        <button
          @click="handleLogin"
          :disabled="loading || !username.trim()"
          class="mt-3 w-full bg-surface-alt disabled:opacity-50 text-fg-secondary font-semibold py-3 rounded-xl transition-colors"
        >
          {{ t('login.signIn') }}
        </button>
      </details>

      <!-- Tout fonctionne aussi sans compte (ADR 0014) -->
      <router-link
        to="/today"
        class="block py-2 text-center text-sm font-medium text-primary"
      >
        {{ t('login.continueWithout') }}
      </router-link>
    </main>
  </div>
</template>