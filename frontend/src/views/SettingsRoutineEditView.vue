<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SettingsHeader from '../components/SettingsHeader.vue'
import { useDragReorder } from '../composables/useDragReorder'
import { getExercises, type ApiExercise } from '../api/exercises'
import {
  createRoutine,
  deleteRoutine,
  getRoutines,
  updateRoutine
} from '../api/routines'

const MAX_ROUNDS = 50
const DEFAULT_REPS = 10

// Route /settings/routines/new (création) ou /settings/routines/:id
const props = defineProps<{
  id?: string
}>()

interface EditedExercise {
  // Clé locale : un même exercice peut apparaître plusieurs fois
  key: number
  exerciseId: string
  reps: number | null
}

const router = useRouter()

const isNew = computed(() => !props.id)

const catalog = ref<ApiExercise[]>([])
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
  return catalog.value.find(exercise => exercise.id === exerciseId)?.nameFr ?? exerciseId
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

const isValidReps = (reps: number | null) => {
  return Number.isInteger(reps) && (reps as number) > 0
}

const repsPerRound = computed(() => {
  return exercises.value.reduce(
    (total, exercise) => total + (isValidReps(exercise.reps) ? exercise.reps! : 0),
    0
  )
})

const canSave = computed(() => {
  return (
    name.value.trim().length > 0 &&
    exercises.value.length > 0 &&
    exercises.value.every(exercise => isValidReps(exercise.reps)) &&
    Number.isInteger(rounds.value) &&
    rounds.value >= 1 &&
    rounds.value <= MAX_ROUNDS &&
    !saving.value
  )
})

const addExercise = (exerciseId: string) => {
  exercises.value.push({ key: nextKey++, exerciseId, reps: DEFAULT_REPS })
  showPicker.value = false
  searchQuery.value = ''
}

const removeExercise = (index: number) => {
  exercises.value.splice(index, 1)
}

const { draggedKey, startDrag } = useDragReorder(
  exercises,
  exercise => String(exercise.key),
  { attribute: 'routine-exercise' }
)

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
      reps: exercise.reps!
    }))
  }

  try {
    if (props.id) {
      await updateRoutine(props.id, input)
    } else {
      await createRoutine(input)
    }

    router.replace('/settings/routines')
  } catch (err: any) {
    console.error(err)
    error.value = err.message || "Erreur lors de l'enregistrement de la séance"
  } finally {
    saving.value = false
  }
}

