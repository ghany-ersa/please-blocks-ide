/**
 * specGenerator.js
 * Canvas state (Feature) → kode JS spec Playwright yang valid.
 *
 * Contoh output:
 *
 *   const { test, expect } = require('@playwright/test')
 *   const { createApp }    = require('../app')
 *   const { URL, ACCOUNT } = require('../data/main')
 *
 *   test.describe('Login Flow', () => {
 *     test('login berhasil', async ({ page }) => {
 *       const { please, AUTH } = createApp(page)
 *       await please.goto(URL.login)
 *       await AUTH.login(ACCOUNT.valid)
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

  const lines = []

  // Playwright imports
  lines.push(`const { test, expect } = require('@playwright/test')`)
  lines.push(`const { createApp }    = require('../app')`)

  // Import data — satu baris per file yang dipakai
  for (const { filePath, groups } of Object.values(importsMap)) {
    const requirePath = `../${filePath.replace(/\.js$/, '')}`
    lines.push(`const { ${groups.join(', ')} } = require('${requirePath}')`)
  }

  lines.push('', `test.describe('${feature.label}', () => {`)

  // Test cases
  const testCaseBlocks = feature.testCases.map(tc =>
    generateTestCase(tc, blockRegistry, components)
  )

  if (!testCaseBlocks.length) {
    lines.push('    // Belum ada test case')
  } else {
    lines.push(...testCaseBlocks)
  }

  lines.push('})')
  return lines.join('\n')
}

/**
 * Generate blok test() dari satu TestCase.
 */
function generateTestCase(tc, blockRegistry, components) {
  const stepLines = tc.steps.map(step => generateStep(step, blockRegistry))
  const indent = (block) => block.split('\n').map(l => `        ${l}`).join('\n')

  // createApp destructure: { please, AUTH, ... }
  const appVars = ['please', ...components].join(', ')
  const createAppLine = `        const { ${appVars} } = createApp(page, test)`

  const body = stepLines.length
    ? [createAppLine, ...stepLines.map(indent)].join('\n')
    : `${createAppLine}\n        // Belum ada step`

  return [
    '',
    `    test('${tc.label}', async ({ page }) => {`,
    body,
    `    })`
  ].join('\n')
}

/**
 * Generate satu baris kode dari satu Step.
 */
function generateStep(step, blockRegistry) {
  const block = blockRegistry.getById(step.blockId)
  if (!block) return `// [!] Block tidak ditemukan: ${step.blockId}`

  let code
  try {
    code = block.codegen(step.inputs || {})
  } catch (err) {
    return `// [!] Error pada '${step.blockId}': ${err.message}`
  }

  return withNote(step.note, code)
}

/**
 * Prepend catatan QA sebagai komentar di atas baris kode.
 */
function withNote(note, code) {
  const text = note?.trim()
  if (!text) return code
  const comment = text.split('\n').map(line => `// ${line.trim()}`).join('\n')
  return `${comment}\n${code}`
}

/**
 * Generate index.js dari semua features.
 * Feature dengan enabled=false di-comment-out otomatis.
 */
export function generateIndex(features) {
  if (!features.length) return '// Belum ada feature'
  const lines = [
    '// Aktifkan atau nonaktifkan spec yang ingin dijalankan',
  ]
  for (const f of features) {
    const requirePath = `'./feature/${slugify(f.label)}.spec'`
    const enabled     = f.enabled !== false
    lines.push(enabled
      ? `require(${requirePath})`
      : `// require(${requirePath})`
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
