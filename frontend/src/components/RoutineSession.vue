<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AddRepsModal from './AddRepsModal.vue'
import { getRoutines, type Routine } from '../api/routines'
import { useExerciseStore } from '../stores/exercise'
import { usePreview } from '../composables/usePreview'

// Mode séance de l'écran d'accueil : un bouton par exercice, avec son
// avancement. Les saisies vont dans la séance en cours (preview), qu'on
// relit et enregistre à la fin depuis l'aperçu.

const props = defineProps<{
  date: string
}>()

// Dernière liste connue : la séance reste utilisable hors ligne (en salle)
const CACHE_KEY = 'countrep.routinesCache'
const MAX_ROUNDS_AT_ONCE = 50

const router = useRouter()
const exerciseStore = useExerciseStore()
const { preview, counts, load, addEntries } = usePreview()

const routines = ref<Routine[]>([])
const loading = ref(false)
const offline = ref(false)

const selectedRoutine = computed(() =>
  routines.value.find(r => r.id === exerciseStore.selectedRoutine) ?? null
)

// Une séance en cours impose sa séance (copie figée au démarrage) et sa date
const current = computed(() => preview.value?.routine ?? selectedRoutine.value)
const sessionDate = computed(() => preview.value?.date ?? props.date)

const doneCount = (position: number) => counts.value[position] ?? 0

// Séries entièrement terminées (tous les exercices faits)
const completedRounds = computed(() =>
  preview.value && counts.value.length ? Math.min(...counts.value) : 0
)

const roundsToAdd = ref(1)

