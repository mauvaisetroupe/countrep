import { db, type LocalWorkout } from '../db'
import { createWorkout, getWorkouts } from '../api/workouts'

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

  await db.workouts.update(workout.id, {
    syncStatus: 'synced'
  })
}

export async function syncPendingWorkouts(): Promise<void> {
  const pendingWorkouts = await db.workouts
    .where('syncStatus')
    .equals('pending')
    .toArray()

  for (const workout of pendingWorkouts) {
    try {
      await syncWorkout(workout)
    } catch (error) {
      console.warn(
        `Impossible de synchroniser le workout ${workout.id} (hors-ligne ou erreur)`,
        error
      )
    }
  }
}

export async function syncWorkoutsFromServer(): Promise<void> {
  try {
    const remoteWorkouts = await getWorkouts()

    for (const workout of remoteWorkouts) {
      await db.workouts.put({
        id: workout.id,
        exercise: workout.exercise,
        date: workout.date,
        reps: workout.reps,
        mode: workout.mode,
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt,
        deletedAt: workout.deletedAt,
        syncStatus: 'synced'
      })
    }
  } catch (error) {
    console.warn("Impossible de récupérer les workouts du serveur (mode hors-ligne)", error)
  }
}