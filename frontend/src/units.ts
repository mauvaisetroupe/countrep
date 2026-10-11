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
