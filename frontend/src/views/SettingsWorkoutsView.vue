<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SettingsHeader from '../components/SettingsHeader.vue'
import WorkoutCard from '../components/WorkoutCard.vue'
import { useWorkouts } from '../composables/useWorkouts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Modèles locaux (ADR 0014)
const { workouts, load } = useWorkouts()
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true

  try {
    await load()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <SettingsHeader :title="t('settings.workouts.title')" />

    <p class="mt-2 text-sm text-fg-secondary">
      {{ t('workouts.intro') }}
    </p>

    <main class="mt-6 space-y-3">

      <p v-if="loading" class="text-sm text-fg-secondary">
        {{ t('workouts.loading') }}
      </p>

      <p v-else-if="error" class="text-sm text-danger">
        {{ error }}
      </p>

      <template v-else>

        <router-link
          v-for="workout in workouts"
          :key="workout.id"
          :to="`/settings/workouts/${workout.id}`"
          class="block bg-surface rounded-xl p-5 active:bg-primary-soft transition-colors"
        >
          <WorkoutCard :workout="workout">
            <template #trailing>
              <span class="text-xl text-fg-muted">›</span>
            </template>
          </WorkoutCard>
        </router-link>

        <div
          v-if="workouts.length === 0"
          class="rounded-xl border border-dashed border-line bg-surface px-4 py-5 text-center"
        >
          <p class="text-sm font-medium text-fg-secondary">
            {{ t('workouts.empty') }}
          </p>
        </div>

        <router-link
          to="/settings/workouts/new"
          class="flex w-full items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          <span class="text-lg leading-none">+</span>
          {{ t('workouts.new') }}
        </router-link>

      </template>

    </main>

  </div>
</template>
