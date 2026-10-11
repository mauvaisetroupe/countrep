<script setup lang="ts">
import { computed, ref } from 'vue'
import ExerciseSelector from '../components/ExerciseSelector.vue'
import { useSets } from '../composables/useSets'
import { useExerciseUnits } from '../composables/useExerciseUnits'
import { formatAmount, formatDuration } from '../units'
import { useI18n } from 'vue-i18n'

const { sets } = useSets()
const { unitOf } = useExerciseUnits()
const { t } = useI18n()
const selectedExercise = ref<string | null>(null)

// Filtrer les sets : si aucun exercice n'est sélectionné (null), on prend tout
const exerciseSets = computed(() => {
  if (!selectedExercise.value) {
    return sets.value
  }

  return sets.value.filter(w => w.exercise === selectedExercise.value)
})

// Les totaux sont dans l'unité de l'exercice choisi. Pour tous les
// exercices, seules les répétitions sont additionnées (les durées ne s'y
// ajoutent pas) ; jours actifs et streak comptent toutes les saisies.
const unit = computed(() => selectedExercise.value ? unitOf(selectedExercise.value) : 'reps')

const amountSets = computed(() =>
  exerciseSets.value.filter(w => unitOf(w.exercise) === unit.value)
)

const formatValue = (value: number) =>
  unit.value === 'seconds' ? formatDuration(Math.round(value)) : String(value)

// --- CALCULS STATISTIQUES ---

// Extraire la date du jour en local (sans heure)
const getToday = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Helper pour formater une Date objet en "YYYY-MM-DD" local
const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Uniformiser n'importe quelle String de date vers "YYYY-MM-DD"
const getLocalDateString = (dateStr: string) => {
  if (!dateStr) return ''
  // Si format ISO avec T (ex: 2026-08-30T14:00:00Z), on extrait la date locale
  if (dateStr.includes('T')) {
    const d = new Date(dateStr)
    return formatDate(d)
  }
  return dateStr.slice(0, 10)
}

// 1. Statistiques globales / Streak
const totalRepsAllTime = computed(() => {
  return formatValue(amountSets.value.reduce((acc, curr) => acc + curr.reps, 0))
})

const longestStreak = computed(() => {
  const dates = [...new Set(exerciseSets.value.map(w => getLocalDateString(w.date)))]
    .filter(Boolean)
    .sort()
    
  if (dates.length === 0) return 0
  
  let maxStreak = 1
  let currentStreak = 1
  
  for (let i = 1; i < dates.length; i++) {
    // Utiliser UTC pour éviter les décalages d'heure d'été/hiver sur la différence de jours
    const [pY, pM, pD] = dates[i - 1].split('-').map(Number)
    const [cY, cM, cD] = dates[i].split('-').map(Number)
    
    const prev = Date.UTC(pY, pM - 1, pD)
    const curr = Date.UTC(cY, cM - 1, cD)
    
    const diffDays = Math.round((curr - prev) / (1000 * 3600 * 24))
    
    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else if (diffDays > 1) {
      currentStreak = 1
    }
  }
  return maxStreak
})

// 2. Statistiques par Période
const getStatsForPeriod = (startDate: Date, endDate: Date) => {
  const startStr = formatDate(startDate)
  const endStr = formatDate(endDate)
  
  const inPeriod = (w: { date: string }) => {
    const wDate = getLocalDateString(w.date)
    return wDate >= startStr && wDate <= endStr
  }

  const filtered = exerciseSets.value.filter(inPeriod)

  const total = amountSets.value.filter(inPeriod).reduce((acc, curr) => acc + curr.reps, 0)
  const activeDaysSet = new Set(filtered.map(w => getLocalDateString(w.date)))
  const activeDays = activeDaysSet.size
  const average = unit.value === 'seconds'
    ? formatValue(activeDays > 0 ? total / activeDays : 0)
    : activeDays > 0 ? (total / activeDays).toFixed(1) : '0.0'

  return { total: formatValue(total), activeDays, average }
}

// Cette semaine (du Lundi au Dimanche)
const weekStats = computed(() => {
  const today = getToday()
  const dayOfWeek = today.getDay() // 0 = Dimanche, 1 = Lundi, ...
  
  // Calcul du lundi
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday)
  
  // Calcul du dimanche
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)

  return getStatsForPeriod(monday, sunday)
})

// Ce mois
const monthStats = computed(() => {
  const today = getToday()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return getStatsForPeriod(firstDay, lastDay)
})

// Cette année
const yearStats = computed(() => {
  const today = getToday()
  const firstDay = new Date(today.getFullYear(), 0, 1)
  const lastDay = new Date(today.getFullYear(), 11, 31)
  return getStatsForPeriod(firstDay, lastDay)
})

