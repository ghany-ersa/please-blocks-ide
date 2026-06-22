// Definisi blok kategori Navigation
// Mapping ke: please.goto(), please.verifyPage()

import { resolveValue } from './helpers.js'

/**
 * URL Object schema yang diterima oleh blok navigasi.
 * Object harus memiliki kedua field ini agar please.goto() / please.verifyPage() bisa berjalan.
 *
 * Contoh object yang valid:
 *   { url: 'https://...', title: 'Page Title...' }
 *
 * Contoh object yang TIDAK valid:
 *   { username: 'student', password: '...' }   ← ACCOUNT object, bukan URL
 */
const URL_SCHEMA = {
  requiredFields:  ['url', 'title'],
  description:     'Object URL — harus memiliki field url dan title',
  example:         'URL.login',
  errorMessage:    (missing) =>
    `Object ini tidak valid untuk navigasi. Field yang hilang: ${missing.map(f => `"${f}"`).join(', ')}. ` +
    `Pilih URL object dari Data Manager (contoh: URL.login, URL.dashboard).`
}

export default [
  {
    id:          'nav.goto',
    type:        'navigation',
    label:       'Go To',
    icon:        '🧭',
    color:       '#6366f1',
    colorBg:     'rgba(99,102,241,0.1)',
    description: 'Buka URL + otomatis assert URL & title halaman',
    inputs: [
      {
        name:        'urlTarget',
        type:        'dataref',
        label:       'URL target',
        placeholder: 'PAGE.login',
        required:    true,
        schema:      URL_SCHEMA
      }
    ],
    output: null,
    codegen(inputs) {
      return `await please.goto(${resolveValue(inputs.urlTarget)})`
    },
    validate(inputs) {
      if (!inputs.urlTarget) return 'URL target wajib dipilih'
      return null
    }
  },

  {
    id:          'nav.verifyPage',
    type:        'navigation',
    label:       'Verify Page',
    icon:        '📍',
    color:       '#6366f1',
    colorBg:     'rgba(99,102,241,0.1)',
    description: 'Assert URL dan title halaman saat ini setelah redirect/navigasi',
    inputs: [
      {
        name:        'urlExpected',
        type:        'dataref',
        label:       'Halaman yang diharapkan',
        placeholder: 'PAGE.dashboard',
        required:    true,
        schema:      URL_SCHEMA
      }
    ],
    output: null,
    codegen(inputs) {
      return `await please.verifyPage(${resolveValue(inputs.urlExpected)})`
    },
    validate(inputs) {
      if (!inputs.urlExpected) return 'Halaman yang diharapkan wajib dipilih'
      return null
    }
  }
]
