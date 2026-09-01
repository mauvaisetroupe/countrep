import { ref, onMounted, onUnmounted } from 'vue'
import { db, type LocalWorkout } from '../db'
import {
  syncPendingWorkouts,
  syncWorkoutsFromServer
} from '../services/sync'

export function useWorkouts() {

  const workouts = ref<LocalWorkout[]>([])
  const loading = ref(false)

  // ============================================================
  // CHARGER DEPUIS INDEXEDDB
  // ============================================================

  const loadWorkouts = async () => {
    workouts.value = await db.workouts.toArray()
  }

  // ============================================================
  // CRÉER UN WORKOUT
  // ============================================================

  const createWorkout = async (
    workout: LocalWorkout
  ): Promise<void> => {

    await db.workouts.add(workout)

    // Mise à jour immédiate de l'état exposé au composant
    workouts.value.push(workout)
  }

  // ============================================================
  // SYNCHRONISATION COMPLÈTE
  // ============================================================

  const sync = async () => {

    if (loading.value) {
      return
    }

    loading.value = true

    try {
      // Toujours commencer par les données locales
      await loadWorkouts()

      // Envoyer les workouts locaux non synchronisés
      await syncPendingWorkouts()

      // Récupérer les workouts du serveur
      await syncWorkoutsFromServer()

      // Recharger IndexedDB après synchronisation
      await loadWorkouts()

    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // RETOUR DU RÉSEAU
  // ============================================================

  const handleOnline = async () => {
    console.log('🌐 Réseau disponible → synchronisation')
    await sync()
  }

  // ============================================================
  // INITIALISATION
  // ============================================================

  onMounted(async () => {
    await sync()
    window.addEventListener('online', handleOnline)
  })

  // ============================================================
  // NETTOYAGE
  // ============================================================

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
  })

  return {
    workouts,
    loading,
    loadWorkouts,
    createWorkout,
    sync
  }
}