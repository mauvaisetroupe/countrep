import type { LocalWorkout } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import {
  createWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkouts
} from '../api/workouts'

export async function syncWorkout(
  workout: LocalWorkout
): Promise<void> {

  const apiWorkout = {
    id: workout.id,
    exercise: workout.exercise,
    date: workout.date,
    workoutTime: workout.workoutTime,
    reps: workout.reps,
    mode: workout.mode,
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
    deletedAt: workout.deletedAt ?? null
  }

  await createWorkout(apiWorkout)

  await workoutRepository.update(workout.id, {
    syncStatus: 'synced',
    syncOperation: 'none'
  })
}

export async function syncPendingWorkouts(): Promise<void> {
  const pendingWorkouts = await workoutRepository.getPending()

  for (const workout of pendingWorkouts) {
    try {

      if (workout.syncOperation === 'create') {
        await syncWorkout(workout)
      }

      if (workout.syncOperation === 'update') {
        await syncUpdatedWorkout(workout)
      }

      if (workout.syncOperation === 'delete') {
        await syncDeletedWorkout(workout)
      }

    } catch (error) {
      console.warn(
        `Impossible de synchroniser le workout ${workout.id}`,
        error
      )
    }
  }
}

export async function syncWorkoutsFromServer(): Promise<void> {
  try {
    const remoteWorkouts = await getWorkouts()

    // IDs actuellement présents sur le serveur
    const remoteIds = new Set(
      remoteWorkouts.map(workout => workout.id)
    )

    // Workouts présents localement avant la synchronisation
    const localWorkouts = await workoutRepository.getAll()

    // ------------------------------------------------------------
    // Serveur → local
    // ------------------------------------------------------------

    for (const workout of remoteWorkouts) {

      const localWorkout = localWorkouts.find(
        local => local.id === workout.id
      )

      // Ne jamais écraser une modification locale en attente
      if (localWorkout?.syncStatus === 'pending') {
        continue
      }

      const localSyncedWorkout: LocalWorkout = {
        id: workout.id,
        exercise: workout.exercise,
        date: workout.date,
        workoutTime: workout.workoutTime,
        reps: workout.reps,
        mode: workout.mode,
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt,
        deletedAt: workout.deletedAt,
        syncStatus: 'synced',
        syncOperation: 'none'
      }

      await workoutRepository.saveSynced(localSyncedWorkout)
    }

    // ------------------------------------------------------------
    // Suppression locale des workouts supprimés du serveur
    // ------------------------------------------------------------

    for (const localWorkout of localWorkouts) {

      // Un workout pending ne doit jamais être supprimé ici
      if (localWorkout.syncStatus !== 'synced') {
        continue
      }

      // Le workout existe localement mais plus sur le serveur
      if (!remoteIds.has(localWorkout.id)) {
        await workoutRepository.remove(localWorkout.id)
      }
    }

  } catch (error) {
    console.warn(
      'Impossible de récupérer les workouts du serveur (mode hors-ligne)',
      error
    )
  }
}

export async function syncUpdatedWorkout(
  workout: LocalWorkout
): Promise<void> {

  await updateWorkout(workout.id, {
    id: workout.id,
    exercise: workout.exercise,
    date: workout.date,
    workoutTime: workout.workoutTime,
    reps: workout.reps,
    mode: workout.mode,
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
    deletedAt: workout.deletedAt ?? null
  })

  await workoutRepository.update(workout.id, {
    syncStatus: 'synced',
    syncOperation: 'none'
  })
}

export async function syncDeletedWorkout(
  workout: LocalWorkout
): Promise<void> {

  try {
    await deleteWorkout(workout.id)
  } catch (error) {

    // Si le workout n'existe déjà plus sur le serveur,
    // la suppression est considérée comme réussie.
    if (
      error instanceof Error &&
      error.message === 'API error: 404'
    ) {
      await workoutRepository.remove(workout.id)
      return
    }

    throw error
  }

  await workoutRepository.remove(workout.id)
}