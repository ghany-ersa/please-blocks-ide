/**
 * statementParser.js — Reverse Codegen (shared)
 *
 * Mengubah satu statement AST (hasil @babel/parser) menjadi satu canvas step
 * { blockId, inputs, note? }. Dipakai bersama oleh:
 *   - specParser.js          (body it())
 *   - componentFileParser.js (body method class component)
 *
 * Method `please.*` dipetakan ke block built-in; pola majemuk seperti
 * `equal(await see(...))` dikenali; getText/getValue jadi varref scope;
 * component call (AUTH.login) di-resolve via componentIndex; sisanya jadi
 * step `util.rawCode` (fallback) agar tidak hilang saat di-generate ulang.
 *
 * ctx = {
 *   warnings: string[],
 *   commentsByLine: Map<line, note>,
 *   componentIndex: Map<EXPORTNAME, 'comp.<name>'>,
 *   source: string,
 *   scopeVars: Set<string>   // varName getText/getValue yang sudah dideklarasi
 * }
 */

import { parse } from '@babel/parser'

// ── Statement → Step ────────────────────────────────────────────────

/**
 * @param {Object} stmt - node statement AST
 * @param {Object} ctx
 * @returns {{ blockId, inputs, note? } | null}
 */
export function parseStatementToStep(stmt, ctx) {
  const note = ctx.commentsByLine?.get(stmt.loc?.start.line) || undefined

  // const VAR = await please.getText/getValue(label, selector)
  if (stmt.type === 'VariableDeclaration') {
    const decl = stmt.declarations[0]
    const varName = decl?.id?.name
    const callee = unwrapAwait(decl?.init)
    const pleaseMethod = matchPleaseCall(callee)
    if (varName && pleaseMethod && (pleaseMethod.method === 'getText' || pleaseMethod.method === 'getValue')) {
      const [label, selector] = pleaseMethod.args
      return withNote(note, {
        blockId: pleaseMethod.method === 'getText' ? 'assert.getText' : 'assert.getValue',
        inputs: { label: litStr(label), selector: litStr(selector), varName }
      })
    }
    return rawStep(stmt, ctx, note)
  }

  if (stmt.type !== 'ExpressionStatement') return rawStep(stmt, ctx, note)

  const expr = unwrapAwait(stmt.expression)

  // assert.seeText → please.equal(await please.see(label, selector), expected)
  const seeText = matchSeeText(expr, ctx)
  if (seeText) {
    return withNote(note, {
      blockId: 'assert.seeText',
      inputs: { label: seeText.label, selector: seeText.selector, expected: seeText.expected }
    })
  }

  const pleaseCall = matchPleaseCall(expr)
  if (pleaseCall) {
    const step = mapPleaseMethod(pleaseCall, ctx)
    if (step) return withNote(note, step)
    return rawStep(stmt, ctx, note)
  }

  // Component call: await AUTH.login(ACCOUNT.valid)
  const compStep = matchComponentCall(expr, ctx)
  if (compStep) return withNote(note, compStep)

  return rawStep(stmt, ctx, note)
}

/**
 * Parse semua statement dalam satu body (array), dengan tracking scopeVars
 * untuk varref. Mengembalikan array steps.
 */
export function parseBodyStatements(body, ctx) {
  const steps = []
  const scopeVars = ctx.scopeVars || new Set()
  for (const stmt of body) {
    const step = parseStatementToStep(stmt, { ...ctx, scopeVars })
    if (!step) continue
    if (step.inputs?.varName) scopeVars.add(step.inputs.varName)
    steps.push(step)
  }
  return steps
}

/**
 * Map please.METHOD(args) → { blockId, inputs } untuk method built-in.
 */
