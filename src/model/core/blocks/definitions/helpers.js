/**
 * helpers.js — utility untuk block codegen functions.
 *
 * resolveValue() menangani tiga format input 'value':
 *   1. Plain string/number  → "'some text'"  atau  42
 *   2. DataRef object       → 'ACCOUNT.valid.username'  (JS identifier)
 *   3. VarRef object        → 'headerText'              (canvas variable)
 */

/**
 * @param {any} val - nilai dari step.inputs[fieldName]
 * @returns {string} ekspresi JS siap tulis ke kode
 */
export function resolveValue(val) {
  if (val === null || val === undefined || val === '') return "''"

  // DataRef: { type: 'dataref', path: 'ACCOUNT.valid.username' }
  if (typeof val === 'object' && val.type === 'dataref') {
    return val.path
  }

  // VarRef: { type: 'varref', varName: 'headerText' }
  if (typeof val === 'object' && val.type === 'varref') {
    return val.varName
  }

  // Number literal — tanpa quotes
  if (typeof val === 'number') return String(val)

  // String biasa — wrap dengan single quotes + escape
  const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}

/**
 * resolveString — untuk field yang seharusnya string literal di kode (label, selector, dll).
 *
 * Bedanya dengan resolveValue: hasilnya selalu dipakai sebagai argumen string.
 * - Plain string        → 'some text'       (sama dengan resolveValue)
 * - varref / dataref   → nama variabel tanpa quotes (identifier JS, bukan string literal)
 *
 * Contoh: selector = { type:'varref', varName:'user' }
 *   resolveString(selector) → user          ← identifier JS
 *   resolveValue(selector)  → user          ← sama, tapi semantiknya beda di konteks string field
 *
 * Dipakai di codegen untuk mengganti `'${inputs.label}'` / `'${inputs.selector}'`
 * agar param method dan dataref tidak menghasilkan '[object Object]'.
 */
export function resolveString(val) {
  if (val === null || val === undefined || val === '') return "''"
  if (typeof val === 'object' && val.type === 'dataref') return val.path
  if (typeof val === 'object' && val.type === 'varref')  return val.varName
  const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}
