<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useExerciseStore } from '../stores/exercise'
import { getUserExercises, type UserExercise } from '../api/exercises'

const props = withDefaults(
  defineProps<{
    required?: boolean
  }>(),
  {
    required: true
  }
)

const exerciseStore = useExerciseStore()

const exercises = ref<UserExercise[]>([])
const loading = ref(false)

const loadExercises = async () => {
  loading.value = true

  try {
    exercises.value = await getUserExercises()

    // L'exercice actuellement mémorisé existe-t-il encore ?
    const currentExists = exercises.value.some(
      exercise => exercise.id === exerciseStore.selectedExercise
    )

    if (!currentExists) {
      if (props.required && exercises.value.length > 0) {
        exerciseStore.setExercise(exercises.value[0].id)
      } else {
        exerciseStore.setExercise(null)
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement des exercices', error)
  } finally {
    loading.value = false
  }
}

const handleSelect = (id: string) => {
  if (!props.required && exerciseStore.selectedExercise === id) {
    exerciseStore.setExercise(null)
  } else {
    exerciseStore.setExercise(id)
  }
}

const currentExercise = computed(() => {
  if (!exerciseStore.selectedExercise) {
    return null
  }

  return exercises.value.find(
    exercise => exercise.id === exerciseStore.selectedExercise
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
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium shadow-xs transition-all',
        exerciseStore.selectedExercise === ex.id
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
    v-else-if="!loading"
    class="px-5 text-sm font-medium text-gray-400 mt-0.5"
  >
    Aucun exercice sélectionné
  </p>
</template>