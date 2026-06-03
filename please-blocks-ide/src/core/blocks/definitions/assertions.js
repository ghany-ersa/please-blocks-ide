// Definisi blok kategori Assertions
// Mapping ke: please.see(), equal(), notEqual(), getText(), getValue(), fail()

export default [
  {
    id: 'assert.seeText',
    type: 'assertion',
    label: 'See Text',
    icon: '👁️',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    description: 'Assert teks tertentu muncul pada element',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',    placeholder: 'pesan error',             required: true },
      { name: 'selector', type: 'selector', label: 'Selector', placeholder: '//div[@id="error"]',      required: true },
      { name: 'expected', type: 'value',    label: 'Teks yang diharapkan', placeholder: 'Your username is invalid!', required: true }
    ],
    output: null,
    codegen(inputs) {
      const exp = inputs.expected?.path || `'${inputs.expected || ''}'`
      return `await please.see('${inputs.label || ''}', '${inputs.selector || ''}', ${exp})`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      if (!inputs.expected) return 'Teks yang diharapkan wajib diisi'
      return null
    }
  },

  {
    id: 'assert.getText',
    type: 'assertion',
    label: 'Get Text',
    icon: '📖',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    description: 'Ambil teks dari element, simpan ke variabel',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',           placeholder: 'header halaman', required: true },
      { name: 'selector', type: 'selector', label: 'Selector',        placeholder: '//h1',           required: true },
      { name: 'varName',  type: 'text',     label: 'Simpan ke variabel', placeholder: 'headerText',  required: true }
    ],
    output: 'text',
    codegen(inputs) {
      const varName = inputs.varName || 'result'
      return `const ${varName} = await please.getText('${inputs.label || ''}', '${inputs.selector || ''}')`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      if (!inputs.varName) return 'Nama variabel wajib diisi'
      return null
    }
  },

  {
    id: 'assert.getValue',
    type: 'assertion',
    label: 'Get Value',
    icon: '💾',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    description: 'Ambil nilai dari input field, simpan ke variabel',
    inputs: [
      { name: 'label',    type: 'text',     label: 'Label',           placeholder: 'input username', required: true },
      { name: 'selector', type: 'selector', label: 'Selector',        placeholder: '#username',      required: true },
      { name: 'varName',  type: 'text',     label: 'Simpan ke variabel', placeholder: 'usernameVal', required: true }
    ],
    output: 'value',
    codegen(inputs) {
      const varName = inputs.varName || 'result'
      return `const ${varName} = await please.getValue('${inputs.label || ''}', '${inputs.selector || ''}')`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      if (!inputs.varName) return 'Nama variabel wajib diisi'
      return null
    }
  },

  {
    id: 'assert.equal',
    type: 'assertion',
    label: 'Assert Equal',
    icon: '✅',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    description: 'Assert nilai aktual === nilai yang diharapkan',
    inputs: [
      { name: 'actual',   type: 'varref', label: 'Nilai aktual',       placeholder: '$headerText',             required: true },
      { name: 'expected', type: 'value',  label: 'Nilai yang diharapkan', placeholder: 'Logged In Successfully', required: true },
      { name: 'message',  type: 'text',   label: 'Pesan error (opsional)', placeholder: 'opsional',            required: false }
    ],
    output: null,
    codegen(inputs) {
      const actual   = inputs.actual?.varName   || inputs.actual   || 'actual'
      const expected = inputs.expected?.path    || `'${inputs.expected || ''}'`
      const args     = [actual, expected]
      if (inputs.message) args.push(`'${inputs.message}'`)
      return `await please.equal(${args.join(', ')})`
    },
    validate(inputs) {
      if (!inputs.actual)   return 'Nilai aktual wajib diisi'
      if (!inputs.expected) return 'Nilai yang diharapkan wajib diisi'
      return null
    }
  },

  {
    id: 'assert.notEqual',
    type: 'assertion',
    label: 'Assert Not Equal',
    icon: '❌',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    description: 'Assert nilai aktual !== nilai yang diharapkan',
    inputs: [
      { name: 'actual',   type: 'varref', label: 'Nilai aktual',          placeholder: '$result',    required: true },
      { name: 'expected', type: 'value',  label: 'Nilai yang tidak diharapkan', placeholder: 'error', required: true },
      { name: 'message',  type: 'text',   label: 'Pesan error (opsional)', placeholder: 'opsional',  required: false }
    ],
    output: null,
    codegen(inputs) {
      const actual   = inputs.actual?.varName || inputs.actual   || 'actual'
      const expected = inputs.expected?.path  || `'${inputs.expected || ''}'`
      const args     = [actual, expected]
      if (inputs.message) args.push(`'${inputs.message}'`)
      return `await please.notEqual(${args.join(', ')})`
    },
    validate(inputs) {
      if (!inputs.actual)   return 'Nilai aktual wajib diisi'
      if (!inputs.expected) return 'Nilai yang tidak diharapkan wajib diisi'
      return null
    }
  },

  {
    id: 'assert.fail',
    type: 'assertion',
    label: 'Force Fail',
    icon: '💥',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    description: 'Gagalkan test secara eksplisit dengan custom message',
    inputs: [
      { name: 'message', type: 'text', label: 'Pesan kegagalan', placeholder: 'Test digagalkan karena...', required: false }
    ],
    output: null,
    codegen(inputs) {
      return inputs.message
        ? `await please.fail('${inputs.message}')`
        : `await please.fail()`
    },
    validate(_inputs) {
      return null
    }
  }
]
