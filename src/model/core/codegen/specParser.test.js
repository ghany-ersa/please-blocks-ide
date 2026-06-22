import { describe, it, expect } from 'vitest'
import { parseSpec } from './specParser.js'

// ── Helpers ───────────────────────────────────────────────────────

function parse(source) {
  return parseSpec(source)
}

// ── Error handling ────────────────────────────────────────────────

describe('parseSpec — error handling', () => {
  it('returns warning untuk syntax error', () => {
    const { features, warnings } = parse('describe( {{{ invalid js')
    expect(features).toHaveLength(0)
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('returns warning ketika tidak ada describe()', () => {
    const { features, warnings } = parse("const x = 1")
    expect(features).toHaveLength(0)
    expect(warnings[0]).toContain('describe')
  })
})

// ── Struktur describe/it ──────────────────────────────────────────

describe('parseSpec — struktur dasar', () => {
  const src = `
    describe('Login', () => {
      it('berhasil login', async () => {
        await please.click('btn', '#btn')
      })
    })
  `

  it('menghasilkan satu feature', () => {
    const { features } = parse(src)
    expect(features).toHaveLength(1)
    expect(features[0].label).toBe('Login')
  })

  it('menghasilkan satu test case', () => {
    const { features } = parse(src)
    expect(features[0].testCases).toHaveLength(1)
    expect(features[0].testCases[0].label).toBe('berhasil login')
  })

  it('menghasilkan step dari body it()', () => {
    const { features } = parse(src)
    const steps = features[0].testCases[0].steps
    expect(steps).toHaveLength(1)
    expect(steps[0].blockId).toBe('action.click')
    expect(steps[0].inputs.label).toBe('btn')
    expect(steps[0].inputs.selector).toBe('#btn')
  })
})

describe('parseSpec — multiple it()', () => {
  const src = `
    describe('Auth', () => {
      it('login berhasil', async () => {
        await please.fill('email', '#email', 'x@y.com')
        await please.click('btn', '#submit')
      })
      it('login gagal', async () => {
        await please.fill('email', '#email', 'wrong')
      })
    })
  `

  it('menghasilkan semua test case', () => {
    const { features } = parse(src)
    expect(features[0].testCases).toHaveLength(2)
  })

  it('setiap test case punya steps sendiri', () => {
    const { features } = parse(src)
    expect(features[0].testCases[0].steps).toHaveLength(2)
    expect(features[0].testCases[1].steps).toHaveLength(1)
  })
})

// ── Multiple describe ─────────────────────────────────────────────

describe('parseSpec — multiple describe()', () => {
  const src = `
    describe('Login', () => {
      it('login', async () => { await please.click('x', '#x') })
    })
    describe('Checkout', () => {
      it('order', async () => { await please.click('y', '#y') })
    })
  `

  it('menghasilkan dua features', () => {
    const { features } = parse(src)
    expect(features).toHaveLength(2)
    expect(features[0].label).toBe('Login')
    expect(features[1].label).toBe('Checkout')
  })
})

// ── Step mapping ──────────────────────────────────────────────────

describe('parseSpec — step mapping', () => {
  it('memetakan navigation goto (Playwright)', () => {
    const src = `test.describe('F', () => { test('t', async ({ page }) => { const { please } = createApp(page); await please.goto(PAGE.login) }) })`
    const { features } = parse(src)
    const step = features[0].testCases[0].steps[0]
    expect(step.blockId).toBe('nav.goto')
    expect(step.inputs.urlTarget).toEqual({ type: 'dataref', path: 'PAGE.login' })
  })

  it('memetakan await see dengan expected → assert.see tanpa varName', () => {
    const src = `test.describe('F', () => {
      test('t', async ({ page }) => {
        const { please } = createApp(page)
        await please.see('pesan', '#msg', 'Berhasil')
      })
    })`
    const { features } = parse(src)
    const step = features[0].testCases[0].steps[0]
    expect(step.blockId).toBe('assert.see')
    expect(step.inputs.expected).toBe('Berhasil')
    expect(step.inputs.varName).toBeUndefined()
  })

  it('memetakan const assignment see → assert.see dengan varName, scopeVars dipakai sebagai varref', () => {
    const src = `test.describe('F', () => {
      test('t', async ({ page }) => {
        const { please } = createApp(page)
        const pageTitle = await please.see('judul', 'h1')
        await please.see('judul', 'h1', pageTitle)
      })
    })`
    const { features } = parse(src)
    const steps = features[0].testCases[0].steps
    expect(steps[0].blockId).toBe('assert.see')
    expect(steps[0].inputs.varName).toBe('pageTitle')
    expect(steps[1].blockId).toBe('assert.see')
    expect(steps[1].inputs.expected).toEqual({ type: 'varref', varName: 'pageTitle' })
  })
})

// ── Note dari comment ─────────────────────────────────────────────

describe('parseSpec — note dari leading comment', () => {
  it('menyertakan note dari comment di atas step', () => {
    const src = `describe('F', () => {
      it('t', async () => {
        // klik tombol submit
        await please.click('btn', '#submit')
      })
    })`
    const { features } = parse(src)
    const step = features[0].testCases[0].steps[0]
    expect(step.note).toBe('klik tombol submit')
  })
})

// ── rawCode fallback ──────────────────────────────────────────────

describe('parseSpec — rawCode fallback', () => {
  it('kode yang tidak dikenal jadi util.rawCode', () => {
    const src = `describe('F', () => {
      it('t', async () => {
        someCustomCall()
      })
    })`
    const { features, warnings } = parse(src)
    const step = features[0].testCases[0].steps[0]
    expect(step.blockId).toBe('util.rawCode')
    expect(step.inputs.code).toBe('someCustomCall()')
    expect(warnings.length).toBeGreaterThan(0)
  })
})
