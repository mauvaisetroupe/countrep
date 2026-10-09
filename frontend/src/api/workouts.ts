import { apiFetch } from './client'

export interface ApiWorkout {
  id: string
  userId?: string
  exercise: string
  date: string
  workoutTime: string
  reps: number
  mode: 'add' | 'set'
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`API error: ${status}`)
    this.status = status
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export async function createWorkout(
  workout: ApiWorkout
): Promise<ApiWorkout> {

  const response = await apiFetch('/api/workouts', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(workout)
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }

  return response.json()
}

export async function getWorkouts(): Promise<ApiWorkout[]> {
  const response = await apiFetch('/api/workouts', {
    headers: JSON_HEADERS
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }

  return response.json()
}

export async function updateWorkout(
  id: string,
  changes: Partial<ApiWorkout>
): Promise<ApiWorkout> {

  const response = await apiFetch(`/api/workouts/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(changes)
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