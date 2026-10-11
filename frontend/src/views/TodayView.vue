<script setup lang="ts">
import { ref, computed } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import AddRepsModal from '../components/AddRepsModal.vue'
import WorkoutSession from '../components/WorkoutSession.vue'
import { useSets } from '../composables/useSets'
import { syncSet } from '../services/sync'
import { useExerciseStore, type HomeMode } from '../stores/exercise'
import type { LocalSet } from '../db'
import { getUserExercises, type UserExercise } from '../api/exercises'
import TodayCalendar from '../components/TodayCalendar.vue'

const exerciseStore = useExerciseStore()
const userExercises = ref<UserExercise[]>([])

const modes: { value: HomeMode, label: string }[] = [
  { value: 'exercise', label: 'Exercice' },
  { value: 'workout', label: 'Séance' }
]

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
  formatDate(now.getFullYear(), now.getMonth(), now.getDate())
)

// ============================================================
// WORKOUTS
// ============================================================

const {
  sets,
  createSet,
  loadSets
} = useSets()

interface LogEntry {
  exerciseId: string
  reps: number
  time: string
}

// Enregistre des séries : d'abord en local (immédiat), puis synchro
const logSets = async (entries: LogEntry[]) => {
  const created: LocalSet[] = []

  for (const entry of entries) {
    const timestamp = Date.now()

    const set: LocalSet = {
      id: crypto.randomUUID(),
      exercise: entry.exerciseId,
      date: selectedDate.value,
      time: entry.time,
      reps: entry.reps,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      syncStatus: 'pending',
      syncOperation: 'create'
    }

    await createSet(set)
    created.push(set)
  }

  try {
    for (const set of created) {
      await syncSet(set)
    }
    await loadSets()
  } catch (error) {
    console.warn(
      'Set enregistré localement mais non synchronisé',
      error
    )
  }
}

// ============================================================
// MODE EXERCICE : MODALE
// ============================================================

const showModal = ref(false)

const saveExercise = async ({ reps, time }: { reps: number, time: string }) => {
  if (!exerciseStore.selectedExercise) return

  showModal.value = false

  await logSets([
    { exerciseId: exerciseStore.selectedExercise, reps, time }
  ])
}

loadUserExercises()
</script>

<template>

  <!-- ========================================================
       EN-TÊTE
  ========================================================= -->

  <header class="px-5 pt-6 pb-4 flex items-center justify-between gap-3">
    <h1 class="page-title">
      Saisie
    </h1>

    <!-- Mode : un exercice au fil de la journée, ou une séance complète.
         Compact et à côté du titre : c'est un réglage de la page, à ne pas
         confondre avec le sélecteur d'exercices juste en dessous. -->
    <div class="inline-flex gap-0.5 rounded-full border border-amber-200 bg-white p-0.5">
      <button
        v-for="m in modes"
        :key="m.value"
        type="button"
        class="rounded-full px-3 py-1 text-xs font-semibold transition-all"
        :class="exerciseStore.mode === m.value
          ? 'bg-amber-500 text-white shadow-sm'
          : 'text-gray-500'"
        @click="exerciseStore.setMode(m.value)"
      >
        {{ m.label }}
      </button>
    </div>
  </header>

  <!-- ========================================================
       MODE SÉANCE
  ========================================================= -->

  <WorkoutSession
    v-if="exerciseStore.mode === 'workout'"
    :date="selectedDate"
  />

  <template v-else>

  <!-- ========================================================
       SÉLECTEUR D'EXERCICES
  ========================================================= -->

  <ExerciseSelector
    :model-value="exerciseStore.selectedExercise"
    @update:model-value="exerciseStore.setExercise"
  />

  <!-- ========================================================
       CORPS
  ========================================================= -->

  <main class="px-3 mt-4 space-y-4">

    <!-- ======================================================
        CALENDRIER
    ====================================================== -->

    <TodayCalendar
      :sets="sets"
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
      @click="showModal = true"
      class="bg-amber-200 text-amber-950 text-sm font-semibold px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2 border border-amber-300/60 active:scale-95 transition-transform"
    >
      <span>⚡</span> Ajouter {{ selectedExerciseName }}
    </button>
  </div>

  <!-- ========================================================
          MODALE D'AJOUT
      ========================================================= -->

  <AddRepsModal
    v-if="showModal && exerciseStore.selectedExercise"
    :exercise-id="exerciseStore.selectedExercise"
    :exercise-name="selectedExerciseName"
    :date="selectedDate"
    @close="showModal = false"
    @save="saveExercise"
  />

  </template>

</template>