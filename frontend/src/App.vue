<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] text-gray-900 pb-28 font-sans select-none">
    <router-view />
  <nav
    class="fixed bottom-0 left-0 right-0 bg-[#fdf8f5]/90 backdrop-blur-md border-t border-amber-100/60 px-4 py-3 flex justify-around items-center z-20"
  >
    <!-- Aujourd'hui -->
    <router-link
      to="/today"
      :class="[
        'flex flex-col items-center gap-1 transition-colors',
        route.name === 'today'
          ? 'text-amber-600 font-bold'
          : 'text-gray-400'
      ]"
    >
      <span class="text-xl">📅</span>
      <span class="text-xs">Aujourd'hui</span>
    </router-link>

    <!-- Journal -->
    <router-link
      to="/journal"
      :class="[
        'flex flex-col items-center gap-1 transition-colors',
        route.name === 'journal'
          ? 'text-amber-600 font-bold'
          : 'text-gray-400'
      ]"
    >
      <span class="text-xl">📋</span>
      <span class="text-xs">Journal</span>
    </router-link>

    <!-- Statistiques -->
    <router-link
      to="/stats"
      :class="[
        'flex flex-col items-center gap-1 transition-colors',
        route.name === 'stats'
          ? 'text-amber-600 font-bold'
          : 'text-gray-400'
      ]"
    >
      <span class="text-xl">📊</span>
      <span class="text-xs">Statistiques</span>
    </router-link>

    <!-- Profil -->
    <router-link
      to="/profile"
      :class="[
        'flex flex-col items-center gap-1 transition-colors',
        route.name === 'profile'
          ? 'text-amber-600 font-bold'
          : 'text-gray-400'
      ]"
    >
      <span class="text-xl">👤</span>
      <span class="text-xs">Profil</span>
    </router-link>
  </nav>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>