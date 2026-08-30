export interface Exercise {
  name: string
  icon: string
}

export const exercises: Exercise[] = [
  { name: 'Inverted row', icon: '↓' },  // pull
  { name: 'Push-ups', icon: '↑' },      // push
  { name: 'Biceps curl', icon: '↓' },   // pull
  { name: 'Support Hold', icon: '⏺' }    // isometric
]