import Dexie, { type Table } from 'dexie'

export interface LocalWorkout {
  id: string
  exercise: string
  date: string
  reps: number
  mode: string
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  syncStatus: 'pending' | 'synced'
}

export interface SyncState {
  id: string
  lastSync: number
}

export class WorkoutDatabase extends Dexie {
  workouts!: Table<LocalWorkout, string>
  syncState!: Table<SyncState, string>

  constructor() {
    super('WorkoutDatabase')
    this.version(1).stores({
        workouts: 'id, exercise, date, createdAt, updatedAt, syncStatus',
        syncState: 'id'
    })
  }
}

export const db = new WorkoutDatabase()