import { describe, it, expect } from 'vitest'
import {
  parseStatementToStep,
  parseBodyStatements,
  buildComponentIndex,
  indexLeadingComments,
  mapArgNInputs,
  isCall,
  isPleaseMember,
  unwrapAwait,
  withNote,
  parseModule
} from './statementParser.js'

// ── Helpers ───────────────────────────────────────────────────────

/** Parse satu ekspresi statement JS → AST statement node. */
function stmtOf(code) {
  const ast = parseModule(code)
  return ast.program.body[0]
}

function makeCtx(overrides = {}) {
  return {
    warnings: [],
    commentsByLine: new Map(),
    componentIndex: new Map(),
    source: '',
    scopeVars: new Set(),
    ...overrides
  }
}

// ── isCall / isPleaseMember / unwrapAwait ──────────────────────────

describe('AST helpers', () => {
  it('isCall: true untuk CallExpression', () => {
    const ast = parseModule('foo()')
    const call = ast.program.body[0].expression
    expect(isCall(call)).toBe(true)
  })

  it('isCall: false untuk Identifier', () => {
    const ast = parseModule('foo')
    expect(isCall(ast.program.body[0].expression)).toBe(false)
  })

  it('isPleaseMember: true untuk please.click', () => {
    const ast = parseModule('please.click()')
    const callee = ast.program.body[0].expression.callee
    expect(isPleaseMember(callee, 'click')).toBe(true)
  })

  it('isPleaseMember: false untuk other.click', () => {
    const ast = parseModule('other.click()')
    const callee = ast.program.body[0].expression.callee
    expect(isPleaseMember(callee, 'click')).toBe(false)
  })

  it('unwrapAwait: mengupas AwaitExpression', () => {
    const ast = parseModule('await please.click()')
    const expr = ast.program.body[0].expression
    const unwrapped = unwrapAwait(expr)
    expect(unwrapped.type).toBe('CallExpression')
  })

  it('unwrapAwait: node non-await dikembalikan apa adanya', () => {
    const ast = parseModule('please.click()')
    const expr = ast.program.body[0].expression
    expect(unwrapAwait(expr)).toBe(expr)
  })
})

// ── withNote ──────────────────────────────────────────────────────

describe('withNote', () => {
  it('menambahkan note ke step', () => {
    const step = { blockId: 'action.click', inputs: {} }
    expect(withNote('catatan', step).note).toBe('catatan')
  })

  it('tidak menambahkan note ketika undefined', () => {
    const step = { blockId: 'action.click', inputs: {} }
    expect(withNote(undefined, step).note).toBeUndefined()
  })
})

// ── parseStatementToStep — please.* methods ────────────────────────

describe('parseStatementToStep — action blocks', () => {
  it('memetakan please.click', () => {
    const stmt = stmtOf("await please.click('tombol', '#btn')")
    const step = parseStatementToStep(stmt, makeCtx({ source: "await please.click('tombol', '#btn')" }))
    expect(step.blockId).toBe('action.click')
    expect(step.inputs.label).toBe('tombol')
    expect(step.inputs.selector).toBe('#btn')
  })

  it('memetakan please.click dengan wait', () => {
    const src = "await please.click('btn', '#btn', 500)"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('action.click')
    expect(step.inputs.wait).toBe(500)
  })

  it('memetakan please.fill', () => {
    const src = "await please.fill('email', '#email', 'user@x.com')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('action.fill')
    expect(step.inputs.value).toBe('user@x.com')
  })

  it('memetakan please.fillAndEnter', () => {
    const src = "await please.fillAndEnter('q', '#q', 'kata')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('action.fillAndEnter')
  })

  it('memetakan please.clear', () => {
    const src = "await please.clear('input', '#name')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('action.clear')
  })

  it('memetakan please.scrollTo', () => {
    const src = "await please.scrollTo('footer', '#footer')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('action.scrollTo')
  })

  it('memetakan please.datepicker', () => {
    const src = "await please.datepicker('tgl', '#date', '2024-01-01')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('action.datepicker')
  })

  it('memetakan please.uploadFile', () => {
    const src = "await please.uploadFile('foto', 'input[type=file]', '/tmp/a.jpg')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('action.uploadFile')
    expect(step.inputs.path).toBe('/tmp/a.jpg')
  })
})

