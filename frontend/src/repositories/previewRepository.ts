import { db, type LocalPreview, type LocalSet } from '../db'

export const previewRepository = {

  // Une seule séance en cours à la fois
  async getCurrent(): Promise<LocalPreview | undefined> {
    return db.previews.toCollection().first()
  },

  async count(): Promise<number> {
    return db.previews.count()
  },

  async save(preview: LocalPreview): Promise<void> {
    await db.previews.put(preview)
  },

  async remove(id: string): Promise<void> {
    await db.previews.delete(id)
  },

  // Enregistre la séance : ses séries deviennent des sets et le
  // brouillon disparaît, dans la même transaction (tout ou rien)
  async commit(previewId: string, sets: LocalSet[]): Promise<void> {
    await db.transaction('rw', db.sets, db.previews, async () => {
      await db.sets.bulkAdd(sets)
      await db.previews.delete(previewId)
    })
  },

  // Enregistre une séance rouverte depuis le journal (ADR 0011), dans une
  // seule transaction : les sets modifiés passent en attente de mise à
  // jour, les nouveaux en attente de création, ceux retirés de la séance
  // en attente de suppression. Mêmes règles que useSets pour un set
  // jamais envoyé au serveur (il reste une création, ou disparaît).
  async commitEdit(
    preview: LocalPreview,
    changed: { id: string, reps: number, time: string }[],
    created: LocalSet[],
    removedIds: string[]
  ): Promise<void> {
    await db.transaction('rw', db.sets, db.previews, async () => {
      const now = Date.now()

      for (const change of changed) {
        const existing = await db.sets.get(change.id)
        if (!existing || existing.deletedAt) continue
        // Inchangé : pas de mise à jour à synchroniser
        if (existing.reps === change.reps && existing.time.slice(0, 5) === change.time.slice(0, 5)) continue

        await db.sets.update(change.id, {
          reps: change.reps,
          time: change.time,
          updatedAt: now,
          syncStatus: 'pending',
          syncOperation: existing.syncOperation === 'create' ? 'create' : 'update'
        })
      }

      await db.sets.bulkAdd(created)

      for (const id of removedIds) {
        const existing = await db.sets.get(id)
        if (!existing) continue

        if (existing.syncOperation === 'create') {
          await db.sets.delete(id)
        } else {
          await db.sets.update(id, {
            deletedAt: now,
            updatedAt: now,
            syncStatus: 'pending',
            syncOperation: 'delete'
          })
        }
      }

      await db.previews.delete(preview.id)
    })
  }

}
