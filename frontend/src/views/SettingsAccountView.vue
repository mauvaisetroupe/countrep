<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { addDevice } from '../services/auth'
import { logoutSafely } from '../services/session'
import SettingsHeader from '../components/SettingsHeader.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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
    deviceMessage.value = t('account.deviceAdded')
  } catch (err: any) {
    console.error(err)
    error.value = err.message || t('account.deviceError')
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
    return { error: t('account.decodeError') }
  }
})
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <SettingsHeader :title="t('settings.account.title')" />

    <main class="mt-6 space-y-4">

      <!-- =====================================================
           PROFIL ACTIF (CONNECTÉ)
      ====================================================== -->

      <section class="bg-surface rounded-xl p-5">

        <div class="flex items-center gap-3">

          <!-- Avatar -->
          <div
            class="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center"
          >
            🔒
          </div>

          <!-- Informations -->
          <div class="min-w-0">

            <p class="text-sm font-semibold text-fg">
              {{ t('account.sessionActive') }}
            </p>

            <p class="text-xs text-fg-secondary font-mono truncate">
              {{ t('account.jwt') }}
            </p>

            <p class="text-sm font-semibold text-fg">
              Raw Token
            </p>

            <p class="text-xs text-fg-secondary font-mono truncate">
              {{ authStore.token }}
            </p>

            <p class="text-sm font-semibold text-fg">
              Decoded Token
            </p>

            <p class="text-xs text-fg-secondary font-mono">
              {{ JSON.stringify(decodedToken, null, 2) }}
            </p>

          </div>
        </div>

        <!-- Ajouter un appareil -->
        <div class="mt-5 pt-4 border-t border-line">

          <p class="text-sm font-semibold text-fg">
            {{ t('account.addDeviceTitle') }}
          </p>

          <p class="mt-1 text-xs text-fg-secondary">
            {{ t('account.addDeviceHint') }}
          </p>

          <p
            v-if="deviceMessage"
            class="mt-3 text-sm text-success"
          >
            {{ deviceMessage }}
          </p>

          <button
            @click="handleAddDevice"
            :disabled="deviceLoading"
            class="mt-3 w-full bg-primary hover:bg-primary/90 disabled:bg-surface-alt disabled:text-fg-muted disabled:cursor-not-allowed text-on-primary font-semibold py-3 rounded-xl transition-all"
          >
            {{ deviceLoading ? t('common.wait') : t('account.addDevice') }}
          </button>

        </div>

        <!-- Erreur -->
        <p
          v-if="error"
          class="mt-3 text-sm text-danger"
        >
          {{ error }}
        </p>
        
        <!-- Déconnexion / Changer de profil -->
        <button
          @click="logout"
          class="mt-4 w-full bg-surface-alt hover:bg-surface-alt text-fg-secondary font-semibold py-3 rounded-xl transition-colors"
        >
          {{ t('account.logout') }}
        </button>

      </section>

    </main>

  </div>
</template>