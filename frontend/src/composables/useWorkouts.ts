import { ref, onMounted, onUnmounted } from 'vue'
import { type LocalWorkout } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import {
  syncPendingWorkouts,
  syncWorkoutsFromServer,
  syncUpdatedWorkout,
  syncDeletedWorkout
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

const updateWorkout = async (
  id: string,
  changes: Partial<LocalWorkout>
): Promise<void> => {

  await workoutRepository.update(id, {
    ...changes,
    updatedAt: Date.now(),
    syncStatus: 'pending',
    syncOperation: 'update'
  })

  await loadWorkouts()

  const workout = workouts.value.find(
    workout => workout.id === id
  )

  if (!workout) {
    return
  }

  try {
    await syncUpdatedWorkout(workout)
    await loadWorkouts()
  } catch (error) {
    console.warn(
      `Workout ${id} modifié localement mais non synchronisé`,
      error
    )
  }
}

const deleteWorkout = async (id: string) => {

  const now = Date.now()

  await workoutRepository.update(id, {
    deletedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
    syncOperation: 'delete'
  })

  await loadWorkouts()

  const workout = workouts.value.find(
    workout => workout.id === id
  )

  if (!workout) {
    return
  }

  try {
    await syncDeletedWorkout(workout)
    await loadWorkouts()
  } catch (error) {
    console.warn(
      `Workout ${id} supprimé localement mais non synchronisé`,
      error
    )
  }
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
    updateWorkout,
    deleteWorkout,
    sync
  }
}