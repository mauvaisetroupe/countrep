<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SettingsHeader from '../components/SettingsHeader.vue'
import WorkoutCard from '../components/WorkoutCard.vue'
import { getWorkouts, type Workout } from '../api/workouts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const workouts = ref<Workout[]>([])
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true

  try {
    workouts.value = await getWorkouts()
  } catch (err: any) {
    console.error(err)
    error.value = err.message || t('workouts.loadError')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <SettingsHeader :title="t('settings.workouts.title')" />

    <p class="mt-2 text-sm text-gray-500">
      {{ t('workouts.intro') }}
    </p>

    <main class="mt-6 space-y-3">

      <p v-if="loading" class="text-sm text-gray-500">
        {{ t('workouts.loading') }}
      </p>

      <p v-else-if="error" class="text-sm text-red-600">
        {{ error }}
      </p>

      <template v-else>

        <router-link
          v-for="workout in workouts"
          :key="workout.id"
          :to="`/settings/workouts/${workout.id}`"
          class="block bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs active:bg-amber-50 transition-colors"
        >
          <WorkoutCard :workout="workout">
            <template #trailing>
              <span class="text-xl text-gray-300">›</span>
            </template>
          </WorkoutCard>
        </router-link>

        <div
          v-if="workouts.length === 0"
          class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center"
        >
          <p class="text-sm font-medium text-gray-600">
            {{ t('workouts.empty') }}
          </p>
        </div>

        <router-link
          to="/settings/workouts/new"
          class="flex w-full items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
        >
          <span class="text-lg leading-none">+</span>
          {{ t('workouts.new') }}
        </router-link>

      </template>

    </main>

  </div>
</template>
