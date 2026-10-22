<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import TodayCalendar from '../components/TodayCalendar.vue'
import JournalDay from '../components/JournalDay.vue'
import { useSets } from '../composables/useSets'
import type { LocalSet } from '../db'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import { useI18n } from 'vue-i18n'

const selectedExercise = ref<string | null>(null)

const { sets, updateSet, deleteSet } = useSets()
const { unitOf } = useExerciseUnits()
const { t } = useI18n()

const expandedDates = ref<Set<string>>(new Set())

const filteredSets = computed(() => {
  let result = sets.value.filter(w => !w.deletedAt)

  if (selectedExercise.value) {
    result = result.filter(
      w => w.exercise === selectedExercise.value
    )
  }

  return [...result].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date)
    }

    return b.time.localeCompare(a.time)
  })
})

// ============================================================
// CALENDRIER : un mois à la fois (la liste ne grandit pas avec les années)
// ============================================================

const todayKey = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

// Jour choisi dans le calendrier ; son mois est le mois affiché
const selectedDate = ref(todayKey())
const visibleMonth = computed(() => selectedDate.value.slice(0, 7))

// Le calendrier remonte jusqu'au mois de la première saisie (au moins
// 12 mois), et ne propose pas de mois futur
const monthsBefore = computed(() => {
  const first = sets.value.reduce<string | null>(
    (oldest, set) => !set.deletedAt && (!oldest || set.date < oldest) ? set.date : oldest,
    null
  )
  if (!first) return 12

  const today = new Date()
  const [year, month] = first.split('-').map(Number)
  return Math.max(12, (today.getFullYear() - year!) * 12 + today.getMonth() + 1 - month!)
})

// Le calendrier annonce son jour en s'ouvrant : ce n'est pas un appui
let calendarReady = false
watch(monthsBefore, () => {
  calendarReady = false
})

// Un appui sur un jour : il est déplié dans la liste, et amené à l'écran
const selectDate = async (date: string) => {
  const sameMonth = date.slice(0, 7) === visibleMonth.value
  selectedDate.value = date

  if (!calendarReady) {
    calendarReady = true
    return
  }

  // Changement de mois par le calendrier : rien à déplier
  if (!sameMonth) return

  expandedDates.value = new Set([...expandedDates.value, date])
  await nextTick()
  document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const visibleDays = computed(() => {
  const days = new Map<string, LocalSet[]>()

  for (const set of filteredSets.value) {
    if (!set.date.startsWith(visibleMonth.value)) continue

    const daySets = days.get(set.date) ?? []
    daySets.push(set)
    days.set(set.date, daySets)
  }

  return [...days.entries()].map(([date, daySets]) => ({
    date,
    sets: daySets
  }))
})

const toggleDay = (date: string) => {
  const dates = new Set(expandedDates.value)

  if (dates.has(date)) {
    dates.delete(date)
  } else {
    dates.add(date)
  }

  expandedDates.value = dates
}
</script>

<template>
  <div class="px-4 pb-24">

    <!-- Titre et filtre d'exercice sur la même ligne, comme le choix
         Exercice / Séance de l'écran Saisie -->
    <div class="px-1 pt-6 pb-4 flex items-center justify-between gap-3">
      <h1 class="page-title shrink-0">
        {{ t('nav.journal') }}
      </h1>
      <ExerciseSelector
        v-model="selectedExercise"
        :required="false"
        source="sets"
        compact
        :sets="sets"
      />
    </div>

    <!-- Calendrier du mois : total de chaque jour -->
    <div class="mb-4">
      <!-- Recréé quand l'historique s'allonge (nombre de mois) -->
      <TodayCalendar
        :key="monthsBefore"
        :sets="sets"
        :selected-date="selectedDate"
        :selected-exercise="selectedExercise"
        :unit="selectedExercise ? unitOf(selectedExercise) : undefined"
        :months-before="monthsBefore"
        :months-after="0"
        @update:selected-date="selectDate"
      />
    </div>

    <!-- Jours du mois affiché -->
    <div
      v-if="visibleDays.length === 0"
      class="py-12 text-center text-fg-muted"
    >
      {{ t('journal.emptyMonth') }}
    </div>

    <JournalDay
      v-for="day in visibleDays"
      :id="`day-${day.date}`"
      :key="day.date"
      class="mb-3 scroll-mt-4"
      :date="day.date"
      :day-sets="day.sets"
      :sets="sets"
      :expanded="expandedDates.has(day.date)"
      @toggle="toggleDay(day.date)"
      @update="updateSet"
      @delete="deleteSet"
    />

  </div>
</template>