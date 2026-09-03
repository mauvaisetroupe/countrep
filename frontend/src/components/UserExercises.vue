<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
const showExercisePicker = ref(false)

const draggedExerciseId = ref<string | null>(null)
const draggedElement = ref<HTMLElement | null>(null)
const dragPointerId = ref<number | null>(null)
const dragStartY = ref(0)
const isDragging = ref(false)

const { workouts } = useWorkouts()

const selectedCount = computed(() => {
  return selectedExerciseIds.value.length
})

const selectedExercises = computed(() => {
  return selectedExerciseIds.value
    .map(id => exercises.value.find(exercise => exercise.id === id))
    .filter((exercise): exercise is ApiExercise => !!exercise)
})

const filteredExercises = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return exercises.value.filter(
      exercise => !selectedExerciseIds.value.includes(exercise.id)
    )
  }

  return exercises.value.filter(exercise =>
    !selectedExerciseIds.value.includes(exercise.id) &&
    (
      exercise.nameFr.toLowerCase().includes(query) ||
      exercise.nameEn.toLowerCase().includes(query)
    )
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

const toggleExercisePicker = () => {
  showExercisePicker.value = !showExercisePicker.value

  if (!showExercisePicker.value) {
    searchQuery.value = ''
  }
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

const startDrag = (
  id: string,
  event: PointerEvent
) => {
  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) {
    return
  }

  const element = target.parentElement

  if (!(element instanceof HTMLElement)) {
    return
  }

  draggedExerciseId.value = id
  draggedElement.value = element
  dragPointerId.value = event.pointerId
  dragStartY.value = event.clientY
  isDragging.value = true

  element.setPointerCapture(event.pointerId)

  event.preventDefault()
}

const moveDrag = (event: PointerEvent) => {
  if (
    !isDragging.value ||
    !draggedExerciseId.value ||
    dragPointerId.value !== event.pointerId
  ) {
    return
  }

  event.preventDefault()

  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-selected-exercise]')
  )

  const target = elements.find(element => {
    if (element === draggedElement.value) {
      return false
    }

    const rect = element.getBoundingClientRect()

    return (
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    )
  })

  if (!target) {
    return
  }

  const targetExerciseId = target.dataset.selectedExercise

  if (!targetExerciseId) {
    return
  }

  const fromIndex = selectedExerciseIds.value.indexOf(
    draggedExerciseId.value
  )

  const toIndex = selectedExerciseIds.value.indexOf(
    targetExerciseId
  )

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return
  }

  const reordered = [...selectedExerciseIds.value]
  const [moved] = reordered.splice(fromIndex, 1)

  reordered.splice(toIndex, 0, moved)

  selectedExerciseIds.value = reordered
  saveMessage.value = ''
}

const endDrag = (event: PointerEvent) => {
  if (
    dragPointerId.value !== null &&
    event.pointerId !== dragPointerId.value
  ) {
    return
  }

  if (
    draggedElement.value &&
    dragPointerId.value !== null
  ) {
    try {
      draggedElement.value.releasePointerCapture(
        dragPointerId.value
      )
    } catch {
      // Pointer capture may already have been released.
    }
  }

  draggedExerciseId.value = null
  draggedElement.value = null
  dragPointerId.value = null
  dragStartY.value = 0
  isDragging.value = false
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

  window.addEventListener('pointermove', moveDrag, {
    passive: false
  })

  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', moveDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
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
          Choisissez jusqu'à {{ MAX_EXERCISES }} exercices à pratiquer
          régulièrement. Faites-les glisser pour définir votre ordre de priorité.
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

    <!-- Exercices sélectionnés -->
    <div
      v-if="selectedExercises.length > 0"
      class="mt-4 space-y-2"
    >
      <div
        v-for="(exercise, index) in selectedExercises"
        :key="exercise.id"
        :data-selected-exercise="exercise.id"
        class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 bg-amber-50 border-amber-400 transition-all"
        :class="
          draggedExerciseId === exercise.id
            ? 'opacity-50 scale-[0.98]'
            : ''
        "
      >
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white"
        >
          {{ index + 1 }}
        </div>

        <div class="min-w-0 flex-1">
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

        <button
          type="button"
          class="shrink-0 text-gray-400 hover:text-red-500 text-lg"
          aria-label="Retirer cet exercice"
          @click.stop="toggleExercise(exercise.id)"
        >
          ×
        </button>

        <button
          type="button"
          class="shrink-0 text-gray-300 hover:text-gray-500 text-xl leading-none touch-none select-none cursor-grab active:cursor-grabbing"
          aria-label="Déplacer cet exercice"
          @pointerdown="startDrag(exercise.id, $event)"
        >
          ⋮⋮⋮
        </button>
      </div>

      <p class="pt-1 text-xs text-gray-400 text-center">
        ↕ Faites glisser les exercices pour modifier leur ordre.
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
    </div>

    <!-- Aucun exercice -->
    <div
      v-else
      class="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center"
    >
      <p class="text-sm font-medium text-gray-600">
        Aucun exercice sélectionné.
      </p>

      <p class="mt-1 text-xs text-gray-400">
        Ajoutez vos exercices ci-dessous.
      </p>
    </div>

    <!-- Bouton ajouter -->
    <div class="mt-5">
      <button
        type="button"
        class="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
        @click="toggleExercisePicker"
      >
        <span class="text-lg leading-none">
          {{ showExercisePicker ? '×' : '+' }}
        </span>

        {{ showExercisePicker ? 'Fermer' : 'Ajouter un exercice' }}
      </button>
    </div>

    <!-- Sélecteur d'exercices -->
    <div
      v-if="showExercisePicker"
      class="mt-4"
    >
      <div class="relative">
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

            <div class="mt-0.5">
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

              <a
                v-if="exercise.liftmanualUrl"
                :href="exercise.liftmanualUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block mt-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                title="Voir l'exercice sur Lift Manual"
                @click.stop
              >
                Guide
              </a>
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
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-7.25 9a.75.75 0 0 1-1.127.075l-4.25-4a.75.75 0 1 1 1.03-1.09l3.658 3.443 6.722-8.34a.75.75 0 0 1 1.074-.14l.14 1.074Z"
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
    </div>
  </section>
</template>