function mapPleaseMethod({ method, args }, ctx) {
  switch (method) {
    case 'goTo':
      return { blockId: 'nav.goTo', inputs: { urlTarget: valueFrom(args[0], ctx) } }
    case 'checkWhere':
      return { blockId: 'nav.checkWhere', inputs: { urlExpected: valueFrom(args[0], ctx) } }

    case 'click':
    case 'scrollTo':
    case 'clear': {
      const inputs = { label: litStr(args[0]), selector: litStr(args[1]) }
      if (method === 'click' && args[2] !== undefined) inputs.wait = numFrom(args[2])
      return { blockId: `action.${method}`, inputs }
    }

    case 'fill':
    case 'fillAndEnter':
    case 'datepicker':
      return {
        blockId: `action.${method}`,
        inputs: { label: litStr(args[0]), selector: litStr(args[1]), value: valueFrom(args[2], ctx) }
      }
    case 'uploadFile':
      return {
        blockId: 'action.uploadFile',
        inputs: { label: litStr(args[0]), selector: litStr(args[1]), path: valueFrom(args[2], ctx) }
      }

    case 'equal':
    case 'notEqual': {
      const inputs = { actual: valueFrom(args[0], ctx), expected: valueFrom(args[1], ctx) }
      if (args[2] !== undefined) inputs.message = litStr(args[2])
      return { blockId: `assert.${method}`, inputs }
    }
    case 'fail':
      return { blockId: 'assert.fail', inputs: args[0] !== undefined ? { message: litStr(args[0]) } : {} }

    case 'wait':
      return { blockId: 'util.wait', inputs: args[0] !== undefined ? { duration: numFrom(args[0]) } : {} }

    default:
      return null  // tak dikenal → caller pakai rawStep
  }
}

// ── Pattern matchers ────────────────────────────────────────────────

/** please.equal(await please.see(label, selector), expected) */
function matchSeeText(expr, ctx) {
  if (!isCall(expr) || !isPleaseMember(expr.callee, 'equal')) return null
  const inner = unwrapAwait(expr.arguments[0])
  if (!isCall(inner) || !isPleaseMember(inner.callee, 'see')) return null
  return {
    label: litStr(inner.arguments[0]),
    selector: litStr(inner.arguments[1]),
    expected: valueFrom(expr.arguments[1], ctx)
  }
}

/** please.METHOD(...args) → { method, args } */
function matchPleaseCall(expr) {
  if (!isCall(expr)) return null
  const m = expr.callee
  if (m?.type !== 'MemberExpression' || m.object?.name !== 'please') return null
  return { method: m.property?.name, args: expr.arguments }
}

/** AUTH.login(...args) → { blockId, inputs } jika AUTH dikenal di componentIndex */
function matchComponentCall(expr, ctx) {
  if (!isCall(expr) || expr.callee?.type !== 'MemberExpression') return null
  const objName = expr.callee.object?.name
  const methodName = expr.callee.property?.name
  if (!objName || !methodName) return null

  const prefix = ctx.componentIndex?.get(objName)  // e.g. 'comp.auth'
  if (!prefix) return null
  const blockId = `${prefix}.${methodName}`

  // Nama field param tidak diketahui dari AST → pakai posisi arg0..N.
  // mapArgNInputs() memetakan ke nama field sebenarnya dari registry nanti.
  const inputs = {}
  expr.arguments.forEach((a, i) => { inputs[`arg${i}`] = valueFrom(a, ctx) })
  return { blockId, inputs }
}

// ── Value extraction ────────────────────────────────────────────────

/**
 * Ubah AST argumen → nilai input canvas.
 *   StringLiteral 'x'              → 'x'
 *   NumericLiteral 42              → 42
 *   Identifier scope               → { type: 'varref', varName }
 *   Identifier / Member URL.login  → { type: 'dataref', path: 'URL.login' }
 */
function valueFrom(node, ctx) {
  if (node == null) return ''
  if (node.type === 'StringLiteral') return node.value
  if (node.type === 'NumericLiteral') return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map(q => q.cooked).join('')
  }
  if (node.type === 'Identifier' && ctx?.scopeVars?.has(node.name)) {
    return { type: 'varref', varName: node.name }
  }
  const path = memberPath(node)
  if (path) return { type: 'dataref', path }
  return ''
}

