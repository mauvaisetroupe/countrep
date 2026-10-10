<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { addDevice } from '../services/auth'
import { logoutSafely } from '../services/session'
import SettingsHeader from '../components/SettingsHeader.vue'

const authStore = useAuthStore()
const router = useRouter()

const error = ref('')
const deviceLoading = ref(false)
const deviceMessage = ref('')

const handleAddDevice = async () => {
  if (!authStore.token) return

  deviceLoading.value = true
  deviceMessage.value = ''
  error.value = ''

  try {
    await addDevice(authStore.token)
    deviceMessage.value = 'Cet appareil est maintenant enregistré.'
  } catch (err: any) {
    console.error(err)
    error.value = err.message || "Une erreur est survenue lors de l'ajout de l'appareil."
  } finally {
    deviceLoading.value = false
  }
}

const logout = async () => {
  if (!(await logoutSafely())) {
    return
  }
  router.replace({ name: 'login' })
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

    <SettingsHeader title="Compte et sécurité" />

    <main class="mt-6 space-y-4">

      <!-- =====================================================
           PROFIL ACTIF (CONNECTÉ)
      ====================================================== -->

      <section class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs">

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

        <!-- Ajouter un appareil -->
        <div class="mt-5 pt-4 border-t border-gray-100">

          <p class="text-sm font-semibold text-gray-800">
            Ajouter cet appareil
          </p>

          <p class="mt-1 text-xs text-gray-500">
            Enregistrez un nouveau Passkey pour pouvoir vous connecter à votre compte depuis cet appareil.
          </p>

          <p
            v-if="deviceMessage"
            class="mt-3 text-sm text-green-600"
          >
            {{ deviceMessage }}
          </p>

          <button
            @click="handleAddDevice"
            :disabled="deviceLoading"
            class="mt-3 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-all"
          >
            {{ deviceLoading ? 'Patientez...' : 'Ajouter un moyen d’accès' }}
          </button>

        </div>

        <!-- Erreur -->
        <p
          v-if="error"
          class="mt-3 text-sm text-red-600"
        >
          {{ error }}
        </p>
        
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