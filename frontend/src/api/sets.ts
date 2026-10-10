import { apiFetch } from './client'

export interface ApiSet {
  id: string
  userId?: string
  exercise: string
  date: string
  time: string
  reps: number
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

export async function createSet(
  set: ApiSet
): Promise<ApiSet> {

  const response = await apiFetch('/api/sets', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(set)
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }

  return response.json()
}

export async function getSets(): Promise<ApiSet[]> {
  const response = await apiFetch('/api/sets', {
    headers: JSON_HEADERS
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }

  return response.json()
}

export async function updateSet(
  id: string,
  changes: Partial<ApiSet>
): Promise<ApiSet> {

  const response = await apiFetch(`/api/sets/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(changes)
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }

  return response.json()
}

export async function deleteSet(id: string): Promise<void> {
  const response = await apiFetch(`/api/sets/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    throw new ApiError(response.status)
  }
}