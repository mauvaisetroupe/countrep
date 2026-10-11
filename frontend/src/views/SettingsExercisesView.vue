<script setup lang="ts">
import SettingsHeader from '../components/SettingsHeader.vue'
import UserExercises from '../components/UserExercises.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <SettingsHeader :title="t('settings.exercises.title')" />

    <main class="mt-6">
      <section class="bg-surface rounded-xl p-5">
        <UserExercises />
      </section>
    </main>

  </div>
</template>
