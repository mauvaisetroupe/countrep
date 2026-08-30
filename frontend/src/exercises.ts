export interface Exercise {
  name: string
  shortName: string
  icon: string
}

export const exercises: Exercise[] = [
  { name: 'Inverted row', shortName: 'Rowing', icon: '↓' },
  { name: 'Biceps curl', shortName: 'Curl', icon: '↓' },
  { name: 'Push-ups', shortName: 'PushUp', icon: '↑' },
  { name: 'Support Hold', shortName: 'Hold', icon: '⏺' },
]