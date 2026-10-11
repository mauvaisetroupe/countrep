<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getExercises, getUserExercises, type ApiExercise } from '../api/exercises'
import type { LocalSet } from '../db'
import { useI18n } from 'vue-i18n'
import { exerciseName } from '../i18n'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    required?: boolean
    // 'sets' : les exercices déjà saisis, d'après les sets de l'écran
    // (passés en prop, pour suivre leur chargement et leur synchro)
    source?: 'user' | 'sets'
    sets?: LocalSet[]
  }>(),
  {
    modelValue: null,
    required: true,
    source: 'user',
    sets: () => []
  }
)

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
}>()

const { t } = useI18n()

const exercises = ref<ApiExercise[]>([])
const catalog = ref<ApiExercise[]>([])
const loading = ref(false)

// Exercices déjà saisis, du plus pratiqué au moins pratiqué
const exercisesFromSets = () => {
  const setReps = new Map<string, number>()

  props.sets
    .filter(set => !set.deletedAt)
    .forEach(set => {
      setReps.set(
        set.exercise,
        (setReps.get(set.exercise) ?? 0) + set.reps
      )
    })

  return catalog.value
    .filter(exercise => setReps.has(exercise.id))
    .sort(
      (a, b) =>
        (setReps.get(b.id) ?? 0) -
        (setReps.get(a.id) ?? 0)
    )
}

const selectedExercise = computed({
  get: () => props.modelValue,
  set: (id: string | null) => {
    emit('update:modelValue', id)
  }
})

const loadExercises = async () => {
  loading.value = true

  try {
    if (props.source === 'user') {
      exercises.value = await getUserExercises()
    } else {
      catalog.value = await getExercises()
      exercises.value = exercisesFromSets()
    }

    // Pour une sélection obligatoire, on sélectionne
    // le premier exercice si la sélection actuelle est invalide.
    if (props.required) {
      const currentExists = exercises.value.some(
        exercise => exercise.id === selectedExercise.value
      )

      if (!currentExists && exercises.value.length > 0) {
        selectedExercise.value = exercises.value[0].id
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des exercices', error)
  } finally {
    loading.value = false
  }
}

const handleSelect = (id: string) => {
  if (!props.required && selectedExercise.value === id) {
    selectedExercise.value = null
  } else {
    selectedExercise.value = id
  }
}

// Au-delà de VISIBLE_COUNT exercices, les autres sont dans un panneau.
// L'exercice sélectionné reste toujours visible.
const VISIBLE_COUNT = 4

const showAll = ref(false)

const visibleExercises = computed(() => {
  const first = exercises.value.slice(0, VISIBLE_COUNT)

  if (
    !selectedExercise.value ||
    first.some(exercise => exercise.id === selectedExercise.value)
  ) {
    return first
  }

  const selected = exercises.value.find(exercise => exercise.id === selectedExercise.value)

  return selected ? [...first.slice(0, VISIBLE_COUNT - 1), selected] : first
})

const hiddenCount = computed(() => exercises.value.length - visibleExercises.value.length)

const selectFromAll = (id: string) => {
  handleSelect(id)
  showAll.value = false
}

const currentExercise = computed(() => {
  if (!selectedExercise.value) {
    return null
  }

  return exercises.value.find(
    exercise => exercise.id === selectedExercise.value
  )
})

onMounted(() => {
  loadExercises()
})

// Les sets arrivent après l'affichage (IndexedDB, puis synchro)
watch(() => props.sets, () => {
  if (props.source === 'sets') {
    exercises.value = exercisesFromSets()
  }
})
</script>

<template>
  <div
    v-if="!loading"
    class="px-5 flex flex-wrap gap-2 pb-2"
  >
    <button
      v-for="ex in visibleExercises"
      :key="ex.id"
      type="button"
      @click="handleSelect(ex.id)"
      :class="[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base font-medium transition-all',
        selectedExercise === ex.id
          ? 'bg-primary text-on-primary'
          : 'bg-surface-alt text-fg-secondary'
      ]"
    >
      <span>{{ ex.id }}</span>
    </button>

    <button
      v-if="hiddenCount > 0"
      type="button"
      class="px-3 py-1.5 rounded-xl text-base font-medium text-primary border border-dashed border-primary bg-surface transition-all"
      @click="showAll = true"
    >
      +{{ hiddenCount }}
    </button>
  </div>

  <p
    v-if="currentExercise"
    class="px-5 text-base font-medium text-primary mt-0.5"
  >
    {{ exerciseName(currentExercise) }}
  </p>

  <p
    v-else-if="!loading && !props.required"
    class="px-5 text-sm font-medium text-fg-muted mt-0.5"
  >
    {{ t('selector.all') }}
  </p>

  <!-- Tous les exercices -->
  <Teleport to="body">
    <div
      v-if="showAll"
      class="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-xs sm:items-center sm:p-4"
      @click.self="showAll = false"
    >
      <div class="w-full max-w-md max-h-[80dvh] flex flex-col rounded-t-[32px] bg-card p-6 shadow-2xl sm:rounded-xl">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-bold text-fg">
            {{ t('selector.title') }}
          </h3>
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-fg-secondary"
            :aria-label="t('common.close')"
            @click="showAll = false"
          >
            ✕
          </button>
        </div>

        <div class="mt-4 flex flex-wrap gap-2 overflow-y-auto">
          <button
            v-for="ex in exercises"
            :key="ex.id"
            type="button"
            :title="exerciseName(ex)"
            @click="selectFromAll(ex.id)"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base font-medium transition-all',
              selectedExercise === ex.id
                ? 'bg-primary text-on-primary'
                : 'bg-surface-alt text-fg-secondary'
            ]"
          >
            <span>{{ ex.id }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
