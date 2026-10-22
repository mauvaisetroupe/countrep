<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { deleteAccount, logoutSafely } from '../services/session'
import { getProfile, type AccountProfile } from '../services/auth'
import SettingsHeader from '../components/SettingsHeader.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const authStore = useAuthStore()
const router = useRouter()

// Compte connecté par Google (ADR 0013) : nom affiché
const profile = ref<AccountProfile | null>(null)

const loadProfile = async () => {
  if (!authStore.isAuthenticated) return
  profile.value = await getProfile().catch(() => null)
}

onMounted(loadProfile)

// Déconnexion (ADR 0014) : on reste dans l'application, en local. Avec
// `wipe`, les données de ce téléphone sont aussi effacées.
const logout = async (wipe: boolean) => {
  if (!(await logoutSafely({ wipe }))) {
    return
  }
  router.replace({ name: 'today' })
}

// Suppression du compte (ADR 0016) : serveur puis données de ce téléphone
const deleting = ref(false)
const deleteError = ref<string | null>(null)

const removeAccount = async () => {
  deleting.value = true
  deleteError.value = null
  try {
    if (await deleteAccount()) {
      router.replace({ name: 'today' })
    }
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : t('account.deleteFailed')
  } finally {
    deleting.value = false
  }
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
           SANS COMPTE (ADR 0014) : tout fonctionne en local
      ====================================================== -->

      <section v-if="!authStore.isAuthenticated" class="bg-surface rounded-xl p-5">
        <p class="text-sm font-semibold text-fg">
          {{ authStore.sessionExpired ? t('account.expiredTitle') : t('account.localTitle') }}
        </p>
        <p class="mt-1 text-sm text-fg-secondary">
          {{ t('account.localHint') }}
        </p>
        <router-link
          to="/login"
          class="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-3 font-semibold text-on-primary"
        >
          {{ t('login.signIn') }}
        </router-link>
      </section>

      <!-- =====================================================
           PROFIL ACTIF (CONNECTÉ)
      ====================================================== -->

      <section v-else class="bg-surface rounded-xl p-5">

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

        <!-- Compte Google -->
        <div class="mt-5 pt-4 border-t border-line">
          <p class="text-sm font-semibold text-fg">{{ t('account.googleTitle') }}</p>
          <p v-if="profile" class="mt-1 text-xs text-fg-secondary">
            {{ t('account.name') }} : {{ profile.name }}
          </p>
        </div>

        <!-- Déconnexion : garder ou effacer les données de ce téléphone -->
        <button
          @click="logout(false)"
          class="mt-4 w-full bg-surface-alt text-fg-secondary font-semibold py-3 rounded-xl transition-colors"
        >
          {{ t('account.logout') }}
        </button>
        <p class="mt-1.5 px-1 text-xs text-fg-muted">
          {{ t('account.logoutHint') }}
        </p>
        <button
          @click="logout(true)"
          class="mt-3 w-full bg-surface-alt text-danger font-semibold py-3 rounded-xl transition-colors"
        >
          {{ t('account.logoutWipe') }}
        </button>

      </section>

      <!-- Suppression du compte (ADR 0016) -->
      <section v-if="authStore.isAuthenticated" class="bg-surface rounded-xl p-5">
        <button
          @click="removeAccount"
          :disabled="deleting"
          class="w-full bg-surface-alt text-danger font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {{ deleting ? t('common.wait') : t('account.delete') }}
        </button>
        <p class="mt-1.5 px-1 text-xs text-fg-muted">
          {{ t('account.deleteHint') }}
        </p>
        <p v-if="deleteError" class="mt-2 px-1 text-sm text-danger">
          {{ deleteError }}
        </p>
      </section>

    </main>

  </div>
</template>