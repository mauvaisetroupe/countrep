<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SettingsHeader from '../components/SettingsHeader.vue'
import { getRoutines, type Routine } from '../api/routines'

const routines = ref<Routine[]>([])
const loading = ref(false)
const error = ref('')

const repsPerRound = (routine: Routine) => {
  return routine.exercises.reduce((total, exercise) => total + exercise.reps, 0)
}

onMounted(async () => {
  loading.value = true

  try {
    routines.value = await getRoutines()
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Erreur lors du chargement des séances'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <SettingsHeader title="Mes séances" />

    <p class="mt-2 text-sm text-gray-500">
      Une séance enchaîne plusieurs exercices, chacun avec son nombre de
      répétitions, répétés sur plusieurs séries.
    </p>

    <main class="mt-6 space-y-3">

      <p v-if="loading" class="text-sm text-gray-500">
        Chargement des séances...
      </p>

      <p v-else-if="error" class="text-sm text-red-600">
        {{ error }}
      </p>

      <template v-else>

        <router-link
          v-for="routine in routines"
          :key="routine.id"
          :to="`/settings/routines/${routine.id}`"
          class="block bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs active:bg-amber-50 transition-colors"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-base font-semibold text-gray-800 truncate">
              {{ routine.name }}
            </p>
            <span class="text-xl text-gray-300">›</span>
          </div>

          <p class="mt-1 text-xs text-gray-500">
            {{ routine.rounds }} {{ routine.rounds > 1 ? 'séries' : 'série' }}
            · {{ routine.exercises.length }}
            {{ routine.exercises.length > 1 ? 'exercices' : 'exercice' }}
            · {{ repsPerRound(routine) }} reps par série
          </p>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="(exercise, index) in routine.exercises"
              :key="index"
              class="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs text-amber-800"
            >
              {{ exercise.reps }} × {{ exercise.nameFr }}
            </span>
          </div>
        </router-link>

        <div
          v-if="routines.length === 0"
          class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center"
        >
          <p class="text-sm font-medium text-gray-600">
            Aucune séance pour l'instant.
          </p>
        </div>

        <router-link
          to="/settings/routines/new"
          class="flex w-full items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
        >
          <span class="text-lg leading-none">+</span>
          Nouvelle séance
        </router-link>

      </template>

    </main>

  </div>
</template>
