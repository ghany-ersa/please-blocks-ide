/**
 * dataResolver.js
 * Mengubah nilai input canvas menjadi ekspresi JavaScript valid.
 * Juga menyediakan helper untuk scan DataRef usage per file
 * agar specGenerator bisa generate require() yang tepat.
 */

/**
 * Resolve satu nilai input → string ekspresi JS.
 */
export function resolveInput(value, inputType = 'text') {
  if (value === null || value === undefined || value === '') {
    return inputType === 'number' ? '0' : "''"
  }
  if (value && typeof value === 'object' && value.type === 'dataref') {
    return value.path       // e.g. 'ACCOUNT.valid' atau 'PRODUCT.laptop'
  }
  if (value && typeof value === 'object' && value.type === 'varref') {
    return value.varName    // e.g. 'headerText'
  }
  if (inputType === 'number') {
    const n = Number(value)
    return isNaN(n) ? '0' : String(n)
  }
  const escaped = String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}

/**
 * Scan satu feature dan kumpulkan semua DataRef yang dipakai,
 * dikelompokkan per file sumber.
 *
 * Hasil:
 *   {
 *     'main':     { filePath: 'data/main.js',     groups: ['URL', 'ACCOUNT'] },
 *     'products': { filePath: 'data/products.js', groups: ['PRODUCT'] },
 *   }
 *
 * @param {Object}  feature       - feature dari canvasStore
 * @param {Array}   dataEntries   - dataRegistry.entries (sudah punya fileId + filePath)
 * @returns {Object} imports per file
 */
export function collectImportsPerFile(feature, dataEntries) {
  const importsMap = {}  // { fileId: { filePath, groups: Set<groupName> } }

  // Buat index: path → entry (untuk lookup O(1))
  const entryByPath = {}
  for (const e of dataEntries) {
    entryByPath[e.path] = e
  }

  for (const tc of feature.testCases) {
    for (const step of tc.steps) {
      for (const val of Object.values(step.inputs || {})) {
        if (val && typeof val === 'object' && val.type === 'dataref') {
          const entry = entryByPath[val.path]
          if (!entry) continue

          const { fileId, filePath, group } = entry
          if (!importsMap[fileId]) {
            importsMap[fileId] = { filePath, groups: new Set() }
          }
          importsMap[fileId].groups.add(group)
        }
      }
    }
  }

  // Konversi Set ke Array
  for (const v of Object.values(importsMap)) {
    v.groups = [...v.groups]
  }
  return importsMap
}

/**
 * Dari importsMap, kumpulkan nama component yang dipakai
 * (block type === 'component').
 */
export function collectComponents(feature, blockRegistry) {
  const comps = new Set()
  for (const tc of feature.testCases) {
    for (const step of tc.steps) {
      const block = blockRegistry.getById(step.blockId)
      if (block?.type === 'component') {
        const parts = block.id.split('.')
        if (parts[1]) comps.add(parts[1].toUpperCase())
      }
    }
  }
  return [...comps]
}
