<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import { useSets } from '../composables/useSets'
import type { LocalSet } from '../db'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import { useI18n } from 'vue-i18n'
import { dateLocale } from '../i18n'
import { formatAmount, formatDuration, formatTotals, type AmountTotals } from '../units'

const selectedExercise = ref<string | null>(null)

const { sets, updateSet, deleteSet } = useSets()
const { unitOf } = useExerciseUnits()
const { t } = useI18n()

const PAGE_SIZE = 30

// Équivalence Garmin : une minute = 30 s d'effort + 30 s de repos,
// soit 15 répétitions ou 30 s tenues pour un exercice à la durée
const REPS_PER_SET = 15
const SECONDS_PER_SET = 30
const MINUTES_PER_SET = 1
const SETS_PER_BLOCK = 10
const BLOCK_REST_MINUTES = 2

const visibleCount = ref(PAGE_SIZE)
const editingSetId = ref<string | null>(null)
const openMenuId = ref<string | null>(null)
const copiedGarminDate = ref<string | null>(null)

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

const visibleSets = computed(() => {
  return filteredSets.value.slice(0, visibleCount.value)
})

const hasMore = computed(() => {
  return visibleCount.value < filteredSets.value.length
})

const loadMore = () => {
  if (!hasMore.value) return

  visibleCount.value += PAGE_SIZE
}

const visibleDays = computed(() => {
  const days = new Map<string, LocalSet[]>()

  for (const set of visibleSets.value) {
    const daySets = days.get(set.date) ?? []
    daySets.push(set)
    days.set(set.date, daySets)
  }

  return [...days.entries()].map(([date, daySets]) => ({
    date,
    sets: daySets
  }))
})

const getTodayString = () => {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getYesterdayString = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, '0')
  const day = String(yesterday.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const formatDay = (date: string) => {
  const day = date.slice(0, 10)

  if (day === getTodayString()) {
    return t('calendar.today')
  }

  if (day === getYesterdayString()) {
    return t('journal.yesterday')
  }

  return new Date(`${day}T12:00:00`).toLocaleDateString(
    dateLocale(),
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  )
}

const formatSetTime = (time: string) => {
  if (!time) return '--:--'

  return time.slice(0, 5)
}

// Répétitions et secondes d'une liste de sets, comptées à part
const totalsOf = (daySets: LocalSet[]): AmountTotals => {
  const totals = { reps: 0, seconds: 0 }
  for (const w of daySets) {
    totals[unitOf(w.exercise) === 'seconds' ? 'seconds' : 'reps'] += w.reps
  }
  return totals
}

const dayTotal = (date: string) => {
  return formatTotals(totalsOf(filteredSets.value.filter(w => w.date === date)))
}

const garminDayTotal = (date: string) => {
  return totalsOf(sets.value.filter(w => !w.deletedAt && w.date === date))
}

const garminExerciseSummary = (date: string) => {
  const totals = new Map<string, number>()

  sets.value
    .filter(w => !w.deletedAt && w.date === date)
    .forEach(w => {
      totals.set(
        w.exercise,
        (totals.get(w.exercise) ?? 0) + w.reps
      )
    })

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([exercise, value]) =>
      unitOf(exercise) === 'seconds'
        ? `${formatDuration(value)} ${exercise}`
        : `${value} ${exercise}`
    )
    .join(' · ')
}

const garminDuration = (date: string) => {
  const { reps, seconds } = garminDayTotal(date)

  if (reps <= 0 && seconds <= 0) return 0

  const sets = Math.ceil(reps / REPS_PER_SET + seconds / SECONDS_PER_SET)

  return (
    sets * MINUTES_PER_SET +
    Math.floor(sets / SETS_PER_BLOCK) * BLOCK_REST_MINUTES
  )
}

