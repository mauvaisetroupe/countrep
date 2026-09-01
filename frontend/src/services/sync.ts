import type { LocalWorkout } from '../db'
import { workoutRepository } from '../repositories/workoutRepository'
import { createWorkout, updateWorkout, deleteWorkout, getWorkouts } from '../api/workouts'

export async function syncWorkout(
  workout: LocalWorkout
): Promise<void> {

  const apiWorkout = {
    id: workout.id,
    exercise: workout.exercise,
    date: workout.date,
    reps: workout.reps,
    mode: workout.mode,
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
    deletedAt: workout.deletedAt ?? null
  }

  await createWorkout(apiWorkout)

  await workoutRepository.update(workout.id, {
    syncStatus: 'synced'
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

    for (const workout of remoteWorkouts) {
      const localWorkout: LocalWorkout = {
        id: workout.id,
        exercise: workout.exercise,
        date: workout.date,
        reps: workout.reps,
        mode: workout.mode,
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt,
        deletedAt: workout.deletedAt,
        syncStatus: 'synced',
        syncOperation: 'none'
      }
      await workoutRepository.saveSynced(localWorkout)
    }
  } catch (error) {
    console.warn("Impossible de récupérer les workouts du serveur (mode hors-ligne)", error)
  }
}

export async function syncUpdatedWorkout(
  workout: LocalWorkout
): Promise<void> {

  await updateWorkout(workout.id, {
    id: workout.id,
    exercise: workout.exercise,
    date: workout.date,
    reps: workout.reps,
    mode: workout.mode,
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
    deletedAt: workout.deletedAt ?? null
  })

  await workoutRepository.update(workout.id, {
    syncStatus: 'synced'
  })
}

export async function syncDeletedWorkout(
  workout: LocalWorkout
): Promise<void> {

  await deleteWorkout(workout.id)

  await workoutRepository.remove(workout.id)
}