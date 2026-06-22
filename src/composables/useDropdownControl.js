import { ref, watch, nextTick } from 'vue'

/**
 * Composable untuk logika buka/tutup dropdown yang di-teleport ke body.
 *
 * @param {object} options
 *   wrapSelector     - CSS selector wrapper trigger (untuk deteksi klik luar)
 *   dropdownSelector - CSS selector dropdown panel (untuk deteksi klik luar)
 *   focusRef         - ref yang di-focus saat dropdown terbuka
 *   dropHeight       - estimasi tinggi dropdown untuk kalkulasi posisi (default 240)
 */
export function useDropdownControl({ wrapSelector, dropdownSelector, focusRef, triggerRef, dropHeight = 240 } = {}) {
  const open      = ref(false)
  const searchQ   = ref('')
  const dropStyle = ref({})

  function positionDropdown() {
    if (!triggerRef?.value) return
    const rect       = triggerRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom

    if (spaceBelow >= dropHeight || spaceBelow >= 120) {
      dropStyle.value = {
        top:   `${rect.bottom + window.scrollY}px`,
        left:  `${rect.left   + window.scrollX}px`,
        width: `${rect.width}px`
      }
    } else {
      dropStyle.value = {
        top:   `${rect.top + window.scrollY - dropHeight}px`,
        left:  `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`
      }
    }
  }

  function toggle() {
    open.value = !open.value
    if (open.value) {
      searchQ.value = ''
      nextTick(() => {
        positionDropdown()
        focusRef?.value?.focus()
      })
    }
  }

  function close() {
    open.value    = false
    searchQ.value = ''
  }

  function onOutsideClick(e) {
    const inWrap     = wrapSelector     && e.target.closest(wrapSelector)
    const inDropdown = dropdownSelector && e.target.closest(dropdownSelector)
    if (!inWrap && !inDropdown) close()
  }

  watch(open, (val) => {
    if (val) nextTick(() => document.addEventListener('click', onOutsideClick))
    else     document.removeEventListener('click', onOutsideClick)
  })

  return { open, searchQ, dropStyle, toggle, close, positionDropdown }
}
