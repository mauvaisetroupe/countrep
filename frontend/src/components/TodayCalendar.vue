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

const formatDate = (year: number, monthIndex: number, day: number) => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

type CalendarMonth = {
  year: number
  monthIndex: number
}

// 12 mois avant + mois actuel + 12 mois après
const months = computed<CalendarMonth[]>(() => {
  return Array.from({ length: 25 }, (_, index) => {
    const date = new Date(realYear, realMonthIndex + (index - 12), 1)
    return {
      year: date.getFullYear(),
      monthIndex: date.getMonth()
    }
  })
})

const todayCarouselIndex = 12
const currentCarouselIndex = ref(todayCarouselIndex)

// ============================================================
// EMBLA
// ============================================================

const [emblaRef, emblaApi] = emblaCarouselVue({
  align: 'start',
  containScroll: 'trimSnaps',
  loop: false
})

const currentMonth = computed(() => {
  const month = months.value[currentCarouselIndex.value]
  if (!month) return ''

  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(month.year, month.monthIndex, 1))
})

const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const getDaysInMonth = (year: number, monthIndex: number) => {
  let firstDayIndex = new Date(year, monthIndex, 1).getDay()
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1
  const totalDays = new Date(year, monthIndex + 1, 0).getDate()

  return [
    ...Array(firstDayIndex).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1)
  ]
}

// ============================================================
// NAVIGATION
// ============================================================

const prevMonth = () => emblaApi.value?.scrollPrev()
const nextMonth = () => emblaApi.value?.scrollNext()

const goToToday = () => {
  emblaApi.value?.scrollTo(todayCarouselIndex)
  emit('update:selectedDate', formatDate(realYear, realMonthIndex, realDay))
}

// ============================================================
// SYNCHRONISATION EMBLA
// ============================================================

const updateCurrentMonth = () => {
  if (!emblaApi.value) return

  const index = emblaApi.value.selectedScrollSnap()
  currentCarouselIndex.value = index
  const month = months.value[index]
  if (!month) return
  // Vérifie si le mois affiché est le mois réel en cours
  const isCurrentMonth =
    month.year === realYear && month.monthIndex === realMonthIndex

  // Sélectionne le jour réel si mois courant, sinon le 1er du mois
  const targetDay = isCurrentMonth ? realDay : 1

  emit(
    'update:selectedDate',
    formatDate(month.year, month.monthIndex, targetDay)
  )
}

onMounted(() => {
  if (!emblaApi.value) return

  // 1. Positionnement initial sans animation
  emblaApi.value.scrollTo(todayCarouselIndex, true)

  // 2. Écoute uniquement les interactions de l'utilisateur (Swipe ou Flèches)
  // Utiliser 'settle' ou 'select' une fois initialisé garantit que ça réagit à la navigation
  emblaApi.value.on('select', updateCurrentMonth)
})

onMounted(() => {
  if (!emblaApi.value) return
  emblaApi.value.scrollTo(todayCarouselIndex, true)
  emblaApi.value.on('select', updateCurrentMonth)
})

const selectDay = (year: number, monthIndex: number, day: number) => {
  emit('update:selectedDate', formatDate(year, monthIndex, day))
}

// ============================================================
// DÉCOMPTE OPTIMISÉ DES RÉPÉTITIONS (COMPUTED MAP)
// ============================================================

const repsByDateMap = computed<Record<string, number>>(() => {
  const totals: Record<string, number> = {}
  if (!props.selectedExercise) return totals

  for (const workout of props.workouts) {
    if (workout.exercise !== props.selectedExercise) continue

    // Normalisation au format YYYY-MM-DD
    const dateKey = workout.date.substring(0, 10)
    totals[dateKey] = (totals[dateKey] || 0) + workout.reps
  }

  return totals
})

// Vérifications
const isSelectedDay = (year: number, monthIndex: number, day: number) => {
  return props.selectedDate === formatDate(year, monthIndex, day)
}

const isToday = (year: number, monthIndex: number, day: number) => {
  return day === realDay && monthIndex === realMonthIndex && year === realYear
}
</script>

<template>
  <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs">
    <!-- EN-TÊTE DU CALENDRIER -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold capitalize text-gray-800">
        {{ currentMonth }}
      </h2>

      <div class="flex gap-1">
        <button
          type="button"
          @click="prevMonth"
          :disabled="currentCarouselIndex === 0"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mois précédent"
        >
          ‹
        </button>

        <button
          type="button"
          @click="goToToday"
          class="px-2 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-xs font-semibold text-gray-700 transition-colors"
        >
          Aujourd'hui
        </button>

        <button
          type="button"
          @click="nextMonth"
          :disabled="currentCarouselIndex === months.length - 1"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200/50 text-gray-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>
    </div>

    <!-- CAROUSEL -->
    <div ref="emblaRef" class="overflow-hidden touch-pan-y">
      <div class="flex">
        <div
          v-for="month in months"
          :key="`${month.year}-${month.monthIndex}`"
          class="min-w-0 flex-[0_0_100%]"
        >
          <div class="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-2">
            <span v-for="day in daysOfWeek" :key="day">{{ day }}</span>
          </div>

          <div class="grid grid-cols-7 gap-y-1 text-center text-sm">
            <div
              v-for="(day, index) in getDaysInMonth(month.year, month.monthIndex)"
              :key="index"
              class="flex justify-center items-center"
            >
              <div v-if="day" class="flex flex-col items-center h-[54px]">
                <button
                  type="button"
                  @click="selectDay(month.year, month.monthIndex, day)"
                  :class="[
                    'w-9 h-9 flex items-center justify-center rounded-full font-medium transition-all',
                    isSelectedDay(month.year, month.monthIndex, day)
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : isToday(month.year, month.monthIndex, day)
                        ? 'border border-amber-600 text-gray-900'
                        : 'text-gray-700 hover:bg-amber-100/50'
                  ]"
                >
                  {{ day }}
                </button>

                <!-- Affichage via la computed map (performant) -->
                <span class="h-[14px] text-[10px] font-bold text-amber-600 leading-[14px] mt-0.5">
                  {{ repsByDateMap[formatDate(month.year, month.monthIndex, day)] || '' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>