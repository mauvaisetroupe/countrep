<script setup lang="ts">
import { computed } from 'vue'
import { useWorkouts } from '../composables/useWorkouts'
import { exercises } from '../exercises'
import { useExerciseStore } from '../stores/exercise'

const exerciseStore = useExerciseStore()  

// Charger les données depuis IndexedDB
const { workouts } = useWorkouts()

// Filtrer les workouts pour l'exercice sélectionné
const exerciseWorkouts = computed(() => {
  return workouts.value.filter(w => w.exercise === exerciseStore.selectedExercise)
})

// --- CALCULS STATISTIQUES ---
const now = new Date()
const currentYear = now.getFullYear()
const currentMonthIndex = now.getMonth()

// Helper pour formater une date en "YYYY-MM-DD"
const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 1. Statistiques globales / Streak
const totalRepsAllTime = computed(() => {
  return exerciseWorkouts.value.reduce((acc, curr) => acc + curr.reps, 0)
})

const longestStreak = computed(() => {
  const dates = [...new Set(exerciseWorkouts.value.map(w => w.date))].sort()
  if (dates.length === 0) return 0
  
  let maxStreak = 1
  let currentStreak = 1
  
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffTime = curr.getTime() - prev.getTime()
    const diffDays = diffTime / (1000 * 3600 * 24)
    
    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else if (diffDays > 1) {
      currentStreak = 1
    }
  }
  return maxStreak
})

// 2. Statistiques par Période (Semaine, Mois, Année)
const getStatsForPeriod = (startDate: Date, endDate: Date) => {
  const startStr = formatDate(startDate)
  const endStr = formatDate(endDate)
  
  const filtered = exerciseWorkouts.value.filter(w => w.date >= startStr && w.date <= endStr)
  const total = filtered.reduce((acc, curr) => acc + curr.reps, 0)
  const activeDaysSet = new Set(filtered.map(w => w.date))
  const activeDays = activeDaysSet.size
  
  // Calcul du nombre de jours écoulés ou total dans la période pour la moyenne
  const average = activeDays > 0 ? (total / activeDays).toFixed(1) : '0.0'

  return { total, activeDays, average }
}

// Cette semaine (du lundi au dimanche par exemple)
const weekStats = computed(() => {
  const d = new Date(now)
  const day = d.getDay()
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diffToMonday))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return getStatsForPeriod(monday, sunday)
})

// Ce mois
const monthStats = computed(() => {
  const firstDay = new Date(currentYear, currentMonthIndex, 1)
  const lastDay = new Date(currentYear, currentMonthIndex + 1, 0)
  return getStatsForPeriod(firstDay, lastDay)
})

// Cette année
const yearStats = computed(() => {
  const firstDay = new Date(currentYear, 0, 1)
  const lastDay = new Date(currentYear, 11, 31)
  return getStatsForPeriod(firstDay, lastDay)
})

// 3. Données pour le graphique du mois (jours 1 à N)

const getLocalDateString = (date: string) => {
  return date.length === 10
    ? date
    : date.slice(0, 10)
}

const monthChartData = computed(() => {
  const totalDays = new Date(currentYear, currentMonthIndex + 1, 0).getDate()
  const mapData: Record<number, number> = {}
  
  exerciseWorkouts.value.forEach(w => {
    const [y, m, d] = getLocalDateString(w.date)
      .split('-')
      .map(Number)
    if (y === currentYear && m - 1 === currentMonthIndex) {
      mapData[d] = (mapData[d] || 0) + w.reps
    }
  })

  const maxReps = Math.max(...Object.values(mapData), 20) // Échelle dynamique

  return Array.from({ length: totalDays }, (_, i) => {
    const dayNum = i + 1
    const reps = mapData[dayNum] || 0
    const heightPercent = Math.min(100, (reps / maxReps) * 100)
    return { day: dayNum, reps, height: heightPercent }
  })
})
</script>

