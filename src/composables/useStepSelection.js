import { ref, computed } from 'vue'

export function useStepSelection() {
  // Selalu assign Set baru agar Vue tracking bekerja
  const selectedSet = ref(new Set())
  const lastClicked = ref(null)

  const selectedIndices = computed(() => [...selectedSet.value].sort((a, b) => a - b))
  const hasSelection    = computed(() => selectedSet.value.size > 0)

  function onStepClick(index, event) {
    // Checkbox click: event.target adalah .sc-checkbox-wrap atau anaknya
    // Tidak pakai modifier — selalu toggle
    const isCheckbox = event.target?.closest?.('.sc-checkbox-wrap')

    if (isCheckbox) {
      // Shift + checkbox = range select dari lastClicked
      if (event.shiftKey && lastClicked.value !== null) {
        const from = Math.min(lastClicked.value, index)
        const to   = Math.max(lastClicked.value, index)
        const next = new Set(selectedSet.value)
        for (let i = from; i <= to; i++) next.add(i)
        selectedSet.value = next
      } else {
        // Toggle single
        const next = new Set(selectedSet.value)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        selectedSet.value = next
        lastClicked.value = index
      }
    } else {
      // Klik di luar checkbox (header/body) — clear selection
      selectedSet.value = new Set()
      lastClicked.value = null
    }
  }

  function clearSelection() {
    selectedSet.value = new Set()
    lastClicked.value = null
  }

  function isSelected(index) {
    return selectedSet.value.has(index)
  }

  return {
    selectedIndices,
    hasSelection,
    isSelected,
    clearSelection,
    onStepClick
  }
}
