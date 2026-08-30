import { db, type LocalWorkout } from '../db'
import { createWorkout, getWorkouts, type ApiWorkout } from '../api/workouts'
import { useCurrentUser } from '../composables/useCurrentUser'

export async function syncWorkout(
  workout: LocalWorkout
): Promise<void> {

  const { userId } = useCurrentUser()

  if (!userId.value) {
    return
  }

  const apiWorkout: ApiWorkout = {
    id: workout.id,
    userId: userId.value,
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
        `Impossible de synchroniser le workout ${workout.id}`,
        error
      )
    }
  }
}

export async function syncWorkoutsFromServer(): Promise<void> {

  const { userId } = useCurrentUser()

  if (!userId.value) {
    return
  }

  const remoteWorkouts = await getWorkouts(userId.value)

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
}