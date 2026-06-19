/**
 * specParser.js — Reverse Codegen
 * Parse file `.spec.js` (mungkin diedit manual) → struktur canvas Feature.
 *
 * Kebalikan dari specGenerator.js. Logika statement→step ada di
 * statementParser.js (dipakai bersama componentFileParser). File ini hanya
 * menangani traversal describe()/it().
 *
 * Output:
 *   {
 *     features: [{ label, testCases: [{ label, steps: [{ blockId, inputs, note? }] }] }],
 *     warnings: [string]
 *   }
 */

import {
  parseModule,
  parseBodyStatements,
  buildComponentIndex,
  indexLeadingComments
} from './statementParser.js'

/**
 * @param {string} source        - isi file .spec.js
 * @param {Object} [opts]
 * @param {Object} [opts.blockRegistry] - resolve component call → blockId
 * @param {Map}    [opts.componentIndex] - override index (preview tanpa registry)
 * @returns {{ features: Array, warnings: string[] }}
 */
export function parseSpec(source, { blockRegistry = null, componentIndex = null } = {}) {
  const warnings = []
  let ast
  try {
    ast = parseModule(source)
  } catch (err) {
    return { features: [], warnings: [`Gagal parse file: ${err.message}`] }
  }

  const ctx = {
    warnings,
    commentsByLine: indexLeadingComments(ast.comments),
    componentIndex: componentIndex || (blockRegistry ? buildComponentIndex(blockRegistry) : new Map()),
    source
  }

  const features = []
  for (const node of ast.program.body) {
    // Playwright: test.describe(...) atau mocha: describe(...)
    const describe = matchCallNamed(node, 'describe') || matchMemberCall(node, 'test', 'describe')
    if (!describe) continue
    features.push(parseDescribe(describe, ctx))
  }

  if (!features.length && !warnings.length) {
    warnings.push('Tidak ada blok describe() yang ditemukan di file.')
  }
  return { features, warnings }
}

// ── describe() → Feature ────────────────────────────────────────────

function parseDescribe(call, ctx) {
  const label = stringArg(call.arguments[0]) ?? 'Feature'
  const body = fnBody(call.arguments[1])
  if (!body) {
    ctx.warnings.push(`describe('${label}') tidak punya body fungsi yang valid.`)
    return { label, testCases: [] }
  }

  const testCases = []
  for (const stmt of body) {
    // Playwright: test(...) atau mocha: it(...)
    const it = matchCallNamed(stmt, 'it') || matchCallNamed(stmt, 'test')
    if (!it) {
      ctx.warnings.push(`Statement di dalam describe('${label}') diabaikan (bukan it()/test()).`)
      continue
    }
    testCases.push(parseIt(it, ctx))
  }
  return { label, testCases }
}

// ── it() → TestCase ─────────────────────────────────────────────────

function parseIt(call, ctx) {
  const label = stringArg(call.arguments[0]) ?? 'Test Case'
  const body = fnBody(call.arguments[1]) || []
  // scopeVars baru per test case (varref hanya valid dalam it() yang sama)
  const steps = parseBodyStatements(body, { ...ctx, scopeVars: new Set() })
  return { label, steps }
}

// ── Local AST helpers (khusus describe/it) ──────────────────────────

/** ExpressionStatement berupa call ke fungsi top-level bernama `name`. */
function matchCallNamed(stmt, name) {
  if (stmt?.type !== 'ExpressionStatement') return null
  const call = stmt.expression
  if (call?.type === 'CallExpression' && call.callee?.name === name) return call
  return null
}

/** ExpressionStatement berupa member call: obj.method(...) — mis. test.describe(...). */
function matchMemberCall(stmt, obj, method) {
  if (stmt?.type !== 'ExpressionStatement') return null
  const call = stmt.expression
  if (call?.type !== 'CallExpression') return null
  const callee = call.callee
  if (callee?.type === 'MemberExpression' && callee.object?.name === obj && callee.property?.name === method) return call
  return null
}

function stringArg(node) {
  return node?.type === 'StringLiteral' ? node.value : null
}

/** Ambil body[] dari arrow/function expression (sync atau async). */
function fnBody(fn) {
  if (!fn) return null
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') return null
  if (fn.body?.type === 'BlockStatement') return fn.body.body
  return null
}
