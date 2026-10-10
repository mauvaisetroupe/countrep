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
  }

}
