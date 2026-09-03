import { useAuthStore } from '../stores/auth'

export interface ApiExercise {
  id: string
  nameEn: string
  nameFr: string
  liftmanualUrl: string | null
}

export interface UserExercise extends ApiExercise {
  position: number
}

const API_URL = import.meta.env.VITE_API_URL || ''

function getHeaders() {
  const authStore = useAuthStore()

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authStore.token}`
  }
}

// ============================================================
// CATALOG
// ============================================================

export async function getExercises(): Promise<ApiExercise[]> {
  const response = await fetch(`${API_URL}/api/exercises`, {
    headers: getHeaders()
  })

  if (!response.ok) {
    throw new Error(`Failed to load exercises: ${response.status}`)
  }

  return response.json()
}

// ============================================================
// USER EXERCISES
// ============================================================

export async function getUserExercises(): Promise<UserExercise[]> {
  const response = await fetch(`${API_URL}/api/user/exercises`, {
    headers: getHeaders()
  })

  if (!response.ok) {
    throw new Error(`Failed to load user exercises: ${response.status}`)
  }

  return response.json()
}

// ============================================================
// UPDATE USER EXERCISES
// ============================================================

export async function updateUserExercises(
  exerciseIds: string[]
): Promise<UserExercise[]> {
  const response = await fetch(`${API_URL}/api/user/exercises`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      exerciseIds
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)

    throw new Error(
      error?.error || `Failed to update user exercises: ${response.status}`
    )
  }

  return response.json()
}