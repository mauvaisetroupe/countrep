<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import DayNavigator from '../components/DayNavigator.vue'
import { useSets } from '../composables/useSets'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import { dateLocale, exerciseName } from '../i18n'
import {
  effortMinutes, formatAmount, formatDuration, formatDurationShort, formatMinutes, trainingMinutes,
  type AmountTotals, type ExerciseUnit
} from '../units'

// Statistiques, sur le modèle de Step Challenge : une période (1 jour,
// 7 jours, 30 jours, 1 an), ses chiffres clés, son graphique, la
// répartition par exercice, et la régularité sur les 16 dernières
// semaines. Filtrables par exercice ; pour tous les exercices, un second
// sélecteur choisit entre répétitions et durée d'entraînement (comme pas
// et minutes intensives dans Step Challenge), calculée comme le résumé
// Garmin du journal.

type Period = '1d' | '7d' | '30d' | '1y'
type Metric = 'reps' | 'minutes'

const PERIODS: Period[] = ['1d', '7d', '30d', '1y']
const METRICS: Metric[] = ['reps', 'minutes']
// Vue 1 jour : on remonte au plus un an en arrière
const MAX_DAYS_BACK = 364
const HEATMAP_WEEKS = 16

const { t, locale } = useI18n()
const { sets } = useSets()
const { unitOf, exerciseOf } = useExerciseUnits()

const selectedExercise = ref<string | null>(null)
const period = ref<Period>('30d')
const metric = ref<Metric>('reps')

// ============================================================
// DATES
// ============================================================

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

// Jour affiché par la vue 1 jour (YYYY-MM-DD), au plus un an en arrière
const dayKeyValue = ref(dayKey(startOfToday()))
const firstDay = dayKey(addDays(startOfToday(), -MAX_DAYS_BACK))

const day = computed(() => {
  const [year, month, date] = dayKeyValue.value.split('-').map(Number)
  return new Date(year!, month! - 1, date!)
})

// ============================================================
// SETS RETENUS
// ============================================================

const activeSets = computed(() =>
  sets.value.filter(set =>
    !set.deletedAt && (!selectedExercise.value || set.exercise === selectedExercise.value)
  )
)

// Échelle des valeurs affichées : l'unité de l'exercice choisi ; pour
// tous les exercices, celle du sélecteur
const scale = computed<ExerciseUnit | 'minutes'>(() =>
  selectedExercise.value ? unitOf(selectedExercise.value) : metric.value
)

const totalsOf = (list: typeof activeSets.value): AmountTotals => {
  const totals = { reps: 0, seconds: 0 }
  for (const set of list) {
    totals[unitOf(set.exercise) === 'seconds' ? 'seconds' : 'reps'] += set.reps
  }
  return totals
}

// Valeur d'un ensemble de sets dans l'échelle affichée : durée
// d'entraînement, somme de celles de chaque jour comme dans le journal, ou
// somme des sets de l'unité (en répétitions, les exercices tenus ne
// comptent pas : on n'additionne jamais reps et secondes)
const scoreOf = (list: typeof activeSets.value) => {
  const current = scale.value
  if (current === 'minutes') {
    const days = new Map<string, typeof list>()
    for (const set of list) days.set(set.date, [...(days.get(set.date) ?? []), set])
    return [...days.values()].reduce((sum, day) => sum + trainingMinutes(totalsOf(day)), 0)
  }
  return list.reduce((sum, set) => unitOf(set.exercise) === current ? sum + set.reps : sum, 0)
}

const formatValue = (value: number) => {
  if (scale.value === 'seconds') return formatDuration(Math.round(value))
  if (scale.value === 'reps') return formatAmount(Math.round(value), 'reps')
  // Moins d'une minute, mais pas rien : 1 min
  return formatMinutes(value > 0 ? Math.max(1, Math.round(value)) : 0)
}

const setsByDay = computed(() => {
  const days = new Map<string, typeof activeSets.value>()
  for (const set of activeSets.value) {
    const list = days.get(set.date) ?? []
    list.push(set)
    days.set(set.date, list)
  }
  return days
})