// 3. Données pour le graphique des 30 derniers jours
const monthChartData = computed(() => {
  const today = getToday()
  const mapData: Record<string, number> = {}

  amountSets.value.forEach(w => {
    const date = getLocalDateString(w.date)
    if (date) {
      mapData[date] = (mapData[date] || 0) + w.reps
    }
  })

  // Les 30 derniers jours, aujourd'hui inclus
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (29 - i))
    return d
  })

  const maxReps = Math.max(
    ...days.map(d => mapData[formatDate(d)] || 0),
    0
  )

  // Détermine une échelle "propre" pour l'axe Y
  const getChartScale = (max: number) => {
    if (max <= 0) {
      return { max: 20, step: 5 }
    }

    const rawStep = max / 4
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const normalized = rawStep / magnitude

    let niceStep: number

    if (normalized <= 1) {
      niceStep = 1 * magnitude
    } else if (normalized <= 2) {
      niceStep = 2 * magnitude
    } else if (normalized <= 5) {
      niceStep = 5 * magnitude
    } else {
      niceStep = 10 * magnitude
    }

    const chartMax = Math.ceil(max / niceStep) * niceStep

    return {
      max: chartMax,
      step: niceStep
    }
  }

  const scale = getChartScale(maxReps)

  return {
    days: days.map(d => {
      const date = formatDate(d)
      const reps = mapData[date] || 0

      return {
        date,
        day: d.getDate(),
        reps
      }
    }),
    max: scale.max,
    step: scale.step,
    ticks: Array.from(
      { length: Math.floor(scale.max / scale.step) + 1 },
      (_, i) => i * scale.step
    )
  }
})

</script>

<template>
  <div class="pb-24">
    <!-- En-tête -->
    <header class="px-5 pt-6 pb-4">
      <h1 class="page-title">{{ t('nav.stats') }}</h1>
    </header>

    <!-- Sélecteur d'exercices -->
    <ExerciseSelector
      v-model="selectedExercise"
      :required="false"
      source="sets"
    />
    
    <main class="px-5 mt-4 space-y-4">
      
      <!-- Carte Graphique "30 derniers jours" -->
      <section class="bg-surface rounded-xl p-5 space-y-4">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-fg">{{ t('stats.last30') }}</h2>
        </div>

        <div class="flex gap-2">

          <!-- Axe Y -->
          <div class="h-28 flex flex-col justify-between text-[10px] text-fg-muted text-right">
            <span
              v-for="tick in [...monthChartData.ticks].reverse()"
              :key="tick"
            >
              {{ tick }}
            </span>
          </div>

          <!-- Graphique -->
          <div class="relative flex-1 h-28">

            <!-- Lignes horizontales -->
            <div
              v-for="tick in monthChartData.ticks"
              :key="`line-${tick}`"
              class="absolute left-0 right-0 border-t border-line"
              :style="{
                bottom: `${(tick / monthChartData.max) * 100}%`
              }"
            ></div>

            <!-- Barres -->
            <div class="absolute inset-0 flex items-end gap-0.5">
              <div
                v-for="item in monthChartData.days"
                :key="item.date"
                class="flex-1 min-w-0 h-full flex items-end"
                :title="`${item.date}: ${formatAmount(item.reps, unit)}`"
              >
                <div
                  :class="[
                    'w-full rounded-t-[2px] transition-all duration-300',
                    item.reps > 0
                      ? 'bg-primary'
                      : 'bg-track'
                  ]"
                  :style="{
                    height: item.reps > 0
                      ? `${(item.reps / monthChartData.max) * 100}%`
                      : '2px'
                  }"
                ></div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Cartes Périodes -->
      <section class="bg-surface rounded-xl p-5 space-y-4">
        <h2 class="text-lg font-bold text-fg">{{ t('stats.week') }}</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-fg-secondary"><span>{{ t('preview.total') }}</span><span class="font-bold text-fg">{{ weekStats.total }}</span></div>
          <div class="flex justify-between text-fg-secondary"><span>{{ t('stats.activeDays') }}</span><span class="font-bold text-fg">{{ weekStats.activeDays }}</span></div>
          <div class="flex justify-between text-fg-secondary"><span>{{ t('stats.average') }}</span><span class="font-bold text-fg">{{ weekStats.average }}</span></div>
        </div>
      </section>

      <section class="bg-surface rounded-xl p-5 space-y-4">
        <h2 class="text-lg font-bold text-fg">{{ t('stats.month') }}</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-fg-secondary"><span>{{ t('preview.total') }}</span><span class="font-bold text-fg">{{ monthStats.total }}</span></div>
          <div class="flex justify-between text-fg-secondary"><span>{{ t('stats.activeDays') }}</span><span class="font-bold text-fg">{{ monthStats.activeDays }}</span></div>
          <div class="flex justify-between text-fg-secondary"><span>{{ t('stats.average') }}</span><span class="font-bold text-fg">{{ monthStats.average }}</span></div>
        </div>
      </section>

      <section class="bg-surface rounded-xl p-5 space-y-4">
        <h2 class="text-lg font-bold text-fg">{{ t('stats.year') }}</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-fg-secondary"><span>{{ t('preview.total') }}</span><span class="font-bold text-fg">{{ yearStats.total }}</span></div>
          <div class="flex justify-between text-fg-secondary"><span>{{ t('stats.activeDays') }}</span><span class="font-bold text-fg">{{ yearStats.activeDays }}</span></div>
          <div class="flex justify-between text-fg-secondary"><span>{{ t('stats.average') }}</span><span class="font-bold text-fg">{{ yearStats.average }}</span></div>
        </div>
      </section>

      <!-- Carte Résumé Global -->
      <section class="bg-surface rounded-xl p-5 space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-fg-secondary font-medium">
            {{ selectedExercise ? t('stats.totalOf', { exercise: selectedExercise }) : t('stats.totalAll') }}
          </span>
          <span class="text-xl font-bold text-fg">{{ totalRepsAllTime }}</span>
        </div>
        <div class="flex justify-between items-center border-t border-line pt-3">
          <span class="text-fg-secondary font-medium">{{ t('stats.longestStreak') }}</span>
          <span class="text-lg font-bold text-fg">{{ t('stats.days', longestStreak) }}</span>
        </div>
      </section>     

    </main>
  </div>
</template>