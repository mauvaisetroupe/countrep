import Dexie, { type Table } from 'dexie'

export interface Workout {
  id?: number
  exercise: string
  date: string // Format "YYYY-MM-DD" pour faciliter le tri
  reps: number
  mode: string
  createdAt: number
}

export class WorkoutDatabase extends Dexie {
  workouts!: Table<Workout, number>

  constructor() {
    super('WorkoutDatabase')
    this.version(1).stores({
      workouts: '++id, exercise, date, createdAt' // Indexation pour la recherche rapide
    })
}
}

export const db = new WorkoutDatabase()