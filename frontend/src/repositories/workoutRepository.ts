import { db, type LocalWorkout } from '../db'

type WorkoutContent = Pick<LocalWorkout, 'name' | 'rounds' | 'exercises'>

// Modèles de séance locaux (ADR 0014). Toute écriture locale passe le
// modèle en attente ; la synchro l'envoie par PUT (upsert) ou DELETE.
export const workoutRepository = {

  async getAll(): Promise<LocalWorkout[]> {
    return (await db.workouts.toArray()).filter(workout => !workout.deletedAt)
  },

  async getById(id: string): Promise<LocalWorkout | undefined> {
    const workout = await db.workouts.get(id)
    return workout && !workout.deletedAt ? workout : undefined
  },

  async save(id: string, content: WorkoutContent): Promise<void> {
    const now = Date.now()
    const existing = await db.workouts.get(id)

    await db.workouts.put({
      id,
      ...content,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: 'pending',
      syncOperation: 'upsert'
    })
  },

  // Suppression douce jusqu'à la confirmation du serveur
  async remove(id: string): Promise<void> {
    const now = Date.now()
    await db.workouts.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      syncOperation: 'delete'
    })
  },

  async getPending(): Promise<LocalWorkout[]> {
    return db.workouts.where('syncStatus').equals('pending').toArray()
  },

  // Marque l'envoi comme fait, sauf si le modèle a changé entre-temps
  async markSynced(workout: LocalWorkout): Promise<void> {
    await db.transaction('rw', db.workouts, async () => {
      const current = await db.workouts.get(workout.id)
      if (!current || current.updatedAt !== workout.updatedAt) return

      if (current.syncOperation === 'delete') {
        await db.workouts.delete(workout.id)
      } else {
        await db.workouts.update(workout.id, { syncStatus: 'synced', syncOperation: 'none' })
      }
    })
  },

  // Version du serveur : remplace les modèles synchronisés, ne touche pas
  // aux modèles en attente, retire les synchronisés absents du serveur
  async replaceSynced(remote: (WorkoutContent & { id: string, createdAt: number, updatedAt: number })[]): Promise<void> {
    await db.transaction('rw', db.workouts, async () => {
      const local = await db.workouts.toArray()
      const pending = new Set(local.filter(w => w.syncStatus === 'pending').map(w => w.id))
      const remoteIds = new Set(remote.map(w => w.id))

      for (const workout of remote) {
        if (pending.has(workout.id)) continue
        await db.workouts.put({
          ...workout,
          deletedAt: null,
          syncStatus: 'synced',
          syncOperation: 'none'
        })
      }

      for (const workout of local) {
        if (workout.syncStatus === 'synced' && !remoteIds.has(workout.id)) {
          await db.workouts.delete(workout.id)
        }
      }
    })
  }
}
