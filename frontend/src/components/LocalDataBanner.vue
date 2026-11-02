<script lang="ts">
import { ref } from 'vue'

// Masqué jusqu'au prochain lancement de l'application, pas au-delà : c'est
// un rappel. Hors du composant pour rester masqué en changeant d'onglet.
const dismissed = ref(false)
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

// Rappel sans compte (ADR 0014) : tant que l'utilisateur n'est pas
// connecté, ses saisies restent sur ce téléphone, sans sauvegarde.
const { t } = useI18n()
const authStore = useAuthStore()

const title = computed(() =>
  authStore.sessionExpired ? t('account.expiredTitle') : t('account.localTitle')
)
</script>

<template>
  <div
    v-if="!authStore.isAuthenticated && !dismissed"
    class="mx-3 mb-3 flex items-start gap-3 rounded-xl bg-warning-soft px-4 py-3"
    role="status"
  >
    <svg class="mt-0.5 h-5 w-5 shrink-0 text-warning" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <!-- Material « cloud_off » -->
      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46A5.497 5.497 0 0 1 17.5 11v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 17.6 24 16.15 24 14.5c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z" />
    </svg>

    <div class="min-w-0 flex-1 text-sm">
      <p class="font-semibold text-fg">
        {{ title }}
      </p>
      <p class="mt-0.5 text-fg-secondary">
        {{ t('localBanner.text') }}
      </p>
      <router-link
        to="/login"
        class="mt-1.5 inline-block font-semibold text-primary"
      >
        {{ t('login.signIn') }}
      </router-link>
    </div>

    <button
      type="button"
      class="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-muted"
      :aria-label="t('localBanner.dismiss')"
      @click="dismissed = true"
    >
      ✕
    </button>
  </div>
</template>
