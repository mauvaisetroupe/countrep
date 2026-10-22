<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePreview } from '../composables/usePreview'
import { useExerciseStore } from '../stores/exercise'
import { CATALOG } from '../catalog'
import type { LocalSet } from '../db'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import { useI18n } from 'vue-i18n'
import { dateLocale } from '../i18n'
import { formatAmount, formatDuration, formatTotals, type AmountTotals } from '../units'

// Carte d'un jour du journal : total, résumé Garmin, et (dépliée) les
// saisies regroupées par séance, modifiables. Utilisée par le journal et
// par l'écran Saisie (jour sélectionné). Les écritures remontent au parent,
// qui détient l'instance de useSets.
const props = defineProps<{
  date: string
  // Sets affichés ce jour (filtrés par le parent), du plus récent au plus ancien
  daySets: LocalSet[]
  // Tous les sets : résumé Garmin et séances, tous exercices confondus
  sets: LocalSet[]
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
  update: [id: string, changes: Partial<LocalSet>]
  delete: [id: string]
}>()

const { unitOf } = useExerciseUnits()
const { t } = useI18n()
const router = useRouter()
const exerciseStore = useExerciseStore()
const { load: loadPreview, openForEdit } = usePreview()

// Équivalence Garmin : une minute = 30 s d'effort + 30 s de repos,
// soit 15 répétitions ou 30 s tenues pour un exercice à la durée
const REPS_PER_SET = 15
const SECONDS_PER_SET = 30
const MINUTES_PER_SET = 1
const SETS_PER_BLOCK = 10
const BLOCK_REST_MINUTES = 2

const editingSetId = ref<string | null>(null)
const openMenuId = ref<string | null>(null)
const copiedGarmin = ref(false)

const toKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const formatDay = (date: string) => {
  const day = date.slice(0, 10)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (day === toKey(today)) {
    return t('calendar.today')
  }

  if (day === toKey(yesterday)) {
    return t('journal.yesterday')
  }

  return new Date(`${day}T12:00:00`).toLocaleDateString(
    dateLocale(),
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  )
}

const formatSetTime = (time: string) => {
  if (!time) return '--:--'

  return time.slice(0, 5)
}

// Répétitions et secondes d'une liste de sets, comptées à part
const totalsOf = (daySets: LocalSet[]): AmountTotals => {
  const totals = { reps: 0, seconds: 0 }
  for (const w of daySets) {
    totals[unitOf(w.exercise) === 'seconds' ? 'seconds' : 'reps'] += w.reps
  }
  return totals
}

const allDaySets = () =>
  props.sets.filter(w => !w.deletedAt && w.date === props.date)

const garminExerciseSummary = () => {
  const totals = new Map<string, number>()

  allDaySets().forEach(w => {
    totals.set(
      w.exercise,
      (totals.get(w.exercise) ?? 0) + w.reps
    )
  })

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([exercise, value]) =>
      unitOf(exercise) === 'seconds'
        ? `${formatDuration(value)} ${exercise}`
        : `${value} ${exercise}`
    )
    .join(' · ')
}

const garminDuration = () => {
  const { reps, seconds } = totalsOf(allDaySets())

  if (reps <= 0 && seconds <= 0) return 0

  const sets = Math.ceil(reps / REPS_PER_SET + seconds / SECONDS_PER_SET)

  return (
    sets * MINUTES_PER_SET +
    Math.floor(sets / SETS_PER_BLOCK) * BLOCK_REST_MINUTES
  )
}

