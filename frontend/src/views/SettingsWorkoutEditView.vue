<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SettingsHeader from '../components/SettingsHeader.vue'
import RepsPicker from '../components/RepsPicker.vue'
import { VueDraggable } from 'vue-draggable-plus'
import { reorderOptions } from '../reorder'
import type { ApiExercise } from '../api/exercises'
import { CATALOG } from '../catalog'
import { useWorkouts } from '../composables/useWorkouts'
import { workoutRepository } from '../repositories/workoutRepository'
import { formatAmount, formatTotals } from '../units'
import { useI18n } from 'vue-i18n'
import { exerciseAltName, exerciseName as localizedName } from '../i18n'

const { t } = useI18n()

const MAX_ROUNDS = 50
const DEFAULT_REPS = 10
const DEFAULT_SECONDS = 30

// Route /settings/workouts/new (création) ou /settings/workouts/:id
const props = defineProps<{
  id?: string
}>()

interface EditedExercise {
  // Clé locale : un même exercice peut apparaître plusieurs fois
  key: number
  exerciseId: string
  reps: number
}

const router = useRouter()

const isNew = computed(() => !props.id)

// Catalogue embarqué, modèles locaux (ADR 0014) : rien ne passe par le réseau
const catalog = ref<ApiExercise[]>(CATALOG)
const { save: saveWorkout, remove: removeWorkout } = useWorkouts()
const name = ref('')
const rounds = ref(3)
const exercises = ref<EditedExercise[]>([])

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const showPicker = ref(false)
const searchQuery = ref('')

let nextKey = 0

const exerciseName = (exerciseId: string) => {
  return localizedName(catalog.value.find(exercise => exercise.id === exerciseId)) || exerciseId
}

const filteredCatalog = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return catalog.value
  }

  return catalog.value.filter(exercise =>
    exercise.nameFr.toLowerCase().includes(query) ||
    exercise.nameEn.toLowerCase().includes(query)
  )
})

const unitOf = (exerciseId: string) =>
  catalog.value.find(exercise => exercise.id === exerciseId)?.unit ?? 'reps'

// Répétitions et secondes sont comptées à part
const perRound = computed(() => {
  const totals = { reps: 0, seconds: 0 }
  for (const exercise of exercises.value) {
    totals[unitOf(exercise.exerciseId) === 'seconds' ? 'seconds' : 'reps'] += exercise.reps
  }
  return totals
})

const canSave = computed(() => {
  return (
    name.value.trim().length > 0 &&
    exercises.value.length > 0 &&
    Number.isInteger(rounds.value) &&
    rounds.value >= 1 &&
    rounds.value <= MAX_ROUNDS &&
    !saving.value
  )
})

// Exercice dont on règle les reps (panneau RepsPicker)
const repsEditKey = ref<number | null>(null)

const repsEdited = computed(() =>
  exercises.value.find(exercise => exercise.key === repsEditKey.value) ?? null
)

const confirmReps = (reps: number) => {
  if (repsEdited.value) {
    repsEdited.value.reps = reps
  }
  repsEditKey.value = null
}

// Ajoute l'exercice et propose tout de suite de régler ses reps,
// en partant de la valeur du dernier exercice de la séance
const addExercise = (exerciseId: string) => {
  const key = nextKey++
  // Valeur du dernier exercice de même unité, sinon la valeur par défaut
  const unit = unitOf(exerciseId)
  const reps = exercises.value
    .filter(exercise => unitOf(exercise.exerciseId) === unit)
    .at(-1)?.reps ?? (unit === 'seconds' ? DEFAULT_SECONDS : DEFAULT_REPS)

  exercises.value.push({ key, exerciseId, reps })
  showPicker.value = false
  searchQuery.value = ''
  repsEditKey.value = key
}

const removeExercise = (index: number) => {
  exercises.value.splice(index, 1)
}


const changeRounds = (offset: -1 | 1) => {
  rounds.value = Math.min(MAX_ROUNDS, Math.max(1, rounds.value + offset))
}

