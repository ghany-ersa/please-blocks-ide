/**
 * DataFactory.js
 * Pipeline: struktur files (multi-file) → flat DataRef entries.
 *
 * Mendukung banyak file data (main.js, users.js, products.js, dll.)
 * setiap file bisa punya banyak group (URL, ACCOUNT, PRODUCT, dll.)
 */

import { flattenAllFiles } from './flattenDataTree.js'

/**
 * Proses semua file data menjadi flat DataRef entries.
 *
 * @param {Object} files - { fileId: { filename, label, groups } }
 * @param {Object} env   - { BASE_URL: '...', ... }
 * @returns {Array} flat DataRef entries dengan fileId dan filePath
 */
export function processDataFiles(files, env = {}) {
  // Resolve env variable references dalam values sebelum flatten
  const resolvedFiles = {}
  for (const [fileId, fileDef] of Object.entries(files)) {
    resolvedFiles[fileId] = {
      ...fileDef,
      groups: resolveEnvRefs(fileDef.groups, env)
    }
  }
  return flattenAllFiles(resolvedFiles)
}

/**
 * Generate kode JS untuk satu file data.
 *
 * @param {Object} fileDef - { filename, label, groups }
 * @param {Object} env     - { BASE_URL: '...', ... }
 * @returns {string} kode data/xxx.js
 */
export function generateDataFile(fileDef, env = {}) {
  const lines = [
    `require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })`,
    ``,
    `module.exports = {`
  ]

  for (const [groupName, entries] of Object.entries(fileDef.groups)) {
    lines.push(`    ${groupName}: {`)
    for (const [entryName, fields] of Object.entries(entries)) {
      if (typeof fields === 'object' && fields !== null) {
        lines.push(`        ${entryName}: {`)
        for (const [fieldName, value] of Object.entries(fields)) {
          const val = formatFieldValue(fieldName, value, env)
          lines.push(`            ${fieldName}: ${val},`)
        }
        lines.push(`        },`)
      } else {
        const val = formatFieldValue(entryName, fields, env)
        lines.push(`        ${entryName}: ${val},`)
      }
    }
    lines.push(`    },`)
  }

  lines.push(`}`)
  return lines.join('\n')
}

/**
 * Generate semua file data sekaligus.
 * @returns {Object} { fileId: codeString }
 */
export function generateAllDataFiles(files, env = {}) {
  const result = {}
  for (const [fileId, fileDef] of Object.entries(files)) {
    result[fileId] = generateDataFile(fileDef, env)
  }
  return result
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Resolve referensi env variable dalam data values.
 * Contoh: '$BASE_URL/login' → 'https://practicetestautomation.com/login'
 */
function resolveEnvRefs(obj, env) {
  if (typeof obj === 'string') {
    return obj.replace(/\$([A-Z_]+)/g, (_, k) => env[k] ?? `$${k}`)
  }
  if (obj === null || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = resolveEnvRefs(v, env)
  }
  return out
}

function formatFieldValue(fieldName, value, env) {
  if (typeof value !== 'string') return String(value)

  // Nilai murni process.env.VAR — tulis langsung
  if (/^process\.env\.[A-Z_]+$/.test(value.trim())) return value

  // Nilai yang mengandung process.env.VAR diikuti path tambahan
  // misal: "process.env.BASE_URL/login" → `${process.env.BASE_URL}/login`
  if (value.includes('process.env.')) {
    const templateVal = value.replace(/(process\.env\.[A-Z_]+)/g, '${$1}')
    return `\`${templateVal}\``
  }

  // URL field: jika nilai mengandung BASE_URL → ganti dengan ${process.env.BASE_URL}
  if (fieldName === 'url' && env.BASE_URL && value.startsWith(env.BASE_URL)) {
    const path = value.slice(env.BASE_URL.length)
    return `\`\${process.env.BASE_URL}${path}\``
  }

  return `'${value.replace(/'/g, "\\'")}'`
}
