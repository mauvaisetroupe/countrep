<script setup lang="ts">
import { exercises } from '../exercises'
import { useExerciseStore } from '../stores/exercise'

const exerciseStore = useExerciseStore()
</script>

<template>
  <div class="px-5 flex gap-3 overflow-x-auto no-scrollbar pb-2">
    <button 
      v-for="ex in exercises" 
      :key="ex.name"
      @click="exerciseStore.setExercise(ex.name)"
      :class="[
        'flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium shadow-xs transition-all whitespace-nowrap',
        exerciseStore.selectedExercise === ex.name 
          ? 'bg-amber-500 text-white shadow-amber-200' 
          : 'bg-white text-gray-700 border border-gray-200/60'
      ]"
    >
      <span>{{ ex.icon }}</span>
      <span>{{ ex.name }}</span>
    </button>
  </div>
</template>