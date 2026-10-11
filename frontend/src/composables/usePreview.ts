import { computed, ref } from 'vue'
import type { LocalPreview, LocalSet, PreviewEntry } from '../db'
import type { ExerciseUnit } from '../units'
import { previewRepository } from '../repositories/previewRepository'

// Séance en cours (preview) : les séries saisies pendant la séance restent
// un brouillon local, modifiable, jusqu'à « Enregistrer » (elles deviennent
// des sets : journal, stats, synchro) ou « Abandonner ».
//
// Une série (tour) n'est pas stockée : la n-ième saisie d'un exercice
// appartient à la série n. Supprimer la série n retire la n-ième saisie
// de chaque exercice.

export interface NewEntry {
  position: number
  reps: number
  time: string
}

// État partagé par tous les écrans (accueil, aperçu)
const preview = ref<LocalPreview | null>(null)
const loaded = ref(false)

// Les objets réactifs de Vue ne passent pas tels quels dans IndexedDB
const plain = (value: LocalPreview): LocalPreview => JSON.parse(JSON.stringify(value))

const persist = async (next: LocalPreview) => {
  next.updatedAt = Date.now()
  await previewRepository.save(plain(next))
  preview.value = next
}

// Saisies de chaque exercice, dans l'ordre de saisie
const entriesByPosition = (value: LocalPreview): PreviewEntry[][] =>
  value.workout.exercises.map((_, position) =>
    value.entries
      .filter(entry => entry.position === position)
      .sort((a, b) => a.createdAt - b.createdAt)
  )

