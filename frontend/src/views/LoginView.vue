<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { registerUser, loginUser } from '../services/auth'
import { prepareLocalDataFor } from '../services/session'
import { workoutRepository } from '../repositories/workoutRepository'

const username = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()

// Séances saisies localement mais pas encore envoyées au serveur
const pendingCount = ref(0)

onMounted(async () => {
  pendingCount.value = (await workoutRepository.getPending()).length
})

const handleRegister = async () => {
  if (!username.value.trim()) return
  loading.value = true
  error.value = ''
  
  try {
    const verification = await registerUser(username.value)
    if (!(await prepareLocalDataFor(verification.token))) {
      error.value = 'Connexion annulée.'
      return
    }
    authStore.setToken(verification.token)
    router.push({ name: 'today' })
  } catch (err: any) {
    error.value = err.message || "Une erreur est survenue lors de l'enregistrement."
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
      error.value = 'Connexion annulée.'
      return
    }
    authStore.setToken(verification.token)
    router.push({ name: 'today' })
  } catch (err: any) {
    error.value = err.message || "Une erreur est survenue lors de la connexion."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">
    <h1 class="text-2xl font-bold text-gray-900">
      Connexion
    </h1>
    <main class="mt-6 space-y-4">
      <section class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs">
        <h2 class="text-lg font-bold text-gray-800">
          Sécurité Passkey
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Entrez votre identifiant pour vous connecter ou créer une clé.
        </p>

        <!-- Session expirée -->
        <div
          v-if="authStore.sessionExpired"
          class="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800"
        >
          Ta session a expiré, reconnecte-toi.
          <template v-if="pendingCount > 0">
            {{ pendingCount }} séance{{ pendingCount > 1 ? 's' : '' }} en attente
            {{ pendingCount > 1 ? 'sont conservées' : 'est conservée' }} sur cet appareil
            et {{ pendingCount > 1 ? 'seront synchronisées' : 'sera synchronisée' }} après la connexion.
          </template>
        </div>

        <!-- Identifiant -->
        <div class="mt-5">
          <label
            for="username"
            class="text-xs font-semibold text-gray-500 block mb-2"
          >
            Identifiant / Email
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Lionel"
            autocomplete="username"
            class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            @keyup.enter="handleLogin"
          />
        </div>

        <!-- Erreur -->
        <p v-if="error" class="mt-3 text-sm text-red-600">
          {{ error }}
        </p>

        <!-- Actions -->
        <div class="mt-5 space-y-3">
          <button
            @click="handleLogin"
            :disabled="loading || !username.trim()"
            class="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
          >
            {{ loading ? 'Chargement...' : 'Se connecter' }}
          </button>

          <button
            @click="handleRegister"
            :disabled="loading || !username.trim()"
            class="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-semibold py-3 rounded-2xl transition-colors"
          >
            S'enregistrer (Passkey)
          </button>
        </div>
      </section>
    </main>
  </div>
</template>