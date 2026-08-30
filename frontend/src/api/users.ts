export interface ApiUser {
  id: string
  name: string
  createdAt: number
}

const API_URL = import.meta.env.VITE_API_URL

export async function createUser(name: string): Promise<ApiUser> {
  const user = {
    id: crypto.randomUUID(),
    name
  }

  const response = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(user)
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

export async function findUserByName(
  name: string
): Promise<ApiUser | null> {

  const response = await fetch(
    `${API_URL}/api/users/by-name/${encodeURIComponent(name)}`
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}
