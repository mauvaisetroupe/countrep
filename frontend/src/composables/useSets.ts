import { ref, onMounted, onUnmounted } from 'vue'
import { type LocalSet } from '../db'
import { setRepository } from '../repositories/setRepository'
import {
  syncPendingSets,
  syncSetsFromServer,
  syncOne
} from '../services/sync'
import { ensureFreshToken } from '../services/session'

export function useSets() {

  const sets = ref<LocalSet[]>([])
  const loading = ref(false)

  // ============================================================
  // CHARGER DEPUIS INDEXEDDB
  // ============================================================

  const loadSets = async () => {
    sets.value = await setRepository.getAll()
  }

  // ============================================================
  // CRÉER UN WORKOUT
  // ============================================================

  const createSet = async (
    set: LocalSet
  ): Promise<void> => {

    await setRepository.create(set)

    sets.value.push(set)
  }

const updateSet = async (
  id: string,
  changes: Partial<LocalSet>
): Promise<void> => {

  const existing = await setRepository.getById(id)

  if (!existing) {
    return
  }

  // Tant que le set n'a jamais atteint le serveur,
  // l'opération en attente reste une création.
  const syncOperation =
    existing.syncOperation === 'create' ? 'create' : 'update'

  await setRepository.update(id, {
    ...changes,
    updatedAt: Date.now(),
    syncStatus: 'pending',
    syncOperation
  })

  await loadSets()

  const set = sets.value.find(
    set => set.id === id
  )

  if (!set) {
    return
  }

  try {
    await syncOne(set)
    await loadSets()
  } catch (error) {
    console.warn(
      `Set ${id} modifié localement mais non synchronisé`,
      error
    )
  }
}

const deleteSet = async (id: string) => {

  const existing = await setRepository.getById(id)

  if (!existing) {
    return
  }

  // Jamais envoyé au serveur : rien à synchroniser
  if (existing.syncOperation === 'create') {
    await setRepository.remove(id)
    await loadSets()
    return
  }

  const now = Date.now()

  await setRepository.update(id, {
    deletedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
    syncOperation: 'delete'
  })

  await loadSets()

  const set = sets.value.find(
    set => set.id === id
  )

  if (!set) {
    return
  }

  try {
    await syncOne(set)
    await loadSets()
  } catch (error) {
    console.warn(
      `Set ${id} supprimé localement mais non synchronisé`,
      error
    )
  }
}

  // ============================================================
  // SYNCHRONISATION COMPLÈTE
  // ============================================================

  const sync = async () => {

    if (loading.value) {
      return
    }

    loading.value = true

    try {
      // Toujours commencer par les données locales
      await loadSets()

      await ensureFreshToken()

      // Envoyer les sets locaux non synchronisés
      await syncPendingSets()

      // Récupérer les sets du serveur
      await syncSetsFromServer()

      // Recharger IndexedDB après synchronisation
      await loadSets()

    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // RETOUR DU RÉSEAU
  // ============================================================

  const handleOnline = async () => {
    console.log('🌐 Réseau disponible → synchronisation')
    await sync()
  }

  // ============================================================
  // INITIALISATION
  // ============================================================

  onMounted(async () => {
    await sync()
    window.addEventListener('online', handleOnline)
  })

  // ============================================================
  // NETTOYAGE
  // ============================================================

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
  })

  return {
    sets,
    loading,
    loadSets,
    createSet,
    updateSet,
    deleteSet,
    sync
  }
}