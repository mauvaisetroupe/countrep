import type { LocalSet } from '../db'
import { setRepository } from '../repositories/setRepository'
import {
  ApiError,
  createSet,
  updateSet,
  deleteSet,
  getSets,
  type ApiSet
} from '../api/sets'

function toApiSet(set: LocalSet): ApiSet {
  return {
    id: set.id,
    exercise: set.exercise,
    date: set.date,
    time: set.time,
    reps: set.reps,
    sessionId: set.sessionId ?? null,
    createdAt: set.createdAt,
    updatedAt: set.updatedAt,
    deletedAt: set.deletedAt ?? null
  }
}

// Le POST est idempotent côté serveur (upsert sur l'id) :
// on peut le rejouer sans risque après une réponse perdue.
export async function syncSet(
  set: LocalSet
): Promise<void> {

  await createSet(toApiSet(set))

  await setRepository.markSynced(set)
}

// Synchronise un set selon l'opération en attente
export async function syncOne(
  set: LocalSet
): Promise<void> {

  if (set.syncOperation === 'create') {
    await syncSet(set)
  }

  if (set.syncOperation === 'update') {
    await syncUpdatedSet(set)
  }

  if (set.syncOperation === 'delete') {
    await syncDeletedSet(set)
  }
}

export async function syncPendingSets(): Promise<void> {
  const pendingSets = await setRepository.getPending()

  for (const set of pendingSets) {
    try {
      await syncOne(set)
    } catch (error) {
      console.warn(
        `Impossible de synchroniser le set ${set.id}`,
        error
      )
    }
  }
}

export async function syncSetsFromServer(): Promise<void> {
  try {
    const remoteSets = await getSets()

    // IDs actuellement présents sur le serveur
    const remoteIds = new Set(
      remoteSets.map(set => set.id)
    )

    // Sets présents localement avant la synchronisation
    const localSets = await setRepository.getAll()

    // ------------------------------------------------------------
    // Serveur → local
    // ------------------------------------------------------------

    for (const set of remoteSets) {

      const localSet = localSets.find(
        local => local.id === set.id
      )

      // Ne jamais écraser une modification locale en attente
      if (localSet?.syncStatus === 'pending') {
        continue
      }

      const localSyncedSet: LocalSet = {
        id: set.id,
        exercise: set.exercise,
        date: set.date,
        time: set.time,
        reps: set.reps,
        sessionId: set.sessionId,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        deletedAt: set.deletedAt,
        syncStatus: 'synced',
        syncOperation: 'none'
      }

      await setRepository.saveSynced(localSyncedSet)
    }

    // ------------------------------------------------------------
    // Suppression locale des sets supprimés du serveur
    // ------------------------------------------------------------

    for (const localSet of localSets) {

      // Un set pending ne doit jamais être supprimé ici
      if (localSet.syncStatus !== 'synced') {
        continue
      }

      // Le set existe localement mais plus sur le serveur
      if (!remoteIds.has(localSet.id)) {
        await setRepository.remove(localSet.id)
      }
    }

  } catch (error) {
    console.warn(
      'Impossible de récupérer les sets du serveur (mode hors-ligne)',
      error
    )
  }
}

export async function syncUpdatedSet(
  set: LocalSet
): Promise<void> {

  try {
    await updateSet(set.id, toApiSet(set))
  } catch (error) {

    // Le set n'existe pas sur le serveur : il a été modifié
    // localement avant d'avoir été créé (ancien comportement).
    // On le crée avec son état actuel.
    if (error instanceof ApiError && error.status === 404) {
      await createSet(toApiSet(set))
    } else {
      throw error
    }
  }

  await setRepository.markSynced(set)
}

export async function syncDeletedSet(
  set: LocalSet
): Promise<void> {

  try {
    await deleteSet(set.id)
  } catch (error) {

    // Si le set n'existe déjà plus sur le serveur,
    // la suppression est considérée comme réussie.
    if (!(error instanceof ApiError && error.status === 404)) {
      throw error
    }
  }

  await setRepository.remove(set.id)
}
