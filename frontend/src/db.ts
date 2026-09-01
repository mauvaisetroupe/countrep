import Dexie, { type Table } from 'dexie'

export interface LocalWorkout {
  id: string
  exercise: string
  date: string
  reps: number
  mode: 'add' | 'set'
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  syncStatus: 'pending' | 'synced'
  syncOperation: 'none' | 'create' | 'update' | 'delete'
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
    this.version(2).stores({
        workouts: 'id, exercise, date, createdAt, updatedAt, syncStatus, syncOperation',
        syncState: 'id'
    })
  }
}

export const db = new WorkoutDatabase()