const remove = async () => {
  if (!props.id) return
  if (!window.confirm(`Supprimer la séance « ${name.value} » ?`)) return

  saving.value = true
  error.value = ''

  try {
    await deleteRoutine(props.id)
    router.replace('/settings/routines')
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Erreur lors de la suppression de la séance'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true

  try {
    const [allExercises, routines] = await Promise.all([
      getExercises(),
      props.id ? getRoutines() : Promise.resolve([])
    ])

    catalog.value = allExercises

    if (props.id) {
      const routine = routines.find(routine => routine.id === props.id)

      if (!routine) {
        error.value = 'Séance introuvable.'
        return
      }

      name.value = routine.name
      rounds.value = routine.rounds
      exercises.value = routine.exercises.map(exercise => ({
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
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <SettingsHeader
      :title="isNew ? 'Nouvelle séance' : 'Modifier la séance'"
      back-to="/settings/routines"
      back-label="Mes séances"
    />

    <main class="mt-6 space-y-4">

      <p v-if="loading" class="text-sm text-gray-500">
        Chargement...
      </p>

      <template v-else>

        <!-- Nom -->
        <section class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs">
          <label for="routine-name" class="text-xs font-semibold text-gray-500 block mb-2">
            Nom de la séance
          </label>
          <input
            id="routine-name"
            v-model="name"
            type="text"
            maxlength="100"
            placeholder="Calisthénie maison"
            class="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />
        </section>

        <!-- Exercices -->
        <section class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs">
          <p class="text-sm font-semibold text-gray-800">
            Exercices
          </p>
          <p class="mt-1 text-xs text-gray-500">
            Dans l'ordre où ils s'enchaînent, avec le nombre de répétitions de chacun.
          </p>

          <div v-if="exercises.length > 0" class="mt-4 space-y-2">
            <div
              v-for="(exercise, index) in exercises"
              :key="exercise.key"
              :data-routine-exercise="exercise.key"
              class="flex items-center gap-2 rounded-2xl border border-amber-400 bg-amber-50 px-3 py-2.5 transition-all"
              :class="draggedKey === String(exercise.key) ? 'opacity-50 scale-[0.98]' : ''"
            >
              <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {{ index + 1 }}
              </div>

              <p class="min-w-0 flex-1 text-sm font-medium text-gray-800 truncate">
                {{ exerciseName(exercise.exerciseId) }}
              </p>

              <input
                v-model.number="exercise.reps"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                aria-label="Répétitions"
                class="w-16 rounded-lg border bg-white px-2 py-1.5 text-right text-sm font-semibold text-gray-800 outline-none focus:border-amber-400"
                :class="isValidReps(exercise.reps) ? 'border-gray-200' : 'border-red-400'"
              />
              <span class="text-xs text-gray-500">reps</span>

              <button
                type="button"
                class="shrink-0 text-lg text-gray-400 hover:text-red-500"
                aria-label="Retirer cet exercice"
                @click="removeExercise(index)"
              >
                ×
              </button>

              <button
                type="button"
                class="shrink-0 text-gray-300 hover:text-gray-500 text-xl leading-none touch-none select-none cursor-grab active:cursor-grabbing"
                aria-label="Déplacer cet exercice"
                @pointerdown="startDrag(String(exercise.key), $event)"
              >
                ⋮⋮⋮
              </button>
            </div>

            <p
              v-if="exercises.length > 1"
              class="pt-1 text-xs text-gray-400 text-center"
            >
              ↕ Faites glisser les exercices pour modifier leur ordre.
            </p>
          </div>

          <div
            v-else
            class="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center"
          >
            <p class="text-sm font-medium text-gray-600">
              Aucun exercice.
            </p>
          </div>

          <button
            type="button"
            class="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            @click="showPicker = !showPicker; searchQuery = ''"
          >
            <span class="text-lg leading-none">{{ showPicker ? '×' : '+' }}</span>
            {{ showPicker ? 'Fermer' : 'Ajouter un exercice' }}
          </button>

          <div v-if="showPicker" class="mt-4">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Rechercher un exercice..."
                class="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <p
              v-if="filteredCatalog.length === 0"
              class="mt-4 text-sm text-gray-500 text-center"
            >
              Aucun exercice trouvé.
            </p>

            <div v-else class="mt-4 max-h-80 overflow-y-auto space-y-2">
              <button
                v-for="exercise in filteredCatalog"
                :key="exercise.id"
                type="button"
                class="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition-all active:bg-amber-50"
                @click="addExercise(exercise.id)"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-800">{{ exercise.nameFr }}</p>
                  <p class="text-xs text-gray-400">{{ exercise.nameEn }}</p>
                </div>
                <span class="ml-3 text-lg text-amber-500">+</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Séries -->
        <section class="bg-white border border-gray-200/80 rounded-3xl p-5 shadow-xs">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-gray-800">
                Nombre de séries
              </p>
              <p class="mt-1 text-xs text-gray-500">
                Combien de fois enchaîner l'ensemble des exercices.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="h-9 w-9 rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-700 disabled:opacity-30"
                :disabled="rounds <= 1"
                aria-label="Une série de moins"
                @click="changeRounds(-1)"
              >
                −
              </button>
              <span class="w-8 text-center text-lg font-bold text-gray-900">{{ rounds }}</span>
              <button
                type="button"
                class="h-9 w-9 rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-700 disabled:opacity-30"
                :disabled="rounds >= MAX_ROUNDS"
                aria-label="Une série de plus"
                @click="changeRounds(1)"
              >
                +
              </button>
            </div>
          </div>

          <p v-if="exercises.length > 0" class="mt-4 text-xs text-gray-500">
            {{ repsPerRound }} reps par série · {{ repsPerRound * rounds }} reps au total
          </p>
        </section>

        <p v-if="error" class="text-sm text-red-600">
          {{ error }}
        </p>

        <button
          type="button"
          :disabled="!canSave"
          class="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
          @click="save"
        >
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </button>

        <button
          v-if="!isNew"
          type="button"
          :disabled="saving"
          class="w-full bg-gray-100 hover:bg-gray-200 text-red-600 font-semibold py-3 rounded-2xl transition-colors"
          @click="remove"
        >
          Supprimer la séance
        </button>

      </template>

    </main>

  </div>
</template>
