<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePreview } from '../composables/usePreview'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import { formatAmount, unitLabel, type ExerciseUnit } from '../units'
import { useI18n } from 'vue-i18n'
import { exerciseName } from '../i18n'

// Aperçu de la séance en cours : relire, corriger, puis enregistrer
// (les séries partent dans le journal) ou abandonner.

const { t } = useI18n()
const router = useRouter()
const { preview, loaded, grid, load, updateReps, removeEntry, removeRound, discard, commit } = usePreview()
const { unitOf } = useExerciseUnits()

// Unité de l'exercice à cette position (copie de la séance, sinon catalogue)
const unitAt = (position: number): ExerciseUnit => {
  const exercise = preview.value?.workout.exercises[position]
  return exercise?.unit ?? unitOf(exercise?.exerciseId)
}

const saving = ref(false)

// Saisies en cours de modification (texte du champ)
const editedReps = ref<Record<string, string>>({})

const isValidReps = (value: string) => {
  const reps = Number(value)
  return Number.isInteger(reps) && reps > 0
}

const repsText = (entryId: string, reps: number) => editedReps.value[entryId] ?? String(reps)

const onRepsInput = (entryId: string, value: string) => {
  editedReps.value = { ...editedReps.value, [entryId]: value }
}

const onRepsChange = async (entryId: string) => {
  const value = editedReps.value[entryId]
  if (value === undefined || !isValidReps(value)) return

  await updateReps(entryId, Number(value))

  const { [entryId]: _, ...rest } = editedReps.value
  editedReps.value = rest
}

const hasInvalidReps = computed(() =>
  Object.values(editedReps.value).some(value => !isValidReps(value))
)

// Totaux par exercice
const totals = computed(() => {
  if (!preview.value) return []

  return preview.value.workout.exercises.map((exercise, position) => {
    const entries = preview.value!.entries.filter(entry => entry.position === position)
    return {
      name: exerciseName(exercise),
      unit: unitAt(position),
      rounds: entries.length,
      reps: entries.reduce((sum, entry) => sum + entry.reps, 0)
    }
  })
})

const confirmRemoveRound = async (round: number) => {
  if (window.confirm(t('preview.removeRoundConfirm', { round: round + 1 }))) {
    await removeRound(round)
  }
}

const save = async () => {
  if (hasInvalidReps.value || saving.value) return

  saving.value = true

  try {
    await commit()
    // L'accueil synchronise les nouvelles séries à son ouverture
    router.replace('/today')
  } finally {
    saving.value = false
  }
}

const abandon = async () => {
  if (!window.confirm(t('session.abandonConfirm'))) return

  await discard()
  router.replace('/today')
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-background pb-28 px-5 pt-6">

    <header>
      <router-link
        to="/today"
        class="inline-flex items-center gap-1 text-sm font-medium text-primary"
      >
        <span class="text-lg leading-none">‹</span>
        {{ t('preview.continue') }}
      </router-link>

      <h1 class="mt-2 page-title">
        {{ t('preview.title') }}
      </h1>

      <p v-if="preview" class="mt-1 text-sm text-fg-secondary">
        {{ preview.workout.name }} · {{ preview.date }}
      </p>
    </header>

    <main class="mt-6 space-y-4">

      <div
        v-if="loaded && !preview"
        class="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center"
      >
        <p class="text-sm font-medium text-fg-secondary">
          {{ t('preview.none') }}
        </p>
        <router-link to="/today" class="mt-3 inline-block text-sm font-semibold text-primary">
          {{ t('preview.backHome') }}
        </router-link>
      </div>

      <template v-else-if="preview">

        <!-- Une carte par série -->
        <section
          v-for="(row, round) in grid"
          :key="round"
          class="bg-surface rounded-xl p-4"
        >
          <div class="flex items-center justify-between px-1">
            <p class="text-sm font-semibold text-fg">
              {{ t('preview.round', { round: round + 1 }) }}
            </p>
            <button
              type="button"
              class="text-xs font-medium text-danger"
              @click="confirmRemoveRound(round)"
            >
              {{ t('preview.removeRound') }}
            </button>
          </div>

          <div class="mt-3 space-y-2">
            <div
              v-for="(entry, position) in row"
              :key="position"
              class="flex items-center gap-2 rounded-xl px-3 py-2"
              :class="entry ? 'bg-primary-soft' : 'bg-surface'"
            >
              <p
                class="min-w-0 flex-1 text-sm truncate"
                :class="entry ? 'font-medium text-fg' : 'text-fg-muted'"
              >
                {{ exerciseName(preview.workout.exercises[position]) }}
              </p>

              <template v-if="entry">
                <input
                  :value="repsText(entry.id, entry.reps)"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  :aria-label="unitAt(position) === 'seconds' ? t('addReps.seconds') : t('preview.reps')"
                  class="w-16 rounded-lg border bg-surface px-2 py-1.5 text-right text-sm font-semibold text-fg outline-none focus:border-primary"
                  :class="isValidReps(repsText(entry.id, entry.reps)) ? 'border-line' : 'border-danger'"
                  @input="onRepsInput(entry.id, ($event.target as HTMLInputElement).value)"
                  @change="onRepsChange(entry.id)"
                />
                <span class="text-xs text-fg-secondary">{{ unitLabel(unitAt(position)) }}</span>
                <button
                  type="button"
                  class="shrink-0 text-lg text-fg-muted hover:text-danger"
                  :aria-label="t('preview.removeEntry')"
                  @click="removeEntry(entry.id)"
                >
                  ×
                </button>
              </template>

              <span v-else class="text-xs text-fg-muted">{{ t('preview.notDone') }}</span>
            </div>
          </div>
        </section>

        <p
          v-if="grid.length === 0"
          class="text-sm text-fg-secondary text-center"
        >
          {{ t('preview.empty') }}
        </p>

        <!-- Totaux -->
        <section
          v-if="grid.length > 0"
          class="bg-surface rounded-xl p-4"
        >
          <p class="px-1 text-sm font-semibold text-fg">
            {{ t('preview.total') }}
          </p>
          <div class="mt-2 divide-y divide-line">
            <div
              v-for="(total, position) in totals"
              :key="position"
              class="flex items-center justify-between px-1 py-2 text-sm"
            >
              <span class="text-fg-secondary truncate">{{ total.name }}</span>
              <span class="shrink-0 font-semibold text-fg">
                {{ formatAmount(total.reps, total.unit) }}
                <span class="font-normal text-fg-secondary">({{ t('workoutCard.rounds', total.rounds) }})</span>
              </span>
            </div>
          </div>
        </section>

        <p v-if="hasInvalidReps" class="text-sm text-danger">
          {{ t('preview.invalid') }}
        </p>

        <button
          type="button"
          :disabled="grid.length === 0 || hasInvalidReps || saving"
          class="w-full bg-primary hover:bg-primary/90 disabled:bg-surface-alt disabled:text-fg-muted disabled:shadow-none text-on-primary font-semibold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
          @click="save"
        >
          {{ saving ? t('common.saving') : t('preview.save') }}
        </button>

        <button
          type="button"
          class="w-full bg-surface-alt hover:bg-surface-alt text-danger font-semibold py-3 rounded-xl transition-colors"
          @click="abandon"
        >
          {{ t('preview.abandon') }}
        </button>

      </template>

    </main>

  </div>
</template>
