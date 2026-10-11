<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AddRepsModal from './AddRepsModal.vue'
import ExerciseTile from './ExerciseTile.vue'
import WorkoutCard from './WorkoutCard.vue'
import { getWorkouts, type Workout } from '../api/workouts'
import { useExerciseStore } from '../stores/exercise'
import { usePreview } from '../composables/usePreview'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import type { ExerciseUnit } from '../units'
import { useI18n } from 'vue-i18n'
import { exerciseName } from '../i18n'

// Mode séance de l'écran d'accueil : un bouton par exercice, avec son
// avancement. Les saisies vont dans la séance en cours (preview), qu'on
// relit et enregistre à la fin depuis l'aperçu.

const props = defineProps<{
  date: string
}>()

// Dernière liste connue : la séance reste utilisable hors ligne (en salle)
const CACHE_KEY = 'countrep.workoutsCache'
const MAX_ROUNDS_AT_ONCE = 50

const { t } = useI18n()
const router = useRouter()
const exerciseStore = useExerciseStore()
const { preview, counts, load, start, addEntries, discard } = usePreview()
const { unitOf } = useExerciseUnits()

// Une séance démarrée avant les unités (ADR 0008), ou la copie locale des
// séances, peut ne pas porter l'unité : on la reprend du catalogue
const unitFor = (exercise: { exerciseId: string, unit?: ExerciseUnit }) =>
  exercise.unit ?? unitOf(exercise.exerciseId)

const workouts = ref<Workout[]>([])
const loading = ref(false)
const offline = ref(false)

const selectedWorkout = computed(() =>
  workouts.value.find(r => r.id === exerciseStore.selectedWorkout) ?? null
)

// Une séance en cours impose sa séance (copie figée au démarrage) et sa date
const current = computed(() => preview.value?.workout ?? selectedWorkout.value)
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

const saveOne = async ({ reps, time }: { reps: number, time: string }) => {
  const position = modalPosition.value
  if (position === null || !current.value) return

  modalPosition.value = null
  await addEntries([{ position, reps, time }])
}

// Série complète : chaque exercice avec son objectif, `roundsToAdd` fois
const addRounds = async () => {
  if (!current.value) return

  const time = getCurrentTime()
  const items = []

  for (let round = 0; round < roundsToAdd.value; round++) {
    for (const [position, exercise] of current.value.exercises.entries()) {
      items.push({ position, reps: exercise.reps, time })
    }
  }

  roundsToAdd.value = 1
  await addEntries(items)
}

const startSession = async () => {
  if (selectedWorkout.value) {
    await start(selectedWorkout.value, props.date)
  }
}

const abandon = async () => {
  if (window.confirm(t(preview.value?.editing ? 'session.abandonEditConfirm' : 'session.abandonConfirm'))) {
    await discard()
  }
}

const changeRoundsToAdd = (offset: -1 | 1) => {
  roundsToAdd.value = Math.min(MAX_ROUNDS_AT_ONCE, Math.max(1, roundsToAdd.value + offset))
}

// Garde une séance sélectionnée valide
watch(workouts, list => {
  if (!list.some(r => r.id === exerciseStore.selectedWorkout)) {
    exerciseStore.setWorkout(list[0]?.id ?? null)
  }
})

