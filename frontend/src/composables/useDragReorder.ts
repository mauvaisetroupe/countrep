import { onMounted, onUnmounted, ref, type Ref } from 'vue'

// Réordonnancement d'une liste par glisser-déposer (souris et tactile).
//
// Chaque ligne porte l'attribut `data-<attribute>="<clé>"` ; la poignée
// de déplacement est un enfant direct de la ligne et appelle
// `startDrag(clé, $event)` sur `pointerdown` (avec la classe `touch-none`
// pour que le défilement tactile ne prenne pas la main).
export function useDragReorder<T>(
  items: Ref<T[]>,
  keyOf: (item: T) => string,
  options: {
    attribute: string
    onReorder?: () => void
  }
) {
  const draggedKey = ref<string | null>(null)

  let draggedElement: HTMLElement | null = null
  let dragPointerId: number | null = null

  // `data-selected-exercise` → `selectedExercise` dans `element.dataset`
  const datasetKey = options.attribute.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

  const startDrag = (key: string, event: PointerEvent) => {
    const handle = event.currentTarget

    if (!(handle instanceof HTMLElement)) {
      return
    }

    const element = handle.parentElement

    if (!(element instanceof HTMLElement)) {
      return
    }

    draggedKey.value = key
    draggedElement = element
    dragPointerId = event.pointerId

    element.setPointerCapture(event.pointerId)

    event.preventDefault()
  }

  const moveDrag = (event: PointerEvent) => {
    if (draggedKey.value === null || dragPointerId !== event.pointerId) {
      return
    }

    event.preventDefault()

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-${options.attribute}]`)
    )

    const target = elements.find(element => {
      if (element === draggedElement) {
        return false
      }

      const rect = element.getBoundingClientRect()

      return event.clientY >= rect.top && event.clientY <= rect.bottom
    })

    const targetKey = target?.dataset[datasetKey]

    if (!targetKey) {
      return
    }

    const keys = items.value.map(keyOf)
    const fromIndex = keys.indexOf(draggedKey.value)
    const toIndex = keys.indexOf(targetKey)

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return
    }

    const reordered = [...items.value]
    const [moved] = reordered.splice(fromIndex, 1)

    reordered.splice(toIndex, 0, moved!)

    items.value = reordered
    options.onReorder?.()
  }

  const endDrag = (event: PointerEvent) => {
    if (dragPointerId !== null && event.pointerId !== dragPointerId) {
      return
    }

    if (draggedElement && dragPointerId !== null) {
      try {
        draggedElement.releasePointerCapture(dragPointerId)
      } catch {
        // Pointer capture may already have been released.
      }
    }

    draggedKey.value = null
    draggedElement = null
    dragPointerId = null
  }

  onMounted(() => {
    window.addEventListener('pointermove', moveDrag, { passive: false })
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  })

  onUnmounted(() => {
    window.removeEventListener('pointermove', moveDrag)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
  })

  return {
    draggedKey,
    startDrag
  }
}
