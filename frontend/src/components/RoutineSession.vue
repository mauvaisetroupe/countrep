<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AddRepsModal from './AddRepsModal.vue'
import RoutineTile from './RoutineTile.vue'
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
const { preview, counts, load, addEntries, discard } = usePreview()

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

// Séance commencée : plein écran, sauf si l'utilisateur l'a réduite
const minimized = ref(false)
const fullscreen = computed(() => !!preview.value && !minimized.value)

// Une nouvelle séance s'ouvre en plein écran
watch(() => preview.value?.id, () => {
  minimized.value = false
})

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

const abandon = async () => {
  if (window.confirm('Abandonner cette séance ? Les séries saisies seront perdues.')) {
    await discard()
  }
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

    <!-- Séance en cours, réduite -->
    <button
      v-else-if="preview"
      type="button"
      class="mx-2 flex w-[calc(100%-1rem)] items-center justify-between gap-3 rounded-3xl bg-amber-500 px-5 py-4 text-left text-white shadow-md shadow-amber-200 active:scale-[0.98] transition-transform"
      @click="minimized = false"
    >
      <div class="min-w-0">
        <p class="text-xs opacity-90">Séance en cours · {{ preview.date }}</p>
        <p class="text-base font-bold truncate">{{ preview.routine.name }}</p>
      </div>
      <span class="shrink-0 text-sm font-semibold">
        {{ completedRounds }}/{{ preview.routine.rounds }} · Reprendre ›
      </span>
    </button>

    <!-- Choix de la séance, avant de commencer -->
    <template v-else>

      <p v-if="offline" class="px-2 text-xs text-gray-400">
        Hors ligne : dernière version connue des séances.
      </p>

      <div class="flex gap-2 overflow-x-auto px-2 pb-1 no-scrollbar">
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
        <p class="px-1 text-sm text-gray-500">
          {{ current.rounds }} {{ current.rounds > 1 ? 'séries' : 'série' }} ·
          appuie sur un exercice pour commencer
        </p>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <RoutineTile
            v-for="(exercise, index) in current.exercises"
            :key="index"
            :name="exercise.nameFr"
            :reps="exercise.reps"
            :done="0"
            :rounds="current.rounds"
            @click="modalPosition = index"
          />
        </div>
      </section>

    </template>

    <!-- ======================================================
         SÉANCE EN COURS : PLEIN ÉCRAN
    ====================================================== -->

    <Teleport to="body">
      <div
        v-if="fullscreen && current"
        class="fixed inset-0 z-40 flex flex-col bg-[#fdf8f5] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <!-- En-tête -->
        <header class="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            type="button"
            class="shrink-0 text-sm font-medium text-amber-600"
            @click="minimized = true"
          >
            ‹ Réduire
          </button>

          <div class="min-w-0 flex-1 text-center">
            <p class="text-base font-bold text-gray-900 truncate">{{ current.name }}</p>
            <p class="text-xs text-gray-500">{{ sessionDate }}</p>
          </div>

          <span class="shrink-0 rounded-full bg-white border border-gray-200 px-3 py-1 text-sm font-bold text-gray-800">
            {{ completedRounds }}/{{ current.rounds }}
          </span>
        </header>

        <!-- Exercices -->
        <div class="flex-1 overflow-y-auto px-4">
          <div class="grid grid-cols-2 gap-2 pb-2">
            <RoutineTile
              v-for="(exercise, index) in current.exercises"
              :key="index"
              :name="exercise.nameFr"
              :reps="exercise.reps"
              :done="doneCount(index)"
              :rounds="current.rounds"
              @click="modalPosition = index"
            />
          </div>
        </div>

        <!-- Actions -->
        <footer class="space-y-2 border-t border-gray-200/70 bg-white/80 px-4 pt-3 pb-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="h-10 w-10 rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-700 disabled:opacity-30"
                :disabled="roundsToAdd <= 1"
                aria-label="Une série de moins"
                @click="changeRoundsToAdd(-1)"
              >
                −
              </button>
              <span class="w-7 text-center text-lg font-bold text-gray-900">{{ roundsToAdd }}</span>
              <button
                type="button"
                class="h-10 w-10 rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-700"
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

          <div class="flex gap-2">
            <button
              type="button"
              class="shrink-0 bg-gray-100 hover:bg-gray-200 text-red-600 font-semibold px-4 py-3.5 rounded-2xl transition-colors"
              @click="abandon"
            >
              Abandonner
            </button>

            <button
              type="button"
              class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
              @click="router.push('/preview')"
            >
              Terminer la séance
            </button>
          </div>
        </footer>
      </div>
    </Teleport>

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