const getCurrentTime = () => {
  const date = new Date()
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// Saisie d'un exercice (fenêtre)
const modalPosition = ref<number | null>(null)

const modalExercise = computed(() =>
  modalPosition.value !== null
    ? current.value?.exercises[modalPosition.value] ?? null
    : null
)

const saveOne = async ({ reps, workoutTime }: { reps: number, workoutTime: string }) => {
  const position = modalPosition.value
  if (position === null || !current.value) return

  modalPosition.value = null
  await addEntries(current.value, sessionDate.value, [{ position, reps, workoutTime }])
}

// Série complète : chaque exercice avec son objectif, `roundsToAdd` fois
const addRounds = async () => {
  if (!current.value) return

  const workoutTime = getCurrentTime()
  const items = []

  for (let round = 0; round < roundsToAdd.value; round++) {
    for (const [position, exercise] of current.value.exercises.entries()) {
      items.push({ position, reps: exercise.reps, workoutTime })
    }
  }

  roundsToAdd.value = 1
  await addEntries(current.value, sessionDate.value, items)
}

const changeRoundsToAdd = (offset: -1 | 1) => {
  roundsToAdd.value = Math.min(MAX_ROUNDS_AT_ONCE, Math.max(1, roundsToAdd.value + offset))
}

// Garde une séance sélectionnée valide
watch(routines, list => {
  if (!list.some(r => r.id === exerciseStore.selectedRoutine)) {
    exerciseStore.setRoutine(list[0]?.id ?? null)
  }
})

onMounted(async () => {
  loading.value = true

  try {
    await load()
    routines.value = await getRoutines()
    localStorage.setItem(CACHE_KEY, JSON.stringify(routines.value))
    offline.value = false
  } catch (error) {
    console.warn('Séances indisponibles, utilisation du cache local', error)
    try {
      routines.value = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')
    } catch {
      routines.value = []
    }
    offline.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="px-3 space-y-4">

    <p v-if="loading" class="px-2 text-sm text-gray-500">
      Chargement des séances...
    </p>

    <!-- Aucune séance -->
    <div
      v-else-if="!current && routines.length === 0"
      class="mx-2 rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center"
    >
      <p class="text-sm font-medium text-gray-700">
        Aucune séance définie.
      </p>
      <router-link
        to="/settings/routines/new"
        class="mt-3 inline-block text-sm font-semibold text-amber-600"
      >
        Créer une séance ›
      </router-link>
    </div>

    <template v-else>

      <p v-if="offline" class="px-2 text-xs text-gray-400">
        Hors ligne : dernière version connue des séances.
      </p>

      <!-- Séance en cours : elle s'impose jusqu'à son enregistrement -->
      <div
        v-if="preview"
        class="mx-2 rounded-2xl bg-amber-100/70 border border-amber-200 px-4 py-2.5 text-sm text-amber-900"
      >
        Séance en cours : <strong>{{ preview.routine.name }}</strong> du {{ preview.date }}
      </div>

      <!-- Choix de la séance -->
      <div v-else class="flex gap-2 overflow-x-auto px-2 pb-1 no-scrollbar">
        <button
          v-for="r in routines"
          :key="r.id"
          type="button"
          class="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
          :class="r.id === current?.id
            ? 'bg-amber-500 border-amber-500 text-white'
            : 'bg-white border-gray-200 text-gray-700'"
          @click="exerciseStore.setRoutine(r.id)"
        >
          {{ r.name }}
        </button>
      </div>

      <section
        v-if="current"
        class="bg-white border border-gray-200/80 rounded-3xl p-4 shadow-xs"
      >
        <div class="flex items-baseline justify-between gap-3 px-1">
          <p class="text-sm text-gray-500">
            Séance du {{ sessionDate }}
          </p>
          <p class="text-sm font-semibold text-gray-800">
            {{ completedRounds }} / {{ current.rounds }} séries
          </p>
        </div>

        <!-- Un bouton par exercice -->
        <div class="mt-3 space-y-2">
          <button
            v-for="(exercise, index) in current.exercises"
            :key="index"
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.98]"
            :class="doneCount(index) >= current.rounds
              ? 'border-green-300 bg-green-50'
              : 'border-amber-300 bg-amber-50'"
            @click="modalPosition = index"
          >
            <div class="min-w-0 flex-1">
              <p class="text-base font-semibold text-gray-900 truncate">
                {{ exercise.nameFr }}
              </p>
              <p class="text-xs text-gray-500">
                {{ exercise.reps }} reps
              </p>
            </div>

            <span
              class="shrink-0 rounded-full px-3 py-1 text-sm font-bold"
              :class="doneCount(index) >= current.rounds
                ? 'bg-green-500 text-white'
                : 'bg-white text-amber-700 border border-amber-300'"
            >
              {{ doneCount(index) >= current.rounds ? '✓ ' : '' }}{{ doneCount(index) }} / {{ current.rounds }}
            </span>
          </button>
        </div>

        <!-- Série complète -->
        <div class="mt-4 rounded-2xl bg-gray-50 p-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="h-9 w-9 rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-700 disabled:opacity-30"
                :disabled="roundsToAdd <= 1"
                aria-label="Une série de moins"
                @click="changeRoundsToAdd(-1)"
              >
                −
              </button>
              <span class="w-7 text-center text-lg font-bold text-gray-900">{{ roundsToAdd }}</span>
              <button
                type="button"
                class="h-9 w-9 rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-700"
                aria-label="Une série de plus"
                @click="changeRoundsToAdd(1)"
              >
                +
              </button>
            </div>

            <button
              type="button"
              class="flex-1 bg-white border border-amber-400 text-amber-800 text-sm font-semibold py-3 rounded-2xl transition-all active:scale-[0.98]"
              @click="addRounds"
            >
              Ajouter {{ roundsToAdd > 1 ? `${roundsToAdd} séries` : 'la série' }}
            </button>
          </div>
          <p class="mt-2 text-xs text-gray-500 text-center">
            Chaque exercice avec son nombre de reps prévu.
          </p>
        </div>

        <!-- Fin de séance -->
        <button
          type="button"
          :disabled="!preview || preview.entries.length === 0"
          class="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:shadow-none text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
          @click="router.push('/preview')"
        >
          Terminer la séance
        </button>
      </section>

    </template>

    <AddRepsModal
      v-if="modalExercise"
      :exercise-id="modalExercise.exerciseId"
      :exercise-name="modalExercise.nameFr"
      :date="sessionDate"
      :initial-reps="modalExercise.reps"
      @close="modalPosition = null"
      @save="saveOne"
    />

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
