<script setup lang="ts">
import { ref } from 'vue'

// Fenêtre de saisie d'une série : heure, nombre de répétitions,
// ajout rapide. Utilisée en mode exercice et en mode séance.
const props = defineProps<{
  exerciseId: string
  exerciseName: string
  date: string
  // Valeur proposée (objectif de la séance), vide sinon
  initialReps?: number | null
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { reps: number, time: string }]
}>()

// Heure actuelle au format HH:MM
const getCurrentTime = () => {
  const date = new Date()

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

const repsValue = ref(props.initialReps ? String(props.initialReps) : '')
const time = ref(getCurrentTime())
const imageAvailable = ref(true)

const addQuick = (val: number) => {
  repsValue.value = String(val)
}

const save = () => {
  const reps = Number(repsValue.value)

  if (!Number.isInteger(reps) || reps <= 0) {
    return
  }

  emit('save', { reps, time: time.value })
}
</script>

<template>
  <div class="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
    <div class="bg-[#fdf8f5] w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl space-y-6 border border-amber-100 animate-in fade-in slide-in-from-bottom duration-200">

      <!-- En-tête de la modale -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2.5">
          <span class="bg-amber-500 text-white p-2 rounded-xl text-sm shadow-sm">⚡</span>
          <h3 class="text-xl font-bold text-gray-900">
            Ajouter {{ exerciseName }}
          </h3>
        </div>
        <button @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/60 text-gray-600 hover:bg-gray-200">
          ✕
        </button>
      </div>

      <!-- Illustration de l'exercice -->
      <img
        v-if="imageAvailable"
        :src="`/exercises/${exerciseId}.jpg`"
        :alt="`Illustration de ${exerciseName}`"
        class="w-full h-48 object-contain rounded-2xl bg-white border border-amber-100"
        @error="imageAvailable = false"
      />

      <!-- Date sélectionnée -->
      <div class="text-center text-sm text-gray-500">
        {{ date }}
      </div>

      <!-- Heure du set -->
      <div
        class="relative border-2 border-amber-600/70 rounded-2xl bg-white px-4 py-3 flex items-center gap-3 shadow-xs"
      >
        <span class="absolute -top-3 left-4 bg-white px-1.5 text-xs font-semibold text-amber-700">
          Heure
        </span>

        <span class="text-amber-600">
          🕐
        </span>

        <input
          type="time"
          v-model="time"
          class="w-full bg-transparent text-lg font-semibold text-gray-900 focus:outline-none"
        />
      </div>

      <!-- Question -->
      <p class="text-sm font-medium text-gray-800 text-center">
        Combien de {{ exerciseName }} avez-vous fait ?
      </p>

      <!-- Champ de saisie -->
      <div class="relative border-2 border-amber-600/70 rounded-2xl bg-white px-4 py-3 flex items-center gap-3 shadow-xs">
        <span class="absolute -top-3 left-4 bg-white px-1.5 text-xs font-semibold text-amber-700">Nombre</span>
        <span class="text-amber-600">⚡</span>
        <input
          type="number"
          v-model="repsValue"
          placeholder="Entrez un nombre"
          min="1"
          step="1"
          inputmode="numeric"
          class="w-full bg-transparent text-lg font-semibold text-gray-900 focus:outline-none placeholder:text-gray-300"
        />
      </div>

      <!-- Ajout rapide -->
      <div>
        <span class="text-xs font-semibold text-gray-500 block mb-2">
          Ajout rapide :
        </span>
        <div class="grid grid-cols-4 gap-2">
          <button v-for="n in [5, 10, 15, 20]" :key="n" @click="addQuick(n)"
            class="bg-white border border-gray-200/80 hover:border-amber-400 py-2.5 rounded-xl text-sm font-semibold text-gray-700 shadow-2xs active:scale-95 transition-all">
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Boutons de validation -->
      <div class="flex gap-3 pt-2">
        <button @click="emit('close')"
          class="flex-1 bg-transparent hover:bg-gray-100 text-gray-700 font-semibold py-3.5 rounded-2xl transition-colors">
          Annuler
        </button>
        <button @click="save"
          class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]">
          Enregistrer
        </button>
      </div>

    </div>
  </div>
</template>
