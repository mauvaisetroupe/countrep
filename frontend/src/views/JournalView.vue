<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import { useWorkouts } from '../composables/useWorkouts'
import type { LocalWorkout } from '../db'

const selectedExercise = ref<string | null>(null)

const { workouts, updateWorkout, deleteWorkout } = useWorkouts()

const PAGE_SIZE = 30

const REPS_PER_SET = 15
const MINUTES_PER_SET = 1
const SETS_PER_BLOCK = 10
const BLOCK_REST_MINUTES = 2

const visibleCount = ref(PAGE_SIZE)
const editingWorkoutId = ref<string | null>(null)
const openMenuId = ref<string | null>(null)
const copiedGarminDate = ref<string | null>(null)

const expandedDates = ref<Set<string>>(new Set())

const filteredWorkouts = computed(() => {
  let result = workouts.value.filter(w => !w.deletedAt)

  if (selectedExercise.value) {
    result = result.filter(
      w => w.exercise === selectedExercise.value
    )
  }

  return [...result].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date)
    }

    return b.workoutTime.localeCompare(a.workoutTime)
  })
})

const visibleWorkouts = computed(() => {
  return filteredWorkouts.value.slice(0, visibleCount.value)
})

const hasMore = computed(() => {
  return visibleCount.value < filteredWorkouts.value.length
})

const loadMore = () => {
  if (!hasMore.value) return

  visibleCount.value += PAGE_SIZE
}

