<script setup lang="ts">
import { ref, computed } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import AddRepsModal from '../components/AddRepsModal.vue'
import WorkoutSession from '../components/WorkoutSession.vue'
import { useSets } from '../composables/useSets'
import { syncSet } from '../services/sync'
import { useExerciseStore, type HomeMode } from '../stores/exercise'
import type { LocalSet } from '../db'
import { useUserExercises } from '../composables/useUserExercises'
import TodayCalendar from '../components/TodayCalendar.vue'
import DayNavigator from '../components/DayNavigator.vue'
import JournalDay from '../components/JournalDay.vue'
import { useI18n } from 'vue-i18n'
import { exerciseName } from '../i18n'
import { formatAmount } from '../units'

const exerciseStore = useExerciseStore()
// Sélection locale (ADR 0014)
const { userExercises, load: loadUserExercises } = useUserExercises()

const { t } = useI18n()

const modes = computed<{ value: HomeMode, label: string }[]>(() => [
  { value: 'exercise', label: t('today.modeExercise') },
  { value: 'workout', label: t('today.modeWorkout') }
])

const selectedExerciseName = computed(() => {
  if (!exerciseStore.selectedExercise) {
    return ''
  }

  return (
    exerciseName(
      userExercises.value.find(
        exercise => exercise.id === exerciseStore.selectedExercise
      )
    ) ||
    exerciseStore.selectedExercise
  )
})

const selectedExerciseUnit = computed(() =>
  userExercises.value.find(
    exercise => exercise.id === exerciseStore.selectedExercise
  )?.unit ?? 'reps'
)

// ============================================================
// DATE : aujourd'hui par défaut, ‹ › ou calendrier en fenêtre
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

const todayKey = formatDate(now.getFullYear(), now.getMonth(), now.getDate())

// Date actuellement sélectionnée
const selectedDate = ref(todayKey)

const showCalendar = ref(false)

// Jour choisi dans le calendrier : pas de saisie dans le futur
const pickDate = (date: string) => {
  selectedDate.value = date > todayKey ? todayKey : date
  showCalendar.value = false
}

// ============================================================
// WORKOUTS
// ============================================================

const {
  sets,
  createSet,
  updateSet,
  deleteSet,
  loadSets
} = useSets()

// Saisies du jour sélectionné, comme dans le journal (tous exercices),
// dépliées par défaut
const selectedDaySets = computed(() =>
  sets.value
    .filter(set => !set.deletedAt && set.date === selectedDate.value)
    .sort((a, b) => b.time.localeCompare(a.time))
)

const dayExpanded = ref(true)

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

// Bandeau de confirmation après une saisie : ce qui vient d'être
// enregistré, et le total du jour pour cet exercice
const snackbar = ref<string | null>(null)
let snackbarTimer: ReturnType<typeof setTimeout> | undefined

const showSnackbar = (message: string) => {
  snackbar.value = message
  clearTimeout(snackbarTimer)
  snackbarTimer = setTimeout(() => {
    snackbar.value = null
  }, 3000)
}

const saveExercise = async ({ reps, time }: { reps: number, time: string }) => {
  const exerciseId = exerciseStore.selectedExercise
  if (!exerciseId) return

  showModal.value = false

  await logSets([
    { exerciseId, reps, time }
  ])

  const dayTotal = sets.value
    .filter(set => !set.deletedAt && set.exercise === exerciseId && set.date === selectedDate.value)
    .reduce((sum, set) => sum + set.reps, 0)

  showSnackbar(t(selectedDate.value === todayKey ? 'log.savedToday' : 'log.savedDay', {
    amount: formatAmount(reps, selectedExerciseUnit.value),
    name: selectedExerciseName.value,
    total: formatAmount(dayTotal, selectedExerciseUnit.value)
  }))
}

loadUserExercises()
</script>

<template>

  <!-- ========================================================
       EN-TÊTE
  ========================================================= -->

  <header class="px-5 pt-6 pb-4 flex items-center justify-between gap-3">
    <h1 class="page-title">
      {{ t('nav.log') }}
    </h1>

    <!-- Mode : un exercice au fil de la journée, ou une séance complète.
         Compact et à côté du titre : c'est un réglage de la page, à ne pas
         confondre avec le sélecteur d'exercices juste en dessous. -->
    <div class="inline-flex gap-0.5 rounded-xl bg-surface-alt p-1">
      <button
        v-for="m in modes"
        :key="m.value"
        type="button"
        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
        :class="exerciseStore.mode === m.value
          ? 'bg-card text-fg shadow-sm'
          : 'text-fg-secondary'"
        @click="exerciseStore.setMode(m.value)"
      >
        {{ m.label }}
      </button>
    </div>
  </header>

  <!-- ========================================================
       DATE (les deux modes) : un appui ouvre le calendrier
  ========================================================= -->

  <div class="px-3 pb-3">
    <DayNavigator
      v-model="selectedDate"
      @open="showCalendar = true"
    />
  </div>

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
       AJOUT
  ========================================================= -->

  <div class="px-5 mt-6">
    <button
      type="button"
      :disabled="!exerciseStore.selectedExercise"
      class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-on-primary transition-transform active:scale-[0.98] disabled:bg-surface-alt disabled:text-fg-muted"
      @click="showModal = true"
    >
      <span class="text-xl leading-none">+</span>
      {{ t('addReps.title', { name: selectedExerciseName }) }}
    </button>
  </div>

  <!-- ========================================================
          MODALE D'AJOUT
      ========================================================= -->

  <!-- ========================================================
       SAISIES DU JOUR (comme dans le journal)
  ========================================================= -->

  <div
    v-if="selectedDaySets.length > 0"
    class="px-4 pt-6 pb-24"
  >
    <JournalDay
      :date="selectedDate"
      :day-sets="selectedDaySets"
      :sets="sets"
      :expanded="dayExpanded"
      @toggle="dayExpanded = !dayExpanded"
      @update="updateSet"
      @delete="deleteSet"
    />
  </div>

  <AddRepsModal
    v-if="showModal && exerciseStore.selectedExercise"
    :exercise-id="exerciseStore.selectedExercise"
    :exercise-name="selectedExerciseName"
    :unit="selectedExerciseUnit"
    :date="selectedDate"
    @close="showModal = false"
    @save="saveExercise"
  />

  </template>

  <!-- ========================================================
          CALENDRIER (fenêtre du bas) : sauter à un autre jour
      ========================================================= -->

  <Teleport to="body">
    <div
      v-if="showCalendar"
      class="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-xs sm:items-center sm:p-4"
      @click.self="showCalendar = false"
    >
      <div class="w-full max-w-md rounded-t-[32px] bg-card px-3 pt-4 pb-6 shadow-2xl sm:rounded-xl">
        <TodayCalendar
          :sets="sets"
          :selected-date="selectedDate"
          :selected-exercise="exerciseStore.mode === 'exercise' ? exerciseStore.selectedExercise : null"
          :unit="selectedExerciseUnit"
          :months-after="0"
          @pick="pickDate"
        />
      </div>
    </div>
  </Teleport>

  <!-- ========================================================
          BANDEAU DE CONFIRMATION
      ========================================================= -->

  <Transition name="snackbar">
    <div
      v-if="snackbar"
      class="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-xl bg-fg px-4 py-3 text-sm font-medium text-background shadow-lg"
      role="status"
    >
      ✓ {{ snackbar }}
    </div>
  </Transition>

</template>

<style scoped>
.snackbar-enter-active,
.snackbar-leave-active {
  transition: all 0.2s ease;
}

.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>