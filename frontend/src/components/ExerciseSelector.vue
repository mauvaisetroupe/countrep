<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getExercises, getUserExercises, type ApiExercise } from '../api/exercises'
import { useWorkouts } from '../composables/useWorkouts'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    required?: boolean
    source?: 'user' | 'workouts'
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

const { workouts } = useWorkouts()

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
      const workoutReps = new Map<string, number>()

      workouts.value
        .filter(workout => !workout.deletedAt)
        .forEach(workout => {
          workoutReps.set(
            workout.exercise,
            (workoutReps.get(workout.exercise) ?? 0) + workout.reps
          )
        })

      exercises.value = catalog
        .filter(exercise => workoutReps.has(exercise.id))
        .sort(
          (a, b) =>
            (workoutReps.get(b.id) ?? 0) -
            (workoutReps.get(a.id) ?? 0)
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
      v-for="ex in exercises"
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
  </div>

  <p
    v-if="currentExercise"
    class="px-5 text-sm font-medium text-amber-600 mt-0.5"
  >
    {{ currentExercise.nameFr }}
  </p>

  <p
    v-else-if="!loading && !props.required"
    class="px-5 text-sm font-medium text-gray-400 mt-0.5"
  >
    Tous les exercices
  </p>
</template>