describe('parseStatementToStep — navigation', () => {
  it('memetakan please.goto dengan dataref', () => {
    const src = 'await please.goto(PAGE.login)'
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('nav.goTo')
    expect(step.inputs.urlTarget).toEqual({ type: 'dataref', path: 'PAGE.login' })
  })

  it('memetakan please.verifyPage', () => {
    const src = 'await please.verifyPage(PAGE.dashboard)'
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('nav.checkWhere')
    expect(step.inputs.urlExpected).toEqual({ type: 'dataref', path: 'PAGE.dashboard' })
  })
})

describe('parseStatementToStep — assertions', () => {
  it('memetakan please.see(label, selector, expected) → assert.seeText', () => {
    const src = "await please.see('teks', '#msg', 'Berhasil')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('assert.seeText')
    expect(step.inputs.label).toBe('teks')
    expect(step.inputs.selector).toBe('#msg')
    expect(step.inputs.expected).toBe('Berhasil')
  })

  it('please.see tanpa expected jatuh ke rawCode (bukan seeText)', () => {
    const src = "await please.see('teks', '#msg')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    // tanpa expected → null dari mapper → rawCode
    expect(step.blockId).toBe('util.rawCode')
  })
})

describe('parseStatementToStep — see sebagai VariableDeclaration (Read Text)', () => {
  it('memetakan const x = await please.see(label, selector) → assert.getText', () => {
    const src = "const pageTitle = await please.see('judul', 'h1')"
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('assert.getText')
    expect(step.inputs.varName).toBe('pageTitle')
    expect(step.inputs.label).toBe('judul')
    expect(step.inputs.selector).toBe('h1')
  })
})

describe('parseStatementToStep — wait', () => {
  it('memetakan please.wait dengan durasi', () => {
    const src = 'await please.wait(3000)'
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('util.wait')
    expect(step.inputs.duration).toBe(3000)
  })

  it('memetakan please.wait tanpa argumen', () => {
    const src = 'await please.wait()'
    const step = parseStatementToStep(stmtOf(src), makeCtx({ source: src }))
    expect(step.blockId).toBe('util.wait')
  })
})

describe('parseStatementToStep — rawCode fallback', () => {
  it('kode tidak dikenal jadi util.rawCode', () => {
    const src = 'someCustomCall()'
    const ctx = makeCtx({ source: src })
    const step = parseStatementToStep(stmtOf(src), ctx)
    expect(step.blockId).toBe('util.rawCode')
    expect(step.inputs.code).toBe('someCustomCall()')
  })

  it('menambahkan warning untuk rawCode', () => {
    const src = 'unknownMethod()'
    const ctx = makeCtx({ source: src })
    parseStatementToStep(stmtOf(src), ctx)
    expect(ctx.warnings.length).toBeGreaterThan(0)
  })
})

// ── parseBodyStatements ────────────────────────────────────────────

