// Definisi blok kategori Navigation
// Mapping ke: please.goTo(), please.checkWhere()

export default [
  {
    id: 'nav.goTo',
    type: 'navigation',
    label: 'Navigate To',
    icon: '🧭',
    color: '#6366f1',
    colorBg: 'rgba(99,102,241,0.1)',
    description: 'Buka URL + otomatis assert URL & title halaman',
    inputs: [
      {
        name: 'urlTarget',
        type: 'dataref',
        label: 'URL target',
        placeholder: 'URL.login',
        required: true
      }
    ],
    output: null,
    codegen(inputs) {
      const target = inputs.urlTarget?.path || inputs.urlTarget || 'URL.login'
      return `await please.goTo(${target})`
    },
    validate(inputs) {
      if (!inputs.urlTarget) return 'URL target wajib dipilih'
      return null
    }
  },

  {
    id: 'nav.checkWhere',
    type: 'navigation',
    label: 'Verify Page',
    icon: '📍',
    color: '#6366f1',
    colorBg: 'rgba(99,102,241,0.1)',
    description: 'Assert URL dan title halaman saat ini',
    inputs: [
      {
        name: 'urlExpected',
        type: 'dataref',
        label: 'Halaman yang diharapkan',
        placeholder: 'URL.dashboard',
        required: true
      }
    ],
    output: null,
    codegen(inputs) {
      const target = inputs.urlExpected?.path || inputs.urlExpected || 'URL.dashboard'
      return `await please.checkWhere(${target})`
    },
    validate(inputs) {
      if (!inputs.urlExpected) return 'Halaman yang diharapkan wajib dipilih'
      return null
    }
  }
]
