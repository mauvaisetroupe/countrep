<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'

const username = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()

const handleRegister = async () => {
  if (!username.value.trim()) return
  loading.value = true
  error.value = ''
  
  try {
    const res = await fetch('http://localhost:3000/api/auth/register-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value })
    })
    const optionsJSON = await res.json()
    const cred = await startRegistration({ optionsJSON })

    const verifyRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, cred })
    })
    const verification = await verifyRes.json()

    if (!verification.verified) {
      throw new Error("L'enregistrement a échoué.")
    }
    
    authStore.setToken(verification.token)
    router.push({ name: 'today' })
  } catch (err: any) {
    error.value = "Une erreur est survenue lors de l'enregistrement."
  } finally {
    loading.value = false
  }
}

const handleLogin = async () => {
  if (!username.value.trim()) return
  loading.value = true
  error.value = ''

  try {
    const res = await fetch('http://localhost:3000/api/auth/login-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value })
    })
    const optionsJSON = await res.json()
    const cred = await startAuthentication({ optionsJSON })

    const verifyRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, cred })
    })
    const verification = await verifyRes.json()

    if (verification.verified) {
      authStore.setToken(verification.token)
      router.push({ name: 'today' })
    } else {
      error.value = 'Échec de la connexion.'
    }
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