const save = async () => {
  if (!canSave.value) return

  saving.value = true
  error.value = ''

  const input = {
    name: name.value.trim(),
    rounds: rounds.value,
    exercises: exercises.value.map(exercise => ({
      exerciseId: exercise.exerciseId,
      reps: exercise.reps
    }))
  }

  try {
    await saveWorkout(props.id ?? null, input)
    router.replace('/settings/workouts')
  } catch (err: any) {
    console.error(err)
    error.value = err.message || t('editWorkout.saveError')
  } finally {
    saving.value = false
  }
}

const remove = async () => {
  if (!props.id) return
  if (!window.confirm(t('editWorkout.deleteConfirm', { name: name.value }))) return

  saving.value = true
  error.value = ''

  try {
    await removeWorkout(props.id)
    router.replace('/settings/workouts')
  } catch (err: any) {
    console.error(err)
    error.value = err.message || t('editWorkout.deleteError')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true

  try {
    if (props.id) {
      const workout = await workoutRepository.getById(props.id)

      if (!workout) {
        error.value = t('editWorkout.notFound')
        return
      }

      name.value = workout.name
      rounds.value = workout.rounds
      exercises.value = workout.exercises.map(exercise => ({
        key: nextKey++,
        exerciseId: exercise.exerciseId,
        reps: exercise.reps
      }))
    }
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Erreur lors du chargement'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <SettingsHeader
      :title="isNew ? t('workouts.new') : t('editWorkout.title')"
      back-to="/settings/workouts"
      :back-label="t('settings.workouts.title')"
    />

    <main class="mt-6 space-y-4">

      <p v-if="loading" class="text-sm text-fg-secondary">
        {{ t('common.loading') }}
      </p>

      <template v-else>

        <!-- Nom -->
        <section class="bg-surface rounded-xl p-5">
          <label for="workout-name" class="text-xs font-semibold text-fg-secondary block mb-2">
            {{ t('editWorkout.name') }}
          </label>
          <input
            id="workout-name"
            v-model="name"
            type="text"
            maxlength="100"
            :placeholder="t('editWorkout.namePlaceholder')"
            class="w-full bg-surface-alt border border-transparent rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
          />
        </section>

        <!-- Exercices -->
        <section class="bg-surface rounded-xl p-5">
          <p class="text-sm font-semibold text-fg">
            {{ t('selector.title') }}
          </p>
          <p class="mt-1 text-xs text-fg-secondary">
            {{ t('editWorkout.exercisesHint') }}
          </p>

          <div v-if="exercises.length > 0" class="mt-4 space-y-2">
            <VueDraggable
              v-model="exercises"
              v-bind="reorderOptions"
              class="space-y-2"
            >
            <div
              v-for="(exercise, index) in exercises"
              :key="exercise.key"
              class="flex items-center gap-2 rounded-xl bg-background px-3 py-2.5"
            >
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                {{ index + 1 }}
              </div>

              <p class="min-w-0 flex-1 text-sm font-medium text-fg truncate">
                {{ exerciseName(exercise.exerciseId) }}
              </p>

              <button
                type="button"
                class="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary active:scale-95 transition-transform"
                :aria-label="t('editWorkout.repsOf', { name: exerciseName(exercise.exerciseId) })"
                @click="repsEditKey = exercise.key"
              >
                {{ formatAmount(exercise.reps, unitOf(exercise.exerciseId)) }}
              </button>

              <button
                type="button"
                class="shrink-0 text-lg text-fg-muted hover:text-danger"
                :aria-label="t('exercises.remove')"
                @click="removeExercise(index)"
              >
                ×
              </button>

              <button
                type="button"
                class="drag-handle shrink-0 text-fg-muted hover:text-fg-secondary text-xl leading-none touch-none select-none cursor-grab active:cursor-grabbing"
                :aria-label="t('exercises.move')"
              >
                ⋮⋮⋮
              </button>
            </div>
            </VueDraggable>

            <p
              v-if="exercises.length > 1"
              class="pt-1 text-xs text-fg-muted text-center"
            >
              {{ t('exercises.dragHint') }}
            </p>
          </div>

          <div
            v-else
            class="mt-4 rounded-xl border border-dashed border-line bg-surface px-4 py-5 text-center"
          >
            <p class="text-sm font-medium text-fg-secondary">
              {{ t('editWorkout.noExercise') }}
            </p>
          </div>

          <button
            type="button"
            class="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-surface-alt px-4 py-3 text-sm font-semibold text-fg-secondary hover:bg-line transition-all"
            @click="showPicker = !showPicker; searchQuery = ''"
          >
            <span class="text-lg leading-none">{{ showPicker ? '×' : '+' }}</span>
            {{ showPicker ? t('common.close') : t('exercises.add') }}
          </button>

          <div v-if="showPicker" class="mt-4">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">🔎</span>
              <input
                v-model="searchQuery"
                type="search"
                :placeholder="t('exercises.search')"
                class="w-full bg-surface-alt border border-transparent rounded-xl pl-10 pr-4 py-3 text-sm text-fg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
              />
            </div>

            <p
              v-if="filteredCatalog.length === 0"
              class="mt-4 text-sm text-fg-secondary text-center"
            >
              {{ t('exercises.notFound') }}
            </p>

            <div v-else class="mt-4 max-h-80 overflow-y-auto space-y-2">
              <button
                v-for="exercise in filteredCatalog"
                :key="exercise.id"
                type="button"
                class="flex w-full items-center justify-between rounded-xl bg-background px-4 py-3 text-left transition-all active:bg-primary-soft"
                @click="addExercise(exercise.id)"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-fg">{{ localizedName(exercise) }}</p>
                  <p class="text-xs text-fg-muted">{{ exerciseAltName(exercise) }}</p>
                </div>
                <span class="ml-3 text-lg text-primary">+</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Séries -->
        <section class="bg-surface rounded-xl p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-fg">
                {{ t('editWorkout.rounds') }}
              </p>
              <p class="mt-1 text-xs text-fg-secondary">
                {{ t('editWorkout.roundsHint') }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="h-9 w-9 rounded-full bg-surface-alt text-lg font-semibold text-fg-secondary disabled:opacity-30"
                :disabled="rounds <= 1"
                :aria-label="t('session.lessRounds')"
                @click="changeRounds(-1)"
              >
                −
              </button>
              <span class="w-8 text-center text-lg font-bold text-fg">{{ rounds }}</span>
              <button
                type="button"
                class="h-9 w-9 rounded-full bg-surface-alt text-lg font-semibold text-fg-secondary disabled:opacity-30"
                :disabled="rounds >= MAX_ROUNDS"
                :aria-label="t('session.moreRounds')"
                @click="changeRounds(1)"
              >
                +
              </button>
            </div>
          </div>

          <p v-if="exercises.length > 0" class="mt-4 text-xs text-fg-secondary">
            {{ t('workoutCard.perRound', { total: formatTotals(perRound) }) }} ·
            {{ t('editWorkout.inTotal', { total: formatTotals({ reps: perRound.reps * rounds, seconds: perRound.seconds * rounds }) }) }}
          </p>
        </section>

        <p v-if="error" class="text-sm text-danger">
          {{ error }}
        </p>

        <button
          type="button"
          :disabled="!canSave"
          class="w-full bg-primary hover:bg-primary/90 disabled:bg-surface-alt disabled:text-fg-muted disabled:cursor-not-allowed text-on-primary font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
          @click="save"
        >
          {{ saving ? t('common.saving') : t('common.save') }}
        </button>

        <button
          v-if="!isNew"
          type="button"
          :disabled="saving"
          class="w-full bg-surface-alt hover:bg-surface-alt text-danger font-semibold py-3 rounded-xl transition-colors"
          @click="remove"
        >
          {{ t('editWorkout.delete') }}
        </button>

      </template>

    </main>

    <RepsPicker
      v-if="repsEdited"
      :key="repsEdited.key"
      :title="exerciseName(repsEdited.exerciseId)"
      :value="repsEdited.reps"
      :unit="unitOf(repsEdited.exerciseId)"
      @close="repsEditKey = null"
      @confirm="confirmReps"
    />

  </div>
</template>
