import { describe, it, expect } from 'vitest'
import { collectImportsPerFile, collectComponents } from './dataResolver.js'

// ── Fixtures ──────────────────────────────────────────────────────

const dataEntries = [
  { path: 'URL.login',            group: 'URL',     fileId: 'main',     filePath: 'data/main.js'     },
  { path: 'URL.dashboard',        group: 'URL',     fileId: 'main',     filePath: 'data/main.js'     },
  { path: 'ACCOUNT.valid',        group: 'ACCOUNT', fileId: 'main',     filePath: 'data/main.js'     },
  { path: 'PRODUCT.laptop',       group: 'PRODUCT', fileId: 'products', filePath: 'data/products.js' },
]

function makeFeature(steps = []) {
  return {
    label: 'Feature',
    testCases: [{ label: 'TC', steps }]
  }
}

function makeStep(blockId, inputs = {}) {
  return { blockId, inputs }
}

// ── collectImportsPerFile ──────────────────────────────────────────

describe('collectImportsPerFile — tanpa dataref', () => {
  it('returns empty object when no dataref in steps', () => {
    const feature = makeFeature([makeStep('action.click', { label: 'btn', selector: '#btn' })])
    expect(collectImportsPerFile(feature, dataEntries)).toEqual({})
  })
})

describe('collectImportsPerFile — satu file', () => {
  const feature = makeFeature([
    makeStep('action.fill', { value: { type: 'dataref', path: 'ACCOUNT.valid' } }),
    makeStep('nav.goto',    { urlTarget: { type: 'dataref', path: 'URL.login' } })
  ])

  const result = collectImportsPerFile(feature, dataEntries)

  it('mengelompokkan groups dari file yang sama', () => {
    expect(result.main).toBeDefined()
    expect(result.main.filePath).toBe('data/main.js')
    expect(result.main.groups).toContain('URL')
    expect(result.main.groups).toContain('ACCOUNT')
  })

  it('tidak duplikat group yang sama', () => {
    const feature2 = makeFeature([
      makeStep('nav.goto',       { urlTarget:  { type: 'dataref', path: 'URL.login'     } }),
      makeStep('nav.verifyPage', { urlExpected: { type: 'dataref', path: 'URL.dashboard' } })
    ])
    const r = collectImportsPerFile(feature2, dataEntries)
    expect(r.main.groups.filter(g => g === 'URL')).toHaveLength(1)
  })
})

describe('collectImportsPerFile — multi file', () => {
  const feature = makeFeature([
    makeStep('action.fill',  { value:     { type: 'dataref', path: 'ACCOUNT.valid'  } }),
    makeStep('assert.equal', { expected:  { type: 'dataref', path: 'PRODUCT.laptop' } })
  ])

  const result = collectImportsPerFile(feature, dataEntries)

  it('menghasilkan entry per file yang berbeda', () => {
    expect(result.main).toBeDefined()
    expect(result.products).toBeDefined()
  })

  it('filePath sesuai per file', () => {
    expect(result.products.filePath).toBe('data/products.js')
    expect(result.products.groups).toContain('PRODUCT')
  })
})

describe('collectImportsPerFile — path tidak ada di entries', () => {
  it('mengabaikan dataref yang tidak ada di registry', () => {
    const feature = makeFeature([
      makeStep('nav.goto', { urlTarget: { type: 'dataref', path: 'URL.unknown' } })
    ])
    const result = collectImportsPerFile(feature, dataEntries)
    expect(Object.keys(result)).toHaveLength(0)
  })
})

// ── collectComponents ──────────────────────────────────────────────

describe('collectComponents', () => {
  const blockRegistry = {
    getById: (id) => {
      const map = {
        'action.click':    { id: 'action.click',    type: 'action' },
        'comp.auth.login': { id: 'comp.auth.login', type: 'component' },
        'comp.auth.logout':{ id: 'comp.auth.logout',type: 'component' },
      }
      return map[id] ?? null
    }
  }

  it('returns empty when no component blocks', () => {
    const feature = makeFeature([makeStep('action.click')])
    expect(collectComponents(feature, blockRegistry)).toEqual([])
  })

  it('returns unique component export names', () => {
    const feature = makeFeature([
      makeStep('comp.auth.login'),
      makeStep('comp.auth.logout'),
      makeStep('action.click')
    ])
    const comps = collectComponents(feature, blockRegistry)
    expect(comps).toContain('AUTH')
    expect(comps).toHaveLength(1)
  })

  it('handles multiple different components', () => {
    const registry2 = {
      getById: (id) => {
        const map = {
          'comp.auth.login':     { id: 'comp.auth.login',     type: 'component' },
          'comp.checkout.order': { id: 'comp.checkout.order', type: 'component' },
        }
        return map[id] ?? null
      }
    }
    const feature = makeFeature([
      makeStep('comp.auth.login'),
      makeStep('comp.checkout.order')
    ])
    const comps = collectComponents(feature, registry2)
    expect(comps).toContain('AUTH')
    expect(comps).toContain('CHECKOUT')
  })
})
