// Definisi blok kategori Utilities
// Mapping ke: please.wait(), untilShow(), screenshot(), newTab(), switchTab(), closeTab(), acceptDialog(), dismissDialog()

const UTIL = { type: 'utility', color: '#6b7280', colorBg: 'rgba(107,114,128,0.1)', output: null }

export default [
  {
    ...UTIL,
    id: 'util.untilShow',
    label: 'Wait Until Show',
    icon: '👁️',
    description: 'Tunggu elemen muncul di halaman (default 20 detik)',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',      placeholder: 'loading spinner', required: true },
      { name: 'selector', type: 'selector', label: 'Selector',   placeholder: '.spinner',         required: true },
      { name: 'time',     type: 'number',   label: 'Timeout (ms)', placeholder: '20000',          required: false }
    ],
    codegen(inputs) {
      const label    = inputs.label    ? `'${inputs.label}'`    : "'elemen'"
      const selector = inputs.selector ? `'${inputs.selector}'` : "''"
      return inputs.time
        ? `await please.untilShow(${label}, ${selector}, ${inputs.time})`
        : `await please.untilShow(${label}, ${selector})`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      return null
    }
  },

  {
    ...UTIL,
    id: 'util.screenshot',
    label: 'Screenshot',
    icon: '📸',
    description: 'Ambil screenshot, simpan ke folder screenshots/',
    inputs: [
      { name: 'label', type: 'text', label: 'Label (opsional)', placeholder: 'halaman login', required: false }
    ],
    codegen(inputs) {
      return inputs.label
        ? `await please.screenshot('${inputs.label}')`
        : `await please.screenshot()`
    },
    validate(_inputs) { return null }
  },

  {
    ...UTIL,
    id: 'util.newTab',
    label: 'New Tab',
    icon: '🪟',
    description: 'Buka tab baru, simpan referensinya ke variabel',
    output: 'tab',
    inputs: [
      { name: 'varName', type: 'text', label: 'Simpan ke variabel', placeholder: 'tab2', required: true }
    ],
    codegen(inputs) {
      const v = inputs.varName || 'tab'
      return `const ${v} = await please.newTab()`
    },
    validate(inputs) {
      if (!inputs.varName) return 'Nama variabel wajib diisi'
      return null
    }
  },

  {
    ...UTIL,
    id: 'util.switchTab',
    label: 'Switch Tab',
    icon: '🔀',
    description: 'Pindah active page ke tab tertentu',
    inputs: [
      { name: 'tab', type: 'varref', label: 'Variabel tab', placeholder: '$tab2', required: true }
    ],
    codegen(inputs) {
      const ref = inputs.tab && typeof inputs.tab === 'object' && inputs.tab.type === 'varref'
        ? inputs.tab.varName
        : inputs.tab || 'tab'
      return `await please.switchTab(${ref})`
    },
    validate(inputs) {
      if (!inputs.tab) return 'Variabel tab wajib diisi'
      return null
    }
  },

  {
    ...UTIL,
    id: 'util.closeTab',
    label: 'Close Tab',
    icon: '✖️',
    description: 'Tutup tab tertentu',
    inputs: [
      { name: 'tab', type: 'varref', label: 'Variabel tab', placeholder: '$tab2', required: true }
    ],
    codegen(inputs) {
      const ref = inputs.tab && typeof inputs.tab === 'object' && inputs.tab.type === 'varref'
        ? inputs.tab.varName
        : inputs.tab || 'tab'
      return `await please.closeTab(${ref})`
    },
    validate(inputs) {
      if (!inputs.tab) return 'Variabel tab wajib diisi'
      return null
    }
  },

  {
    ...UTIL,
    id: 'util.acceptDialog',
    label: 'Accept Dialog',
    icon: '✅',
    description: 'Accept alert/confirm/prompt berikutnya; isi teks untuk prompt',
    inputs: [
      { name: 'text', type: 'text', label: 'Teks prompt (opsional)', placeholder: 'teks untuk prompt', required: false }
    ],
    codegen(inputs) {
      return inputs.text
        ? `await please.acceptDialog('${inputs.text}')`
        : `await please.acceptDialog()`
    },
    validate(_inputs) { return null }
  },

  {
    ...UTIL,
    id: 'util.dismissDialog',
    label: 'Dismiss Dialog',
    icon: '❌',
    description: 'Dismiss/cancel dialog berikutnya',
    inputs: [],
    codegen(_inputs) {
      return `await please.dismissDialog()`
    },
    validate(_inputs) { return null }
  },

  {
    ...UTIL,
    id: 'util.wait',
    label: 'Wait',
    icon: '⏳',
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
