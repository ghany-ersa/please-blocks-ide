/**
 * ComponentFactory.js
 * Mengubah definisi component (dari componentStore) menjadi block definitions
 * yang siap didaftarkan ke blockRegistry.
 *
 * Setiap method dalam satu component → satu block definition.
 *
 * Contoh input (component def):
 *   {
 *     id: 'comp-auth',
 *     name: 'Auth',
 *     exportName: 'AUTH',
 *     methods: [
 *       { name: 'login',  params: ['user'], steps: [...] },
 *       { name: 'logout', params: [],       steps: [...] }
 *     ]
 *   }
 *
 * Output (block definitions):
 *   [
 *     { id: 'comp.auth.login',  type: 'component', label: 'AUTH.login',  inputs: [...], codegen: fn },
 *     { id: 'comp.auth.logout', type: 'component', label: 'AUTH.logout', inputs: [],    codegen: fn }
 *   ]
 */

/**
 * Buat block definitions dari satu component definition.
 * @param {Object} compDef - component definition dari componentStore
 * @returns {Array} array of block definition objects
 */
export function buildComponentBlocks(compDef) {
  return compDef.methods.map(method =>
    buildMethodBlock(compDef, method)
  )
}

/**
 * Buat satu block definition dari satu method.
 */
function buildMethodBlock(compDef, method) {
  const compKey  = compDef.name.toLowerCase()
  const blockId  = `comp.${compKey}.${method.name}`
  const label    = `${compDef.exportName}.${method.name}`

  // Inputs: satu input per parameter method
  // Gunakan paramSchemas jika tersedia, fallback ke guess
  const inputs = method.params.map(paramName => {
    const ps = method.paramSchemas?.[paramName]
    return {
      name:        paramName,
      type:        ps?.inputType || guessInputType(paramName),
      schema:      ps?.schema    || null,
      label:       formatParamLabel(paramName),
      placeholder: guessPlaceholder(paramName, compDef),
      required:    true
    }
  })

  return {
    id:          blockId,
    type:        'component',
    label,
    icon:        '📦',
    color:       '#ec4899',
    colorBg:     'rgba(236,72,153,0.1)',
    description: `Jalankan ${label}()`,
    componentId:    compDef.id,
    componentName:  compDef.name,        // nama class asli (utk require + new)
    componentExport: compDef.exportName, // EXPORTNAME (variabel di kode)
    methodName:  method.name,
    inputs,
    output:      null,

    codegen(inp) {
      const args = method.params
        .map(p => {
          const val = inp[p]
          if (!val && val !== 0) return p
          if (typeof val === 'object' && val.type === 'dataref') return val.path
          if (typeof val === 'object' && val.type === 'varref')  return val.varName
          return `'${val}'`
        })
        .join(', ')
      return `await ${compDef.exportName}.${method.name}(${args})`
    },

    validate(inp) {
      for (const inputDef of inputs) {
        if (inputDef.required && !inp[inputDef.name] && inp[inputDef.name] !== 0) {
          return `${inputDef.label} wajib diisi`
        }
      }
      return null
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────

/** Fallback nama class dari nama file lowercase (jika block tak ada di registry). */
function pascal(s) {
  return String(s).replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase())
}

function guessInputType(paramName) {
  const lower = paramName.toLowerCase()
  if (lower === 'user' || lower === 'account' || lower === 'data' || lower === 'payload') {
    return 'dataref'
  }
  if (lower === 'url' || lower === 'page') return 'dataref'
  return 'value'
}

function formatParamLabel(paramName) {
  return paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/([A-Z])/g, ' $1')
}

function guessPlaceholder(paramName, compDef) {
  const lower = paramName.toLowerCase()
  if (lower === 'user' || lower === 'account')  return 'ACCOUNT.valid'
  if (lower === 'url'  || lower === 'page')     return 'URL.login'
  if (lower === 'data' || lower === 'payload')  return 'DATA.entry'
  return `${compDef.exportName.toLowerCase()}.${paramName}`
}

/**
 * Generate kode file components/[name].js dari satu component definition.
 * Dipakai oleh Code Generator (Sprint 5).
 *
 * @param {Object} compDef
 * @param {Object} [blockRegistry]
 * @param {Array}  [dataEntries] - dataRegistry.entries (utk require data yang dipakai)
 */
export function generateComponentFile(compDef, blockRegistry = null, dataEntries = []) {
  // Deteksi sibling component yang dipanggil di dalam method (nested component).
  // Sibling di-require & di-instansiasi di dalam constructor sebagai variabel object.
  const ownPrefix = `comp.${compDef.name.toLowerCase()}`
  const siblingMap = new Map()  // exportName → { className, exportName, fileName }
  for (const method of compDef.methods) {
    for (const step of method.steps || []) {
      const parts = String(step.blockId).split('.')
      if (parts[0] !== 'comp' || parts.length < 3 || `comp.${parts[1]}` === ownPrefix) continue
      const block = blockRegistry?.getById?.(step.blockId)
      const className  = block?.componentName   || pascal(parts[1])
      const exportName = block?.componentExport  || parts[1].toUpperCase()
      siblingMap.set(exportName, { className, exportName, fileName: className.toLowerCase() })
    }
  }
  const siblings = [...siblingMap.values()]

  // Kumpulkan data group yang dipakai (dataref) → require per file data.
  const dataImports = collectComponentDataImports(compDef, dataEntries)

  const lines = []
  // require data: const { URL, ACCOUNT } = require('../data/main')
  for (const { filePath, groups } of Object.values(dataImports)) {
    const requirePath = `../${filePath.replace(/\.js$/, '')}`
    lines.push(`const { ${groups.join(', ')} } = require('${requirePath}')`)
  }
  // require class sibling
  for (const s of siblings) lines.push(`const ${s.className} = require('./${s.fileName}')`)

  lines.push(``)
  lines.push(`class ${compDef.name} {`)
  lines.push(`    constructor(please) {`)
  lines.push(`        this.please = please`)
  // Sibling component disimpan di this.<EXPORTNAME>
  for (const s of siblings) lines.push(`        this.${s.exportName} = new ${s.className}(please)`)
  lines.push(`    }`)

  for (const method of compDef.methods) {
    const params = method.params.join(', ')
    lines.push(``, `    async ${method.name}(${params}) {`)

    if (method.steps?.length && blockRegistry) {
      for (const step of method.steps) {
        const block = blockRegistry.getById?.(step.blockId)
        if (block) {
          try {
            let code = block.codegen(step.inputs || {})
            // please.* → this.please.*
            code = code.replace(/\bplease\./g, 'this.please.')
            // Method sekelas: EXPORTNAME.method() → this.method()
            if (`comp.${String(step.blockId).split('.')[1]}` === ownPrefix) {
              code = code.replace(/^await\s+[A-Z][A-Za-z0-9_]*\./, 'await this.')
            } else {
              // Sibling component: EXPORTNAME.method() → this.EXPORTNAME.method()
              for (const s of siblings) {
                code = code.replace(
                  new RegExp(`\\bawait\\s+${s.exportName}\\.`),
                  `await this.${s.exportName}.`
                )
              }
            }
            lines.push(`        ${code}`)
          } catch {
            lines.push(`        // [!] error pada step: ${step.blockId}`)
          }
        }
      }
    } else if (method.steps?.length) {
      // blockRegistry tidak tersedia — fallback placeholder per step
      for (const step of method.steps) {
        lines.push(`        // step: ${step.blockId}`)
      }
    } else {
      lines.push(`        // TODO: implementasi`)
    }

    lines.push(`    }`)
  }

  lines.push(`}`, ``, `module.exports = ${compDef.name}`)
  return lines.join('\n')
}

/**
 * Kumpulkan data group yang dipakai (dataref) di seluruh step component,
 * dikelompokkan per file data → { fileId: { filePath, groups: [..] } }.
 * Group = segmen pertama path dataref (mis. 'ACCOUNT.valid' → 'ACCOUNT').
 */
function collectComponentDataImports(compDef, dataEntries = []) {
  // Index group → { fileId, filePath } dari entries (segmen pertama path entry).
  const groupInfo = {}
  for (const e of dataEntries) {
    const group = String(e.path).split('.')[0]
    if (group && !groupInfo[group]) {
      groupInfo[group] = { fileId: e.fileId, filePath: e.filePath }
    }
  }

  const importsMap = {}  // fileId → { filePath, groups: Set }
  for (const method of compDef.methods) {
    for (const step of method.steps || []) {
      for (const val of Object.values(step.inputs || {})) {
        if (!val || typeof val !== 'object' || val.type !== 'dataref') continue
        const group = String(val.path).split('.')[0]
        const info  = groupInfo[group]
        if (!info) continue
        if (!importsMap[info.fileId]) importsMap[info.fileId] = { filePath: info.filePath, groups: new Set() }
        importsMap[info.fileId].groups.add(group)
      }
    }
  }
  for (const v of Object.values(importsMap)) v.groups = [...v.groups]
  return importsMap
}
