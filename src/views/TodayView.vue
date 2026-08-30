<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { db, type Workout } from '../db'
import { exercises } from '../exercises'

// Exercice sélectionné
const selectedExercise = ref('Push-ups')

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

const inputMode = ref<'add' | 'set'>('add')

const repsValue = ref('')

// ============================================================
// WORKOUTS
// ============================================================

const workoutsList = ref<Workout[]>([])

// Charger les workouts depuis IndexedDB
const loadWorkouts = async () => {
  workoutsList.value = await db.workouts.toArray()
}

onMounted(() => {
  loadWorkouts()
})

// ============================================================
// REPETITIONS PAR JOUR
// ============================================================

// Retourne le total des reps pour chaque jour du mois
// pour l'exercice actuellement sélectionné.
const repsByDay = computed<Record<number, number>>(() => {
  const totals: Record<number, number> = {}

  workoutsList.value
    .filter(
      workout =>
        workout.exercise === selectedExercise.value
    )
    .forEach(workout => {
      const [year, month, day] = workout.date
        .split('-')
        .map(Number)

      // Seulement les workouts du mois affiché
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
  const current = parseInt(repsValue.value) || 0

  if (inputMode.value === 'add') {
    repsValue.value = String(current + val)
  } else {
    repsValue.value = String(val)
  }
}

// ============================================================
// ENREGISTRER UN WORKOUT
// ============================================================

const saveWorkout = async () => {
  const repsNum = parseInt(repsValue.value)

  if (!repsNum || isNaN(repsNum)) {
    return
  }
  const now = Date.now()

  await db.workouts.add({
    id: crypto.randomUUID(),
    exercise: selectedExercise.value,
    date: selectedDate.value,
    reps: repsNum,
    mode: inputMode.value,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  })

  await loadWorkouts()

  showModal.value = false
  repsValue.value = ''
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

  <div class="px-5 flex gap-3 overflow-x-auto no-scrollbar pb-2">

    <button v-for="ex in exercises" :key="ex.name" @click="selectedExercise = ex.name" :class="[
      'flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium shadow-xs transition-all whitespace-nowrap',
      selectedExercise === ex.name
        ? 'bg-amber-500 text-white shadow-amber-200'
        : 'bg-white text-gray-700 border border-gray-200/60'
    ]">
      <span>{{ ex.icon }}</span>
      <span>{{ ex.name }}</span>
    </button>

  </div>


  <!-- ========================================================
       CORPS
  ========================================================= -->

  <main class="px-5 mt-4 space-y-4">

    <!-- ======================================================
         CALENDRIER
    ====================================================== -->

    <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs">

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
           
           IMPORTANT :
           Chaque case possède une hauteur fixe.
           L'espace réservé aux reps existe même lorsqu'il
           n'y a aucune répétition.
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

                 On garde TOUJOURS une hauteur de 14px.
                 Cela empêche les jours avec reps de décaler
                 verticalement le calendrier.
            ================================================== -->
            <span class="h-[14px] text-[10px] font-bold text-amber-600 leading-[14px] mt-0.5">
              {{ repsByDay[day] || '' }}
            </span>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- Bouton d'action flottant (FAB) -->
  <div class="fixed bottom-20 right-5 z-10">
    <button
      @click="showModal = true"
      class="bg-amber-200 text-amber-950 font-semibold px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2 border border-amber-300/60 active:scale-95 transition-transform"
      >
      <span>⚡</span> Add {{ selectedExercise }}
    </button>
  </div>

  <!-- MODALE D'AJOUT -->
  <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
    <div class="bg-[#fdf8f5] w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl space-y-6 border border-amber-100 animate-in fade-in slide-in-from-bottom duration-200">

      <!-- En-tête de la modale -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2.5">
          <span class="bg-amber-500 text-white p-2 rounded-xl text-sm shadow-sm">⚡</span>
          <h3 class="text-xl font-bold text-gray-900">
            Ajouter {{ selectedExercise }}
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

      <!-- Onglets (Ajouter une série / Définir le total) -->
      <div class="grid grid-cols-2 bg-gray-200/70 p-1 rounded-2xl">
        <button @click="inputMode = 'add'" :class="[
          'py-2.5 text-sm font-semibold rounded-xl transition-all',
          inputMode === 'add'
            ? 'bg-white text-gray-900 shadow-xs'
            : 'text-gray-500'
        ]">
          Ajouter une série
        </button>
        <button @click="inputMode = 'set'"
        :class="[
          'py-2.5 text-sm font-semibold rounded-xl transition-all',
          inputMode === 'set'
            ? 'bg-white text-gray-900 shadow-xs'
            : 'text-gray-500'
        ]">
          Définir le total
        </button>
      </div>

      <!-- Question -->
      <p class="text-sm font-medium text-gray-800 text-center">
        Combien de {{ selectedExercise }} avez-vous fait ?
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