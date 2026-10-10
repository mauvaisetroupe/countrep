import Dexie, { type Table } from 'dexie'

export interface LocalWorkout {
  id: string
  exercise: string
  date: string
  workoutTime: string
  reps: number
  mode: 'add' | 'set'
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  syncStatus: 'pending' | 'synced'
  syncOperation: 'none' | 'create' | 'update' | 'delete'
}

// Séance en cours, gardée en brouillon sur l'appareil jusqu'à ce qu'elle
// soit enregistrée (ses séries deviennent alors des workouts) ou abandonnée.
export interface PreviewEntry {
  id: string
  // Position de l'exercice dans la séance
  position: number
  reps: number
  workoutTime: string
  createdAt: number
}

export interface LocalPreview {
  id: string
  date: string
  startedAt: number
  updatedAt: number
  // Copie de la séance au démarrage : la modifier dans les réglages
  // ne casse pas la séance en cours
  routine: {
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

export class WorkoutDatabase extends Dexie {
  workouts!: Table<LocalWorkout, string>
  syncState!: Table<SyncState, string>
  previews!: Table<LocalPreview, string>

  constructor() {
    super('WorkoutDatabase')
    this.version(2).stores({
        workouts: 'id, exercise, date, createdAt, updatedAt, syncStatus, syncOperation',
        syncState: 'id'
    })
    this.version(3).stores({
        workouts: 'id, exercise, date, createdAt, updatedAt, syncStatus, syncOperation',
        syncState: 'id',
        previews: 'id'
    })
  }
}

export const db = new WorkoutDatabase()