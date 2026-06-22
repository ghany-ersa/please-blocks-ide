import { describe, it, expect } from 'vitest'
import { exportProject } from './projectExporter.js'

// ── Fixtures ──────────────────────────────────────────────────────

function makeCanvas(overrides = {}) {
  return { features: [], ...overrides }
}

function makeBlockRegistry(blocks = []) {
  const map = Object.fromEntries(blocks.map(b => [b.id, b]))
  return { getById: (id) => map[id] ?? null }
}

function makeDataRegistry(overrides = {}) {
  return { files: {}, entries: [], env: {}, ...overrides }
}

function makeComponentStore(components = []) {
  return { components }
}

function getFile(files, path) {
  return files.find(f => f.path === path)
}

// ── app.js ────────────────────────────────────────────────────────

describe('exportProject — app.js (tanpa component)', () => {
  const files = exportProject(
    makeCanvas(),
    makeBlockRegistry(),
    makeDataRegistry(),
    makeComponentStore()
  )
  const app = getFile(files, 'app.js')

  it('menghasilkan file app.js', () => {
    expect(app).toBeDefined()
  })

  it('require please-test (bukan selenium-webdriver Builder)', () => {
    expect(app.content).toContain("require('please-test')")
    expect(app.content).not.toContain('selenium-webdriver')
    expect(app.content).not.toContain('Builder')
  })

  it('menggunakan pola createApp(page) factory', () => {
    expect(app.content).toContain('function createApp(page)')
    expect(app.content).toContain('new Please(page)')
  })

  it('module.exports menyertakan createApp', () => {
    expect(app.content).toContain('module.exports = { createApp }')
  })
})

describe('exportProject — app.js (dengan component)', () => {
  const components = [
    { name: 'Auth', exportName: 'AUTH', methods: [] },
    { name: 'Checkout', exportName: 'CHECKOUT', methods: [] }
  ]
  const files = exportProject(
    makeCanvas(),
    makeBlockRegistry(),
    makeDataRegistry(),
    makeComponentStore(components)
  )
  const app = getFile(files, 'app.js')

  it('require file component', () => {
    expect(app.content).toContain("require('./components/auth')")
    expect(app.content).toContain("require('./components/checkout')")
  })

  it('instansiasi component dengan please', () => {
    expect(app.content).toContain('new AuthComponent(please)')
    expect(app.content).toContain('new CheckoutComponent(please)')
  })

  it('export AUTH dan CHECKOUT', () => {
    expect(app.content).toContain('AUTH:')
    expect(app.content).toContain('CHECKOUT:')
  })
})

// ── package.json ──────────────────────────────────────────────────

describe('exportProject — package.json', () => {
  const files = exportProject(
    makeCanvas(),
    makeBlockRegistry(),
    makeDataRegistry(),
    makeComponentStore(),
    'my-project'
  )
  const pkg = getFile(files, 'package.json')
  let parsed

  it('menghasilkan JSON yang valid', () => {
    expect(() => { parsed = JSON.parse(pkg.content) }).not.toThrow()
  })

  it('versi please-test adalah ^2.0.0', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.dependencies['please-test']).toBe('^2.0.0')
  })

  it('menyertakan @playwright/test sebagai devDependency', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.devDependencies['@playwright/test']).toBeDefined()
  })

  it('script test menggunakan playwright test', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.scripts.test).toBe('playwright test')
  })

  it('menggunakan nama project yang diberikan', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.name).toBe('my-project')
  })
})

// ── index.js ──────────────────────────────────────────────────────

describe('exportProject — index.js', () => {
  it('menghasilkan file index.js', () => {
    const files = exportProject(makeCanvas(), makeBlockRegistry(), makeDataRegistry(), makeComponentStore())
    const idx = getFile(files, 'index.js')
    expect(idx).toBeDefined()
  })

  it('include require untuk feature yang enabled', () => {
    const canvas = makeCanvas({
      features: [{ label: 'Login', enabled: true, testCases: [] }]
    })
    const files = exportProject(canvas, makeBlockRegistry(), makeDataRegistry(), makeComponentStore())
    const idx = getFile(files, 'index.js')
    expect(idx.content).toContain("require('./feature/login.spec')")
  })
})

// ── .gitignore ────────────────────────────────────────────────────

describe('exportProject — .gitignore', () => {
  it('menghasilkan .gitignore dengan node_modules dan .env', () => {
    const files = exportProject(makeCanvas(), makeBlockRegistry(), makeDataRegistry(), makeComponentStore())
    const gi = getFile(files, '.gitignore')
    expect(gi.content).toContain('node_modules/')
    expect(gi.content).toContain('.env')
  })
})

// ── .env ──────────────────────────────────────────────────────────

describe('exportProject — .env', () => {
  it('menghasilkan .env dari dataRegistry.env', () => {
    const dataReg = makeDataRegistry({ env: { BASE_URL: 'https://app.com', USER: 'admin' } })
    const files = exportProject(makeCanvas(), makeBlockRegistry(), dataReg, makeComponentStore())
    const env = getFile(files, '.env')
    expect(env.content).toContain('BASE_URL=https://app.com')
    expect(env.content).toContain('USER=admin')
  })
})

// ── kategori file ──────────────────────────────────────────────────

describe('exportProject — kategori file', () => {
  it('setiap file memiliki category', () => {
    const files = exportProject(makeCanvas(), makeBlockRegistry(), makeDataRegistry(), makeComponentStore())
    for (const f of files) {
      expect(f.category, `file ${f.path} tidak punya category`).toBeDefined()
    }
  })
})
