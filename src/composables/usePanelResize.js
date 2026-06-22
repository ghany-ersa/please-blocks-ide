/**
 * usePanelResize — ViewModel untuk drag-resize panel kanan (Inspector vs Code).
 * Mengelola persentase tinggi inspector + status drag.
 */
import { ref } from 'vue'

export function usePanelResize(initialPct = 55) {
  const inspectorHeightPct = ref(initialPct)
  const isResizing = ref(false)
  const panelRef   = ref(null)

  function startResize(e) {
    isResizing.value = true
    const startY   = e.clientY
    const startPct = inspectorHeightPct.value

    function onMove(ev) {
      if (!panelRef.value) return
      const panelH = panelRef.value.getBoundingClientRect().height
      const delta  = ev.clientY - startY
      inspectorHeightPct.value = Math.min(80, Math.max(20, startPct + (delta / panelH) * 100))
    }
    function onUp() {
      isResizing.value = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return { inspectorHeightPct, isResizing, panelRef, startResize }
}
