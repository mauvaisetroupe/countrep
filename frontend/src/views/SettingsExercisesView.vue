<script setup lang="ts">
import SettingsHeader from '../components/SettingsHeader.vue'
import UserExercises from '../components/UserExercises.vue'
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <SettingsHeader title="Exercices au quotidien" />

    <main class="mt-6">
      <section class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs">
        <UserExercises />
      </section>
    </main>

  </div>
</template>
