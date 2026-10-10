<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePreview } from '../composables/usePreview'

// Aperçu de la séance en cours : relire, corriger, puis enregistrer
// (les séries partent dans le journal) ou abandonner.

const router = useRouter()
const { preview, loaded, grid, load, updateReps, removeEntry, removeRound, discard, commit } = usePreview()

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

  return preview.value.routine.exercises.map((exercise, position) => {
    const entries = preview.value!.entries.filter(entry => entry.position === position)
    return {
      nameFr: exercise.nameFr,
      rounds: entries.length,
      reps: entries.reduce((sum, entry) => sum + entry.reps, 0)
    }
  })
})

const confirmRemoveRound = async (round: number) => {
  if (window.confirm(`Supprimer la série ${round + 1} ?`)) {
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
  if (!window.confirm('Abandonner cette séance ? Les séries saisies seront perdues.')) return

  await discard()
  router.replace('/today')
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] pb-28 px-5 pt-6">

    <header>
      <router-link
        to="/today"
        class="inline-flex items-center gap-1 text-sm font-medium text-amber-600"
      >
        <span class="text-lg leading-none">‹</span>
        Continuer la séance
      </router-link>

      <h1 class="mt-2 page-title">
        Aperçu de la séance
      </h1>

      <p v-if="preview" class="mt-1 text-sm text-gray-500">
        {{ preview.routine.name }} · {{ preview.date }}
      </p>
    </header>

    <main class="mt-6 space-y-4">

      <div
        v-if="loaded && !preview"
        class="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center"
      >
        <p class="text-sm font-medium text-gray-600">
          Aucune séance en cours.
        </p>
        <router-link to="/today" class="mt-3 inline-block text-sm font-semibold text-amber-600">
          Retour à l'accueil ›
        </router-link>
      </div>

      <template v-else-if="preview">

        <!-- Une carte par série -->
        <section
          v-for="(row, round) in grid"
          :key="round"
          class="bg-white border border-gray-200/80 rounded-3xl p-4 shadow-xs"
        >
          <div class="flex items-center justify-between px-1">
            <p class="text-sm font-semibold text-gray-800">
              Série {{ round + 1 }}
            </p>
            <button
              type="button"
              class="text-xs font-medium text-red-500"
              @click="confirmRemoveRound(round)"
            >
              Supprimer la série
            </button>
          </div>

          <div class="mt-3 space-y-2">
            <div
              v-for="(entry, position) in row"
              :key="position"
              class="flex items-center gap-2 rounded-2xl px-3 py-2"
              :class="entry ? 'bg-amber-50' : 'bg-gray-50'"
            >
              <p
                class="min-w-0 flex-1 text-sm truncate"
                :class="entry ? 'font-medium text-gray-800' : 'text-gray-400'"
              >
                {{ preview.routine.exercises[position]?.nameFr }}
              </p>

              <template v-if="entry">
                <input
                  :value="repsText(entry.id, entry.reps)"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  aria-label="Répétitions"
                  class="w-16 rounded-lg border bg-white px-2 py-1.5 text-right text-sm font-semibold text-gray-800 outline-none focus:border-amber-400"
                  :class="isValidReps(repsText(entry.id, entry.reps)) ? 'border-gray-200' : 'border-red-400'"
                  @input="onRepsInput(entry.id, ($event.target as HTMLInputElement).value)"
                  @change="onRepsChange(entry.id)"
                />
                <span class="text-xs text-gray-500">reps</span>
                <button
                  type="button"
                  class="shrink-0 text-lg text-gray-400 hover:text-red-500"
                  aria-label="Retirer"
                  @click="removeEntry(entry.id)"
                >
                  ×
                </button>
              </template>

              <span v-else class="text-xs text-gray-400">non fait</span>
            </div>
          </div>
        </section>

        <p
          v-if="grid.length === 0"
          class="text-sm text-gray-500 text-center"
        >
          Aucune série saisie.
        </p>

        <!-- Totaux -->
        <section
          v-if="grid.length > 0"
          class="bg-white border border-gray-200/80 rounded-3xl p-4 shadow-xs"
        >
          <p class="px-1 text-sm font-semibold text-gray-800">
            Total
          </p>
          <div class="mt-2 divide-y divide-gray-100">
            <div
              v-for="(total, position) in totals"
              :key="position"
              class="flex items-center justify-between px-1 py-2 text-sm"
            >
              <span class="text-gray-700 truncate">{{ total.nameFr }}</span>
              <span class="shrink-0 font-semibold text-gray-900">
                {{ total.reps }} reps
                <span class="font-normal text-gray-500">({{ total.rounds }} {{ total.rounds > 1 ? 'séries' : 'série' }})</span>
              </span>
            </div>
          </div>
        </section>

        <p v-if="hasInvalidReps" class="text-sm text-red-600">
          Corrige les nombres de répétitions invalides avant d'enregistrer.
        </p>

        <button
          type="button"
          :disabled="grid.length === 0 || hasInvalidReps || saving"
          class="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:shadow-none text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
          @click="save"
        >
          {{ saving ? 'Enregistrement...' : 'Enregistrer la séance' }}
        </button>

        <button
          type="button"
          class="w-full bg-gray-100 hover:bg-gray-200 text-red-600 font-semibold py-3 rounded-2xl transition-colors"
          @click="abandon"
        >
          Abandonner la séance
        </button>

      </template>

    </main>

  </div>
</template>
