<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import { useExerciseStore } from '../stores/exercise'
import { useWorkouts } from '../composables/useWorkouts'

const exerciseStore = useExerciseStore()
const { workouts } = useWorkouts()

const PAGE_SIZE = 30

const visibleCount = ref(PAGE_SIZE)
const editingWorkoutId = ref<string | null>(null)

const filteredWorkouts = computed(() => {
  let result = workouts.value.filter(w => !w.deletedAt)

  if (exerciseStore.selectedExercise) {
    result = result.filter(
      w => w.exercise === exerciseStore.selectedExercise
    )
  }

  // Tri par date du workout, puis par heure de création.
  return [...result].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date)
    }

    return b.createdAt - a.createdAt
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

const resetPagination = () => {
  visibleCount.value = PAGE_SIZE
  editingWorkoutId.value = null
}

/**
 * Heure réelle de création du workout.
 */
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

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
 * Le filtre exercice est déjà appliqué dans filteredWorkouts.
 */
const dayTotal = (date: string) => {
  return filteredWorkouts.value
    .filter(w => w.date === date)
    .reduce((total, w) => total + w.reps, 0)
}

const startEdit = (id: string) => {
  editingWorkoutId.value = id
}

const cancelEdit = () => {
  editingWorkoutId.value = null
}

/*
 * Pour l'instant on modifie directement l'objet du workout.
 *
 * Si ton useWorkouts possède déjà une méthode updateWorkout(),
 * on la branchera ici ensuite.
 */
const saveEdit = async (workout: any) => {
  workout.reps = Number(workout.reps)

  if (!Number.isFinite(workout.reps) || workout.reps < 0) {
    return
  }

  workout.updatedAt = Date.now()

  editingWorkoutId.value = null

  await nextTick()
}

/*
 * Suppression logique.
 *
 * À remplacer par la méthode du composable si useWorkouts
 * expose déjà deleteWorkout().
 */
const deleteWorkout = async (workout: any) => {
  const confirmed = window.confirm(
    `Supprimer ${workout.exercise} — ${workout.reps} reps ?`
  )

  if (!confirmed) return

  workout.deletedAt = Date.now()
  workout.updatedAt = Date.now()

  await nextTick()
}

/**
 * Infinite scroll.
 */
const handleScroll = () => {
  const scrollPosition = window.innerHeight + window.scrollY
  const threshold = document.documentElement.scrollHeight - 500

  if (scrollPosition >= threshold) {
    loadMore()
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="pb-24">

    <!-- En-tête -->
    <header class="px-5 pt-6 pb-4">
      <h1 class="text-2xl font-bold tracking-tight text-gray-900">
        Journal
      </h1>
    </header>

    <!-- Filtre exercice -->
    <ExerciseSelector :required="false" />

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
        class="space-y-5"
      >

        <template
          v-for="(workout, index) in visibleWorkouts"
          :key="workout.id"
        >

          <!-- Séparateur de journée -->
          <div
            v-if="isFirstOfDay(index)"
            class="flex items-center justify-between pt-2"
          >
            <h2
              class="text-sm font-bold uppercase tracking-wide text-gray-500"
            >
              {{ formatDay(workout.date) }}
            </h2>

            <span class="text-xs font-semibold text-amber-600">
              {{ dayTotal(workout.date) }} reps
            </span>
          </div>

          <!-- Workout -->
          <article
            class="relative bg-amber-50/40 border border-amber-100/80 rounded-2xl overflow-visible"
            :class="{
              'z-40': editingWorkoutId === workout.id
            }"
          >

            <!-- Mode édition -->
            <div
              v-if="editingWorkoutId === workout.id"
              class="p-4"
            >
              <div class="flex items-center gap-3">

                <span class="text-sm text-gray-500 w-12">
                  {{ formatTime(workout.createdAt) }}
                </span>

                <div class="flex-1">
                  <div class="font-semibold text-gray-800">
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

                <div class="flex flex-col gap-2">
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

            <!-- Mode normal -->
            <div
              v-else
              class="flex items-center gap-3 px-4 py-3"
            >

              <!-- Heure -->
              <span
                class="text-sm font-medium text-gray-400 w-12 shrink-0"
              >
                {{ formatTime(workout.createdAt) }}
              </span>

              <!-- Exercice -->
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800 truncate">
                  {{ workout.exercise }}
                </div>

                <div
                  v-if="workout.mode"
                  class="text-xs text-gray-400 mt-0.5"
                >
                  {{ workout.mode }}
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

              <!-- Menu -->
              <div class="relative group">

                <button
                  class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-amber-100 hover:text-gray-700 transition-colors"
                  aria-label="Actions"
                >
                  ⋮
                </button>

                <div
                  class="hidden group-hover:block absolute right-0 top-8 z-50 w-32 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden"
                >

                  <button
                    class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-amber-50"
                    @click="startEdit(workout.id)"
                  >
                    ✏️ Modifier
                  </button>

                  <button
                    class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    @click="deleteWorkout(workout)"
                  >
                    🗑️ Supprimer
                  </button>

                </div>

              </div>

            </div>
          </article>

        </template>

        <!-- Chargement / fin -->
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
