/**
 * specGenerator.js
 * Canvas state (Feature) → kode JS spec yang valid.
 *
 * Mendukung multi-file data: require() di-generate per file yang dipakai,
 * bukan hardcode ke '../data/main' saja.
 *
 * Contoh output dengan 2 data file:
 *
 *   const { please, AUTH }     = require('../app')
 *   const { URL, ACCOUNT }     = require('../data/main')
 *   const { PRODUCT, PAYMENT } = require('../data/checkout')
 *
 *   describe('Checkout Flow', () => {
 *     it('beli produk berhasil', async () => {
 *       await please.goTo(URL.shop)
 *       await please.see('produk', '.title', PRODUCT.laptop.name)
 *       await AUTH.login(ACCOUNT.valid)
 *       ...
 *     })
 *   })
 */

import { collectImportsPerFile, collectComponents } from './dataResolver.js'

/**
 * Generate kode spec lengkap untuk satu Feature.
 *
 * @param {Object} feature       - feature dari canvasStore
 * @param {Object} blockRegistry - instance Pinia blockRegistry store
 * @param {Array}  dataEntries   - dataRegistry.entries (dengan fileId + filePath)
 * @returns {string}
 */
export function generateSpec(feature, blockRegistry, dataEntries = []) {
  if (!feature) return '// Pilih sebuah Feature di canvas'

  const components  = collectComponents(feature, blockRegistry)
  const importsMap  = collectImportsPerFile(feature, dataEntries)

  const lines = [
    `// feature/${slugify(feature.label)}.spec.js`,
    `// Auto-generated oleh Please Blocks IDE`,
    `// Jangan edit manual — ubah melalui canvas`,
    ''
  ]

  // Import app (please + components)
  const compList = ['please', ...components].join(', ')
  lines.push(`const { ${compList} } = require('../app')`)

  // Import data — satu baris per file yang dipakai
  for (const { filePath, groups } of Object.values(importsMap)) {
    const requirePath = `../${filePath.replace(/\.js$/, '')}`
    lines.push(`const { ${groups.join(', ')} } = require('${requirePath}')`)
  }

  lines.push('', `describe('${feature.label}', () => {`)

  // Test cases
  const testCaseBlocks = feature.testCases.map(tc =>
    generateTestCase(tc, blockRegistry)
  )

  if (!testCaseBlocks.length) {
    lines.push('  // Belum ada test case')
  } else {
    lines.push(...testCaseBlocks)
  }

  lines.push('})')
  return lines.join('\n')
}

/**
 * Generate blok it() dari satu TestCase.
 */
function generateTestCase(tc, blockRegistry) {
  const stepLines = tc.steps.map(step => generateStep(step, blockRegistry))
  const body = stepLines.length
    ? stepLines.map(l => `    ${l}`).join('\n')
    : '    // Belum ada step'

  return [
    '',
    `  it('${tc.label}', async () => {`,
    body,
    `  })`
  ].join('\n')
}

/**
 * Generate satu baris kode dari satu Step.
 */
function generateStep(step, blockRegistry) {
  const block = blockRegistry.getById(step.blockId)
  if (!block) return `// [!] Block tidak ditemukan: ${step.blockId}`
  try {
    return block.codegen(step.inputs || {})
  } catch (err) {
    return `// [!] Error pada '${step.blockId}': ${err.message}`
  }
}

/**
 * Generate index.js dari semua features.
 * Feature dengan enabled=false di-comment-out otomatis.
 */
export function generateIndex(features) {
  if (!features.length) return '// Belum ada feature'
  const lines = [
    '// index.js — aktifkan atau nonaktifkan spec yang ingin dijalankan',
    '// Toggle fitur melalui canvas (ikon ▶/⏸ di header feature)',
    ''
  ]
  for (const f of features) {
    const path    = `'./feature/${slugify(f.label)}.spec'`
    const enabled = f.enabled !== false  // default true jika undefined
    lines.push(enabled
      ? `require(${path})`
      : `// require(${path})   // ← dinonaktifkan`
    )
  }
  return lines.join('\n')
}

// ── Helper ────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'feature'
}
