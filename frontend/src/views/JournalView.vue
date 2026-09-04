<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import { useExerciseStore } from '../stores/exercise'
import { useWorkouts } from '../composables/useWorkouts'
import type { LocalWorkout } from '../db'

const exerciseStore = useExerciseStore()
const {
  workouts,
  updateWorkout,
  deleteWorkout
} = useWorkouts()

const PAGE_SIZE = 30

// ============================================================
// ESTIMATION DURÉE GARMIN
// ============================================================

const REPS_PER_SET = 15
const MINUTES_PER_SET = 1
const SETS_PER_BLOCK = 10
const BLOCK_REST_MINUTES = 2

const visibleCount = ref(PAGE_SIZE)
const editingWorkoutId = ref<string | null>(null)
const openMenuId = ref<string | null>(null)
const copiedGarminDate = ref<string | null>(null)

// ============================================================
// WORKOUTS FILTRÉS ET TRIÉS
// ============================================================

const filteredWorkouts = computed(() => {
  let result = workouts.value.filter(w => !w.deletedAt)

  if (exerciseStore.selectedExercise) {
    result = result.filter(
      w => w.exercise === exerciseStore.selectedExercise
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

// ============================================================
// DATE
// ============================================================

/**
 * Date locale actuelle au format YYYY-MM-DD.
 */
const getTodayString = () => {
  const d = new Date()

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Date d'hier au format YYYY-MM-DD.
 */
const getYesterdayString = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Formatage de la date métier du workout.
 *
 * workout.date est une string YYYY-MM-DD.
 */
const formatDay = (date: string) => {
  const day = date.slice(0, 10)

  if (day === getTodayString()) {
    return "Aujourd'hui"
  }

  if (day === getYesterdayString()) {
    return 'Hier'
  }

  return new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// ============================================================
// AFFICHAGE HEURE
// ============================================================

/**
 * Retourne l'heure métier du workout.
 *
 * workoutTime est stocké au format HH:mm.
 */
const formatWorkoutTime = (workoutTime: string) => {
  if (!workoutTime) {
    return '--:--'
  }

  return workoutTime.slice(0, 5)
}

// ============================================================
// JOURNAL
// ============================================================

/**
 * Indique si le workout est le premier de sa journée.
 */
const isFirstOfDay = (index: number) => {
  if (index === 0) return true

  const current = visibleWorkouts.value[index]
  const previous = visibleWorkouts.value[index - 1]

  return current.date !== previous.date
}

/**
 * Total des répétitions pour une journée.
 *
 * Le filtre exercice est appliqué ici.
 */
const dayTotal = (date: string) => {
  return filteredWorkouts.value
    .filter(w => w.date === date)
    .reduce((total, w) => total + w.reps, 0)
}

/**
 * Total réel des répétitions pour une journée,
 * sans tenir compte du filtre exercice.
 *
 * Utilisé pour le résumé Garmin.
 */
const garminDayTotal = (date: string) => {
  return workouts.value
    .filter(w => !w.deletedAt && w.date === date)
    .reduce((total, w) => total + w.reps, 0)
}

/**
 * Détail des répétitions par exercice pour Garmin.
 *
 * Le résultat est trié par nombre de répétitions décroissant.
 */
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

/**
 * Estimation de la durée à saisir dans Garmin.
 *
 * Règle :
 * - 15 reps = 1 minute
 * - +2 minutes toutes les 10 séries équivalentes
 *
 * Le calcul utilise toutes les reps de la journée,
 * indépendamment du filtre exercice.
 */
const garminDuration = (date: string) => {
  const reps = garminDayTotal(date)

  if (reps <= 0) {
    return 0
  }

  const sets = Math.ceil(reps / REPS_PER_SET)

  return (
    sets * MINUTES_PER_SET +
    Math.floor(sets / SETS_PER_BLOCK) * BLOCK_REST_MINUTES
  )
}

/**
 * Formatage de la durée Garmin.
 */
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

/**
 * Copie le résumé Garmin dans le presse-papier.
 */
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

// ============================================================
// MENU
// ============================================================

/**
 * Ouvre / ferme le menu d'un workout.
 */
const toggleMenu = (id: string) => {
  openMenuId.value =
    openMenuId.value === id
      ? null
      : id
}

/**
 * Ferme le menu lorsqu'on clique ailleurs.
 */
const handleDocumentClick = () => {
  openMenuId.value = null
}

// ============================================================
// ÉDITION
// ============================================================

const startEdit = (id: string) => {
  openMenuId.value = null
  editingWorkoutId.value = id
}

const cancelEdit = () => {
  editingWorkoutId.value = null
}

const saveEdit = async (workout: LocalWorkout) => {
  const reps = Number(workout.reps)

  if (!Number.isFinite(reps) || reps <= 0) {
    return
  }

  if (!workout.workoutTime) {
    return
  }

  await updateWorkout(workout.id, {
    reps,
    workoutTime: workout.workoutTime
  })

  editingWorkoutId.value = null
}

// ============================================================
// SUPPRESSION
// ============================================================

const handleDeleteWorkout = async (workout: LocalWorkout) => {
  openMenuId.value = null

  const confirmed = window.confirm(
    `Supprimer ${workout.exercise} — ${workout.reps} reps ?`
  )

  if (!confirmed) return

  await deleteWorkout(workout.id)
}

// ============================================================
// INFINITE SCROLL
// ============================================================

const handleScroll = () => {
  const scrollPosition = window.innerHeight + window.scrollY
  const threshold = document.documentElement.scrollHeight - 500

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

  <div class="pb-24">

    <!-- ========================================================
         EN-TÊTE
    ========================================================= -->

    <header class="px-5 pt-6 pb-4">
      <h1 class="text-2xl font-bold tracking-tight text-gray-900">
        Journal
      </h1>
    </header>

    <!-- ========================================================
         FILTRE EXERCICE
    ========================================================= -->

    <ExerciseSelector
      :required="false"
      source="workouts"
    />

    <!-- ========================================================
         JOURNAL
    ========================================================= -->

    <main class="px-5 mt-4">

      <!-- Aucun workout -->

      <div
        v-if="visibleWorkouts.length === 0"
        class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-8 text-center"
      >
        <div class="text-3xl mb-3">
          📝
        </div>

        <p class="font-semibold text-gray-800">
          Aucun workout
        </p>

        <p class="text-sm text-gray-500 mt-1">
          Tes exercices enregistrés apparaîtront ici.
        </p>
      </div>

      <!-- Journal -->
      <div
        v-else
        class="space-y-2"
      >

        <template
          v-for="(workout, index) in visibleWorkouts"
          :key="workout.id"
        >

          <!-- ==================================================
               SÉPARATEUR DE JOURNÉE
          ================================================== -->

          <div
            v-if="isFirstOfDay(index)"
            class="pt-2 pb-1"
          >

            <div class="flex items-center justify-between">

              <h2
                class="text-sm font-bold uppercase tracking-wide text-gray-500"
              >
                {{ formatDay(workout.date) }}
              </h2>

              <span class="text-xs font-semibold text-amber-600">
                {{ dayTotal(workout.date) }} reps
              </span>

            </div>

            <!-- Résumé Garmin -->

            <div class="mt-1 flex items-center gap-2 text-xs text-gray-400">

              <span class="leading-relaxed">
                Garmin · Musculation · {{ formatGarminDuration(workout.date) }}
                ·
                <span class="font-medium text-gray-500">
                  {{ garminExerciseSummary(workout.date) }}
                </span>
              </span>

              <button
                type="button"
                class="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                :aria-label="
                  copiedGarminDate === workout.date
                    ? 'Copié'
                    : 'Copier pour Garmin'
                "
                @click.stop="copyGarminSummary(workout.date)"
              >
                <span v-if="copiedGarminDate === workout.date">
                  ✓
                </span>

                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  class="w-4 h-4"
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

          </div>

          <!-- ==================================================
               WORKOUT
          ================================================== -->

          <article
            class="relative bg-amber-50/40 border border-amber-100/80 rounded-2xl overflow-visible"
            :class="{
              'z-40': editingWorkoutId === workout.id
            }"
          >

            <!-- ==================================================
                 MODE ÉDITION
            ================================================== -->

            <div
              v-if="editingWorkoutId === workout.id"
              class="p-4"
            >

              <div class="flex items-center gap-3">

                <!-- Heure -->

                <input
                  v-model="workout.workoutTime"
                  type="time"
                  class="w-[76px] shrink-0 rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-sm font-semibold text-gray-700 outline-none focus:border-amber-500"
                />

                <!-- Exercice + reps -->

                <div class="flex-1 min-w-0">

                  <div class="font-semibold text-gray-800 truncate">
                    {{ workout.exercise }}
                  </div>

                  <input
                    v-model.number="workout.reps"
                    type="number"
                    min="0"
                    inputmode="numeric"
                    class="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-lg font-bold outline-none focus:border-amber-500"
                  />

                </div>

                <!-- Actions -->

                <div class="flex flex-col gap-2 shrink-0">

                  <button
                    class="text-xs font-bold text-amber-600"
                    @click="saveEdit(workout)"
                  >
                    Enregistrer
                  </button>

                  <button
                    class="text-xs text-gray-400"
                    @click="cancelEdit"
                  >
                    Annuler
                  </button>

                </div>

              </div>

            </div>

            <!-- ==================================================
                 MODE NORMAL
            ================================================== -->

            <div
              v-else
              class="flex items-center gap-3 px-4 py-1"
            >

              <!-- Heure du workout -->

              <span
                class="text-sm font-medium text-gray-400 w-12 shrink-0"
              >
                {{ formatWorkoutTime(workout.workoutTime) }}
              </span>

              <!-- Exercice -->

              <div class="flex-1 min-w-0">

                <div class="font-semibold text-gray-800 truncate">
                  {{ workout.exercise }}
                </div>

              </div>

              <!-- Reps -->

              <span
                class="font-bold text-gray-900 whitespace-nowrap"
              >
                {{ workout.reps }}

                <span class="text-xs font-medium text-gray-400">
                  reps
                </span>
              </span>

              <!-- ==================================================
                   MENU
              ================================================== -->

              <div class="relative">

                <button
                  class="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-amber-100 hover:text-gray-700 transition-colors"
                  aria-label="Actions"
                  @click.stop="toggleMenu(workout.id)"
                >
                  ⋮
                </button>

                <div
                  v-if="openMenuId === workout.id"
                  class="absolute right-0 top-7 z-50 w-32 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden"
                >

                  <!-- Modifier -->

                  <button
                    class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50"
                    @click="startEdit(workout.id)"
                  >
                    ✏️ Modifier
                  </button>

                  <!-- Supprimer -->

                  <button
                    class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    @click="handleDeleteWorkout(workout)"
                  >
                    🗑️ Supprimer
                  </button>

                </div>

              </div>

            </div>

          </article>

        </template>

        <!-- ======================================================
             CHARGEMENT / FIN
        ======================================================= -->

        <div class="py-5 text-center">

          <button
            v-if="hasMore"
            class="text-sm font-semibold text-amber-600"
            @click="loadMore"
          >
            Charger plus
          </button>

          <span
            v-else
            class="text-xs text-gray-400"
          >
            Fin du journal
          </span>

        </div>

      </div>

    </main>
  </div>
</template>