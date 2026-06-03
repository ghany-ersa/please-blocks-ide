// Definisi blok kategori Actions
// Mapping ke: please.click(), fill(), fillAndEnter(), clear(), datepicker(), uploadFile(), scrollTo()

export default [
  {
    id: 'action.click',
    type: 'action',
    label: 'Click',
    icon: '🖱️',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    description: 'Klik element di halaman',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',     placeholder: 'button submit', required: true },
      { name: 'selector', type: 'selector', label: 'Selector',  placeholder: '#submit',       required: true },
      { name: 'wait',     type: 'number',   label: 'Wait (ms)', placeholder: 'opsional',      required: false }
    ],
    output: null,
    codegen(inputs) {
      const args = [`'${inputs.label || ''}'`, `'${inputs.selector || ''}'`]
      if (inputs.wait) args.push(inputs.wait)
      return `await please.click(${args.join(', ')})`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      return null
    }
  },

  {
    id: 'action.fill',
    type: 'action',
    label: 'Fill Input',
    icon: '⌨️',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    description: 'Isi field dengan nilai tertentu',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',    placeholder: 'input username', required: true },
      { name: 'selector', type: 'selector', label: 'Selector', placeholder: '#username',      required: true },
      { name: 'value',    type: 'value',    label: 'Nilai',    placeholder: 'student',        required: true }
    ],
    output: null,
    codegen(inputs) {
      const val = inputs.value?.path || `'${inputs.value || ''}'`
      return `await please.fill('${inputs.label || ''}', '${inputs.selector || ''}', ${val})`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      if (!inputs.value && inputs.value !== 0) return 'Nilai wajib diisi'
      return null
    }
  },

  {
    id: 'action.fillAndEnter',
    type: 'action',
    label: 'Fill & Enter',
    icon: '⏎',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    description: 'Isi field lalu tekan Enter',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',    placeholder: 'input search', required: true },
      { name: 'selector', type: 'selector', label: 'Selector', placeholder: '#search',      required: true },
      { name: 'value',    type: 'value',    label: 'Nilai',    placeholder: 'kata kunci',   required: true }
    ],
    output: null,
    codegen(inputs) {
      const val = inputs.value?.path || `'${inputs.value || ''}'`
      return `await please.fillAndEnter('${inputs.label || ''}', '${inputs.selector || ''}', ${val})`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      if (!inputs.value && inputs.value !== 0) return 'Nilai wajib diisi'
      return null
    }
  },

  {
    id: 'action.clear',
    type: 'action',
    label: 'Clear Input',
    icon: '🗑️',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    description: 'Kosongkan nilai dari sebuah input field',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',    placeholder: 'input username', required: true },
      { name: 'selector', type: 'selector', label: 'Selector', placeholder: '#username',      required: true }
    ],
    output: null,
    codegen(inputs) {
      return `await please.clear('${inputs.label || ''}', '${inputs.selector || ''}')`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      return null
    }
  },

  {
    id: 'action.datepicker',
    type: 'action',
    label: 'Date Picker',
    icon: '📅',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    description: 'Isi input date picker dengan format tanggal',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',    placeholder: 'input tanggal lahir', required: true },
      { name: 'selector', type: 'selector', label: 'Selector', placeholder: '#birthdate',          required: true },
      { name: 'value',    type: 'text',     label: 'Tanggal',  placeholder: '2000-01-01',          required: true }
    ],
    output: null,
    codegen(inputs) {
      return `await please.datepicker('${inputs.label || ''}', '${inputs.selector || ''}', '${inputs.value || ''}')`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      if (!inputs.value) return 'Tanggal wajib diisi'
      return null
    }
  },

  {
    id: 'action.uploadFile',
    type: 'action',
    label: 'Upload File',
    icon: '📎',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    description: 'Upload file ke input type=file',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',       placeholder: 'input upload foto', required: true },
      { name: 'selector', type: 'selector', label: 'Selector',    placeholder: 'input[type=file]',  required: true },
      { name: 'path',     type: 'text',     label: 'Path file',   placeholder: '/path/to/file.jpg', required: true }
    ],
    output: null,
    codegen(inputs) {
      return `await please.uploadFile('${inputs.label || ''}', '${inputs.selector || ''}', '${inputs.path || ''}')`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      if (!inputs.path) return 'Path file wajib diisi'
      return null
    }
  },

  {
    id: 'action.scrollTo',
    type: 'action',
    label: 'Scroll To',
    icon: '📜',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    description: 'Scroll halaman ke posisi element',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',    placeholder: 'tombol submit', required: true },
      { name: 'selector', type: 'selector', label: 'Selector', placeholder: '#submit',       required: true }
    ],
    output: null,
    codegen(inputs) {
      return `await please.scrollTo('${inputs.label || ''}', '${inputs.selector || ''}')`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      return null
    }
  }
]
