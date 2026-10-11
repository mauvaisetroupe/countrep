import { computed, ref } from 'vue'
import type { UserExercise } from '../api/exercises'
import { catalogExercise } from '../catalog'
import { userExercisesRepository } from '../repositories/userExercisesRepository'
import { onLocalDataChanged, syncUserExercises } from '../services/dataSync'

// Sélection d'exercices du mode Exercice, locale (ADR 0014), partagée
// par tous les écrans. Les exercices viennent du catalogue embarqué.

const exerciseIds = ref<string[]>([])
const loaded = ref(false)

const load = async () => {
  exerciseIds.value = await userExercisesRepository.get()
  loaded.value = true
}

onLocalDataChanged(load)

export function useUserExercises() {
  // Même forme que l'ancienne réponse de l'API (position = ordre choisi)
  const userExercises = computed<UserExercise[]>(() =>
    exerciseIds.value.flatMap((id, position) => {
      const exercise = catalogExercise(id)
      return exercise ? [{ ...exercise, position }] : []
    })
  )

  const save = async (ids: string[]) => {
    await userExercisesRepository.save(ids)
    await load()
    syncUserExercises().then(load).catch(error => {
      console.warn('Sélection d\'exercices non synchronisée', error)
    })
  }

  return { exerciseIds, userExercises, loaded, load, save }
}
