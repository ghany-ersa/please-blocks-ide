// Factory helpers untuk fungsi validate() di block definitions

/**
 * Buat validator yang mengecek beberapa field secara berurutan.
 * Tiap check adalah fungsi (inputs) => string|null.
 */
export function createValidator(...checks) {
  return (inputs) => {
    for (const check of checks) {
      const err = check(inputs)
      if (err) return err
    }
    return null
  }
}

/** Cek field wajib diisi (handle string kosong, null, undefined) */
export function required(fieldName, message) {
  return (inputs) => {
    const v = inputs[fieldName]
    if (v === undefined || v === null || v === '') {
      return message || `${fieldName} wajib diisi`
    }
    return null
  }
}

// Shortcut untuk validator umum
export const v = {
  selector: () => required('selector', 'Selector wajib diisi'),
  value:    () => required('value',    'Nilai wajib diisi'),
  varName:  () => required('varName',  'Nama variabel wajib diisi'),
  actual:   () => required('actual',   'Nilai aktual wajib diisi'),
  expected: (msg = 'Nilai yang diharapkan wajib diisi') => required('expected', msg),
  path:     () => required('path',     'Path file wajib diisi'),
}
