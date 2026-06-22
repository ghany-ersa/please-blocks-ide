/**
 * usePaletteFilter — pencarian blok di palette berdasarkan query.
 * Memfilter registry.byCategory pada label/description. Dipakai BlockPalette
 * & mini-palette di ComponentBuilder.
 *
 * @param {import('vue').Ref<string>} searchRef - ref query pencarian
 * @returns {{ filteredCategories: import('vue').ComputedRef }}
 */
import { computed } from 'vue'
import { useBlockRegistry } from '@/model/stores/blockRegistry.js'

export function usePaletteFilter(searchRef) {
  const registry = useBlockRegistry()

  const filteredCategories = computed(() => {
    const q = (searchRef.value || '').trim().toLowerCase()
    if (!q) return registry.byCategory
    return registry.byCategory
      .map(cat => ({
        ...cat,
        blocks: cat.blocks.filter(b =>
          b.label.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
        )
      }))
      .filter(cat => cat.blocks.length > 0)
  })

  return { filteredCategories }
}
