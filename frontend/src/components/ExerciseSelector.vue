<script setup lang="ts">
import { exercises } from '../exercises'
import { useExerciseStore } from '../stores/exercise'

const exerciseStore = useExerciseStore()
</script>

<template>
  <div class="px-5 flex flex-wrap gap-2 pb-2">
    <button 
      v-for="ex in exercises" 
      :key="ex.name"
      @click="exerciseStore.setExercise(ex.name)"
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
</template>