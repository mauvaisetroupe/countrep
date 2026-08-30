export interface ApiWorkout {
  id: string
  userId: string
  exercise: string
  date: string
  reps: number
  mode: 'add' | 'set'
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

const API_URL = import.meta.env.VITE_API_URL || ''

export async function createWorkout(
  workout: ApiWorkout
): Promise<ApiWorkout> {

  const response = await fetch(`${API_URL}/api/workouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workout)
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function getWorkouts(
  userId: string
): Promise<ApiWorkout[]> {

  const response = await fetch(
    `${API_URL}/api/workouts?userId=${encodeURIComponent(userId)}`
  )

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}