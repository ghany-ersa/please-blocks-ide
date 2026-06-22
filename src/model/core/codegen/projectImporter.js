/**
 * projectImporter.js — Reverse Codegen (full project)
 *
 * Orkestrasi: kumpulan file project (dibaca dari disk via server) →
 * struktur untuk dataRegistry + componentStore + canvas.
 *
 * INVARIANT URUTAN: component harus di-parse & blok-nya terdaftar SEBELUM
 * spec di-parse, agar `await AUTH.login(...)` ter-resolve ke comp.auth.login
 * (bukan jatuh ke util.rawCode). analyzeProject() memakai componentIndex
 * sementara (dari def hasil-parse) agar preview tidak perlu mengubah registry.
 *
 * projectFiles (dari /api/files/read-project):
 *   { specs:[{name,content}], data:[{name,content}], components:[{name,content}],
 *     env: string|null, index: string|null }
 */

import { parseSpec }          from './specParser.js'
import { parseDataFile }      from './dataFileParser.js'
import { parseComponentFile } from './componentFileParser.js'

/**
 * Analisis project tanpa commit ke store. Untuk preview di modal.
 *
 * @param {Object} projectFiles
 * @returns {{ env, files, components, features, summary, warnings }}
 */
export function analyzeProject(projectFiles) {
  const warnings = []
  const { specs = [], data = [], components = [], env = null, index = null } = projectFiles || {}

  // 1. .env
  const envMap = parseEnvFile(env)

  // 2. data/*.js → files map
  const files = {}
  for (const f of data) {
    const { file, warnings: w } = parseDataFile(f.content, f.name)
    warnings.push(...w)
    if (file) {
      if (files[file.id]) warnings.push(`File data '${file.id}' duplikat — yang terakhir dipakai.`)
      files[file.id] = file
    }
  }

  // 3. components/*.js → component defs + componentIndex sementara
  const componentDefs = []
  for (const f of components) {
    const { component, warnings: w } = parseComponentFile(f.content)
    warnings.push(...w)
    if (component) componentDefs.push(component)
  }
  const componentIndex = buildIndexFromDefs(componentDefs)

  // 4. specs → features (pakai componentIndex sementara)
  const enabledMap = parseIndexEnabled(index)
  const features = []
  for (const f of specs) {
    const { features: fs, warnings: w } = parseSpec(f.content, { componentIndex })
    warnings.push(...w)
    for (const feat of fs) {
      // rekonsiliasi enabled dari index.js (default true)
      const slug = slugify(feat.label)
      feat.enabled = enabledMap[slug] !== undefined ? enabledMap[slug] : true
      features.push(feat)
    }
  }

  return {
    env: envMap,
    files,
    components: componentDefs,
    features,
    summary: buildSummary(files, componentDefs, features),
    warnings
  }
}

/**
 * Commit hasil analisis ke store. Urutan: data → components(register) → canvas.
 *
 * @param {Object} projectFiles
 * @param {Object} stores - { dataRegistry, componentStore, blockRegistry, canvas }
 * @param {Object} [opts] - { replace=true }
 * @returns {{ summary, warnings }}
 */
export function importProject(projectFiles, stores, { replace = true } = {}) {
  const { dataRegistry, componentStore, blockRegistry, canvas } = stores
  const analysis = analyzeProject(projectFiles)
  const merge = !replace

  // 1. data + env
  dataRegistry.setData(analysis.files, analysis.env, { merge })

  // 2. components → register blok (sebelum spec dipakai di canvas)
  componentStore.setComponents(analysis.components, { merge })

  // 3. canvas — sekarang blockRegistry sudah punya blok component,
  //    importFeatures akan memetakan argN component ke nama field sebenarnya.
  canvas.importFeatures(analysis.features, { blockRegistry, replace })

  return { summary: analysis.summary, warnings: analysis.warnings }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Parse `.env` (KEY=value per baris, abaikan komentar/kosong). */
export function parseEnvFile(text) {
  const env = {}
  if (!text) return env
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    // strip quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key) env[key] = val
  }
  return env
}

/**
 * Parse index.js → { featureSlug: enabled }.
 * `require('./feature/login.spec')`     → login: true
 * `// require('./feature/login.spec')`  → login: false
 */
export function parseIndexEnabled(text) {
  const map = {}
  if (!text) return map
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const m = line.match(/^(\/\/\s*)?require\(\s*['"]\.\/feature\/([^'"]+?)(\.spec)?['"]\s*\)/)
    if (m) {
      const slug = m[2]
      map[slug] = !m[1]   // ada '//' → disabled
    }
  }
  return map
}

/** Index sementara dari component defs (untuk preview tanpa registry). */
function buildIndexFromDefs(defs) {
  const map = new Map()
  for (const d of defs) {
    const exportName = d.exportName || String(d.name).toUpperCase()
    map.set(exportName, `comp.${String(d.name).toLowerCase()}`)
  }
  return map
}

function buildSummary(files, components, features) {
  let testCases = 0, steps = 0, raw = 0
  for (const f of features) {
    testCases += f.testCases.length
    for (const tc of f.testCases) {
      steps += tc.steps.length
      raw += tc.steps.filter(s => s.blockId === 'util.rawCode').length
    }
  }
  return {
    features:   features.length,
    testCases,
    steps,
    rawCode:    raw,
    dataFiles:  Object.keys(files).length,
    components: components.length
  }
}

/** Sama dengan slugify di specGenerator.js (untuk match index.js). */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'feature'
}
