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
import { useSets } from '../composables/useSets'
import { VueDraggable } from 'vue-draggable-plus'
import { reorderOptions } from '../reorder'
import { useI18n } from 'vue-i18n'
import { exerciseAltName, exerciseName } from '../i18n'

const MAX_EXERCISES = 10

const { t } = useI18n()
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


const { sets } = useSets()

const selectedCount = computed(() => {
  return selectedExerciseIds.value.length
})

const exerciseById = (id: string) => {
  return exercises.value.find(exercise => exercise.id === id)
}

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

const setCountByExercise = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}

  sets.value.forEach(set => {
    if (set.deletedAt) {
      return
    }

    counts[set.exercise] = (counts[set.exercise] || 0) + 1
  })

  return counts
})

const getSetCount = (exerciseId: string) => {
  return setCountByExercise.value[exerciseId] || 0
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
      err.message || t('exercises.loadError')
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

    saveMessage.value = t('exercises.saved')
  } catch (err: any) {
    console.error(err)

    error.value =
      err.message || t('exercises.saveError')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadExercises()
})
</script>

<template>
  <section>
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-gray-800">
          {{ t('settings.exercises.title') }}
        </p>

        <p class="mt-1 text-xs text-gray-500">
          {{ t('exercises.intro', { max: MAX_EXERCISES }) }}
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
      v-if="selectedExerciseIds.length > 0"
      class="mt-4 space-y-2"
    >
      <VueDraggable
        v-model="selectedExerciseIds"
        v-bind="reorderOptions"
        class="space-y-2"
        @end="saveMessage = ''"
      >
      <div
        v-for="(exerciseId, index) in selectedExerciseIds"
        :key="exerciseId"
        class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 bg-amber-50 border-amber-400"
      >
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white"
        >
          {{ index + 1 }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-800">
            {{ exerciseName(exerciseById(exerciseId)) || exerciseId }}
          </p>

          <div class="mt-0.5 flex items-center gap-2">
            <p class="text-xs text-gray-400">
              {{ exerciseAltName(exerciseById(exerciseId)) }}
            </p>

            <span
              v-if="getSetCount(exerciseId) > 0"
              class="text-[10px] font-semibold text-amber-600"
            >
              {{ t('exercises.setCount', getSetCount(exerciseId)) }}
            </span>
          </div>
        </div>

        <button
          type="button"
          class="shrink-0 text-gray-400 hover:text-red-500 text-lg"
          :aria-label="t('exercises.remove')"
          @click.stop="toggleExercise(exerciseId)"
        >
          ×
        </button>

        <button
          type="button"
          class="drag-handle shrink-0 text-gray-300 hover:text-gray-500 text-xl leading-none touch-none select-none cursor-grab active:cursor-grabbing"
          :aria-label="t('exercises.move')"
        >
          ⋮⋮⋮
        </button>
      </div>
      </VueDraggable>

      <p class="pt-1 text-xs text-gray-400 text-center">
        {{ t('exercises.dragHint') }}
      </p>

      <button
        type="button"
        :disabled="!hasChanges || saving"
        class="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-all"
        @click="saveExercises"
      >
        {{ saving ? t('common.saving') : t('common.save') }}
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
        {{ t('exercises.noneSelected') }}
      </p>

      <p class="mt-1 text-xs text-gray-400">
        {{ t('exercises.addBelow') }}
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

        {{ showExercisePicker ? t('common.close') : t('exercises.add') }}
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
          :placeholder="t('exercises.search')"
          class="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
      </div>

      <p
        v-if="loading"
        class="mt-4 text-sm text-gray-500"
      >
        {{ t('exercises.loading') }}
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
        {{ t('exercises.notFound') }}
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
              {{ exerciseName(exercise) }}
            </p>

            <div class="mt-0.5">
              <p class="text-xs text-gray-400">
                {{ exerciseAltName(exercise) }}
              </p>

              <span
                v-if="getSetCount(exercise.id) > 0"
                class="text-[10px] font-semibold text-amber-600"
              >
                {{ t('exercises.setCount', getSetCount(exercise.id)) }}
              </span>

              <a
                v-if="exercise.liftmanualUrl"
                :href="exercise.liftmanualUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block mt-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                :title="t('exercises.guideTitle')"
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
        {{ t('exercises.maxReached', { max: MAX_EXERCISES }) }}
      </p>
    </div>
  </section>
</template>