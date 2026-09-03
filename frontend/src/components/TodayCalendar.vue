<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LocalWorkout } from '../db'

const props = defineProps<{
  workouts: LocalWorkout[]
  selectedDate: string
  selectedExercise: string | null
}>()

const emit = defineEmits<{
  'update:selectedDate': [value: string]
}>()

// ============================================================
// DATE / CALENDRIER
// ============================================================

const now = new Date()

const currentYear = ref(now.getFullYear())
const currentMonthIndex = ref(now.getMonth())

const realYear = now.getFullYear()
const realMonthIndex = now.getMonth()
const realDay = now.getDate()

const formatDate = (
  year: number,
  monthIndex: number,
  day: number
) => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

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

const daysOfWeek = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun'
]

const daysInMonth = computed(() => {
  let firstDayIndex = new Date(
    currentYear.value,
    currentMonthIndex.value,
    1
  ).getDay()

  // La semaine commence le lundi.
  // Dimanche devient donc 6.
  firstDayIndex = firstDayIndex === 0
    ? 6
    : firstDayIndex - 1

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

// ============================================================
// NAVIGATION
// ============================================================

const prevMonth = () => {
  if (currentMonthIndex.value === 0) {
    currentMonthIndex.value = 11
    currentYear.value--
  } else {
    currentMonthIndex.value--
  }

  emit(
    'update:selectedDate',
    formatDate(
      currentYear.value,
      currentMonthIndex.value,
      1
    )
  )
}

const nextMonth = () => {
  if (currentMonthIndex.value === 11) {
    currentMonthIndex.value = 0
    currentYear.value++
  } else {
    currentMonthIndex.value++
  }

  emit(
    'update:selectedDate',
    formatDate(
      currentYear.value,
      currentMonthIndex.value,
      1
    )
  )
}

const goToToday = () => {
  currentYear.value = realYear
  currentMonthIndex.value = realMonthIndex

  emit(
    'update:selectedDate',
    formatDate(
      realYear,
      realMonthIndex,
      realDay
    )
  )
}

const selectDay = (day: number) => {
  emit(
    'update:selectedDate',
    formatDate(
      currentYear.value,
      currentMonthIndex.value,
      day
    )
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

  // Ignore les mouvements principalement verticaux.
  if (Math.abs(deltaX) < Math.abs(deltaY)) {
    return
  }

  // Distance minimale pour considérer un swipe.
  if (Math.abs(deltaX) < 50) {
    return
  }

  if (deltaX < 0) {
    nextMonth()
  } else {
    prevMonth()
  }
}

// ============================================================
// REPETITIONS PAR JOUR
// ============================================================

const getLocalDateKey = (date: string): string => {
  // Date locale déjà au format YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  // Date ISO provenant de PostgreSQL.
  const parsed = new Date(date)

  return formatDate(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  )
}

const repsByDay = computed<Record<number, number>>(() => {
  const totals: Record<number, number> = {}

  if (!props.selectedExercise) {
    return totals
  }

  props.workouts
    .filter(
      workout =>
        workout.exercise === props.selectedExercise
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
// DATE SÉLECTIONNÉE
// ============================================================

const isSelectedDay = (day: number) => {
  return (
    props.selectedDate ===
    formatDate(
      currentYear.value,
      currentMonthIndex.value,
      day
    )
  )
}

const isToday = (day: number) => {
  return (
    day === realDay &&
    currentMonthIndex.value === realMonthIndex &&
    currentYear.value === realYear
  )
}
</script>

<template>
  <section
    class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs touch-pan-y"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- ======================================================
         EN-TÊTE DU CALENDRIER
    ======================================================= -->

    <div class="flex justify-between items-center mb-4">

      <h2 class="text-lg font-bold capitalize text-gray-800">
        {{ currentMonth }}
      </h2>

      <div class="flex gap-1">

        <!-- Mois précédent -->
        <button
          @click="prevMonth"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors"
          aria-label="Mois précédent"
        >
          ‹
        </button>

        <!-- Aujourd'hui -->
        <button
          @click="goToToday"
          class="px-2 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-xs font-semibold text-gray-700 transition-colors"
        >
          Aujourd'hui
        </button>

        <!-- Mois suivant -->
        <button
          @click="nextMonth"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors"
          aria-label="Mois suivant"
        >
          ›
        </button>

      </div>
    </div>

    <!-- ======================================================
         JOURS DE LA SEMAINE
    ======================================================= -->

    <div
      class="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-2"
    >
      <span
        v-for="day in daysOfWeek"
        :key="day"
      >
        {{ day }}
      </span>
    </div>

    <!-- ======================================================
         JOURS DU MOIS
    ======================================================= -->

    <div class="grid grid-cols-7 gap-y-1 text-center text-sm">

      <div
        v-for="(day, index) in daysInMonth"
        :key="index"
        class="flex justify-center items-center"
      >

        <div
          v-if="day"
          class="flex flex-col items-center h-[54px]"
        >

          <!-- Jour -->
          <button
            @click="selectDay(day)"
            :class="[
              'w-9 h-9 flex items-center justify-center rounded-full font-medium transition-all',

              isSelectedDay(day)
                ? 'bg-amber-600 text-white font-bold shadow-sm'

                : isToday(day)
                  ? 'border border-amber-600 text-gray-900'

                  : 'text-gray-700 hover:bg-amber-100/50'
            ]"
          >
            {{ day }}
          </button>

          <!-- Répétitions -->
          <span
            class="h-[14px] text-[10px] font-bold text-amber-600 leading-[14px] mt-0.5"
          >
            {{ repsByDay[day] || '' }}
          </span>

        </div>
      </div>
    </div>
  </section>
</template>