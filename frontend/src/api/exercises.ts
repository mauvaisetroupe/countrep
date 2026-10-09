import { apiFetch } from './client'

export interface ApiExercise {
  id: string
  nameEn: string
  nameFr: string
  liftmanualUrl: string | null
}

export interface UserExercise extends ApiExercise {
  position: number
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// ============================================================
// CATALOG
// ============================================================

export async function getExercises(): Promise<ApiExercise[]> {
  const response = await apiFetch('/api/exercises', {
    headers: JSON_HEADERS
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
  const response = await apiFetch('/api/user/exercises', {
    headers: JSON_HEADERS
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
  const response = await apiFetch('/api/user/exercises', {
    method: 'PUT',
    headers: JSON_HEADERS,
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