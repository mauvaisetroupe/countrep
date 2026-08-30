<script setup lang="ts">
import { computed } from 'vue'
import { useWorkouts } from '../composables/useWorkouts'
import { exercises } from '../exercises'
import { useExerciseStore } from '../stores/exercise'

const exerciseStore = useExerciseStore()  
const { workouts } = useWorkouts()

// Filtrer les workouts pour l'exercice sélectionné
const exerciseWorkouts = computed(() => {
  return workouts.value.filter(w => w.exercise === exerciseStore.selectedExercise)
})

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
  return exerciseWorkouts.value.reduce((acc, curr) => acc + curr.reps, 0)
})

const longestStreak = computed(() => {
  const dates = [...new Set(exerciseWorkouts.value.map(w => getLocalDateString(w.date)))]
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
  
  const filtered = exerciseWorkouts.value.filter(w => {
    const wDate = getLocalDateString(w.date)
    return wDate >= startStr && wDate <= endStr
  })

  const total = filtered.reduce((acc, curr) => acc + curr.reps, 0)
  const activeDaysSet = new Set(filtered.map(w => getLocalDateString(w.date)))
  const activeDays = activeDaysSet.size
  const average = activeDays > 0 ? (total / activeDays).toFixed(1) : '0.0'

  return { total, activeDays, average }
}

// Cette semaine (du Lundi au Dimanche) - Sans muter `now`
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

// 3. Données pour le graphique du mois
const monthChartData = computed(() => {
  const today = getToday()
  const currentYear = today.getFullYear()
  const currentMonthIndex = today.getMonth()

  const totalDays = new Date(currentYear, currentMonthIndex + 1, 0).getDate()
  const mapData: Record<number, number> = {}
  
  exerciseWorkouts.value.forEach(w => {
    const cleanDate = getLocalDateString(w.date)
    const [y, m, d] = cleanDate.split('-').map(Number)
    
    if (y === currentYear && m - 1 === currentMonthIndex) {
      mapData[d] = (mapData[d] || 0) + w.reps
    }
  })

  const maxReps = Math.max(...Object.values(mapData), 20)

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