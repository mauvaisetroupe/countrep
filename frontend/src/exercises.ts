export interface Exercise {
  name: string
  icon: string
}

export const exercises: Exercise[] = [
  { name: 'Inverted row', icon: '↓' },  // pull
  { name: 'Biceps curl', icon: '↓' },   // pull
  { name: 'Push-ups', icon: '↑' },      // push
  { name: 'Support Hold', icon: '⏺' },   // isometric
]