onMounted(async () => {
  loading.value = true

  try {
    await load()
    workouts.value = await getWorkouts()
    localStorage.setItem(CACHE_KEY, JSON.stringify(workouts.value))
    offline.value = false
  } catch (error) {
    console.warn('Séances indisponibles, utilisation du cache local', error)
    try {
      workouts.value = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]')
    } catch {
      workouts.value = []
    }
    offline.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="px-3 space-y-4">

    <p v-if="loading" class="px-2 text-sm text-fg-secondary">
      {{ t('workouts.loading') }}
    </p>

    <!-- Aucune séance -->
    <div
      v-else-if="!current && workouts.length === 0"
      class="mx-2 rounded-xl border border-dashed border-line bg-surface px-5 py-6 text-center"
    >
      <p class="text-sm font-medium text-fg-secondary">
        {{ t('session.none') }}
      </p>
      <router-link
        to="/settings/workouts/new"
        class="mt-3 inline-block text-sm font-semibold text-primary"
      >
        {{ t('session.create') }}
      </router-link>
    </div>

    <!-- Séance en cours, réduite -->
    <button
      v-else-if="preview"
      type="button"
      class="mx-2 flex w-[calc(100%-1rem)] items-center justify-between gap-3 rounded-xl bg-primary px-5 py-4 text-left text-on-primary shadow-md active:scale-[0.98] transition-transform"
      @click="minimized = false"
    >
      <div class="min-w-0">
        <p class="text-xs opacity-90">{{ t(preview.editing ? 'session.editing' : 'session.inProgress', { date: preview.date }) }}</p>
        <p class="text-base font-bold truncate">{{ preview.workout.name }}</p>
      </div>
      <span class="shrink-0 text-sm font-semibold">
        {{ completedRounds }}/{{ preview.workout.rounds }} · {{ t('session.resume') }}
      </span>
    </button>

    <!-- Choix de la séance, avant de commencer -->
    <template v-else>

      <p v-if="offline" class="px-2 text-xs text-fg-muted">
        {{ t('session.offline') }}
      </p>

      <!-- Une carte par séance : un appui la sélectionne -->
      <div
        v-for="w in workouts"
        :key="w.id"
        role="button"
        tabindex="0"
        class="block bg-surface rounded-xl p-5 transition-colors"
        :class="w.id === current?.id
          ? 'ring-2 ring-primary'
          : 'active:bg-surface-alt'"
        @click="exerciseStore.setWorkout(w.id)"
      >
        <WorkoutCard :workout="w" />

        <button
          v-if="w.id === current?.id"
          type="button"
          class="mt-4 w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
          @click.stop="startSession"
        >
          {{ t('session.start') }}
        </button>
      </div>

    </template>

    <!-- ======================================================
         SÉANCE EN COURS : PLEIN ÉCRAN
    ====================================================== -->

    <Teleport to="body">
      <div
        v-if="fullscreen && current"
        class="fixed inset-0 z-40 flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <!-- En-tête -->
        <header class="flex items-center gap-3 px-4 pt-4 pb-3">
          <button
            type="button"
            class="shrink-0 text-sm font-medium text-primary"
            @click="minimized = true"
          >
            {{ t('session.minimize') }}
          </button>

          <div class="min-w-0 flex-1 text-center">
            <p class="text-base font-bold text-fg truncate">{{ current.name }}</p>
            <p class="text-xs text-fg-secondary">{{ sessionDate }}</p>
          </div>

          <span class="shrink-0 rounded-full bg-surface-alt px-3 py-1 text-sm font-bold text-fg">
            {{ completedRounds }}/{{ current.rounds }}
          </span>
        </header>

        <!-- Exercices -->
        <div class="flex-1 overflow-y-auto px-4">
          <div class="grid grid-cols-2 gap-2 pb-2">
            <ExerciseTile
              v-for="(exercise, index) in current.exercises"
              :key="index"
              :name="exerciseName(exercise)"
              :reps="exercise.reps"
              :unit="unitFor(exercise)"
              :done="doneCount(index)"
              :rounds="current.rounds"
              @click="modalPosition = index"
            />
          </div>
        </div>

        <!-- Actions -->
        <footer class="space-y-2 border-t border-line bg-surface/80 px-4 pt-3 pb-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="h-10 w-10 rounded-full bg-surface-alt text-lg font-semibold text-fg-secondary disabled:opacity-30"
                :disabled="roundsToAdd <= 1"
                :aria-label="t('session.lessRounds')"
                @click="changeRoundsToAdd(-1)"
              >
                −
              </button>
              <span class="w-7 text-center text-lg font-bold text-fg">{{ roundsToAdd }}</span>
              <button
                type="button"
                class="h-10 w-10 rounded-full bg-surface-alt text-lg font-semibold text-fg-secondary"
                :aria-label="t('session.moreRounds')"
                @click="changeRoundsToAdd(1)"
              >
                +
              </button>
            </div>

            <button
              type="button"
              class="flex-1 bg-primary-soft text-primary text-sm font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
              @click="addRounds"
            >
              {{ t('session.addRounds', roundsToAdd) }}
            </button>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              class="shrink-0 bg-surface-alt hover:bg-surface-alt text-danger font-semibold px-4 py-3.5 rounded-xl transition-colors"
              @click="abandon"
            >
              {{ t('session.abandon') }}
            </button>

            <button
              type="button"
              :disabled="!preview || preview.entries.length === 0"
              class="flex-1 bg-primary hover:bg-primary/90 disabled:bg-surface-alt disabled:text-fg-muted disabled:shadow-none text-on-primary font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
              @click="router.push('/preview')"
            >
              {{ t('session.finish') }}
            </button>
          </div>
        </footer>
      </div>
    </Teleport>

    <AddRepsModal
      v-if="modalExercise"
      :exercise-id="modalExercise.exerciseId"
      :exercise-name="exerciseName(modalExercise)"
      :unit="unitFor(modalExercise)"
      :date="sessionDate"
      :initial-reps="modalExercise.reps"
      @close="modalPosition = null"
      @save="saveOne"
    />

  </div>
</template>
