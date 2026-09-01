import { ref, onMounted, onUnmounted } from 'vue'
import { type LocalWorkout } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
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
    workouts.value = await workoutRepository.getAll()
  }

  // ============================================================
  // CRÉER UN WORKOUT
  // ============================================================

  const createWorkout = async (
    workout: LocalWorkout
  ): Promise<void> => {

    await workoutRepository.create(workout)

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