/** Khusus field string literal (label/selector/message). */
function litStr(node) {
  if (node == null) return ''
  if (node.type === 'StringLiteral') return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map(q => q.cooked).join('')
  }
  const path = memberPath(node)
  if (path) return { type: 'dataref', path }
  return ''
}

function numFrom(node) {
  if (node?.type === 'NumericLiteral') return node.value
  if (node?.type === 'StringLiteral') { const n = Number(node.value); return isNaN(n) ? node.value : n }
  return ''
}

/** Identifier 'URL' atau MemberExpression 'URL.login.url' → dotted path string. */
function memberPath(node) {
  if (node?.type === 'Identifier') return node.name
  if (node?.type === 'MemberExpression' && !node.computed) {
    const obj = memberPath(node.object)
    const prop = node.property?.name
    if (obj && prop) return `${obj}.${prop}`
  }
  return null
}

// ── Raw-code fallback ───────────────────────────────────────────────

function rawStep(stmt, ctx, note) {
  const code = sliceSource(stmt, ctx) ?? '/* kode tidak terbaca */'
  ctx.warnings?.push(`Baris tidak dikenali, disimpan sebagai Raw Code: ${code}`)
  return withNote(note, { blockId: 'util.rawCode', inputs: { code } })
}

function sliceSource(stmt, ctx) {
  if (ctx.source && typeof stmt.start === 'number' && typeof stmt.end === 'number') {
    return ctx.source.slice(stmt.start, stmt.end).trim()
  }
  return null
}

// ── AST helpers (di-export untuk dipakai parser lain) ────────────────

export function isCall(node) { return node?.type === 'CallExpression' }

export function isPleaseMember(callee, method) {
  return callee?.type === 'MemberExpression'
    && callee.object?.name === 'please'
    && callee.property?.name === method
}

export function unwrapAwait(node) {
  return node?.type === 'AwaitExpression' ? node.argument : node
}

export function withNote(note, step) {
  if (note) step.note = note
  return step
}

/** exportName(UPPER) → block id prefix 'comp.<name>' dari blockRegistry. */
export function buildComponentIndex(blockRegistry) {
  const map = new Map()
  const all = blockRegistry?.all || {}
  for (const block of Object.values(all)) {
    if (block.type !== 'component') continue
    const parts = block.id.split('.')  // comp.<name>.<method>
    if (parts.length >= 3 && parts[0] === 'comp') {
      map.set(parts[1].toUpperCase(), `comp.${parts[1]}`)
    }
  }
  return map
}

/** Komentar baris → note untuk statement di baris berikutnya. */
export function indexLeadingComments(comments) {
  const byLine = new Map()
  for (const c of comments || []) {
    if (c.type !== 'CommentLine') continue
    const targetLine = c.loc.end.line + 1
    const text = c.value.trim()
    const existing = byLine.get(targetLine)
    byLine.set(targetLine, existing ? `${existing}\n${text}` : text)
  }
  return byLine
}

/**
 * Petakan inputs arg0/arg1/... (component call) ke nama field block sebenarnya.
 * Dipakai canvasStore (import canvas) dan componentFileParser (nested call).
 * Jika tidak ada argN atau block tidak dikenal → kembalikan salinan apa adanya.
 */
export function mapArgNInputs(step, blockRegistry) {
  const inputs = step.inputs || {}
  const hasArgN = Object.keys(inputs).some(k => /^arg\d+$/.test(k))
  if (!hasArgN || !blockRegistry) return { ...inputs }

  const block = blockRegistry.getById?.(step.blockId)
  if (!block?.inputs?.length) return { ...inputs }

  const mapped = {}
  block.inputs.forEach((def, i) => {
    if (inputs[`arg${i}`] !== undefined) mapped[def.name] = inputs[`arg${i}`]
  })
  return mapped
}

/** Parse seluruh sumber JS → AST module (helper umum untuk parser file). */
export function parseModule(source) {
  return parse(source, { sourceType: 'module', errorRecovery: true, ranges: true })
}
