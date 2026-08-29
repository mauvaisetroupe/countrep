<script setup>
import { ref } from 'vue'

// Navigation active
const currentTab = ref('today')

// Exercice sélectionné
const selectedExercise = ref('Push-ups')
const exercises = [
  { name: 'Push-ups', icon: '⚡' },
  { name: 'Squats', icon: '🧍' },
  { name: 'Chin-ups', icon: '📈' },
]

// Données du calendrier (Août 2026)
const currentMonth = 'août 2026'
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const daysInMonth = [
  null, null, null,
  ...Array.from({ length: 31 }, (_, i) => i + 1)
]
const today = 29
const selectedDate = ref(15) // Date sélectionnée sur le calendrier

// État de la modale d'ajout
const showModal = ref(false)
const inputMode = ref('add') // 'add' (Ajouter une série) ou 'set' (Définir le total)
const repsValue = ref('')

// Fonction pour ajouter rapidement un nombre fixe
const addQuick = (val) => {
  const current = parseInt(repsValue.value) || 0
  if (inputMode.value === 'add') {
    repsValue.value = current + val
  } else {
    repsValue.value = val
  }
}

// Enregistrement
const saveWorkout = () => {
  console.log(`Exercice: ${selectedExercise.value}, Date: ${selectedDate.value} août, Mode: ${inputMode.value}, Valeur: ${repsValue.value}`)
  showModal.value = false
  repsValue.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-[#fdf8f5] text-gray-900 pb-28 font-sans select-none">
    
    <!-- En-tête -->
    <header class="px-5 pt-6 pb-4">
      <h1 class="text-2xl font-bold tracking-tight text-gray-900">Aujourd'hui</h1>
    </header>

    <!-- Sélecteur d'exercices -->
    <div class="px-5 flex gap-3 overflow-x-auto no-scrollbar pb-2">
      <button 
        v-for="ex in exercises" 
        :key="ex.name"
        @click="selectedExercise = ex.name"
        :class="[
          'flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium shadow-xs transition-all whitespace-nowrap',
          selectedExercise === ex.name ? 'bg-amber-500 text-white shadow-amber-200' : 'bg-white text-gray-700 border border-gray-200/60'
        ]"
      >
        <span>{{ ex.icon }}</span>
        <span>{{ ex.name }}</span>
      </button>
    </div>

    <!-- Corps de la page -->
    <main class="px-5 mt-4 space-y-4">
      
      <!-- Carte Calendrier -->
      <section class="bg-amber-50/40 border border-amber-100/80 rounded-3xl p-5 shadow-xs">
        <h2 class="text-lg font-bold capitalize mb-4 text-gray-800">{{ currentMonth }}</h2>
        
        <div class="grid grid-cols-7 text-center text-xs font-semibold text-gray-400 mb-2">
          <span v-for="day in daysOfWeek" :key="day">{{ day }}</span>
        </div>

        <div class="grid grid-cols-7 gap-y-3 text-center text-sm">
          <div v-for="(day, index) in daysInMonth" :key="index" class="flex justify-center items-center">
            <button 
              v-if="day" 
              @click="selectedDate = day"
              :class="[
                'w-9 h-9 flex items-center justify-center rounded-full font-medium transition-all',
                selectedDate === day ? 'bg-amber-600 text-white font-bold shadow-sm' : 
                day === today ? 'border border-amber-600 text-gray-900' : 'text-gray-700 hover:bg-amber-100/50'
              ]"
            >
              {{ day }}
            </button>
          </div>
        </div>
      </section>

    </main>

    <!-- Bouton d'action flottant (FAB) -->
    <div class="fixed bottom-20 right-5 z-10">
      <button 
        @click="showModal = true"
        class="bg-amber-200 text-amber-950 font-semibold px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2 border border-amber-300/60 active:scale-95 transition-transform"
      >
        <span>⚡</span> Add {{ selectedExercise }}
      </button>
    </div>

    <!-- MODALE D'AJOUT (Identique au screenshot) -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div class="bg-[#fdf8f5] w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl space-y-6 border border-amber-100 animate-in fade-in slide-in-from-bottom duration-200">
        
        <!-- En-tête de la modale -->
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2.5">
            <span class="bg-amber-500 text-white p-2 rounded-xl text-sm shadow-sm">⚡</span>
            <h3 class="text-xl font-bold text-gray-900">Ajouter {{ selectedExercise }}</h3>
          </div>
          <button @click="showModal = false" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/60 text-gray-600 hover:bg-gray-200">
            ✕
          </button>
        </div>

        <!-- Onglets (Ajouter une série / Définir le total) -->
        <div class="grid grid-cols-2 bg-gray-200/70 p-1 rounded-2xl">
          <button 
            @click="inputMode = 'add'"
            :class="['py-2.5 text-sm font-semibold rounded-xl transition-all', inputMode === 'add' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500']"
          >
            Ajouter une série
          </button>
          <button 
            @click="inputMode = 'set'"
            :class="['py-2.5 text-sm font-semibold rounded-xl transition-all', inputMode === 'set' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500']"
          >
            Définir le total
          </button>
        </div>

        <!-- Question -->
        <p class="text-sm font-medium text-gray-800 text-center">
          Combien de {{ selectedExercise }} avez-vous fait ?
        </p>

        <!-- Champ de saisie -->
        <div class="relative border-2 border-amber-600/70 rounded-2xl bg-white px-4 py-3 flex items-center gap-3 shadow-xs">
          <span class="absolute -top-3 left-4 bg-white px-1.5 text-xs font-semibold text-amber-700">Nombre</span>
          <span class="text-amber-600">⚡</span>
          <input 
            type="number" 
            v-model="repsValue" 
            placeholder="Entrez un nombre" 
            class="w-full bg-transparent text-lg font-semibold text-gray-900 focus:outline-none placeholder:text-gray-300"
          />
        </div>

        <!-- Ajout rapide -->
        <div>
          <span class="text-xs font-semibold text-gray-500 block mb-2">Ajout rapide :</span>
          <div class="grid grid-cols-4 gap-2">
            <button 
              v-for="n in [5, 10, 15, 20]" 
              :key="n"
              @click="addQuick(n)"
              class="bg-white border border-gray-200/80 hover:border-amber-400 py-2.5 rounded-xl text-sm font-semibold text-gray-700 shadow-2xs active:scale-95 transition-all"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <!-- Boutons de validation -->
        <div class="flex gap-3 pt-2">
          <button 
            @click="showModal = false" 
            class="flex-1 bg-transparent hover:bg-gray-100 text-gray-700 font-semibold py-3.5 rounded-2xl transition-colors"
          >
            Annuler
          </button>
          <button 
            @click="saveWorkout" 
            class="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3.5 rounded-2xl shadow-md shadow-amber-200 transition-all active:scale-[0.98]"
          >
            Enregistrer
          </button>
        </div>

      </div>
    </div>

    <!-- Barre de navigation inférieure -->
    <nav class="fixed bottom-0 left-0 right-0 bg-[#fdf8f5]/90 backdrop-blur-md border-t border-amber-100/60 px-6 py-3 flex justify-around items-center z-20">
      <button @click="currentTab = 'today'" :class="['flex flex-col items-center gap-1 transition-colors', currentTab === 'today' ? 'text-amber-600 font-bold' : 'text-gray-400']">
        <span class="text-xl">📅</span>
        <span class="text-xs">Aujourd'hui</span>
      </button>
      <button @click="currentTab = 'stats'" :class="['flex flex-col items-center gap-1 transition-colors', currentTab === 'stats' ? 'text-amber-600 font-bold' : 'text-gray-400']">
        <span class="text-xl">📊</span>
        <span class="text-xs">Statistiques</span>
      </button>
      <button @click="currentTab = 'profile'" :class="['flex flex-col items-center gap-1 transition-colors', currentTab === 'profile' ? 'text-amber-600 font-bold' : 'text-gray-400']">
        <span class="text-xl">👤</span>
        <span class="text-xs">Profil</span>
      </button>
    </nav>

  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>