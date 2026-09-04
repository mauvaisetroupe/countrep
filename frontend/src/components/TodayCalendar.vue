<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { LocalWorkout } from '../db'
import emblaCarouselVue from 'embla-carousel-vue'

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

// ============================================================
// MOIS DU CAROUSEL
// ============================================================

type CalendarMonth = {
  year: number
  monthIndex: number
}

// 12 mois avant + mois actuel + 12 mois après.
const months = computed<CalendarMonth[]>(() => {
  return Array.from({ length: 25 }, (_, index) => {
    const offset = index - 12

    const date = new Date(
      realYear,
      realMonthIndex + offset,
      1
    )

    return {
      year: date.getFullYear(),
      monthIndex: date.getMonth()
    }
  })
})

// Le mois actuel est au milieu du carousel.
const todayCarouselIndex = 12

const currentCarouselIndex = ref(
  todayCarouselIndex
)

// ============================================================
// EMBLA
// ============================================================

const [, emblaApi] = emblaCarouselVue({
  align: 'start',
  containScroll: 'trimSnaps',
  loop: false
})

// ============================================================
// NOM DU MOIS ACTUEL
// ============================================================

const currentMonth = computed(() => {
  const month =
    months.value[currentCarouselIndex.value]

  if (!month) {
    return ''
  }

  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric'
  }).format(
    new Date(
      month.year,
      month.monthIndex,
      1
    )
  )
})

// ============================================================
// JOURS DE LA SEMAINE
// ============================================================

const daysOfWeek = [
  'Lun',
  'Mar',
  'Mer',
  'Jeu',
  'Ven',
  'Sam',
  'Dim'
]

// ============================================================
// JOURS D'UN MOIS
// ============================================================

const getDaysInMonth = (
  year: number,
  monthIndex: number
) => {
  let firstDayIndex = new Date(
    year,
    monthIndex,
    1
  ).getDay()

  // La semaine commence le lundi.
  // Dimanche devient donc 6.
  firstDayIndex =
    firstDayIndex === 0
      ? 6
      : firstDayIndex - 1

  const totalDays = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate()

  return [
    ...Array(firstDayIndex).fill(null),
    ...Array.from(
      { length: totalDays },
      (_, i) => i + 1
    )
  ]
}

// ============================================================
// NAVIGATION
// ============================================================

const prevMonth = () => {
  emblaApi.value?.scrollPrev()
}

const nextMonth = () => {
  emblaApi.value?.scrollNext()
}

const goToToday = () => {
  emblaApi.value?.scrollTo(
    todayCarouselIndex
  )

  emit(
    'update:selectedDate',
    formatDate(
      realYear,
      realMonthIndex,
      realDay
    )
  )
}

// ============================================================
// SYNCHRONISATION EMBLA
// ============================================================

const updateCurrentMonth = () => {
  if (!emblaApi.value) {
    return
  }

  const index = emblaApi.value.selectedScrollSnap()
  currentCarouselIndex.value = index
  const month = months.value[index]
  if (!month) {
    return
  }
  const isCurrentMonth =
    month.year === realYear &&
    month.monthIndex === realMonthIndex
  const day = isCurrentMonth ? realDay : 1

  emit(
    'update:selectedDate',
    formatDate(
      month.year,
      month.monthIndex,
      day
    )
  )
}


onMounted(() => {
  if (!emblaApi.value) {
    return
  }

  // On démarre sur le mois actuel.
  emblaApi.value.scrollTo(
    todayCarouselIndex,
    true
  )

  updateCurrentMonth()

  // Mise à jour lors d'un swipe ou d'un clic
  // sur les boutons précédent/suivant.
  emblaApi.value.on(
    'select',
    updateCurrentMonth
  )
})

// ============================================================
// SÉLECTION D'UN JOUR
// ============================================================

const selectDay = (
  year: number,
  monthIndex: number,
  day: number
) => {
  emit(
    'update:selectedDate',
    formatDate(
      year,
      monthIndex,
      day
    )
  )
}

