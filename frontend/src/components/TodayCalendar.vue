<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref
} from 'vue'
import type { LocalSet } from '../db'
import { formatDurationShort, type ExerciseUnit } from '../units'
import { useI18n } from 'vue-i18n'
import { dateLocale } from '../i18n'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import emblaCarouselVue from 'embla-carousel-vue'

const props = withDefaults(defineProps<{
  sets: LocalSet[]
  selectedDate: string
  // null : total de tous les exercices (répétitions, ou durée pour un
  // jour sans répétitions)
  selectedExercise: string | null
  unit?: ExerciseUnit
  // Mois proposés avant et après le mois courant
  monthsBefore?: number
  monthsAfter?: number
}>(), {
  monthsBefore: 12,
  monthsAfter: 12
})

const { unitOf } = useExerciseUnits()

const emit = defineEmits<{
  'update:selectedDate': [value: string]
  // Jour choisi par un appui (ou « Aujourd'hui »), pas un changement de mois
  pick: [value: string]
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
): string => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ============================================================
// MOIS DU CAROUSEL
// ============================================================

type CalendarMonth = {
  year: number
  monthIndex: number
}

// monthsBefore mois avant + mois actuel + monthsAfter mois après
const months = computed<CalendarMonth[]>(() => {
  return Array.from({ length: props.monthsBefore + 1 + props.monthsAfter }, (_, index) => {
    const offset = index - props.monthsBefore

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

// Position du mois actuel dans le carousel
const todayCarouselIndex = props.monthsBefore

const currentCarouselIndex = ref(
  todayCarouselIndex
)

// ============================================================
// EMBLA
// ============================================================

const [emblaRef, emblaApi] = emblaCarouselVue({
  align: 'start',
  containScroll: 'trimSnaps',
  loop: false
})

// TypeScript peut ne pas détecter l'utilisation
// de emblaRef dans le template.
void emblaRef

// ============================================================
// NOM DU MOIS ACTUEL
// ============================================================

const { t, locale } = useI18n()

// Recréé au changement de langue
const monthFormatter = computed(() => {
  void locale.value
  return new Intl.DateTimeFormat(dateLocale(), {
    month: 'long',
    year: 'numeric'
  })
})

const currentMonth = computed(() => {
  const month =
    months.value[currentCarouselIndex.value]

  if (!month) {
    return ''
  }

  return monthFormatter.value.format(
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

// Lundi → dimanche, abrégés dans la langue courante (« Lun », « Mon »)
const daysOfWeek = computed(() => {
  void locale.value
  const formatter = new Intl.DateTimeFormat(dateLocale(), { weekday: 'short' })

  // 1er janvier 2024 : un lundi
  return Array.from({ length: 7 }, (_, index) => {
    const name = formatter.format(new Date(2024, 0, 1 + index)).replace('.', '')
    return name.charAt(0).toUpperCase() + name.slice(1)
  })
})

// ============================================================
// JOURS D'UN MOIS
// ============================================================

const getDaysInMonth = (
  year: number,
  monthIndex: number
): Array<number | null> => {
  const firstDay = new Date(
    year,
    monthIndex,
    1
  ).getDay()

  // La semaine commence le lundi.
  // Dimanche devient donc 6.
  const firstDayIndex =
    firstDay === 0
      ? 6
      : firstDay - 1

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
  if (!emblaApi.value) {
    return
  }

  emblaApi.value.scrollTo(
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
  emit('pick', formatDate(realYear, realMonthIndex, realDay))
}

// ============================================================
// DATE LOCALE
// ============================================================

const getLocalDateKey = (
  date: string
): string => {
  // Date déjà au format YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }

  /*
   * Pour une date ISO, on conserve la partie
   * calendrier YYYY-MM-DD.
   *
   * Cela évite qu'un timestamp à minuit UTC
   * change de jour simplement à cause du fuseau
   * horaire du navigateur.
   */
  return date.slice(0, 10)
}

// ============================================================
// TOTAL PAR DATE
// ============================================================

// Texte affiché sous chaque jour : total de l'exercice choisi (durée pour
// un exercice tenu) ; sans exercice choisi, total des répétitions, ou
// durée pour un jour qui n'a que des exercices tenus
const totalsByDate = computed<Record<string, string>>(() => {
  const reps: Record<string, number> = {}
  const seconds: Record<string, number> = {}

  for (const set of props.sets) {
    if (set.deletedAt) continue
    if (props.selectedExercise && set.exercise !== props.selectedExercise) continue

    const dateKey = getLocalDateKey(set.date)
    const isDuration = props.selectedExercise
      ? props.unit === 'seconds'
      : unitOf(set.exercise) === 'seconds'
    const totals = isDuration ? seconds : reps
    totals[dateKey] = (totals[dateKey] ?? 0) + set.reps
  }

  const labels: Record<string, string> = {}
  for (const key of new Set([...Object.keys(reps), ...Object.keys(seconds)])) {
    labels[key] = reps[key] ? String(reps[key]) : formatDurationShort(seconds[key] ?? 0)
  }
  return labels
})

// ============================================================
// SYNCHRONISATION EMBLA
// ============================================================

const updateCurrentMonth = () => {
  if (!emblaApi.value) {
    return
  }

  const index =
    emblaApi.value.selectedScrollSnap()

  currentCarouselIndex.value = index

  const month = months.value[index]

  if (!month) {
    return
  }

  /*
   * On conserve volontairement le comportement
   * existant :
   *
   * - mois actuel → aujourd'hui
   * - autre mois → premier jour du mois
   */
  const isCurrentMonth =
    month.year === realYear &&
    month.monthIndex === realMonthIndex

  const day = isCurrentMonth
    ? realDay
    : 1

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

onBeforeUnmount(() => {
  emblaApi.value?.off(
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
  emit('pick', formatDate(year, monthIndex, day))
}

// ============================================================
// DATE SÉLECTIONNÉE
// ============================================================

const isSelectedDay = (
  year: number,
  monthIndex: number,
  day: number
): boolean => {
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
): boolean => {
  return (
    day === realDay &&
    monthIndex === realMonthIndex &&
    year === realYear
  )
}
</script>

<template>
  <section
    class="bg-surface rounded-xl p-2"
  >

    <!-- EN-TÊTE DU CALENDRIER -->

    <div
      class="flex justify-between items-center mb-4 min-h-[32px]"
    >
      <h2
        class="text-base sm:text-lg font-bold capitalize text-fg truncate pr-2"
      >
        {{ currentMonth }}
      </h2>

      <div class="flex items-center gap-1.5 shrink-0">

        <!-- Mois précédent -->

        <button
          type="button"
          @click="prevMonth"
          :disabled="currentCarouselIndex === 0"
          class="group w-9 h-9 flex items-center justify-center rounded-xl
                 bg-surface-alt
                 text-fg-secondary
                 transition-all duration-200
                 hover:bg-primary-soft
                 hover:text-primary
                 active:scale-95
                 disabled:opacity-30
                 disabled:pointer-events-none"
          :aria-label="t('calendar.previous')"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            class="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path
              d="M12.5 4.5L7 10L12.5 15.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- Aujourd'hui -->

        <button
          type="button"
          @click="goToToday"
          class="px-3 h-9 flex items-center justify-center rounded-xl
                 bg-surface-alt
                 text-xs font-semibold text-fg-secondary
                 transition-all duration-200
                 hover:bg-primary-soft
                 hover:text-primary
                 active:scale-95
                 whitespace-nowrap"
        >
          {{ t('calendar.today') }}
        </button>

        <!-- Mois suivant -->

        <button
          type="button"
          @click="nextMonth"
          :disabled="
            currentCarouselIndex === months.length - 1
          "
          class="group w-9 h-9 flex items-center justify-center rounded-xl
                 bg-surface-alt
                 text-fg-secondary
                 transition-all duration-200
                 hover:bg-primary-soft
                 hover:text-primary
                 active:scale-95
                 disabled:opacity-30
                 disabled:pointer-events-none"
          :aria-label="t('calendar.next')"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            class="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path
              d="M7.5 4.5L13 10L7.5 15.5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
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
            class="grid grid-cols-7 text-center text-xs font-semibold text-fg-muted mb-2"
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
            class="grid grid-cols-7 gap-y-1 text-center text-base"
          >
            <div
              v-for="(
                day,
                index
              ) in getDaysInMonth(
                month.year,
                month.monthIndex
              )"
              :key="
                day
                  ? `${month.year}-${month.monthIndex}-${day}`
                  : `empty-${index}`
              "
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
                      ? 'bg-primary text-on-primary font-bold shadow-sm'

                      : isToday(
                          month.year,
                          month.monthIndex,
                          day
                        )
                        ? 'border border-primary text-fg'

                        : 'text-fg-secondary hover:bg-primary-soft'
                  ]"
                >
                  {{ day }}
                </button>

                <!-- Répétitions -->

                <span
                  class="h-[14px] text-xs font-bold text-primary leading-[14px] mt-0.5"
                >
                  {{
                    totalsByDate[
                      formatDate(
                        month.year,
                        month.monthIndex,
                        day
                      )
                    ] ?? ''
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
