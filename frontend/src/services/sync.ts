import { db, type LocalWorkout } from '../db'
import { createWorkout } from '../api/workouts'
import { useCurrentUser } from '../composables/useCurrentUser'

export async function syncWorkout(
  workout: LocalWorkout
): Promise<void> {

  const { userId } = useCurrentUser()

  if (!userId.value) {
    return
  }

  const apiWorkout = {
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