export function usePreview() {

  const load = async () => {
    preview.value = (await previewRepository.getCurrent()) ?? null
    loaded.value = true
  }

  // Nombre de séries faites pour chaque exercice
  const counts = computed<number[]>(() =>
    preview.value ? entriesByPosition(preview.value).map(entries => entries.length) : []
  )

  // Tableau séries × exercices : grid[série][position] = saisie ou null
  const grid = computed<(PreviewEntry | null)[][]>(() => {
    if (!preview.value) return []

    const byPosition = entriesByPosition(preview.value)
    const roundCount = Math.max(0, ...byPosition.map(entries => entries.length))

    return Array.from({ length: roundCount }, (_, round) =>
      byPosition.map(entries => entries[round] ?? null)
    )
  })

  // Démarre une séance vide (copie figée de la séance choisie)
  const start = async (workout: LocalPreview['workout'], date: string) => {
    if (preview.value) return

    const now = Date.now()

    await persist({
      id: crypto.randomUUID(),
      date,
      startedAt: now,
      updatedAt: now,
      workout: {
        id: workout.id,
        name: workout.name,
        rounds: workout.rounds,
        exercises: workout.exercises.map(exercise => ({
          exerciseId: exercise.exerciseId,
          nameFr: exercise.nameFr,
          nameEn: exercise.nameEn,
          reps: exercise.reps,
          unit: exercise.unit
        }))
      },
      entries: []
    })
  }

  // Ajoute des saisies à la séance en cours
  const addEntries = async (items: NewEntry[]) => {
    const current = preview.value
    if (!current) return

    const now = Date.now()

    // createdAt croissant même pour des saisies ajoutées d'un coup
    const entries = items.map((item, index) => ({
      id: crypto.randomUUID(),
      position: item.position,
      reps: item.reps,
      time: item.time,
      createdAt: now + index
    }))

    await persist({ ...current, entries: [...current.entries, ...entries] })
  }

  const updateReps = async (entryId: string, reps: number) => {
    if (!preview.value) return

    await persist({
      ...preview.value,
      entries: preview.value.entries.map(entry =>
        entry.id === entryId ? { ...entry, reps } : entry
      )
    })
  }

  const removeEntry = async (entryId: string) => {
    if (!preview.value) return

    await persist({
      ...preview.value,
      entries: preview.value.entries.filter(entry => entry.id !== entryId)
    })
  }

  const removeRound = async (round: number) => {
    const row = grid.value[round]
    if (!preview.value || !row) return

    const ids = new Set(row.filter(entry => entry !== null).map(entry => entry!.id))

    await persist({
      ...preview.value,
      entries: preview.value.entries.filter(entry => !ids.has(entry.id))
    })
  }

  const discard = async () => {
    if (!preview.value) return

    await previewRepository.remove(preview.value.id)
    preview.value = null
  }

  // Rouvre une séance enregistrée pour la modifier (ADR 0011) : ses sets
  // redeviennent un brouillon, avec le même écran que pour une nouvelle
  // séance. Les exercices sont repris dans l'ordre de leur première saisie,
  // le nombre de séries est celui de l'exercice le plus répété. Un même
  // exercice présent deux fois dans le modèle n'occupe ici qu'une colonne.
  const openForEdit = async (
    sessionSets: LocalSet[],
    name: string,
    catalog: { id: string, nameFr: string, nameEn?: string, unit?: ExerciseUnit }[]
  ): Promise<boolean> => {
    if (preview.value || sessionSets.length === 0) return false

    const ordered = sessionSets.slice().sort((a, b) => a.createdAt - b.createdAt)
    const exerciseIds = [...new Set(ordered.map(set => set.exercise))]
    const position = (exerciseId: string) => exerciseIds.indexOf(exerciseId)
    const count = (exerciseId: string) => ordered.filter(set => set.exercise === exerciseId).length
    const now = Date.now()

    await persist({
      id: ordered[0]!.sessionId!,
      date: ordered[0]!.date,
      startedAt: now,
      updatedAt: now,
      workout: {
        id: ordered[0]!.sessionId!,
        name,
        rounds: Math.max(...exerciseIds.map(count)),
        exercises: exerciseIds.map(exerciseId => {
          const exercise = catalog.find(item => item.id === exerciseId)
          return {
            exerciseId,
            nameFr: exercise?.nameFr ?? exerciseId,
            nameEn: exercise?.nameEn,
            unit: exercise?.unit,
            // Objectif : la valeur de la première série
            reps: ordered.find(set => set.exercise === exerciseId)!.reps
          }
        })
      },
      entries: ordered.map(set => ({
        id: crypto.randomUUID(),
        setId: set.id,
        position: position(set.exercise),
        reps: set.reps,
        time: set.time.slice(0, 5),
        createdAt: set.createdAt
      })),
      editing: { originalSetIds: ordered.map(set => set.id) }
    })

    return true
  }

  // Transforme les saisies en sets (en attente de synchro) et supprime
  // le brouillon. Les sets gardent l'id et le nom de la séance (ADR 0007,
  // 0011) pour pouvoir la retrouver et la modifier ensuite. La synchro
  // avec le serveur se fait ensuite, comme pour toute saisie.
  const commit = async (): Promise<LocalSet[]> => {
    if (!preview.value) return []

    const current = preview.value
    const newSet = (entry: PreviewEntry): LocalSet => ({
      id: crypto.randomUUID(),
      exercise: current.workout.exercises[entry.position]!.exerciseId,
      date: current.date,
      time: entry.time,
      reps: entry.reps,
      sessionId: current.id,
      sessionName: current.workout.name,
      createdAt: entry.createdAt,
      updatedAt: entry.createdAt,
      deletedAt: null,
      syncStatus: 'pending',
      syncOperation: 'create'
    })

    const entries = current.entries.slice().sort((a, b) => a.createdAt - b.createdAt)

    if (current.editing) {
      const kept = new Set(entries.filter(entry => entry.setId).map(entry => entry.setId!))
      const created = entries.filter(entry => !entry.setId).map(newSet)

      await previewRepository.commitEdit(
        plain(current),
        entries
          .filter(entry => entry.setId)
          .map(entry => ({ id: entry.setId!, reps: entry.reps, time: entry.time })),
        created,
        current.editing.originalSetIds.filter(id => !kept.has(id))
      )
      preview.value = null

      return created
    }

    const sets = entries.map(newSet)

    await previewRepository.commit(current.id, sets)
    preview.value = null

    return sets
  }

  return {
    preview,
    loaded,
    counts,
    grid,
    load,
    start,
    addEntries,
    updateReps,
    removeEntry,
    removeRound,
    discard,
    openForEdit,
    commit
  }
}
