import { ref } from 'vue'
import type { Workout, WorkoutInput } from '../api/workouts'
import type { LocalWorkout } from '../db'
import { catalogExercise } from '../catalog'
import { workoutRepository } from '../repositories/workoutRepository'
import { onLocalDataChanged, syncWorkouts } from '../services/dataSync'

// Modèles de séance, locaux (ADR 0014), partagés par tous les écrans.
// Les noms et unités des exercices viennent du catalogue embarqué.

const workouts = ref<Workout[]>([])
const loaded = ref(false)

const toWorkout = (workout: LocalWorkout): Workout => ({
  id: workout.id,
  name: workout.name,
  rounds: workout.rounds,
  createdAt: workout.createdAt,
  updatedAt: workout.updatedAt,
  exercises: workout.exercises.map(({ exerciseId, reps }) => {
    const exercise = catalogExercise(exerciseId)
    return {
      exerciseId,
      nameFr: exercise?.nameFr ?? exerciseId,
      nameEn: exercise?.nameEn ?? exerciseId,
      unit: exercise?.unit ?? 'reps',
      reps
    }
  })
})

const load = async () => {
  const local = await workoutRepository.getAll()
  workouts.value = local
    .map(toWorkout)
    .sort((a, b) => a.name.localeCompare(b.name))
  loaded.value = true
}

// Après une synchro, les écrans affichent la version à jour
onLocalDataChanged(load)

// Écriture locale immédiate, puis envoi au serveur si connecté
const pushInBackground = () => {
  syncWorkouts().then(load).catch(error => {
    console.warn('Modèles de séance non synchronisés', error)
  })
}

export function useWorkouts() {
  const save = async (id: string | null, input: WorkoutInput): Promise<string> => {
    const workoutId = id ?? crypto.randomUUID()
    await workoutRepository.save(workoutId, {
      name: input.name.trim(),
      rounds: input.rounds,
      exercises: input.exercises
    })
    await load()
    pushInBackground()
    return workoutId
  }

  const remove = async (id: string) => {
    await workoutRepository.remove(id)
    await load()
    pushInBackground()
  }

  return { workouts, loaded, load, save, remove }
}