<template>
  <div class="pb-24">
    <!-- En-tête -->
    <header class="px-5 pt-6 pb-4">
      <h1 class="text-2xl font-bold tracking-tight text-gray-900">Statistiques</h1>
    </header>

    <!-- Sélecteur d'exercices -->
    <div class="px-5 flex gap-3 overflow-x-auto no-scrollbar pb-2">
      <button 
        v-for="ex in exercises" 
        :key="ex.name"
        @click="exerciseStore.selectedExercise = ex.name"
        :class="[
          'flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium shadow-xs transition-all whitespace-nowrap',
          exerciseStore.selectedExercise === ex.name ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-white text-gray-700 border border-gray-200/60'
        ]"
      >
        <span>{{ ex.icon }}</span>
        <span>{{ ex.name }}</span>
      </button>
    </div>

    <main class="px-5 mt-4 space-y-4">
      
      <!-- Carte Graphique "Ce mois" -->
      <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-amber-600 font-bold">📊</span>
          <h2 class="text-lg font-bold text-gray-800">Ce mois</h2>
        </div>

        <!-- Graphique ultra-compact sans chiffres ni scroll -->
        <div class="h-28 flex items-end gap-0.5 pt-2 border-b border-amber-100 pb-2 w-full">
          <div 
            v-for="item in monthChartData" 
            :key="item.day" 
            class="flex-1 min-w-0 flex flex-col items-center h-full justify-end"
            :title="`Jour ${item.day}: ${item.reps} reps`"
          >
            <!-- Barre -->
            <div 
              :class="[
                'w-full rounded-t-[2px] transition-all duration-300',
                item.reps > 0 ? 'bg-amber-500' : 'bg-amber-200/40'
              ]"
              :style="{ height: `${Math.max(item.height, 4)}%` }"
            ></div>
          </div>
        </div>
      </section>


      <!-- Cartes Périodes (Cette semaine / Ce mois / Cette année) -->
      <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs space-y-4">
        <h2 class="text-lg font-bold text-gray-800">Cette semaine</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-gray-600"><span>Total</span><span class="font-bold text-gray-900">{{ weekStats.total }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Jours actifs</span><span class="font-bold text-gray-900">{{ weekStats.activeDays }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Moyenne par jour actif</span><span class="font-bold text-gray-900">{{ weekStats.average }}</span></div>
        </div>
      </section>

      <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs space-y-4">
        <h2 class="text-lg font-bold text-gray-800">Ce mois-ci</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-gray-600"><span>Total</span><span class="font-bold text-gray-900">{{ monthStats.total }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Jours actifs</span><span class="font-bold text-gray-900">{{ monthStats.activeDays }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Moyenne par jour actif</span><span class="font-bold text-gray-900">{{ monthStats.average }}</span></div>
        </div>
      </section>

      <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs space-y-4">
        <h2 class="text-lg font-bold text-gray-800">Cette année</h2>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-gray-600"><span>Total</span><span class="font-bold text-gray-900">{{ yearStats.total }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Jours actifs</span><span class="font-bold text-gray-900">{{ yearStats.activeDays }}</span></div>
          <div class="flex justify-between text-gray-600"><span>Moyenne par jour actif</span><span class="font-bold text-gray-900">{{ yearStats.average }}</span></div>
        </div>
      </section>

      <!-- Carte Résumé Global (Total & Streak) -->
      <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-600 font-medium">Total {{ exerciseStore.selectedExercise }}</span>
          <span class="text-xl font-bold text-gray-900">{{ totalRepsAllTime }}</span>
        </div>
        <div class="flex justify-between items-center border-t border-amber-100/60 pt-3">
          <span class="text-gray-600 font-medium">Streak le plus long</span>
          <span class="text-lg font-bold text-gray-900">{{ longestStreak }} jours</span>
        </div>
      </section>      

    </main>
  </div>
</template>