describe('parseBodyStatements', () => {
  it('parse beberapa statement sekaligus', () => {
    const src = `
      await please.goto(PAGE.login)
      await please.fill('email', '#email', 'x@y.com')
      await please.click('btn', '#btn')
    `
    const ast = parseModule(src)
    const body = ast.program.body
    const steps = parseBodyStatements(body, makeCtx({ source: src }))
    expect(steps).toHaveLength(3)
    expect(steps[0].blockId).toBe('nav.goTo')
    expect(steps[1].blockId).toBe('action.fill')
    expect(steps[2].blockId).toBe('action.click')
  })

  it('scopeVars terakumulasi lintas statement', () => {
    const src = `
      const headerText = await please.see('header', 'h1')
      await please.see('header', 'h1', headerText)
    `
    const ast = parseModule(src)
    const steps = parseBodyStatements(ast.program.body, makeCtx({ source: src }))
    expect(steps[0].blockId).toBe('assert.getText')
    expect(steps[0].inputs.varName).toBe('headerText')
    expect(steps[1].blockId).toBe('assert.seeText')
  })

  it('baris createApp dilewati (tidak jadi step)', () => {
    const src = `
      const { please, AUTH } = createApp(page)
      await please.click('btn', '#btn')
    `
    const ast = parseModule(src)
    const steps = parseBodyStatements(ast.program.body, makeCtx({ source: src }))
    expect(steps).toHaveLength(1)
    expect(steps[0].blockId).toBe('action.click')
  })
})

// ── buildComponentIndex ────────────────────────────────────────────

describe('buildComponentIndex', () => {
  it('menghasilkan map EXPORTNAME → prefix', () => {
    const registry = {
      all: {
        'comp.auth.login':  { id: 'comp.auth.login',  type: 'component' },
        'comp.auth.logout': { id: 'comp.auth.logout', type: 'component' },
        'action.click':     { id: 'action.click',     type: 'action' }
      }
    }
    const idx = buildComponentIndex(registry)
    expect(idx.get('AUTH')).toBe('comp.auth')
    expect(idx.has('action')).toBe(false)
  })

  it('handles null/empty registry', () => {
    expect(buildComponentIndex(null).size).toBe(0)
    expect(buildComponentIndex({ all: {} }).size).toBe(0)
  })
})

// ── indexLeadingComments ───────────────────────────────────────────

describe('indexLeadingComments', () => {
  it('maps comment to line below it', () => {
    const src = `// klik tombol\nawait please.click('btn', '#btn')`
    const ast = parseModule(src)
    const map = indexLeadingComments(ast.comments)
    expect(map.get(2)).toBe('klik tombol')
  })

  it('setiap comment di-map ke baris berikutnya masing-masing', () => {
    // baris 1: // baris 1  → target baris 2
    // baris 2: // baris 2  → target baris 3
    const src = `// baris 1\n// baris 2\nawait please.click('btn', '#btn')`
    const ast = parseModule(src)
    const map = indexLeadingComments(ast.comments)
    expect(map.get(2)).toBe('baris 1')
    expect(map.get(3)).toBe('baris 2')
  })

  it('handles null/undefined comments', () => {
    expect(indexLeadingComments(null).size).toBe(0)
    expect(indexLeadingComments(undefined).size).toBe(0)
  })
})

// ── mapArgNInputs ──────────────────────────────────────────────────

describe('mapArgNInputs', () => {
  const registry = {
    getById: (id) => id === 'comp.auth.login'
      ? { id, inputs: [{ name: 'email' }, { name: 'password' }] }
      : null
  }

  it('memetakan arg0/arg1 ke nama field block', () => {
    const step = {
      blockId: 'comp.auth.login',
      inputs: { arg0: 'user@x.com', arg1: 'secret' }
    }
    const mapped = mapArgNInputs(step, registry)
    expect(mapped.email).toBe('user@x.com')
    expect(mapped.password).toBe('secret')
  })

  it('tidak mengubah inputs yang sudah named', () => {
    const step = {
      blockId: 'comp.auth.login',
      inputs: { email: 'x@y.com', password: '123' }
    }
    const mapped = mapArgNInputs(step, registry)
    expect(mapped.email).toBe('x@y.com')
  })

  it('returns copy as-is when registry null', () => {
    const step = { blockId: 'comp.auth.login', inputs: { arg0: 'x' } }
    const mapped = mapArgNInputs(step, null)
    expect(mapped.arg0).toBe('x')
  })
})
