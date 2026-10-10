<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  backTo?: string
  backLabel?: string
}>(), {
  backTo: '/settings',
  backLabel: 'Réglages'
})
</script>

<template>
  <header>
    <router-link
      :to="backTo"
      class="inline-flex items-center gap-1 text-sm font-medium text-amber-600"
    >
      <span class="text-lg leading-none">‹</span>
      {{ backLabel }}
    </router-link>

    <h1 class="mt-2 page-title">
      {{ title }}
    </h1>
  </header>
</template>
