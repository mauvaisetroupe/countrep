// Réglages communs des listes réordonnables (SortableJS, via
// vue-draggable-plus) : <VueDraggable v-model="liste" v-bind="reorderOptions">.
// La poignée de chaque ligne porte la classe `drag-handle`.
export const reorderOptions = {
  handle: '.drag-handle',
  // Les autres lignes glissent pour faire de la place
  animation: 200,
  // Emplacement où la ligne sera déposée (style dans style.css)
  ghostClass: 'reorder-ghost',
  // Copie qui suit le doigt, identique sur tous les navigateurs
  forceFallback: true,
  fallbackClass: 'reorder-dragging',
  // Défilement automatique près des bords de l'écran
  scroll: true,
  scrollSensitivity: 80,
  scrollSpeed: 14,
  // Petit retour haptique à la prise (Android)
  onStart: () => {
    navigator.vibrate?.(10)
  }
}
