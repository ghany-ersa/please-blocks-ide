// Definisi blok kategori Assertions
// Mapping ke: please.see(), expect() Playwright

import { t }                  from './inputTemplates.js'
import { v, createValidator } from './validationHelpers.js'
import { resolveString, resolveValue } from './helpers.js'

const ASSERTION = { type: 'assertion', color: '#f59e0b', colorBg: 'rgba(245,158,11,0.1)', output: null }

export default [
  {
    ...ASSERTION,
    id: 'assert.seeText',
    label: 'See Text',
    icon: '👁️',
    description: 'Assert teks tertentu muncul pada element',
    inputs: [
      t.label('pesan error'),
      t.selector('#error'),
      t.expected('Your username is invalid!', 'Teks yang diharapkan')
    ],
    codegen(inputs) {
      const label    = resolveString(inputs.label)
      const selector = resolveString(inputs.selector)
      const expected = resolveValue(inputs.expected)
      return `await please.see(${label}, ${selector}, ${expected})`
    },
    validate: createValidator(v.selector(), v.expected('Teks yang diharapkan wajib diisi'))
  },

  {
    ...ASSERTION,
    id: 'assert.getText',
    label: 'Read Text',
    icon: '📖',
    description: 'Baca teks dari element, simpan ke variabel',
    output: 'text',
    inputs: [t.label('header halaman'), t.selector('h1'), t.varName('headerText')],
    codegen(inputs) {
      const label    = resolveString(inputs.label)
      const selector = resolveString(inputs.selector)
      const varName  = inputs.varName || 'result'
      return `const ${varName} = await please.see(${label}, ${selector})`
    },
    validate: createValidator(v.selector(), v.varName())
  },

  {
    ...ASSERTION,
    id: 'assert.equal',
    label: 'Assert Equal',
    icon: '✅',
    description: 'Assert nilai aktual === nilai yang diharapkan (Playwright expect)',
    inputs: [t.actual('$headerText'), t.expected('Logged In Successfully'), t.message()],
    codegen(inputs) {
      const actual   = inputs.actual && typeof inputs.actual === 'object' && inputs.actual.type === 'varref'
        ? inputs.actual.varName
        : resolveValue(inputs.actual)
      const expected = resolveValue(inputs.expected)
      const msg      = inputs.message ? `, ${resolveString(inputs.message)}` : ''
      return `expect(${actual}${msg}).toBe(${expected})`
    },
    validate: createValidator(v.actual(), v.expected())
  },

  {
    ...ASSERTION,
    id: 'assert.notEqual',
    label: 'Assert Not Equal',
    icon: '❌',
    description: 'Assert nilai aktual !== nilai yang diharapkan (Playwright expect)',
    inputs: [t.actual('$result'), t.expected('error', 'Nilai yang tidak diharapkan'), t.message()],
    codegen(inputs) {
      const actual   = inputs.actual && typeof inputs.actual === 'object' && inputs.actual.type === 'varref'
        ? inputs.actual.varName
        : resolveValue(inputs.actual)
      const expected = resolveValue(inputs.expected)
      const msg      = inputs.message ? `, ${resolveString(inputs.message)}` : ''
      return `expect(${actual}${msg}).not.toBe(${expected})`
    },
    validate: createValidator(v.actual(), v.expected('Nilai yang tidak diharapkan wajib diisi'))
  },

  {
    ...ASSERTION,
    id: 'assert.fail',
    label: 'Force Fail',
    icon: '💥',
    description: 'Gagalkan test secara eksplisit dengan custom message',
    inputs: [
      { name: 'message', type: 'text', label: 'Pesan kegagalan', placeholder: 'Test digagalkan karena...', required: false }
    ],
    codegen(inputs) {
      return inputs.message
        ? `throw new Error('${inputs.message}')`
        : `throw new Error('Test digagalkan secara eksplisit')`
    },
    validate: (_inputs) => null
  }
]
