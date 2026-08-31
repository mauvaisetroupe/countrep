<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { registerUser, loginUser } from '../services/auth'

const authStore = useAuthStore()

const name = ref('')
const loading = ref(false)
const error = ref('')

const handleAuthAction = async (isRegistration: boolean) => {
  const trimmedName = name.value.trim()
  if (!trimmedName) return

  loading.value = true
  error.value = ''

  try {
    // LCO
    const verification = isRegistration 
      ? await registerUser(trimmedName) 
      : await loginUser(trimmedName)

    if (verification.verified && verification.token) {
      authStore.setToken(verification.token)
      name.value = ''
    } else {
      error.value = "Échec de l'authentification."
    }
  } catch (err: any) {
    console.error(err)
    error.value = err.message || "Une erreur est survenue lors de l'authentification biométrique."
  } finally {
    loading.value = false
  }
}

const logout = () => {
  authStore.logout()
  name.value = ''
  error.value = ''
}

const decodedToken = computed(() => {
  const token = authStore.token
  if (!token) return null
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return { error: 'Impossible de décoder le JWT' }
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <h1 class="text-2xl font-bold text-gray-900">
      Profil & Sécurité
    </h1>

    <main class="mt-6 space-y-4">

      <!-- =====================================================
           NON CONNECTÉ
      ====================================================== -->

      <section
        v-if="!authStore.isAuthenticated"
        class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs"
      >

        <h2 class="text-lg font-bold text-gray-800">
          Connexion / Inscription
        </h2>

        <p class="mt-1 text-sm text-gray-500">
          Entrez votre nom pour utiliser la sécurité biométrique (Passkey).
        </p>

        <!-- Nom -->
        <div class="mt-5">

          <label
            for="name"
            class="text-xs font-semibold text-gray-500 block mb-2"
          >
            Nom d'utilisateur
          </label>

          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Lionel"
            autocomplete="username"
            class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            @keyup.enter="handleAuthAction(false)"
          />

        </div>

        <!-- Erreur -->
        <p
          v-if="error"
          class="mt-3 text-sm text-red-600"
        >
          {{ error }}
        </p>

        <!-- Boutons d'action -->
        <div class="mt-4 space-y-2">
          <button
            @click="handleAuthAction(false)"
            :disabled="loading || !name.trim()"
            class="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
          >
            {{ loading ? 'Patientez...' : 'Se connecter (Passkey)' }}
          </button>

          <button
            @click="handleAuthAction(true)"
            :disabled="loading || !name.trim()"
            class="w-full bg-white border border-amber-300 hover:bg-amber-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-amber-700 font-semibold py-3.5 rounded-2xl transition-all"
          >
            Créer un compte
          </button>
        </div>

      </section>


      <!-- =====================================================
           PROFIL ACTIF (CONNECTÉ)
      ====================================================== -->

      <section
        v-else
        class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs"
      >

        <div class="flex items-center gap-3">

          <!-- Avatar -->
          <div
            class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"
          >
            🔒
          </div>

          <!-- Informations -->
          <div class="min-w-0">

            <p class="text-sm font-semibold text-gray-800">
              Session sécurisée active
            </p>

            <p class="text-xs text-gray-500 font-mono truncate">
              Authentifié par Jeton JWT
            </p>

            <p class="text-sm font-semibold text-gray-800">
              Raw Token
            </p>

            <p class="text-xs text-gray-500 font-mono truncate">
              {{ authStore.token }}
            </p>

            <p class="text-sm font-semibold text-gray-800">
              Decoded Token
            </p>

            <p class="text-xs text-gray-500 font-mono">
              {{ JSON.stringify(decodedToken, null, 2) }}
            </p>    
                    
          </div>
        </div>

        <!-- Déconnexion / Changer de profil -->
        <button
          @click="logout"
          class="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl transition-colors"
        >
          Se déconnecter
        </button>

      </section>

    </main>

  </div>
</template>