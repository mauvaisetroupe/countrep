<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{
  title: string
  backTo?: string
  // Par défaut : « Réglages »
  backLabel?: string
}>(), {
  backTo: '/settings'
})

const { t } = useI18n()
</script>

<template>
  <header>
    <router-link
      :to="backTo"
      class="inline-flex items-center gap-1 text-sm font-medium text-amber-600"
    >
      <span class="text-lg leading-none">‹</span>
      {{ backLabel ?? t('nav.settings') }}
    </router-link>

    <h1 class="mt-2 page-title">
      {{ title }}
    </h1>
  </header>
</template>