// ============================================================
// RÉPÉTITIONS PAR JOUR
// ============================================================

const getLocalDateKey = (
  date: string
): string => {
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

const getRepsByDay = (
  year: number,
  monthIndex: number
): Record<number, number> => {
  const totals: Record<number, number> = {}

  if (!props.selectedExercise) {
    return totals
  }

  props.workouts
    .filter(
      workout =>
        workout.exercise ===
        props.selectedExercise
    )
    .forEach(workout => {
      const dateKey =
        getLocalDateKey(workout.date)

      const [
        workoutYear,
        workoutMonth,
        day
      ] = dateKey
        .split('-')
        .map(Number)

      if (
        workoutYear === year &&
        workoutMonth === monthIndex + 1
      ) {
        totals[day] =
          (totals[day] || 0) +
          workout.reps
      }
    })

  return totals
}

// ============================================================
// DATE SÉLECTIONNÉE
// ============================================================

const isSelectedDay = (
  year: number,
  monthIndex: number,
  day: number
) => {
  return (
    props.selectedDate ===
    formatDate(
      year,
      monthIndex,
      day
    )
  )
}

const isToday = (
  year: number,
  monthIndex: number,
  day: number
) => {
  return (
    day === realDay &&
    monthIndex === realMonthIndex &&
    year === realYear
  )
}
</script>

<template>
  <section
    class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs"
  >

    <!-- ======================================================
         EN-TÊTE DU CALENDRIER
    ======================================================= -->

    <div
      class="flex justify-between items-center mb-4"
    >
      <h2
        class="text-lg font-bold capitalize text-gray-800"
      >
        {{ currentMonth }}
      </h2>

      <div class="flex gap-1">

        <!-- Mois précédent -->

        <button
          type="button"
          @click="prevMonth"
          :disabled="
            currentCarouselIndex === 0
          "
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mois précédent"
        >
          ‹
        </button>

        <!-- Aujourd'hui -->

        <button
          type="button"
          @click="goToToday"
          class="px-2 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-xs font-semibold text-gray-700 transition-colors"
        >
          Aujourd'hui
        </button>

        <!-- Mois suivant -->

        <button
          type="button"
          @click="nextMonth"
          :disabled="
            currentCarouselIndex ===
            months.length - 1
          "
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mois suivant"
        >
          ›
        </button>

      </div>
    </div>

    <!-- ======================================================
         CAROUSEL
    ======================================================= -->

    <div
      ref="emblaRef"
      class="overflow-hidden touch-pan-y"
    >
      <div class="flex">

        <div
          v-for="month in months"
          :key="
            `${month.year}-${month.monthIndex}`
          "
          class="min-w-0 flex-[0_0_100%]"
        >

          <!-- ==================================================
               JOURS DE LA SEMAINE
          =================================================== -->

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

          <!-- ==================================================
               JOURS DU MOIS
          =================================================== -->

          <div
            class="grid grid-cols-7 gap-y-1 text-center text-sm"
          >

            <div
              v-for="(
                day,
                index
              ) in getDaysInMonth(
                month.year,
                month.monthIndex
              )"
              :key="index"
              class="flex justify-center items-center"
            >

              <div
                v-if="day"
                class="flex flex-col items-center h-[54px]"
              >

                <!-- Jour -->

                <button
                  type="button"
                  @click="
                    selectDay(
                      month.year,
                      month.monthIndex,
                      day
                    )
                  "
                  :class="[
                    'w-9 h-9 flex items-center justify-center rounded-full font-medium transition-all',

                    isSelectedDay(
                      month.year,
                      month.monthIndex,
                      day
                    )
                      ? 'bg-amber-600 text-white font-bold shadow-sm'

                      : isToday(
                          month.year,
                          month.monthIndex,
                          day
                        )
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
                  {{
                    getRepsByDay(
                      month.year,
                      month.monthIndex
                    )[day] || ''
                  }}
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>

  </section>
</template>