const formatGarminDuration = () => {
  const minutes = garminDuration()

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

const copyGarminSummary = async () => {
  const text =
    `${t('journal.strength')} · ${formatGarminDuration()} · ${garminExerciseSummary()}`

  try {
    await navigator.clipboard.writeText(text)

    copiedGarmin.value = true

    setTimeout(() => {
      copiedGarmin.value = false
    }, 2000)
  } catch {
    copiedGarmin.value = false
  }
}

// ============================================================
// SÉANCES (ADR 0011) : les sets d'une même séance sont regroupés
// ============================================================

type DayRow =
  | { kind: 'session', key: string, sessionId: string, name: string, time: string, rounds: number }
  | { kind: 'set', key: string, set: LocalSet, inSession: boolean }

// Sets de la séance, tous exercices confondus (même si un filtre est actif)
const sessionSets = (sessionId: string) =>
  props.sets.filter(set => !set.deletedAt && set.sessionId === sessionId)

const sessionName = (sessionId: string) =>
  sessionSets(sessionId).find(set => set.sessionName)?.sessionName || t('journal.session')

// Lignes du jour : chaque séance (en-tête, puis ses sets dans l'ordre
// de saisie) à la place de son set le plus récent, et les saisies isolées
const dayRows = (): DayRow[] => {
  const rows: DayRow[] = []
  const seen = new Set<string>()

  for (const set of props.daySets) {
    if (!set.sessionId) {
      rows.push({ kind: 'set', key: set.id, set, inSession: false })
      continue
    }
    if (seen.has(set.sessionId)) continue
    seen.add(set.sessionId)

    const all = sessionSets(set.sessionId)
    const perExercise = new Map<string, number>()
    all.forEach(item => perExercise.set(item.exercise, (perExercise.get(item.exercise) ?? 0) + 1))

    rows.push({
      kind: 'session',
      key: `session-${set.sessionId}`,
      sessionId: set.sessionId,
      name: sessionName(set.sessionId),
      time: formatSetTime(all.map(item => item.time).sort()[0] ?? ''),
      rounds: Math.max(...perExercise.values())
    })

    props.daySets
      .filter(item => item.sessionId === set.sessionId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach(item => rows.push({ kind: 'set', key: item.id, set: item, inSession: true }))
  }

  return rows
}

// Rouvre la séance dans l'écran de séance de l'accueil
const editSession = async (sessionId: string) => {
  await loadPreview()

  const opened = await openForEdit(sessionSets(sessionId), sessionName(sessionId), CATALOG)

  if (!opened) {
    window.alert(t('journal.sessionInProgress'))
    return
  }

  exerciseStore.setMode('workout')
  router.push('/today')
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
  editingSetId.value = id
}

const cancelEdit = () => {
  editingSetId.value = null
}

const saveEdit = (set: LocalSet) => {
  const reps = Number(set.reps)

  // reps est un integer > 0 en base : une valeur décimale
  // serait refusée par le serveur et resterait pending
  if (!Number.isInteger(reps) || reps <= 0) return
  if (!set.time) return

  emit('update', set.id, {
    reps,
    time: set.time
  })

  editingSetId.value = null
}

const handleDeleteSet = (set: LocalSet) => {
  openMenuId.value = null

  const confirmed = window.confirm(
    t('journal.deleteConfirm', {
      exercise: set.exercise,
      amount: formatAmount(set.reps, unitOf(set.exercise))
    })
  )

  if (!confirmed) return

  emit('delete', set.id)
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="overflow-hidden rounded-xl bg-surface">

    <!-- Day header -->
    <button
      type="button"
      class="w-full px-4 py-3 text-left"
      @click="emit('toggle')"
    >
      <div class="flex items-center gap-3">

        <div class="min-w-0 flex-1">
          <div
            class="text-base font-bold capitalize text-fg"
          >
            {{ formatDay(date) }}
          </div>

          <div
            class="mt-0.5 text-lg font-bold text-primary"
          >
            {{ formatTotals(totalsOf(daySets)) }}
          </div>
        </div>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="h-5 w-5 shrink-0 text-fg-muted transition-transform"
          :class="{
            'rotate-180': expanded
          }"
        >
          <path
            d="m6 9 6 6 6-6"
          />
        </svg>

      </div>

      <!-- Garmin summary -->
      <div
        class="mt-2 flex items-center gap-2 text-sm leading-relaxed text-fg-secondary"
        @click.stop
      >
        <span class="min-w-0 flex-1">
          <span class="font-medium text-fg-secondary">
            Garmin · {{ t('journal.strength') }} ·
            {{ formatGarminDuration() }}
          </span>

          <span class="mx-1">·</span>

          <span>
            {{ garminExerciseSummary() }}
          </span>
        </span>

        <button
          type="button"
          class="shrink-0 text-fg-muted transition-colors hover:text-fg-secondary"
          :aria-label="
            copiedGarmin
              ? t('journal.copied')
              : t('journal.copyGarmin')
          "
          @click="copyGarminSummary"
        >
          <span
            v-if="copiedGarmin"
            class="text-sm font-semibold text-success"
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

    <!-- Set details -->
    <div
      v-if="expanded"
      class="border-t border-line"
    >

      <template
        v-for="row in dayRows()"
        :key="row.key"
      >

      <!-- En-tête de séance -->
      <div
        v-if="row.kind === 'session'"
        class="flex items-center gap-3 border-b border-line bg-primary-soft/50 px-4 py-2.5"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-fg">
            {{ row.name }}
          </p>
          <p class="text-xs text-fg-secondary">
            {{ row.time }} · {{ t('workoutCard.rounds', row.rounds) }}
          </p>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary active:scale-95 transition-transform"
          @click="editSession(row.sessionId)"
        >
          {{ t('journal.edit') }}
        </button>
      </div>

      <article
        v-else
        class="relative border-b border-line last:border-b-0"
        :class="{
          'z-40': editingSetId === row.set.id,
          'ms-4 border-s-2 border-s-primary-soft': row.inSession
        }"
      >

        <!-- Edit mode -->
        <div
          v-if="editingSetId === row.set.id"
          class="px-4 py-3"
        >
          <div class="flex items-center gap-3">

            <input
              v-model="row.set.time"
              type="time"
              class="w-24 rounded-lg border border-transparent bg-surface-alt px-2 py-1.5 text-sm text-fg-secondary outline-none focus:border-primary"
            />

            <div class="min-w-0 flex-1">
              <div
                class="truncate font-semibold text-fg"
              >
                {{ row.set.exercise }}
              </div>
            </div>

            <input
              v-model.number="row.set.reps"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="w-20 rounded-lg bg-surface-alt px-2 py-1.5 text-right text-sm font-semibold text-fg outline-none focus:border-primary"
            />

            <span
              v-if="unitOf(row.set.exercise) === 'seconds'"
              class="text-xs font-medium text-fg-muted"
            >
              s
            </span>

          </div>

          <div class="mt-3 flex justify-end gap-2">

            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-secondary hover:bg-surface-alt"
              @click="cancelEdit"
            >
              {{ t('common.cancel') }}
            </button>

            <button
              type="button"
              class="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary/90"
              @click="saveEdit(row.set)"
            >
              {{ t('common.save') }}
            </button>

          </div>
        </div>

        <!-- Normal mode -->
        <div
          v-else
          class="flex items-center gap-3 px-4 py-2.5"
        >
          <span
            class="w-12 shrink-0 text-sm font-medium text-fg-muted"
          >
            {{ formatSetTime(row.set.time) }}
          </span>

          <div class="min-w-0 flex-1">
            <div
              class="truncate font-semibold text-fg"
            >
              {{ row.set.exercise }}
            </div>
          </div>

          <span
            class="whitespace-nowrap font-bold text-fg"
          >
            <template v-if="unitOf(row.set.exercise) === 'seconds'">
              {{ formatDuration(row.set.reps) }}
            </template>
            <template v-else>
              {{ row.set.reps }}

              <span
                class="text-xs font-medium text-fg-muted"
              >
                reps
              </span>
            </template>
          </span>

          <!-- Menu -->
          <div class="relative shrink-0">

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface-alt hover:text-fg-secondary"
              :aria-label="t('journal.options')"
              @click.stop="toggleMenu(row.set.id)"
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
              v-if="openMenuId === row.set.id"
              class="absolute right-0 top-9 z-50 w-32 overflow-hidden rounded-xl bg-surface py-1 shadow-lg"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-sm text-fg-secondary hover:bg-surface-alt"
                @click="startEdit(row.set.id)"
              >
                {{ t('journal.edit') }}
              </button>

              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                @click="handleDeleteSet(row.set)"
              >
                {{ t('journal.delete') }}
              </button>
            </div>

          </div>
        </div>

      </article>
      </template>

    </div>

  </div>
</template>
