// Definisi blok kategori Utilities
// Mapping ke: please.wait()

export default [
  {
    id: 'util.wait',
    type: 'utility',
    label: 'Wait',
    icon: '⏳',
    color: '#6b7280',
    colorBg: 'rgba(107,114,128,0.1)',
    description: 'Pause eksekusi selama N milidetik',
    inputs: [
      {
        name: 'duration',
        type: 'number',
        label: 'Durasi (ms)',
        placeholder: '2000',
        required: false
      }
    ],
    output: null,
    codegen(inputs) {
      return inputs.duration
        ? `await please.wait(${inputs.duration})`
        : `await please.wait()`
    },
    validate(_inputs) {
      return null
    }
  },

  {
    id: 'util.rawCode',
    type: 'utility',
    label: 'Raw Code',
    icon: '📝',
    color: '#6b7280',
    colorBg: 'rgba(107,114,128,0.1)',
    description: 'Baris kode JS mentah hasil import .spec.js yang belum dipetakan ke blok',
    inputs: [
      {
        name: 'code',
        type: 'text',
        label: 'Kode',
        placeholder: 'await please.customMethod()',
        required: true
      }
    ],
    output: null,
    codegen(inputs) {
      return inputs.code || '// (kode kosong)'
    },
    validate(inputs) {
      return inputs.code ? null : 'Kode tidak boleh kosong'
    }
  }
]
