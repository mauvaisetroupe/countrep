import Dexie, { type Table } from 'dexie'

export interface Workout {
  id: string
  exercise: string
  date: string
  reps: number
  mode: string
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
}

export interface SyncState {
  id: string
  lastSync: number
}

export class WorkoutDatabase extends Dexie {
  workouts!: Table<Workout, string>
  syncState!: Table<SyncState, string>

  constructor() {
    super('WorkoutDatabase')
    this.version(1).stores({
      workouts: 'id, exercise, date, createdAt, updatedAt', 
      syncState: 'id'
    })
  }
}

export const db = new WorkoutDatabase()