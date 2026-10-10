<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <header>
    <router-link
      to="/settings"
      class="inline-flex items-center gap-1 text-sm font-medium text-amber-600"
    >
      <span class="text-lg leading-none">‹</span>
      Réglages
    </router-link>

    <h1 class="mt-2 text-2xl font-bold text-gray-900">
      {{ title }}
    </h1>
  </header>
</template>
