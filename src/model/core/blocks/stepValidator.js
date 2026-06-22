/**
 * stepValidator.js
 * Validasi sebuah Step (block + inputs) dan return hasil validasi.
 *
 * Dipakai oleh StepItem dan TestCaseBlock untuk menampilkan indikator error di canvas.
 */
import { validateSchema } from './schemaValidator.js'

/**
 * @param {Object} step          - step dari canvasStore { blockId, inputs }
 * @param {Object} blockDef      - block definition dari blockRegistry
 * @param {Array}  dataEntries   - dataRegistry.entries (untuk schema validation)
 * @returns {{ valid: boolean, errors: { [fieldName]: string }, errorCount: number }}
 */
export function validateStep(step, blockDef, dataEntries = []) {
  if (!blockDef) {
    return { valid: false, errors: { _block: 'Block tidak ditemukan' }, errorCount: 1 }
  }

  const errors = {}

  for (const inputDef of blockDef.inputs) {
    const value = step.inputs?.[inputDef.name]

    // Required check
    if (inputDef.required && (value === undefined || value === null || value === '')) {
      errors[inputDef.name] = `"${inputDef.label}" wajib diisi`
      continue
    }

    // Schema check
    if (inputDef.schema && value) {
      const result = validateSchema(value, inputDef, dataEntries)
      if (result && !result.valid) {
        errors[inputDef.name] = result.message
      }
    }
  }

  // Jalankan validate() dari block definition jika ada
  if (blockDef.validate) {
    const msg = blockDef.validate(step.inputs || {})
    if (msg) errors._custom = msg
  }

  return {
    valid:      Object.keys(errors).length === 0,
    errors,
    errorCount: Object.keys(errors).length
  }
}

/**
 * Validasi semua steps dalam satu test case.
 * @returns { totalErrors, stepResults: [{ stepId, valid, errorCount }] }
 */
export function validateTestCase(tc, blockRegistry, dataEntries) {
  let totalErrors = 0
  const stepResults = tc.steps.map(step => {
    const block  = blockRegistry.getById(step.blockId)
    const result = validateStep(step, block, dataEntries)
    totalErrors += result.errorCount
    return { stepId: step.id, ...result }
  })
  return { totalErrors, stepResults }
}

/**
 * Validasi seluruh canvas — return ringkasan per feature.
 */
export function validateCanvas(features, blockRegistry, dataEntries) {
  return features.map(feature => {
    let featureErrors = 0
    const tcResults = feature.testCases.map(tc => {
      const result = validateTestCase(tc, blockRegistry, dataEntries)
      featureErrors += result.totalErrors
      return { tcId: tc.id, ...result }
    })
    return { featureId: feature.id, featureErrors, tcResults }
  })
}
