import Dexie, { type Table } from 'dexie'

export interface LocalSet {
  id: string
  exercise: string
  date: string
  time: string
  reps: number
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  syncStatus: 'pending' | 'synced'
  syncOperation: 'none' | 'create' | 'update' | 'delete'
}

// Séance en cours, gardée en brouillon sur l'appareil jusqu'à ce qu'elle
// soit enregistrée (ses séries deviennent alors des sets) ou abandonnée.
export interface PreviewEntry {
  id: string
  // Position de l'exercice dans la séance
  position: number
  reps: number
  time: string
  createdAt: number
}

export interface LocalPreview {
  id: string
  date: string
  startedAt: number
  updatedAt: number
  // Copie de la séance au démarrage : la modifier dans les réglages
  // ne casse pas la séance en cours
  workout: {
    id: string
    name: string
    rounds: number
    exercises: { exerciseId: string, nameFr: string, reps: number }[]
  }
  entries: PreviewEntry[]
}

export interface SyncState {
  id: string
  lastSync: number
}

// Base IndexedDB de l'application. Son nom (« WorkoutDatabase ») date
// d'avant le renommage de l'ADR 0006 : le changer créerait une base vide.
export class CountRepDatabase extends Dexie {
  sets!: Table<LocalSet, string>
  syncState!: Table<SyncState, string>
  previews!: Table<LocalPreview, string>

  constructor() {
    super('WorkoutDatabase')

    // Versions historiques : les sets s'appelaient alors « workouts »
    this.version(2).stores({
      workouts: 'id, exercise, date, createdAt, updatedAt, syncStatus, syncOperation',
      syncState: 'id'
    })
    this.version(3).stores({
      workouts: 'id, exercise, date, createdAt, updatedAt, syncStatus, syncOperation',
      syncState: 'id',
      previews: 'id'
    })

    // ADR 0006 : workouts -> sets (workoutTime -> time, plus de champ mode),
    // et dans une séance en cours : routine -> workout, workoutTime -> time.
    // Dexie ne sait pas renommer une table : on copie, puis on supprime (v5).
    this.version(4).stores({
      sets: 'id, exercise, date, createdAt, updatedAt, syncStatus, syncOperation'
    }).upgrade(async tx => {
      const legacySets = await tx.table('workouts').toArray()

      await tx.table('sets').bulkAdd(
        legacySets.map(({ workoutTime, mode: _mode, ...rest }) => ({
          ...rest,
          time: workoutTime
        }))
      )

      await tx.table('previews').toCollection().modify((preview: any) => {
        if (preview.routine) {
          preview.workout = preview.routine
          delete preview.routine
        }
        for (const entry of preview.entries ?? []) {
          if ('workoutTime' in entry) {
            entry.time = entry.workoutTime
            delete entry.workoutTime
          }
        }
      })
    })
    this.version(5).stores({
      workouts: null
    })
  }
}

export const db = new CountRepDatabase()