// ============================================================
// PÉRIODE
// ============================================================

const periodDays = computed(() => {
  if (period.value === '1d') return [day.value]

  const today = startOfToday()
  const count = period.value === '7d' ? 7 : period.value === '30d' ? 30 : 365
  return Array.from({ length: count }, (_, index) => addDays(today, index - count + 1))
})

const periodSets = computed(() => {
  const keys = new Set(periodDays.value.map(dayKey))
  return activeSets.value.filter(set => keys.has(set.date))
})

const activeDays = computed(() => new Set(periodSets.value.map(set => set.date)).size)

// Vue 1 jour : nombre de saisies et d'exercices différents
const exerciseCount = computed(() => new Set(periodSets.value.map(set => set.exercise)).size)

const periodScore = computed(() => scoreOf(periodSets.value))

const periodTotal = computed(() => formatValue(periodScore.value))

// Moyenne par jour actif, dans l'échelle affichée
const periodAverage = computed(() =>
  activeDays.value === 0 ? '—' : formatValue(periodScore.value / activeDays.value)
)

// ============================================================
// SÉRIE DE JOURS (toutes dates confondues)
// ============================================================

const activeDayKeys = computed(() => new Set(activeSets.value.map(set => set.date)))

// Jours consécutifs jusqu'à aujourd'hui, ou jusqu'à hier si rien encore
// aujourd'hui : la série n'est pas perdue avant la fin de la journée
const currentStreak = computed(() => {
  let day = startOfToday()
  if (!activeDayKeys.value.has(dayKey(day))) day = addDays(day, -1)

  let streak = 0
  while (activeDayKeys.value.has(dayKey(day))) {
    streak++
    day = addDays(day, -1)
  }
  return streak
})

const longestStreak = computed(() => {
  const days = [...activeDayKeys.value].sort()
  let longest = 0
  let current = 0
  let previous: Date | null = null

  for (const key of days) {
    const [year, month, day] = key.split('-').map(Number)
    const date = new Date(year!, month! - 1, day!)
    current = previous && dayKey(addDays(previous, 1)) === key ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = date
  }
  return longest
})

// ============================================================
// GRAPHIQUE
// ============================================================

interface Bar {
  key: string
  label: string
  value: number
  title: string
}

const chartBars = computed<Bar[]>(() => {
  void locale.value

  if (period.value === '1y') {
    // Un an : une barre par mois, du mois d'il y a 11 mois au mois courant
    const today = startOfToday()
    const monthFormat = new Intl.DateTimeFormat(dateLocale(), { month: 'narrow' })
    const titleFormat = new Intl.DateTimeFormat(dateLocale(), { month: 'long', year: 'numeric' })

    return Array.from({ length: 12 }, (_, index) => {
      const month = new Date(today.getFullYear(), today.getMonth() - 11 + index, 1)
      const prefix = dayKey(month).slice(0, 7)
      const value = scoreOf(periodSets.value.filter(set => set.date.startsWith(prefix)))
      return {
        key: prefix,
        label: monthFormat.format(month).toUpperCase(),
        value,
        title: `${titleFormat.format(month)} : ${formatValue(value)}`
      }
    })
  }

  if (period.value === '1d') {
    // Un jour : une barre par heure, l'heure affichée toutes les 6 heures.
    // En minutes, l'effort de l'heure sans arrondi ni repos, qui ne
    // s'appliquent qu'à la journée
    return Array.from({ length: 24 }, (_, hour) => {
      const prefix = String(hour).padStart(2, '0')
      const hourSets = periodSets.value.filter(set => set.time.startsWith(prefix))
      const value = scale.value === 'minutes' ? effortMinutes(totalsOf(hourSets)) : scoreOf(hourSets)
      return {
        key: prefix,
        label: hour % 6 === 0 ? `${hour}h` : '',
        value,
        title: `${hour}h : ${formatValue(value)}`
      }
    })
  }

  const weekdayFormat = new Intl.DateTimeFormat(dateLocale(), { weekday: 'narrow' })
  const titleFormat = new Intl.DateTimeFormat(dateLocale(), { day: 'numeric', month: 'short' })

  return periodDays.value.map((day, index) => {
    const key = dayKey(day)
    const value = scoreOf(setsByDay.value.get(key) ?? [])
    // 7 jours : initiale du jour ; 30 jours : le numéro, un jour sur cinq
    const label = period.value === '7d'
      ? weekdayFormat.format(day).toUpperCase()
      : (periodDays.value.length - 1 - index) % 5 === 0 ? String(day.getDate()) : ''
    return { key, label, value, title: `${titleFormat.format(day)} : ${formatValue(value)}` }
  })
})

