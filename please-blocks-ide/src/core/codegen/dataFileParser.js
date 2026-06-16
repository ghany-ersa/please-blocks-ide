/**
 * dataFileParser.js — Reverse Codegen (data/*.js)
 *
 * Kebalikan dari DataFactory.generateDataFile(). Parse `module.exports = {...}`
 * via AST (TANPA require/eval — browser-safe, tidak mengeksekusi process.env)
 * menjadi shape file dataRegistry: { id, filename, label, description, groups }.
 *
 * Round-trip process.env (invers DataFactory.formatFieldValue):
 *   - process.env.X                       → "process.env.X"
 *   - `${process.env.BASE_URL}/login`     → "process.env.BASE_URL/login"
 */

import { parseModule } from './statementParser.js'

/**
 * @param {string} source   - isi file data/*.js
 * @param {string} filename - nama file (mis. 'main.js' atau 'main')
 * @returns {{ file: Object|null, warnings: string[] }}
 */
export function parseDataFile(source, filename) {
  const warnings = []
  const id = String(filename).replace(/\.js$/, '')

  let ast
  try {
    ast = parseModule(source)
  } catch (err) {
    return { file: null, warnings: [`Gagal parse data/${filename}: ${err.message}`] }
  }

  const objNode = findModuleExportsObject(ast)
  if (!objNode) {
    return { file: null, warnings: [`data/${filename}: tidak ada 'module.exports = { ... }'`] }
  }

  const groups = objectExpressionToPlain(objNode, warnings, id)

  return {
    file: { id, filename: id, label: id, description: '', groups },
    warnings
  }
}

// ── AST: cari module.exports = ObjectExpression ─────────────────────

function findModuleExportsObject(ast) {
  for (const node of ast.program.body) {
    if (node.type !== 'ExpressionStatement') continue
    const e = node.expression
    if (e?.type !== 'AssignmentExpression' || e.operator !== '=') continue
    const left = e.left
    if (left?.type === 'MemberExpression'
        && left.object?.name === 'module'
        && left.property?.name === 'exports'
        && e.right?.type === 'ObjectExpression') {
      return e.right
    }
  }
  return null
}

// ── ObjectExpression → plain object ─────────────────────────────────

function objectExpressionToPlain(node, warnings, ctxPath) {
  const out = {}
  for (const prop of node.properties) {
    if (prop.type !== 'ObjectProperty' || prop.computed) {
      warnings.push(`${ctxPath}: property tidak didukung (spread/computed/method) dilewati`)
      continue
    }
    const key = prop.key.type === 'Identifier' ? prop.key.name
              : prop.key.type === 'StringLiteral' ? prop.key.value
              : null
    if (key == null) {
      warnings.push(`${ctxPath}: key property tidak dikenali, dilewati`)
      continue
    }
    out[key] = valueNodeToPlain(prop.value, warnings, `${ctxPath}.${key}`)
  }
  return out
}

function valueNodeToPlain(node, warnings, ctxPath) {
  switch (node.type) {
    case 'ObjectExpression':
      return objectExpressionToPlain(node, warnings, ctxPath)
    case 'StringLiteral':
      return node.value
    case 'NumericLiteral':
      return node.value
    case 'BooleanLiteral':
      return node.value
    case 'NullLiteral':
      return null
    case 'ArrayExpression':
      return node.elements.map((el, i) =>
        el ? valueNodeToPlain(el, warnings, `${ctxPath}[${i}]`) : null)
    case 'MemberExpression': {
      const env = processEnvName(node)
      if (env) return `process.env.${env}`
      warnings.push(`${ctxPath}: ekspresi member tidak dikenali, disimpan kosong`)
      return ''
    }
    case 'TemplateLiteral':
      return templateLiteralToString(node, warnings, ctxPath)
    case 'UnaryExpression':
      if (node.operator === '-' && node.argument.type === 'NumericLiteral') {
        return -node.argument.value
      }
      warnings.push(`${ctxPath}: unary tidak didukung, disimpan kosong`)
      return ''
    default:
      warnings.push(`${ctxPath}: nilai bertipe ${node.type} tidak didukung, disimpan kosong`)
      return ''
  }
}

/**
 * Template literal → string bentuk-tersimpan.
 * `${process.env.BASE_URL}/login` → "process.env.BASE_URL/login"
 * Ekspresi non-env → warning + placeholder ${...} apa adanya.
 */
function templateLiteralToString(node, warnings, ctxPath) {
  let result = ''
  node.quasis.forEach((quasi, i) => {
    result += quasi.cooked ?? quasi.value?.cooked ?? ''
    if (i < node.expressions.length) {
      const expr = node.expressions[i]
      const env = processEnvName(expr)
      if (env) {
        result += `process.env.${env}`
      } else {
        warnings.push(`${ctxPath}: ekspresi template non-env tidak dapat di-round-trip`)
        result += '${?}'
      }
    }
  })
  return result
}

/** MemberExpression process.env.X → 'X' (atau null jika bukan process.env.*) */
function processEnvName(node) {
  if (node?.type !== 'MemberExpression' || node.computed) return null
  const obj = node.object
  if (obj?.type === 'MemberExpression'
      && obj.object?.name === 'process'
      && obj.property?.name === 'env'
      && node.property?.type === 'Identifier') {
    return node.property.name
  }
  return null
}
