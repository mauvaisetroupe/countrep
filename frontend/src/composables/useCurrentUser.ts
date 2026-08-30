import { ref } from 'vue'

const STORAGE_KEY = 'countrep.userId'

const userId = ref<string | null>(
  localStorage.getItem(STORAGE_KEY)
)

export function useCurrentUser() {

  const setUserId = (id: string) => {
    userId.value = id
    localStorage.setItem(STORAGE_KEY, id)
  }

  const clearUserId = () => {
    userId.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    userId,
    setUserId,
    clearUserId
  }
}
