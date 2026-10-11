import { useAuthStore } from '../stores/auth'
import { ApiError } from '../api/sets'
import { deleteWorkout, getWorkouts, putWorkout } from '../api/workouts'
import { getUserExercises, updateUserExercises } from '../api/exercises'
import { workoutRepository } from '../repositories/workoutRepository'
import { userExercisesRepository } from '../repositories/userExercisesRepository'

// Synchronisation des modèles de séance et de la sélection d'exercices
// (ADR 0014), sur le modèle de celle des sets (services/sync.ts).

// Aucun appel réseau sans session valide : l'application fonctionne
// alors en local (ADR 0013, 0014)
export const canSync = () => useAuthStore().isAuthenticated

// Écrans à rafraîchir après une synchro (composables à état partagé)
const listeners = new Set<() => void>()

export const onLocalDataChanged = (listener: () => void) => {
  listeners.add(listener)
}

export const notifyLocalDataChanged = () => {
  listeners.forEach(listener => listener())
}

export async function syncWorkouts(): Promise<void> {
  if (!canSync()) return

  for (const workout of await workoutRepository.getPending()) {
    try {
      if (workout.syncOperation === 'delete') {
        try {
          await deleteWorkout(workout.id)
        } catch (error) {
          // Déjà absent du serveur : la suppression est acquise
          if (!(error instanceof ApiError && error.status === 404)) throw error
        }
      } else {
        await putWorkout(workout.id, {
          name: workout.name,
          rounds: workout.rounds,
          exercises: workout.exercises
        })
      }
      await workoutRepository.markSynced(workout)
    } catch (error) {
      console.warn(`Modèle ${workout.id} non synchronisé`, error)
    }
  }

  try {
    const remote = await getWorkouts()
    await workoutRepository.replaceSynced(remote.map(workout => ({
      id: workout.id,
      name: workout.name,
      rounds: workout.rounds,
      exercises: workout.exercises.map(({ exerciseId, reps }) => ({ exerciseId, reps })),
      createdAt: workout.createdAt,
      updatedAt: workout.updatedAt
    })))
  } catch (error) {
    console.warn('Modèles de séance non récupérés (hors ligne ?)', error)
  }
}

export async function syncUserExercises(): Promise<void> {
  if (!canSync()) return

  try {
    const local = await userExercisesRepository.getRecord()

    if (local?.syncStatus === 'pending') {
      await updateUserExercises(local.exerciseIds)
      await userExercisesRepository.markSynced(local.updatedAt)
    } else {
      const remote = await getUserExercises()
      await userExercisesRepository.replaceSynced(
        remote.sort((a, b) => a.position - b.position).map(exercise => exercise.id)
      )
    }
  } catch (error) {
    console.warn('Sélection d\'exercices non synchronisée (hors ligne ?)', error)
  }
}

// Tout ce qui n'est pas des sets, puis rafraîchissement des écrans
export async function syncLocalData(): Promise<void> {
  if (!canSync()) return

  await Promise.all([syncWorkouts(), syncUserExercises()])
  notifyLocalDataChanged()
}
