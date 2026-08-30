export interface ApiWorkout {
  id: string
  userId: string
  exercise: string
  date: string
  reps: number
  mode: string
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
}

const API_URL = 'http://localhost:3000'

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

export async function getWorkouts(): Promise<ApiWorkout[]> {

  const response = await fetch(`${API_URL}/api/workouts`)

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}