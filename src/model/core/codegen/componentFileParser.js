/**
 * componentFileParser.js — Reverse Codegen (components/*.js)
 *
 * Kebalikan dari ComponentFactory.generateComponentFile(). Parse
 * `class X { constructor(master){...} async method(params){...} }` via AST
 * menjadi component def: { name, exportName, methods: [{ name, params, steps }] }.
 *
 * Body method diparse memakai statementParser bersama (sama vocabulary dengan
 * body it()): please.*, seeText, getText/getValue, component call, rawCode.
 */

import {
  parseModule,
  parseBodyStatements,
  buildComponentIndex,
  indexLeadingComments,
  mapArgNInputs
} from './statementParser.js'

/**
 * @param {string} source
 * @param {Object} [opts]
 * @param {Object} [opts.blockRegistry]  - resolve nested component call
 * @param {Map}    [opts.componentIndex] - override index (preview)
 * @returns {{ component: Object|null, warnings: string[] }}
 */
export function parseComponentFile(source, { blockRegistry = null, componentIndex = null } = {}) {
  const warnings = []
  let ast
  try {
    ast = parseModule(source)
  } catch (err) {
    return { component: null, warnings: [`Gagal parse component: ${err.message}`] }
  }

  const classes = ast.program.body.filter(n => n.type === 'ClassDeclaration')
  if (!classes.length) {
    return { component: null, warnings: ['Tidak ada class di file component.'] }
  }
  if (classes.length > 1) {
    warnings.push(`Ditemukan ${classes.length} class — hanya class pertama yang diimpor.`)
  }

  const classNode = classes[0]
  const name = classNode.id?.name || 'Component'
  const exportName = name.toUpperCase()

  const ctx = {
    warnings,
    commentsByLine: indexLeadingComments(ast.comments),
    componentIndex: componentIndex || (blockRegistry ? buildComponentIndex(blockRegistry) : new Map()),
    selfPrefix: `comp.${name.toLowerCase()}`,   // resolusi this.method() → component ini
    source
  }

  const methods = []
  for (const member of classNode.body.body) {
    if (member.type !== 'ClassMethod') continue
    if (member.kind === 'constructor') continue
    const methodName = member.key?.name || member.key?.value
    if (!methodName) continue
    if (methodName === '_bind') continue   // wiring nested component, bukan method user

    const params = (member.params || []).map(p => paramName(p, warnings))
    const body = member.body?.type === 'BlockStatement' ? member.body.body : []
    let steps = parseBodyStatements(body, { ...ctx, scopeVars: new Set() })
    // Resolusi argN (nested component call) → nama field block sebenarnya
    if (blockRegistry) {
      steps = steps.map(s => ({ ...s, inputs: mapArgNInputs(s, blockRegistry) }))
    }

    methods.push({ name: methodName, params, steps })
  }

  return { component: { name, exportName, methods }, warnings }
}

/** Ambil nama parameter dari berbagai bentuk (Identifier, default, rest). */
function paramName(p, warnings) {
  if (p.type === 'Identifier') return p.name
  if (p.type === 'AssignmentPattern' && p.left?.type === 'Identifier') return p.left.name
  if (p.type === 'RestElement' && p.argument?.type === 'Identifier') return p.argument.name
  warnings.push(`Parameter bertipe ${p.type} tidak dikenali, dilewati.`)
  return p.name || '_param'
}
