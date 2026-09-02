<script setup lang="ts">
import { ref, computed } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import { useWorkouts } from '../composables/useWorkouts'
import { syncWorkout } from '../services/sync'
import { useExerciseStore } from '../stores/exercise'
import type { LocalWorkout } from '../db'

const exerciseStore = useExerciseStore()

// ============================================================
// DATE / CALENDRIER
// ============================================================

const now = new Date()

// Mois actuellement affiché
const currentYear = ref(now.getFullYear())
const currentMonthIndex = ref(now.getMonth())

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

// Nom du mois affiché
const currentMonth = computed(() => {
  const dateObj = new Date(
    currentYear.value,
    currentMonthIndex.value,
    1
  )

  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric'
  }).format(dateObj)
})

// Jours de la semaine
const daysOfWeek = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun'
]

// Jours du mois avec les espaces nécessaires
// pour commencer le mois un lundi
const daysInMonth = computed(() => {
  let firstDayIndex = new Date(
    currentYear.value,
    currentMonthIndex.value,
    1
  ).getDay()

  // Conversion pour commencer la semaine par lundi
  // Dimanche devient 6
  firstDayIndex = firstDayIndex === 0
    ? 6
    : firstDayIndex - 1

  // Nombre de jours du mois
  const totalDays = new Date(
    currentYear.value,
    currentMonthIndex.value + 1,
    0
  ).getDate()

  return [
    ...Array(firstDayIndex).fill(null),
    ...Array.from(
      { length: totalDays },
      (_, i) => i + 1
    )
  ]
})

// Mois précédent
const prevMonth = () => {
  if (currentMonthIndex.value === 0) {
    currentMonthIndex.value = 11
    currentYear.value--
  } else {
    currentMonthIndex.value--
  }

  // On sélectionne le premier jour du nouveau mois
  selectedDate.value = formatDate(
    currentYear.value,
    currentMonthIndex.value,
    1
  )
}

// Mois suivant
const nextMonth = () => {
  if (currentMonthIndex.value === 11) {
    currentMonthIndex.value = 0
    currentYear.value++
  } else {
    currentMonthIndex.value++
  }

  // On sélectionne le premier jour du nouveau mois
  selectedDate.value = formatDate(
    currentYear.value,
    currentMonthIndex.value,
    1
  )
}

// ============================================================
// SWIPE CALENDRIER
// ============================================================

const touchStartX = ref(0)
const touchStartY = ref(0)

const handleTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]

  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
}

const handleTouchEnd = (event: TouchEvent) => {
  const touch = event.changedTouches[0]

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value

  // On ignore les mouvements principalement verticaux
  if (Math.abs(deltaX) < Math.abs(deltaY)) {
    return
  }

  // Distance minimale pour considérer qu'il s'agit d'un swipe
  if (Math.abs(deltaX) < 50) {
    return
  }

  if (deltaX < 0) {
    // Swipe vers la gauche → mois suivant
    nextMonth()
  } else {
    // Swipe vers la droite → mois précédent
    prevMonth()
  }
}

// Retour à aujourd'hui
const goToToday = () => {
  currentYear.value = realYear
  currentMonthIndex.value = realMonthIndex

  selectedDate.value = formatDate(
    realYear,
    realMonthIndex,
    realDay
  )
}

// ============================================================
// MODALE
// ============================================================

const showModal = ref(false)

const repsValue = ref('')

// Heure du workout
// Par défaut : heure actuelle
const workoutTime = ref(getCurrentTime())

// ============================================================
// WORKOUTS
// ============================================================

const {
  workouts,
  createWorkout,
  loadWorkouts
} = useWorkouts()


// ============================================================
// REPETITIONS PAR JOUR
// ============================================================



const getLocalDateKey = (date: string): string => {
  // Date locale déjà au format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  // Date ISO provenant de PostgreSQL
  const parsed = new Date(date)

  return formatDate(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  )
}

// Retourne le total des reps pour chaque jour du mois
// pour l'exercice actuellement sélectionné.
const repsByDay = computed<Record<number, number>>(() => {
  const totals: Record<number, number> = {}

  workouts.value
    .filter(
      workout =>
        workout.exercise === exerciseStore.selectedExercise
    )
    .forEach(workout => {

      const dateKey = getLocalDateKey(workout.date)

      const [year, month, day] = dateKey
        .split('-')
        .map(Number)

      if (
        year === currentYear.value &&
        month === currentMonthIndex.value + 1
      ) {
        totals[day] = (totals[day] || 0) + workout.reps
      }
    })

  return totals
})


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

  <ExerciseSelector/>


  <!-- ========================================================
       CORPS
  ========================================================= -->

  <main class="px-5 mt-4 space-y-4">

    <!-- ======================================================
         CALENDRIER
    ====================================================== -->

    <section
      class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs touch-pan-y"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <!-- En-tête du calendrier -->
      <div class="flex justify-between items-center mb-4">

        <h2 class="text-lg font-bold capitalize text-gray-800">
          {{ currentMonth }}
        </h2>

        <div class="flex gap-1">

          <!-- Mois précédent -->
          <button @click="prevMonth"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors"
            aria-label="Mois précédent">
            ‹
          </button>

          <!-- Aujourd'hui -->
          <button @click="goToToday"
            class="px-2 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-xs font-semibold text-gray-700 transition-colors">
            Aujourd'hui
          </button>

          <!-- Mois suivant -->
          <button @click="nextMonth"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors"
            aria-label="Mois suivant">
            ›
          </button>

        </div>

      </div>


      <!-- ====================================================
           JOURS DE LA SEMAINE
      ===================================================== -->

      <div class="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-2">

        <span v-for="day in daysOfWeek" :key="day">
          {{ day }}
        </span>

      </div>


      <!-- ====================================================
           JOURS DU MOIS
      ===================================================== -->

      <div class="grid grid-cols-7 gap-y-1 text-center text-sm">

        <div v-for="(day, index) in daysInMonth" :key="index" class="flex justify-center items-center">

          <!-- Case d'un jour -->
          <div v-if="day" class="flex flex-col items-center h-[54px]">

            <!-- Jour -->
            <button @click="
                selectedDate = formatDate(
                  currentYear,
                  currentMonthIndex,
                  day
                )
              " :class="[
                'w-9 h-9 flex items-center justify-center rounded-full font-medium transition-all',

                selectedDate === formatDate(
                  currentYear,
                  currentMonthIndex,
                  day
                )
                  ? 'bg-amber-600 text-white font-bold shadow-sm'

                  : (
                    day === realDay &&
                    currentMonthIndex === realMonthIndex &&
                    currentYear === realYear
                  )
                    ? 'border border-amber-600 text-gray-900'
                    : 'text-gray-700 hover:bg-amber-100/50'
              ]">
              {{ day }}
            </button>
            <!-- =================================================
                 REPETITIONS
            ================================================= -->
            <span class="h-[14px] text-[10px] font-bold text-amber-600 leading-[14px] mt-0.5">
              {{ repsByDay[day] || '' }}
            </span>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- ========================================================
       BOUTON D'ACTION FLOTTANT (FAB)
  ========================================================= -->

  <div class="fixed bottom-20 right-5 z-10">
    <button
      @click="showModal = true"
      class="bg-amber-200 text-amber-950 font-semibold px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2 border border-amber-300/60 active:scale-95 transition-transform"
    >
      <span>⚡</span> Add {{ exerciseStore.selectedExercise }}
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
            Ajouter {{ exerciseStore.selectedExercise }}
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
        Combien de {{ exerciseStore.selectedExercise }} avez-vous fait ?
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