const visibleDays = computed(() => {
  const days = new Map<string, LocalWorkout[]>()

  for (const workout of visibleWorkouts.value) {
    const dayWorkouts = days.get(workout.date) ?? []
    dayWorkouts.push(workout)
    days.set(workout.date, dayWorkouts)
  }

  return [...days.entries()].map(([date, dayWorkouts]) => ({
    date,
    workouts: dayWorkouts
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
    return "Aujourd'hui"
  }

  if (day === getYesterdayString()) {
    return 'Hier'
  }

  return new Date(`${day}T12:00:00`).toLocaleDateString(
    'fr-FR',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  )
}

const formatWorkoutTime = (workoutTime: string) => {
  if (!workoutTime) return '--:--'

  return workoutTime.slice(0, 5)
}

const dayTotal = (date: string) => {
  return filteredWorkouts.value
    .filter(w => w.date === date)
    .reduce((total, w) => total + w.reps, 0)
}

const garminDayTotal = (date: string) => {
  return workouts.value
    .filter(w => !w.deletedAt && w.date === date)
    .reduce((total, w) => total + w.reps, 0)
}

const garminExerciseSummary = (date: string) => {
  const totals = new Map<string, number>()

  workouts.value
    .filter(w => !w.deletedAt && w.date === date)
    .forEach(w => {
      totals.set(
        w.exercise,
        (totals.get(w.exercise) ?? 0) + w.reps
      )
    })

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([exercise, reps]) => `${reps} ${exercise}`)
    .join(' · ')
}

const garminDuration = (date: string) => {
  const reps = garminDayTotal(date)

  if (reps <= 0) return 0

  const sets = Math.ceil(reps / REPS_PER_SET)

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
    `Musculation · ${formatGarminDuration(date)} · ${garminExerciseSummary(date)}`

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
  editingWorkoutId.value = id
}

const cancelEdit = () => {
  editingWorkoutId.value = null
}

const saveEdit = async (workout: LocalWorkout) => {
  const reps = Number(workout.reps)

  if (!Number.isFinite(reps) || reps <= 0) return
  if (!workout.workoutTime) return

  await updateWorkout(workout.id, {
    reps,
    workoutTime: workout.workoutTime
  })

  editingWorkoutId.value = null
}

const handleDeleteWorkout = async (workout: LocalWorkout) => {
  openMenuId.value = null

  const confirmed = window.confirm(
    `Supprimer ${workout.exercise} — ${workout.reps} reps ?`
  )

  if (!confirmed) return

  await deleteWorkout(workout.id)
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

    <div class="pt-4 pb-3">
      <h1 class="text-2xl font-bold text-gray-900">
        Journal
      </h1>
    </div>

    <div class="mb-4">
      <ExerciseSelector
        v-model="selectedExercise"
        :required="false"
        source="workouts"
      />
    </div>

    <div
      v-if="visibleDays.length === 0"
      class="py-12 text-center text-gray-400"
    >
      Aucun entraînement.
    </div>

    <div
      v-for="day in visibleDays"
      :key="day.date"
      class="mb-3 overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-xs"
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
              class="text-base font-bold capitalize text-gray-900"
            >
              {{ formatDay(day.date) }}
            </div>

            <div
              class="mt-0.5 text-lg font-bold text-amber-600"
            >
              {{ dayTotal(day.date) }}
              <span class="text-sm font-medium text-gray-400">
                reps
              </span>
            </div>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="h-5 w-5 shrink-0 text-gray-400 transition-transform"
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
          class="mt-2 flex items-center gap-2 text-sm leading-relaxed text-gray-500"
          @click.stop
        >
          <span class="min-w-0 flex-1">
            <span class="font-medium text-gray-600">
              Garmin · Musculation ·
              {{ formatGarminDuration(day.date) }}
            </span>

            <span class="mx-1">·</span>

            <span>
              {{ garminExerciseSummary(day.date) }}
            </span>
          </span>

          <button
            type="button"
            class="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            :aria-label="
              copiedGarminDate === day.date
                ? 'Copié'
                : 'Copier pour Garmin'
            "
            @click="copyGarminSummary(day.date)"
          >
            <span
              v-if="copiedGarminDate === day.date"
              class="text-sm font-semibold text-green-600"
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

      <!-- Workout details -->
      <div
        v-if="isExpanded(day.date)"
        class="border-t border-gray-100"
      >

        <article
          v-for="workout in day.workouts"
          :key="workout.id"
          class="relative border-b border-gray-100 last:border-b-0"
          :class="{
            'z-40': editingWorkoutId === workout.id
          }"
        >

          <!-- Edit mode -->
          <div
            v-if="editingWorkoutId === workout.id"
            class="px-4 py-3"
          >
            <div class="flex items-center gap-3">

              <input
                v-model="workout.workoutTime"
                type="time"
                class="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-amber-400"
              />

              <div class="min-w-0 flex-1">
                <div
                  class="truncate font-semibold text-gray-800"
                >
                  {{ workout.exercise }}
                </div>
              </div>

              <input
                v-model.number="workout.reps"
                type="number"
                min="1"
                class="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm font-semibold text-gray-800 outline-none focus:border-amber-400"
              />

            </div>

            <div class="mt-3 flex justify-end gap-2">

              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
                @click="cancelEdit"
              >
                Annuler
              </button>

              <button
                type="button"
                class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
                @click="saveEdit(workout)"
              >
                Enregistrer
              </button>

            </div>
          </div>

          <!-- Normal mode -->
          <div
            v-else
            class="flex items-center gap-3 px-4 py-2.5"
          >
            <span
              class="w-12 shrink-0 text-sm font-medium text-gray-400"
            >
              {{ formatWorkoutTime(workout.workoutTime) }}
            </span>

            <div class="min-w-0 flex-1">
              <div
                class="truncate font-semibold text-gray-800"
              >
                {{ workout.exercise }}
              </div>
            </div>

            <span
              class="whitespace-nowrap font-bold text-gray-900"
            >
              {{ workout.reps }}

              <span
                class="text-xs font-medium text-gray-400"
              >
                reps
              </span>
            </span>

            <!-- Menu -->
            <div class="relative shrink-0">

              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Options"
                @click.stop="toggleMenu(workout.id)"
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
                v-if="openMenuId === workout.id"
                class="absolute right-0 top-9 z-50 w-32 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                @click.stop
              >
                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  @click="startEdit(workout.id)"
                >
                  Modifier
                </button>

                <button
                  type="button"
                  class="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  @click="handleDeleteWorkout(workout)"
                >
                  Supprimer
                </button>
              </div>

            </div>
          </div>

        </article>

      </div>

    </div>

    <div
      v-if="hasMore"
      class="py-6 text-center text-sm text-gray-400"
    >
      Chargement…
    </div>

  </div>
</template>