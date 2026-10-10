import { apiFetch } from './client'

export interface RoutineExercise {
  exerciseId: string
  nameEn: string
  nameFr: string
  reps: number
}

export interface Routine {
  id: string
  name: string
  rounds: number
  createdAt: number
  updatedAt: number
  exercises: RoutineExercise[]
}

export interface RoutineInput {
  name: string
  rounds: number
  exercises: { exerciseId: string, reps: number }[]
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function errorFrom(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null)
  return new Error(body?.error || `${fallback}: ${response.status}`)
}

export async function getRoutines(): Promise<Routine[]> {
  const response = await apiFetch('/api/routines')

  if (!response.ok) {
    throw await errorFrom(response, 'Failed to load routines')
  }

  return response.json()
}

export async function createRoutine(input: RoutineInput): Promise<Routine> {
  const response = await apiFetch('/api/routines', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw await errorFrom(response, 'Failed to create routine')
  }

  return response.json()
}

export async function updateRoutine(
  id: string,
  input: RoutineInput
): Promise<Routine> {
  const response = await apiFetch(`/api/routines/${id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw await errorFrom(response, 'Failed to update routine')
  }

  return response.json()
}

export async function deleteRoutine(id: string): Promise<void> {
  const response = await apiFetch(`/api/routines/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw await errorFrom(response, 'Failed to delete routine')
  }
}
