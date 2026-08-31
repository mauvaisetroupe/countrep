<script setup lang="ts">
import { exercises } from '../exercises'
import { useExerciseStore } from '../stores/exercise'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    required?: boolean
  }>(),
  {
    required: true
  }
)

const exerciseStore = useExerciseStore()

// Si requis et que le store est vide, on force le premier exercice
if (props.required && !exerciseStore.selectedExercise && exercises.length > 0) {
  exerciseStore.setExercise(exercises[0].name)
}

const handleSelect = (name: string) => {
  if (!props.required && exerciseStore.selectedExercise === name) {
    // Si non requis et qu'on clique sur l'actif -> Désélection
    exerciseStore.setExercise(null)
  } else {
    // Sinon -> Sélection normale
    exerciseStore.setExercise(name)
  }
}

const currentExercise = computed(() => {
  if (!exerciseStore.selectedExercise) {
    return null
  }
  return exercises.find(
    ex => ex.name === exerciseStore.selectedExercise
  )
})
</script>

<template>
  <div class="px-5 flex flex-wrap gap-2 pb-2">
    <button
      v-for="ex in exercises" 
      :key="ex.name"
      @click="handleSelect(ex.name)"
      :class="[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium shadow-xs transition-all',
        exerciseStore.selectedExercise === ex.name 
          ? 'bg-amber-500 text-white shadow-amber-200' 
          : 'bg-white text-gray-700 border border-gray-200/60'
      ]"
    >
      <span>{{ ex.shortName }}</span>
    </button>
  </div>
  <p class="px-5 text-sm font-medium text-amber-600 mt-0.5">
    {{ currentExercise ? `${currentExercise.icon} ${currentExercise.name}` : 'Tous les exercices' }}
  </p>
</template>