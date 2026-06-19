import { defineStore } from 'pinia'
import { ALL_BUILT_IN_BLOCKS, CATEGORY_ORDER, CATEGORY_META } from '@/model/core/blocks/definitions/index.js'

export const useBlockRegistry = defineStore('blockRegistry', {
  state: () => ({
    // Built-in blocks — hardcoded, dari definitions/
    builtIn: Object.fromEntries(ALL_BUILT_IN_BLOCKS.map(b => [b.id, b])),

    // Blocks dari ComponentBuilder / extract canvas (dikelola componentStore)
    components: {},

    data: {}
  }),

  getters: {
    all(state) {
      return { ...state.builtIn, ...state.components, ...state.data }
    },

    byCategory(state) {
      const all = { ...state.builtIn, ...state.components, ...state.data }
      const groups = {}

      for (const block of Object.values(all)) {
        if (!groups[block.type]) groups[block.type] = []
        groups[block.type].push(block)
      }

      const ordered = []
      for (const cat of CATEGORY_ORDER) {
        if (groups[cat]?.length) {
          ordered.push({
            id: cat,
            meta: CATEGORY_META[cat],
            blocks: groups[cat]
          })
        }
      }

      for (const [cat, blocks] of Object.entries(groups)) {
        if (!CATEGORY_ORDER.includes(cat) && blocks.length) {
          ordered.push({
            id: cat,
            meta: CATEGORY_META[cat] || { label: cat, icon: '📦', color: '#94a3b8' },
            blocks
          })
        }
      }

      return ordered
    },

    getById: (state) => (id) => {
      return state.builtIn[id] || state.components[id] || state.data[id] || null
    }
  },

  actions: {
    // Daftarkan semua block component dari componentStore (replace penuh)
    registerComponentBlocks(blocks) {
      this.components = Object.fromEntries(blocks.map(b => [b.id, b]))
    },

    registerDataBlocks(blocks) {
      for (const block of blocks) {
        this.data[block.id] = block
      }
    },

    // Reset dynamic blocks (saat project ditutup)
    clearDynamicBlocks() {
      this.components = {}
      this.data = {}
    }
  }
})
