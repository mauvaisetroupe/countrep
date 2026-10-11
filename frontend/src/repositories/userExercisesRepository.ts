import { db } from '../db'

// Sélection d'exercices du mode Exercice, locale (ADR 0014)
export const userExercisesRepository = {

  async get(): Promise<string[]> {
    return (await db.userExercises.get('current'))?.exerciseIds ?? []
  },

  async getRecord() {
    return db.userExercises.get('current')
  },

  async save(exerciseIds: string[]): Promise<void> {
    await db.userExercises.put({
      id: 'current',
      exerciseIds,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    })
  },

  // Envoyée au serveur : synchronisée, sauf si modifiée entre-temps
  async markSynced(updatedAt: number): Promise<void> {
    await db.transaction('rw', db.userExercises, async () => {
      const current = await db.userExercises.get('current')
      if (current && current.updatedAt === updatedAt) {
        await db.userExercises.update('current', { syncStatus: 'synced' })
      }
    })
  },

  // Version du serveur, si la sélection locale n'a pas de modification
  // en attente (la dernière modification gagne)
  async replaceSynced(exerciseIds: string[]): Promise<void> {
    await db.transaction('rw', db.userExercises, async () => {
      const current = await db.userExercises.get('current')
      if (current?.syncStatus === 'pending') return

      await db.userExercises.put({
        id: 'current',
        exerciseIds,
        updatedAt: Date.now(),
        syncStatus: 'synced'
      })
    })
  }
}
