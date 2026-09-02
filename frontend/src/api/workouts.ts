import { useAuthStore } from '../stores/auth'

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

const API_URL = import.meta.env.VITE_API_URL || ''

function getHeaders() {
  const authStore = useAuthStore()
  return {
    'Content-Type': 'application/json',
    ...(authStore.token ? { 'Authorization': `Bearer ${authStore.token}` } : {})
  }
}

export async function createWorkout(
  workout: ApiWorkout
): Promise<ApiWorkout> {

  const response = await fetch(`${API_URL}/api/workouts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(workout)
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function getWorkouts(): Promise<ApiWorkout[]> {
  const response = await fetch(`${API_URL}/api/workouts`, {
    headers: getHeaders()
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function updateWorkout(
  id: string,
  changes: Partial<ApiWorkout>
): Promise<ApiWorkout> {

  const response = await fetch(`${API_URL}/api/workouts/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(changes)
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function deleteWorkout(id: string): Promise<void> {
  const authStore = useAuthStore()

  const response = await fetch(`${API_URL}/api/workouts/${id}`, {
    method: 'DELETE',
    headers: {
      ...(authStore.token
        ? { 'Authorization': `Bearer ${authStore.token}` }
        : {})
    }
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
}