// Échelle « ronde » de l'axe vertical : 4 graduations environ
const chartScale = computed(() => {
  const max = Math.max(0, ...chartBars.value.map(bar => bar.value))
  if (max <= 0) return { max: 20, ticks: [0, 5, 10, 15, 20] }

  const rawStep = max / 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude
  const chartMax = Math.ceil(max / step) * step

  return {
    max: chartMax,
    ticks: Array.from({ length: Math.round(chartMax / step) + 1 }, (_, index) => index * step)
  }
})

// Graduations : durée courte pour un exercice tenu, sinon le nombre
const formatTick = (value: number) =>
  scale.value === 'seconds' ? formatDurationShort(value) : String(Math.round(value))

const chartLegend = computed(() => {
  if (selectedExercise.value) return ''
  return scale.value === 'minutes' ? t('stats.chartEquivalent') : t('stats.chartRepsOnly')
})

// ============================================================
// RÉPARTITION PAR EXERCICE (sans filtre)
// ============================================================

const breakdown = computed(() => {
  const byExercise = new Map<string, typeof activeSets.value>()
  for (const set of periodSets.value) {
    const list = byExercise.get(set.exercise) ?? []
    list.push(set)
    byExercise.set(set.exercise, list)
  }

  const rows = [...byExercise.entries()].map(([exerciseId, list]) => {
    const exerciseUnit = unitOf(exerciseId)
    const total = list.reduce((sum, set) => sum + set.reps, 0)
    return {
      exerciseId,
      name: exerciseName(exerciseOf(exerciseId)) || exerciseId,
      amount: formatAmount(total, exerciseUnit),
      score: effortMinutes(exerciseUnit === 'seconds' ? { reps: 0, seconds: total } : { reps: total, seconds: 0 })
    }
  })

  const max = Math.max(0, ...rows.map(row => row.score))
  return rows
    .sort((a, b) => b.score - a.score)
    .map(row => ({ ...row, share: max > 0 ? row.score / max : 0 }))
})

// ============================================================
// RÉGULARITÉ : 16 SEMAINES, UNE COLONNE PAR SEMAINE (LUNDI EN HAUT)
// ============================================================

const heatmap = computed(() => {
  void locale.value
  const today = startOfToday()
  // Lundi de la semaine courante
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  const first = addDays(monday, -7 * (HEATMAP_WEEKS - 1))

  const values = new Map<string, number>()
  for (const [key, list] of setsByDay.value) values.set(key, scoreOf(list))

  // Niveaux 1 à 4 selon la valeur par rapport au maximum de la période
  const keys = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, index) => dayKey(addDays(first, index)))
  const max = Math.max(0, ...keys.map(key => values.get(key) ?? 0))
  const level = (value: number) => value <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((value / max) * 4))

  const titleFormat = new Intl.DateTimeFormat(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' })
  const monthFormat = new Intl.DateTimeFormat(dateLocale(), { month: 'short' })

  const weeks = Array.from({ length: HEATMAP_WEEKS }, (_, week) => {
    const days = Array.from({ length: 7 }, (_, weekday) => {
      const date = addDays(first, week * 7 + weekday)
      const key = dayKey(date)
      const value = values.get(key) ?? 0
      return {
        key,
        future: date > today,
        level: level(value),
        title: `${titleFormat.format(date)} : ${value > 0 ? formatValue(value) : '—'}`
      }
    })
    // Nom du mois au-dessus de la première semaine qui le commence
    const start = addDays(first, week * 7)
    const startsMonth = week === 0 || start.getDate() <= 7
    return { key: dayKey(start), days, month: startsMonth ? monthFormat.format(start).replace('.', '') : '' }
  })

  return weeks
})

