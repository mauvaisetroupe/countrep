import { db, type LocalWorkout } from '../db'

export const workoutRepository = {

  async getAll(): Promise<LocalWorkout[]> {
    return db.workouts.toArray()
  },

  async create(workout: LocalWorkout): Promise<void> {
    await db.workouts.add(workout)
  },

  async update(
    id: string,
    changes: Partial<LocalWorkout>
  ): Promise<void> {
    await db.workouts.update(id, changes)
  },

  async getPending(): Promise<LocalWorkout[]> {
    return db.workouts
      .where('syncStatus')
      .equals('pending')
      .toArray()
  }

}
