export interface Exercise {
  name: string
  shortName: string
  icon: string
}

export const exercises: Exercise[] = [
  { name: 'high-bar-inverted-row', shortName: 'Rowing', icon: '↓' },
  { name: 'biceps-curl-band', shortName: 'Curl', icon: '↓' },
  { name: 'incline-push-up',  shortName: 'PushUp', icon: '↑' },
  { name: 'support-hold', shortName: 'Hold', icon: '⏺' },
]