import { ref, onMounted, onUnmounted } from 'vue'
import { type LocalWorkout } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import {
  syncPendingWorkouts,
  syncWorkoutsFromServer,
  syncOne
} from '../services/sync'
import { ensureFreshToken } from '../services/session'

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

  const existing = await workoutRepository.getById(id)

  if (!existing) {
    return
  }

  // Tant que le workout n'a jamais atteint le serveur,
  // l'opération en attente reste une création.
  const syncOperation =
    existing.syncOperation === 'create' ? 'create' : 'update'

  await workoutRepository.update(id, {
    ...changes,
    updatedAt: Date.now(),
    syncStatus: 'pending',
    syncOperation
  })

  await loadWorkouts()

  const workout = workouts.value.find(
    workout => workout.id === id
  )

  if (!workout) {
    return
  }

  try {
    await syncOne(workout)
    await loadWorkouts()
  } catch (error) {
    console.warn(
      `Workout ${id} modifié localement mais non synchronisé`,
      error
    )
  }
}

const deleteWorkout = async (id: string) => {

  const existing = await workoutRepository.getById(id)

  if (!existing) {
    return
  }

  // Jamais envoyé au serveur : rien à synchroniser
  if (existing.syncOperation === 'create') {
    await workoutRepository.remove(id)
    await loadWorkouts()
    return
  }

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
    await syncOne(workout)
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

      await ensureFreshToken()

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