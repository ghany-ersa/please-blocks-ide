/**
 * schemaValidator.js
 * Validasi apakah sebuah DataRef entry kompatibel dengan skema yang diminta oleh block input.
 *
 * Skema didefinisikan di block input definition:
 *   schema: {
 *     requiredFields:  ['url', 'title'],
 *     description:     'Object URL — harus memiliki field url dan title',
 *     example:         'URL.login',
 *     errorMessage:    (missingFields) => '...'
 *   }
 *
 * DataRef entry (dari dataRegistry.entries) memiliki:
 *   { path, type, fields: ['url','title'], ... }
 */

/**
 * Validasi satu input value terhadap skema yang didefinisikan di block input.
 *
 * @param {any}    value     - isi step.inputs[fieldName] (DataRef object atau string)
 * @param {Object} inputDef  - definisi input dari block.inputs[]
 * @param {Array}  entries   - dataRegistry.entries
 * @returns {{ valid: boolean, missing: string[], message: string } | null}
 *   null  = tidak ada skema / tidak perlu validasi
 *   object = hasil validasi dengan detail
 */
export function validateSchema(value, inputDef, entries) {
  // Hanya validasi jika input punya schema dan value adalah DataRef
  if (!inputDef.schema) return null
  if (!value || typeof value !== 'object' || value.type !== 'dataref') return null

  const schema  = inputDef.schema
  const entry   = entries.find(e => e.path === value.path)

  // Entry tidak ditemukan di registry — mungkin data dihapus
  if (!entry) {
    return {
      valid:   false,
      missing: [],
      type:    'not_found',
      message: `DataRef "${value.path}" tidak ditemukan di Data Manager. Pilih ulang dari dropdown.`
    }
  }

  // Entry bukan object — tidak bisa divalidasi field-nya
  if (entry.type !== 'object' || !entry.fields) {
    return {
      valid:   false,
      missing: schema.requiredFields || [],
      type:    'not_object',
      message: `"${value.path}" adalah nilai ${entry.type}, bukan object. Blok ini membutuhkan ${schema.description || 'object'}.`
    }
  }

  // Cek field yang hilang
  const missing = (schema.requiredFields || []).filter(f => !entry.fields.includes(f))

  if (missing.length === 0) {
    return { valid: true, missing: [], type: 'ok', message: '' }
  }

  // Ada field yang hilang
  const message = typeof schema.errorMessage === 'function'
    ? schema.errorMessage(missing)
    : `Object "${value.path}" tidak memiliki field yang dibutuhkan: ${missing.map(f => `"${f}"`).join(', ')}. ` +
      `Butuh: ${schema.requiredFields.join(', ')}.`

  return { valid: false, missing, type: 'missing_fields', message }
}

/**
 * Cek apakah sebuah entry kompatibel dengan skema (untuk filtering dropdown).
 *
 * @param {Object} entry  - DataRef entry dari dataRegistry
 * @param {Object} schema - schema dari block input definition
 * @returns {'ok' | 'wrong_type' | 'missing_fields'}
 */
export function checkEntryCompatibility(entry, schema) {
  if (!schema || !schema.requiredFields) return 'ok'
  if (entry.type !== 'object') return 'wrong_type'
  if (!entry.fields) return 'wrong_type'

  const missing = schema.requiredFields.filter(f => !entry.fields.includes(f))
  if (missing.length) return 'missing_fields'

  return 'ok'
}
