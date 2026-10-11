<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getExercises, getUserExercises, type ApiExercise } from '../api/exercises'
import { useSets } from '../composables/useSets'
import { useI18n } from 'vue-i18n'
import { exerciseName } from '../i18n'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    required?: boolean
    source?: 'user' | 'sets'
  }>(),
  {
    modelValue: null,
    required: true,
    source: 'user'
  }
)

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
}>()

const { t } = useI18n()
const { sets } = useSets()

const exercises = ref<ApiExercise[]>([])
const loading = ref(false)

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
      const catalog = await getExercises()
      const setReps = new Map<string, number>()

      sets.value
        .filter(set => !set.deletedAt)
        .forEach(set => {
          setReps.set(
            set.exercise,
            (setReps.get(set.exercise) ?? 0) + set.reps
          )
        })

      exercises.value = catalog
        .filter(exercise => setReps.has(exercise.id))
        .sort(
          (a, b) =>
            (setReps.get(b.id) ?? 0) -
            (setReps.get(a.id) ?? 0)
        )
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
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base font-medium shadow-xs transition-all',
        selectedExercise === ex.id
          ? 'bg-amber-500 text-white shadow-amber-200'
          : 'bg-white text-gray-700 border border-gray-200/60'
      ]"
    >
      <span>{{ ex.id }}</span>
    </button>

    <button
      v-if="hiddenCount > 0"
      type="button"
      class="px-3 py-1.5 rounded-xl text-base font-medium text-amber-700 border border-dashed border-amber-300 bg-white transition-all"
      @click="showAll = true"
    >
      +{{ hiddenCount }}
    </button>
  </div>

  <p
    v-if="currentExercise"
    class="px-5 text-base font-medium text-amber-600 mt-0.5"
  >
    {{ exerciseName(currentExercise) }}
  </p>

  <p
    v-else-if="!loading && !props.required"
    class="px-5 text-sm font-medium text-gray-400 mt-0.5"
  >
    {{ t('selector.all') }}
  </p>

  <!-- Tous les exercices -->
  <Teleport to="body">
    <div
      v-if="showAll"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs sm:items-center sm:p-4"
      @click.self="showAll = false"
    >
      <div class="w-full max-w-md max-h-[80dvh] flex flex-col rounded-t-[32px] border border-amber-100 bg-[#fdf8f5] p-6 shadow-2xl sm:rounded-3xl">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-bold text-gray-900">
            {{ t('selector.title') }}
          </h3>
          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200/60 text-gray-600"
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
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-base font-medium shadow-xs transition-all',
              selectedExercise === ex.id
                ? 'bg-amber-500 text-white shadow-amber-200'
                : 'bg-white text-gray-700 border border-gray-200/60'
            ]"
          >
            <span>{{ ex.id }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
