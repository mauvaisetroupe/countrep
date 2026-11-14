// Unité d'un exercice (ADR 0008) : la valeur d'un set (champ reps) est un
// nombre de répétitions, ou un nombre de secondes pour un exercice tenu
// (gainage, maintien aux anneaux...).
export type ExerciseUnit = 'reps' | 'seconds'

// 45 s, 1 min, 1 min 30
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} s`

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return rest === 0
    ? `${minutes} min`
    : `${minutes} min ${String(rest).padStart(2, '0')}`
}

// Format court pour les petites cases (calendrier) : 45s, 2m, 2m30
export const formatDurationShort = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return rest === 0
    ? `${minutes}m`
    : `${minutes}m${String(rest).padStart(2, '0')}`
}

// « 12 reps » ou « 1 min 30 »
export const formatAmount = (value: number, unit: ExerciseUnit = 'reps'): string =>
  unit === 'seconds' ? formatDuration(value) : `${value} reps`

// Libellé à côté d'un champ de saisie
export const unitLabel = (unit: ExerciseUnit = 'reps'): string =>
  unit === 'seconds' ? 's' : 'reps'

// Totaux d'une liste de sets d'unités mélangées : « 120 reps · 2 min 30 »
export interface AmountTotals {
  reps: number
  seconds: number
}

export const formatTotals = ({ reps, seconds }: AmountTotals): string => {
  const parts: string[] = []
  if (reps > 0 || seconds === 0) parts.push(`${reps} reps`)
  if (seconds > 0) parts.push(formatDuration(seconds))
  return parts.join(' · ')
}

// Équivalence Garmin : une minute = 30 s d'effort + 30 s de repos, soit
// 15 répétitions ou 30 s tenues pour un exercice à la durée
const REPS_PER_MINUTE = 15
const SECONDS_PER_MINUTE = 30
const MINUTES_PER_BLOCK = 10
const BLOCK_REST_MINUTES = 2

// Minutes d'effort, sans arrondi
export const effortMinutes = ({ reps, seconds }: AmountTotals): number =>
  reps / REPS_PER_MINUTE + seconds / SECONDS_PER_MINUTE

// Durée d'entraînement d'une journée (résumé Garmin du journal, statistiques) :
// minutes d'effort arrondies à la minute supérieure, plus 2 min de repos par
// bloc de 10. Une période additionne les durées de ses jours.
export const trainingMinutes = (totals: AmountTotals): number => {
  if (totals.reps <= 0 && totals.seconds <= 0) return 0

  const minutes = Math.ceil(effortMinutes(totals))
  return minutes + Math.floor(minutes / MINUTES_PER_BLOCK) * BLOCK_REST_MINUTES
}

// 45 min, 1 h, 1 h 20 min
export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