const formatGarminDuration = (date: string) => {
  const minutes = garminDuration(date)

  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} h`
  }

  return `${hours} h ${remainingMinutes} min`
}

const copyGarminSummary = async (date: string) => {
  const text =
    `${t('journal.strength')} · ${formatGarminDuration(date)} · ${garminExerciseSummary(date)}`

  try {
    await navigator.clipboard.writeText(text)

    copiedGarminDate.value = date

    setTimeout(() => {
      if (copiedGarminDate.value === date) {
        copiedGarminDate.value = null
      }
    }, 2000)
  } catch {
    copiedGarminDate.value = null
  }
}

const isExpanded = (date: string) => {
  return expandedDates.value.has(date)
}

const toggleDay = (date: string) => {
  const dates = new Set(expandedDates.value)

  if (dates.has(date)) {
    dates.delete(date)
  } else {
    dates.add(date)
  }

  expandedDates.value = dates
}

const toggleMenu = (id: string) => {
  openMenuId.value =
    openMenuId.value === id
      ? null
      : id
}

const handleDocumentClick = () => {
  openMenuId.value = null
}

const startEdit = (id: string) => {
  openMenuId.value = null
  editingSetId.value = id
}

const cancelEdit = () => {
  editingSetId.value = null
}

const saveEdit = async (set: LocalSet) => {
  const reps = Number(set.reps)

  // reps est un integer > 0 en base : une valeur décimale
  // serait refusée par le serveur et resterait pending
  if (!Number.isInteger(reps) || reps <= 0) return
  if (!set.time) return

  await updateSet(set.id, {
    reps,
    time: set.time
  })

  editingSetId.value = null
}

const handleDeleteSet = async (set: LocalSet) => {
  openMenuId.value = null

  const confirmed = window.confirm(
    t('journal.deleteConfirm', {
      exercise: set.exercise,
      amount: formatAmount(set.reps, unitOf(set.exercise))
    })
  )

  if (!confirmed) return

  await deleteSet(set.id)
}

const handleScroll = () => {
  const scrollPosition =
    window.innerHeight + window.scrollY

  const threshold =
    document.documentElement.scrollHeight - 500

  if (scrollPosition >= threshold) {
    loadMore()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="px-4 pb-24">

    <div class="px-1 pt-6 pb-3">
      <h1 class="page-title">
        {{ t('nav.journal') }}
      </h1>
    </div>

    <div class="mb-4">
      <ExerciseSelector
        v-model="selectedExercise"
        :required="false"
        source="sets"
      />
    </div>

    <div
      v-if="visibleDays.length === 0"
      class="py-12 text-center text-fg-muted"
    >
      {{ t('journal.empty') }}
    </div>

    <div
      v-for="day in visibleDays"
      :key="day.date"
      class="mb-3 overflow-hidden rounded-xl bg-surface"
    >

      <!-- Day header -->
      <button
        type="button"
        class="w-full px-4 py-3 text-left"
        @click="toggleDay(day.date)"
      >
        <div class="flex items-center gap-3">

          <div class="min-w-0 flex-1">
            <div
              class="text-base font-bold capitalize text-fg"
            >
              {{ formatDay(day.date) }}
            </div>

            <div
              class="mt-0.5 text-lg font-bold text-primary"
            >
              {{ dayTotal(day.date) }}
            </div>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="h-5 w-5 shrink-0 text-fg-muted transition-transform"
            :class="{
              'rotate-180': isExpanded(day.date)
            }"
          >
            <path
              d="m6 9 6 6 6-6"
            />
          </svg>

        </div>

        <!-- Garmin summary -->
        <div
          class="mt-2 flex items-center gap-2 text-sm leading-relaxed text-fg-secondary"
          @click.stop
        >
          <span class="min-w-0 flex-1">
            <span class="font-medium text-fg-secondary">
              Garmin · {{ t('journal.strength') }} ·
              {{ formatGarminDuration(day.date) }}
            </span>

            <span class="mx-1">·</span>

            <span>
              {{ garminExerciseSummary(day.date) }}
            </span>
          </span>

          <button
            type="button"
            class="shrink-0 text-fg-muted transition-colors hover:text-fg-secondary"
            :aria-label="
              copiedGarminDate === day.date
                ? t('journal.copied')
                : t('journal.copyGarmin')
            "
            @click="copyGarminSummary(day.date)"
          >
            <span
              v-if="copiedGarminDate === day.date"
              class="text-sm font-semibold text-success"
            >
              ✓
            </span>

            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              class="h-4 w-4"
            >
              <rect
                x="8"
                y="8"
                width="11"
                height="11"
                rx="2"
              />

              <path
                d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
              />
            </svg>
          </button>
        </div>
      </button>

      <!-- Set details -->
      <div
        v-if="isExpanded(day.date)"
        class="border-t border-line"
      >

        <article
          v-for="set in day.sets"
          :key="set.id"
          class="relative border-b border-line last:border-b-0"
          :class="{
            'z-40': editingSetId === set.id
          }"
        >

          <!-- Edit mode -->
          <div
            v-if="editingSetId === set.id"
            class="px-4 py-3"
          >
            <div class="flex items-center gap-3">

              <input
                v-model="set.time"
                type="time"
                class="w-24 rounded-lg border border-transparent bg-surface-alt px-2 py-1.5 text-sm text-fg-secondary outline-none focus:border-primary"
              />

              <div class="min-w-0 flex-1">
                <div
                  class="truncate font-semibold text-fg"
                >
                  {{ set.exercise }}
                </div>
              </div>

              <input
                v-model.number="set.reps"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                class="w-20 rounded-lg bg-surface-alt px-2 py-1.5 text-right text-sm font-semibold text-fg outline-none focus:border-primary"
              />

              <span
                v-if="unitOf(set.exercise) === 'seconds'"
                class="text-xs font-medium text-fg-muted"
              >
                s
              </span>

            </div>

            <div class="mt-3 flex justify-end gap-2">

              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-secondary hover:bg-surface-alt"
                @click="cancelEdit"
              >
                {{ t('common.cancel') }}
              </button>

              <button
                type="button"
                class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary/90"
                @click="saveEdit(set)"
              >
                {{ t('common.save') }}
              </button>

            </div>
          </div>

          <!-- Normal mode -->
          <div
            v-else
            class="flex items-center gap-3 px-4 py-2.5"
          >
            <span
              class="w-12 shrink-0 text-sm font-medium text-fg-muted"
            >
              {{ formatSetTime(set.time) }}
            </span>

            <div class="min-w-0 flex-1">
              <div
                class="truncate font-semibold text-fg"
              >
                {{ set.exercise }}
              </div>
            </div>

            <span
              class="whitespace-nowrap font-bold text-fg"
            >
              <template v-if="unitOf(set.exercise) === 'seconds'">
                {{ formatDuration(set.reps) }}
              </template>
              <template v-else>
                {{ set.reps }}

                <span
                  class="text-xs font-medium text-fg-muted"
                >
                  reps
                </span>
              </template>
            </span>

            <!-- Menu -->
            <div class="relative shrink-0">

              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-alt hover:text-fg-secondary"
                :aria-label="t('journal.options')"
                @click.stop="toggleMenu(set.id)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="h-5 w-5"
                >
                  <circle
                    cx="5"
                    cy="12"
                    r="1.5"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="1.5"
                  />
                  <circle
                    cx="19"
                    cy="12"
                    r="1.5"
                  />
                </svg>
              </button>

              <div
                v-if="openMenuId === set.id"
                class="absolute right-0 top-9 z-50 w-32 overflow-hidden rounded-xl bg-surface py-1 shadow-lg"
                @click.stop
              >
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-fg-secondary hover:bg-surface-alt"
                  @click="startEdit(set.id)"
                >
                  {{ t('journal.edit') }}
                </button>

                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                  @click="handleDeleteSet(set)"
                >
                  {{ t('journal.delete') }}
                </button>
              </div>

            </div>
          </div>

        </article>

      </div>

    </div>

    <div
      v-if="hasMore"
      class="py-6 text-center text-sm text-fg-muted"
    >
      {{ t('common.loading') }}
    </div>

  </div>
</template>