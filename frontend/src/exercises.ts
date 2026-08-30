export interface Exercise {
  name: string
  icon: string
}

export const exercises: Exercise[] = [
  { name: 'Inverted row', icon: '↓' },  // pull
  { name: 'Biceps curl', icon: '↓' },   // pull
  { name: 'Support Hold', icon: '⏺' },   // isometric
  { name: 'Push-ups', icon: '↑' },      // push
]