<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { registerUser, loginUser } from '../services/auth'
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

const handleRegister = async () => {
  if (!username.value.trim()) return
  loading.value = true
  error.value = ''
  
  try {
    const verification = await registerUser(username.value)
    if (!(await prepareLocalDataFor(verification.token))) {
      error.value = t('login.cancelled')
      return
    }
    authStore.setToken(verification.token)
    router.push({ name: 'today' })
  } catch (err: any) {
    error.value = err.message || t('login.registerError')
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
    if (!(await prepareLocalDataFor(verification.token))) {
      error.value = t('login.cancelled')
      return
    }
    authStore.setToken(verification.token)
    router.push({ name: 'today' })
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
      <section class="bg-surface rounded-xl p-5">
        <h2 class="text-lg font-bold text-fg">
          {{ t('login.passkey') }}
        </h2>
        <p class="mt-1 text-sm text-fg-secondary">
          {{ t('login.intro') }}
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

        <!-- Identifiant -->
        <div class="mt-5">
          <label
            for="username"
            class="text-xs font-semibold text-fg-secondary block mb-2"
          >
            {{ t('login.username') }}
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Lionel"
            autocomplete="username"
            class="w-full bg-surface-alt border border-transparent rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Erreur -->
        <p v-if="error" class="mt-3 text-sm text-danger">
          {{ error }}
        </p>

        <!-- Actions -->
        <div class="mt-5 space-y-3">
          <button
            @click="handleLogin"
            :disabled="loading || !username.trim()"
            class="w-full bg-primary hover:bg-primary/90 disabled:bg-surface-alt disabled:text-fg-muted disabled:cursor-not-allowed text-on-primary font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            {{ loading ? t('common.loading') : t('login.signIn') }}
          </button>

          <button
            @click="handleRegister"
            :disabled="loading || !username.trim()"
            class="w-full bg-surface-alt hover:bg-surface-alt disabled:opacity-50 text-fg-secondary font-semibold py-3 rounded-xl transition-colors"
          >
            {{ t('login.register') }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>