import { apiFetch } from './client'
import { ApiError } from './sets'
import type { ExerciseUnit } from '../units'

export interface WorkoutExercise {
  exerciseId: string
  nameEn: string
  nameFr: string
  unit: ExerciseUnit
  // Répétitions, ou secondes pour un exercice à la durée
  reps: number
}

export interface Workout {
  id: string
  name: string
  rounds: number
  createdAt: number
  updatedAt: number
  exercises: WorkoutExercise[]
}

export interface WorkoutInput {
  name: string
  rounds: number
  exercises: { exerciseId: string, reps: number }[]
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function errorFrom(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null)
  return new Error(body?.error || `${fallback}: ${response.status}`)
}

export async function getWorkouts(): Promise<Workout[]> {
  const response = await apiFetch('/api/workouts')

  if (!response.ok) {
    throw await errorFrom(response, 'Failed to load workouts')
  }

  return response.json()
}

// Crée ou remplace le modèle d'id donné (upsert idempotent, ADR 0014)
export async function putWorkout(
  id: string,
  input: WorkoutInput
): Promise<Workout> {
  const response = await apiFetch(`/api/workouts/${id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }

  return response.json()
}

export async function deleteWorkout(id: string): Promise<void> {
  const response = await apiFetch(`/api/workouts/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }
}
