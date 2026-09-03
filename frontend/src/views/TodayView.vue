<script setup lang="ts">
import { ref, computed } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import { useWorkouts } from '../composables/useWorkouts'
import { syncWorkout } from '../services/sync'
import { useExerciseStore } from '../stores/exercise'
import type { LocalWorkout } from '../db'
import { getUserExercises, type UserExercise } from '../api/exercises'
import TodayCalendar from '../components/TodayCalendar.vue'

const exerciseStore = useExerciseStore()
const userExercises = ref<UserExercise[]>([])

const selectedExerciseName = computed(() => {
  if (!exerciseStore.selectedExercise) {
    return ''
  }

  return (
    userExercises.value.find(
      exercise => exercise.id === exerciseStore.selectedExercise
    )?.nameFr ||
    exerciseStore.selectedExercise
  )
})

const loadUserExercises = async () => {
  try {
    userExercises.value = await getUserExercises()
  } catch (error) {
    console.error(
      'Erreur lors du chargement des exercices',
      error
    )
  }
}

// ============================================================
// DATE / CALENDRIER
// ============================================================

const now = new Date()

// Date réelle d'aujourd'hui
const realYear = now.getFullYear()
const realMonthIndex = now.getMonth()
const realDay = now.getDate()

// Heure actuelle
const getCurrentTime = () => {
  const date = new Date()

  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

// Formater une date au format YYYY-MM-DD
const formatDate = (
  year: number,
  monthIndex: number,
  day: number
) => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Date actuellement sélectionnée
const selectedDate = ref(
  formatDate(realYear, realMonthIndex, realDay)
)


// ============================================================
// MODALE
// ============================================================

const showModal = ref(false)

const repsValue = ref('')

// Heure du workout
// Par défaut : heure actuelle
const workoutTime = ref(getCurrentTime())

const openAddModal = () => {
  workoutTime.value = getCurrentTime()
  console.log(workoutTime.value)
  repsValue.value = ''
  showModal.value = true
}

// ============================================================
// WORKOUTS
// ============================================================

const {
  workouts,
  createWorkout,
  loadWorkouts
} = useWorkouts()


// ============================================================
// AJOUT RAPIDE
// ============================================================

const addQuick = (val: number) => {
  repsValue.value = String(val)
}

// ============================================================
// ENREGISTRER UN WORKOUT
// ============================================================

const saveWorkout = async () => {
  if (!exerciseStore.selectedExercise) return

  const repsNum = parseInt(repsValue.value)

  if (!repsNum || isNaN(repsNum)) {
    return
  }
  const timestamp = Date.now()

  const workout: LocalWorkout = {
    id: crypto.randomUUID(),
    exercise: exerciseStore.selectedExercise,
    date: selectedDate.value,
    workoutTime: workoutTime.value,
    reps: repsNum,
    mode: 'add',
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    syncStatus: 'pending',
    syncOperation: 'create'
  }

  await createWorkout(workout)

  showModal.value = false
  repsValue.value = ''

  // Pour le prochain ajout :
  // on repart sur l'heure actuelle
  workoutTime.value = getCurrentTime()

  try {
    await syncWorkout(workout)
    await loadWorkouts()
  } catch (error) {
    console.warn(
      'Workout enregistré localement mais non synchronisé',
      error
    )
  }
}

loadUserExercises()
</script>

<template>

  <!-- ========================================================
       EN-TÊTE
  ========================================================= -->

  <header class="px-5 pt-6 pb-4">
    <h1 class="text-2xl font-bold tracking-tight text-gray-900">
      Aujourd'hui
    </h1>
  </header>

  <!-- ========================================================
       SÉLECTEUR D'EXERCICES
  ========================================================= -->

  <ExerciseSelector />


  <!-- ========================================================
       CORPS
  ========================================================= -->

  <main class="px-5 mt-4 space-y-4">

    <!-- ======================================================
        CALENDRIER
    ====================================================== -->

    <TodayCalendar
      :workouts="workouts"
      :selected-date="selectedDate"
      :selected-exercise="exerciseStore.selectedExercise"
      @update:selected-date="selectedDate = $event"
    />

  </main>

  <!-- ========================================================
          BOUTON D'ACTION FLOTTANT (FAB)
      ========================================================= -->

  <div class="fixed bottom-20 right-5 z-10">
    <button
      @click="openAddModal"
      class="bg-amber-200 text-amber-950 text-sm font-semibold px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2 border border-amber-300/60 active:scale-95 transition-transform"
    >
      <span>⚡</span> Ajouter {{ selectedExerciseName }}
    </button>
  </div>

  <!-- ========================================================
          MODALE D'AJOUT
      ========================================================= -->

  <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
    <div class="bg-[#fdf8f5] w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl space-y-6 border border-amber-100 animate-in fade-in slide-in-from-bottom duration-200">

      <!-- En-tête de la modale -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2.5">
          <span class="bg-amber-500 text-white p-2 rounded-xl text-sm shadow-sm">⚡</span>
          <h3 class="text-xl font-bold text-gray-900">
            Ajouter {{ selectedExerciseName }}
          </h3>
        </div>
        <button @click="showModal = false"
          class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/60 text-gray-600 hover:bg-gray-200">
          ✕
        </button>

      </div>
      <!-- ==================================================
          DATE SÉLECTIONNÉE
      ================================================== -->
      <div class="text-center text-sm text-gray-500">
        {{ selectedDate }}
      </div>

      <!-- ==================================================
          HEURE DU WORKOUT
      ================================================== -->

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
          v-model="workoutTime"
          class="w-full bg-transparent text-lg font-semibold text-gray-900 focus:outline-none"
        />

      </div>

      <!-- Question -->
      <p class="text-sm font-medium text-gray-800 text-center">
        Combien de {{ selectedExerciseName }} avez-vous fait ?
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
        <button @click="showModal = false"
          class="flex-1 bg-transparent hover:bg-gray-100 text-gray-700 font-semibold py-3.5 rounded-2xl transition-colors">
          Annuler
        </button>
        <button @click="saveWorkout"
          class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]">
          Enregistrer
        </button>
      </div>

    </div>
  </div>

</template>