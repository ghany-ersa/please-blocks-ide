import { defineStore } from 'pinia'
import { ALL_BUILT_IN_BLOCKS, CATEGORY_ORDER, CATEGORY_META } from '@/core/blocks/definitions/index.js'

export const useBlockRegistry = defineStore('blockRegistry', {
  state: () => ({
    // Built-in blocks — hardcoded, dari definitions/
    builtIn: Object.fromEntries(ALL_BUILT_IN_BLOCKS.map(b => [b.id, b])),

    // Dynamic blocks — akan diisi oleh ComponentFactory dan DataFactory (Sprint 3)
    components: {},
    data: {}
  }),

  getters: {
    // Semua blok dalam satu flat object { id: blockDef }
    all(state) {
      return { ...state.builtIn, ...state.components, ...state.data }
    },

    // Blok dikelompokkan per kategori, urut sesuai CATEGORY_ORDER
    byCategory(state) {
      const all = { ...state.builtIn, ...state.components, ...state.data }
      const groups = {}

      for (const block of Object.values(all)) {
        if (!groups[block.type]) groups[block.type] = []
        groups[block.type].push(block)
      }

      // Kembalikan dalam urutan yang sudah ditentukan
      const ordered = []
      for (const cat of CATEGORY_ORDER) {
        if (groups[cat]?.length) {
          ordered.push({
            id:     cat,
            meta:   CATEGORY_META[cat],
            blocks: groups[cat]
          })
        }
      }

      // Kategori dinamis (component, data) ditambah di akhir
      for (const [cat, blocks] of Object.entries(groups)) {
        if (!CATEGORY_ORDER.includes(cat) && blocks.length) {
          ordered.push({
            id:     cat,
            meta:   CATEGORY_META[cat] || { label: cat, icon: '📦', color: '#94a3b8' },
            blocks
          })
        }
      }

      return ordered
    },

    // Ambil satu block definition by ID
    getById: (state) => (id) => {
      return state.builtIn[id] || state.components[id] || state.data[id] || null
    }
  },

  actions: {
    // Daftarkan component blocks dari ComponentFactory (dipakai Sprint 3)
    registerComponentBlocks(blocks) {
      for (const block of blocks) {
        this.components[block.id] = block
      }
    },

    // Daftarkan data blocks dari DataFactory (dipakai Sprint 3)
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
