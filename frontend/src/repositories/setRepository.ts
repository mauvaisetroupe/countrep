import { db, type LocalSet } from '../db'

export const setRepository = {

  async getAll(): Promise<LocalSet[]> {
    return db.sets.toArray()
  },

  async getById(id: string): Promise<LocalSet | undefined> {
    return db.sets.get(id)
  },

  async create(set: LocalSet): Promise<void> {
    await db.sets.add(set)
  },

  async update(
    id: string,
    changes: Partial<LocalSet>
  ): Promise<void> {
    await db.sets.update(id, changes)
  },

  async getPending(): Promise<LocalSet[]> {
    return db.sets
      .where('syncStatus')
      .equals('pending')
      .toArray()
  },

  // Marque le set comme synchronisé, sauf s'il a été modifié
  // localement pendant l'appel réseau (il reste alors pending).
  async markSynced(set: LocalSet): Promise<void> {
    await db.transaction('rw', db.sets, async () => {
      const current = await db.sets.get(set.id)

      if (!current || current.updatedAt !== set.updatedAt) {
        return
      }

      await db.sets.update(set.id, {
        syncStatus: 'synced',
        syncOperation: 'none'
      })
    })
  },

  async saveSynced(set: LocalSet): Promise<void> {
    await db.sets.put(set)
  },

  async remove(id: string): Promise<void> {
    await db.sets.delete(id)
  },

  async clearAll(): Promise<void> {
    await db.transaction('rw', [db.sets, db.syncState, db.previews, db.workouts, db.userExercises], async () => {
      await db.sets.clear()
      await db.syncState.clear()
      await db.previews.clear()
      await db.workouts.clear()
      await db.userExercises.clear()
    })
  }  

}
