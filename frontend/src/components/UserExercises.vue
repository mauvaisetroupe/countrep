<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import {
  getExercises,
  getUserExercises,
  updateUserExercises,
  type ApiExercise,
  type UserExercise
} from '../api/exercises'
import { useWorkouts } from '../composables/useWorkouts'

const MAX_EXERCISES = 6

const authStore = useAuthStore()

const exercises = ref<ApiExercise[]>([])
const userExercises = ref<UserExercise[]>([])

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const saveMessage = ref('')

const selectedExerciseIds = ref<string[]>([])
const searchQuery = ref('')

const { workouts } = useWorkouts()

const selectedCount = computed(() => {
  return selectedExerciseIds.value.length
})

const filteredExercises = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return exercises.value
  }

  return exercises.value.filter(exercise =>
    exercise.nameFr.toLowerCase().includes(query) ||
    exercise.nameEn.toLowerCase().includes(query)
  )
})

const workoutCountByExercise = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}

  workouts.value.forEach(workout => {
    if (workout.deletedAt) {
      return
    }

    counts[workout.exercise] = (counts[workout.exercise] || 0) + 1
  })

  return counts
})

const getWorkoutCount = (exerciseId: string) => {
  return workoutCountByExercise.value[exerciseId] || 0
}

const hasChanges = computed(() => {
  const currentIds = [...userExercises.value]
    .sort((a, b) => a.position - b.position)
    .map(exercise => exercise.id)

  if (currentIds.length !== selectedExerciseIds.value.length) {
    return true
  }

  return currentIds.some(
    (id, index) => id !== selectedExerciseIds.value[index]
  )
})

const isSelected = (exerciseId: string) => {
  return selectedExerciseIds.value.includes(exerciseId)
}

const loadExercises = async () => {
  if (!authStore.token) return

  loading.value = true
  error.value = ''
  saveMessage.value = ''

  try {
    const [catalog, selected] = await Promise.all([
      getExercises(),
      getUserExercises()
    ])

    exercises.value = catalog
    userExercises.value = selected

    selectedExerciseIds.value = [...selected]
      .sort((a, b) => a.position - b.position)
      .map(exercise => exercise.id)
  } catch (err: any) {
    console.error(err)

    error.value =
      err.message || 'Erreur lors du chargement des exercices'
  } finally {
    loading.value = false
  }
}

const toggleExercise = (exerciseId: string) => {
  saveMessage.value = ''

  const index = selectedExerciseIds.value.indexOf(exerciseId)

  if (index !== -1) {
    selectedExerciseIds.value.splice(index, 1)
    return
  }

  if (selectedExerciseIds.value.length >= MAX_EXERCISES) {
    return
  }

  selectedExerciseIds.value.push(exerciseId)
}

const saveExercises = async () => {
  if (selectedExerciseIds.value.length > MAX_EXERCISES) {
    return
  }

  saving.value = true
  error.value = ''
  saveMessage.value = ''

  try {
    const selected = await updateUserExercises(
      selectedExerciseIds.value
    )

    userExercises.value = selected

    selectedExerciseIds.value = [...selected]
      .sort((a, b) => a.position - b.position)
      .map(exercise => exercise.id)

    saveMessage.value = 'Exercices enregistrés.'
  } catch (err: any) {
    console.error(err)

    error.value =
      err.message || 'Erreur lors de la sauvegarde des exercices'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadExercises()
})
</script>

<template>
  <section class="mt-5 pt-4 border-t border-gray-100">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-gray-800">
          Mes exercices
        </p>
        <p class="mt-1 text-xs text-gray-500">
          Choisissez jusqu'à {{ MAX_EXERCISES }} exercices à afficher
          dans Today et Journal.
        </p>
      </div>

      <div
        class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
        :class="
          selectedCount === MAX_EXERCISES
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-600'
        "
      >
        {{ selectedCount }} / {{ MAX_EXERCISES }}
      </div>
    </div>

    <div class="relative mt-4">
      <span
        class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      >
        🔎
      </span>

      <input
        v-model="searchQuery"
        type="search"
        placeholder="Rechercher un exercice..."
        class="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
      />
    </div>

    <p
      v-if="loading"
      class="mt-4 text-sm text-gray-500"
    >
      Chargement des exercices...
    </p>

    <p
      v-else-if="error"
      class="mt-4 text-sm text-red-600"
    >
      {{ error }}
    </p>

    <p
      v-else-if="filteredExercises.length === 0"
      class="mt-4 text-sm text-gray-500 text-center"
    >
      Aucun exercice trouvé.
    </p>

    <div
      v-else
      class="mt-4 space-y-2"
    >
      <button
        v-for="exercise in filteredExercises"
        :key="exercise.id"
        type="button"
        :disabled="
          !isSelected(exercise.id) &&
          selectedCount >= MAX_EXERCISES
        "
        class="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all"
        :class="
          isSelected(exercise.id)
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-200 bg-white'
        "
        @click="toggleExercise(exercise.id)"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-800">
            {{ exercise.nameFr }}
          </p>

          <div class="mt-0.5 flex items-center gap-2">
            <p class="text-xs text-gray-400">
              {{ exercise.nameEn }}
            </p>

            <span
              v-if="getWorkoutCount(exercise.id) > 0"
              class="text-[10px] font-semibold text-amber-600"
            >
              {{ getWorkoutCount(exercise.id) }}
              {{ getWorkoutCount(exercise.id) === 1 ? 'séance' : 'séances' }}
            </span>
          </div>
        </div>

        <div
          class="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
          :class="
            isSelected(exercise.id)
              ? 'border-amber-500 bg-amber-500 text-white'
              : 'border-gray-300 bg-white'
          "
        >
          <svg
            v-if="isSelected(exercise.id)"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="h-4 w-4"
          >
            <path
              fill-rule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-7.25 9a.75.75 0 0 1-1.127.075l-4.25-4a.75.75 0 1 1 1.03-1.09l3.658 3.443 6.722-8.34a.75.75 0 0 1 1.074-.14.75.75 0 0 1 .14 1.074Z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </button>
    </div>

    <p
      v-if="selectedCount === MAX_EXERCISES"
      class="mt-3 text-xs text-gray-500"
    >
      Maximum de {{ MAX_EXERCISES }} exercices sélectionnés.
    </p>

    <button
      type="button"
      :disabled="!hasChanges || saving"
      class="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-all"
      @click="saveExercises"
    >
      {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
    </button>

    <p
      v-if="saveMessage"
      class="mt-2 text-center text-sm text-green-600"
    >
      {{ saveMessage }}
    </p>
  </section>
</template>