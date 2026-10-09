import { db, type LocalWorkout } from '../db'

export const workoutRepository = {

  async getAll(): Promise<LocalWorkout[]> {
    return db.workouts.toArray()
  },

  async getById(id: string): Promise<LocalWorkout | undefined> {
    return db.workouts.get(id)
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
  },

  // Marque le workout comme synchronisé, sauf s'il a été modifié
  // localement pendant l'appel réseau (il reste alors pending).
  async markSynced(workout: LocalWorkout): Promise<void> {
    await db.transaction('rw', db.workouts, async () => {
      const current = await db.workouts.get(workout.id)

      if (!current || current.updatedAt !== workout.updatedAt) {
        return
      }

      await db.workouts.update(workout.id, {
        syncStatus: 'synced',
        syncOperation: 'none'
      })
    })
  },

  async saveSynced(workout: LocalWorkout): Promise<void> {
    await db.workouts.put(workout)
  },

  async remove(id: string): Promise<void> {
    await db.workouts.delete(id)
  },

  async clearAll(): Promise<void> {
    await db.transaction('rw', db.workouts, db.syncState, async () => {
      await db.workouts.clear()
      await db.syncState.clear()
    })
  }  

}