const LEVEL_CLASSES = ['bg-track', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary']
</script>

<template>
  <div class="pb-24">

    <!-- Titre et filtre d'exercice sur la même ligne, comme le choix
         Exercice / Séance de l'écran Saisie -->
    <header class="px-5 pt-6 pb-4 flex items-center justify-between gap-3">
      <h1 class="page-title shrink-0">{{ t('nav.stats') }}</h1>
      <ExerciseSelector
        v-model="selectedExercise"
        :required="false"
        source="sets"
        compact
        :sets="sets"
      />
    </header>

    <!-- Période, comme Step Challenge -->
    <div class="px-5">
      <div class="grid grid-cols-4 gap-1 rounded-xl bg-surface-alt p-1">
        <button
          v-for="p in PERIODS"
          :key="p"
          type="button"
          class="rounded-lg py-2 text-sm font-semibold transition-all"
          :class="period === p ? 'bg-card text-fg shadow-sm' : 'text-fg-secondary'"
          @click="period = p"
        >
          {{ t(`stats.period.${p}`) }}
        </button>
      </div>
    </div>

    <main class="px-5 mt-4 space-y-4">

      <!-- Vue 1 jour : jour affiché -->
      <DayNavigator
        v-if="period === '1d'"
        v-model="dayKeyValue"
        :min="firstDay"
        :pickable="false"
      />

      <!-- Répétitions ou minutes d'effort, pour tous les exercices (un
           exercice choisi s'affiche dans son unité) -->
      <div v-if="!selectedExercise" class="mx-auto flex w-fit rounded-xl bg-surface-alt p-1">
        <button
          v-for="m in METRICS"
          :key="m"
          type="button"
          class="rounded-lg border-b-2 px-4 py-1.5 text-[13px] transition-all"
          :class="metric === m
            ? 'border-primary bg-card font-bold text-fg shadow-sm'
            : 'border-transparent font-medium text-fg-secondary'"
          @click="metric = m"
        >
          {{ t(`stats.metric.${m}`) }}
        </button>
      </div>

      <!-- Graphique -->
      <section class="rounded-xl bg-surface p-4">
        <div class="flex gap-2">
          <!-- Graduations -->
          <div class="relative h-40 w-9 shrink-0 text-[10px] text-fg-muted">
            <span
              v-for="tick in chartScale.ticks"
              :key="tick"
              class="absolute right-0 translate-y-1/2"
              :style="{ bottom: `${(tick / chartScale.max) * 100}%` }"
            >
              {{ formatTick(tick) }}
            </span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="relative h-40">
              <div
                v-for="tick in chartScale.ticks"
                :key="tick"
                class="absolute inset-x-0 border-t border-line"
                :style="{ bottom: `${(tick / chartScale.max) * 100}%` }"
              />
              <div
                class="absolute inset-0 flex items-end"
                :class="period === '30d' || period === '1d' ? 'gap-px' : 'gap-1.5'"
              >
                <div
                  v-for="bar in chartBars"
                  :key="bar.key"
                  class="flex h-full flex-1 items-end"
                  :title="bar.title"
                >
                  <div
                    class="w-full rounded-t-sm bg-primary transition-all duration-300"
                    :style="{ height: `${(bar.value / chartScale.max) * 100}%` }"
                  />
                </div>
              </div>
            </div>

            <!-- Libellés -->
            <div class="mt-1.5 flex" :class="period === '30d' || period === '1d' ? 'gap-px' : 'gap-1.5'">
              <span
                v-for="bar in chartBars"
                :key="bar.key"
                class="flex-1 text-center text-[10px] text-fg-muted"
              >
                {{ bar.label }}
              </span>
            </div>
          </div>
        </div>

        <p v-if="chartLegend" class="mt-3 text-xs text-fg-muted">{{ chartLegend }}</p>
      </section>

      <!-- Chiffres clés -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-surface p-4">
          <p class="text-xs font-medium text-fg-secondary">{{ t('preview.total') }}</p>
          <p class="mt-1 text-lg font-bold leading-tight text-fg">{{ periodTotal }}</p>
        </div>
        <template v-if="period === '1d'">
          <div class="rounded-xl bg-surface p-4">
            <p class="text-xs font-medium text-fg-secondary">{{ t('stats.entries') }}</p>
            <p class="mt-1 text-lg font-bold leading-tight text-fg">{{ periodSets.length }}</p>
          </div>
          <div class="rounded-xl bg-surface p-4">
            <p class="text-xs font-medium text-fg-secondary">{{ t('selector.title') }}</p>
            <p class="mt-1 text-lg font-bold leading-tight text-fg">{{ exerciseCount }}</p>
          </div>
        </template>
        <template v-else>
          <div class="rounded-xl bg-surface p-4">
            <p class="text-xs font-medium text-fg-secondary">{{ t('stats.activeDays') }}</p>
            <p class="mt-1 text-lg font-bold leading-tight text-fg">
              {{ activeDays }}
              <span class="text-sm font-medium text-fg-muted">/ {{ periodDays.length }}</span>
            </p>
          </div>
          <div class="rounded-xl bg-surface p-4">
            <p class="text-xs font-medium text-fg-secondary">{{ t('stats.average') }}</p>
            <p class="mt-1 text-lg font-bold leading-tight text-fg">{{ periodAverage }}</p>
          </div>
        </template>
        <div class="rounded-xl bg-surface p-4">
          <p class="text-xs font-medium text-fg-secondary">{{ t('stats.currentStreak') }}</p>
          <p class="mt-1 text-lg font-bold leading-tight text-fg">{{ t('stats.days', currentStreak) }}</p>
          <p class="text-xs text-fg-muted">{{ t('stats.record', { days: t('stats.days', longestStreak) }) }}</p>
        </div>
      </div>

      <!-- Répartition par exercice -->
      <section v-if="!selectedExercise" class="rounded-xl bg-surface p-4">
        <h2 class="text-sm font-semibold text-fg">{{ t('stats.byExercise') }}</h2>

        <p v-if="breakdown.length === 0" class="mt-3 text-sm text-fg-secondary">
          {{ t('stats.empty') }}
        </p>

        <button
          v-for="row in breakdown"
          :key="row.exerciseId"
          type="button"
          class="mt-3 block w-full text-left"
          @click="selectedExercise = row.exerciseId"
        >
          <div class="flex items-baseline justify-between gap-3">
            <span class="min-w-0 truncate text-sm text-fg">{{ row.name }}</span>
            <span class="shrink-0 text-sm font-semibold text-fg">{{ row.amount }}</span>
          </div>
          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
            <div class="h-full rounded-full bg-primary" :style="{ width: `${row.share * 100}%` }" />
          </div>
        </button>
      </section>

      <!-- Régularité -->
      <section class="rounded-xl bg-surface p-4">
        <h2 class="text-sm font-semibold text-fg">{{ t('stats.regularity') }}</h2>

        <div class="mt-3 flex gap-[3px]">
          <div v-for="week in heatmap" :key="week.key" class="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span class="h-3 w-0 overflow-visible whitespace-nowrap text-[10px] leading-3 text-fg-muted">
              {{ week.month }}
            </span>
            <div
              v-for="day in week.days"
              :key="day.key"
              class="aspect-square rounded-[3px]"
              :class="day.future ? 'bg-transparent' : LEVEL_CLASSES[day.level]"
              :title="day.title"
            />
          </div>
        </div>

        <div class="mt-3 flex items-center justify-end gap-1 text-[10px] text-fg-muted">
          <span class="mr-1">{{ t('stats.less') }}</span>
          <span v-for="(level, index) in LEVEL_CLASSES" :key="index" class="h-2.5 w-2.5 rounded-[2px]" :class="level" />
          <span class="ml-1">{{ t('stats.more') }}</span>
        </div>
      </section>

    </main>
  </div>
</template>
