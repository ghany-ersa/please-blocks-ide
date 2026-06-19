import { describe, it, expect } from 'vitest'
import { parseComponentFile } from './componentFileParser.js'

// ── Error handling ────────────────────────────────────────────────

describe('parseComponentFile — error handling', () => {
  it('returns null + warning untuk syntax error', () => {
    const { component, warnings } = parseComponentFile('{{{ invalid js')
    expect(component).toBeNull()
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('returns null ketika tidak ada class', () => {
    const { component, warnings } = parseComponentFile('const x = 1')
    expect(component).toBeNull()
    expect(warnings[0]).toContain('class')
  })
})

// ── Parse struktur class ──────────────────────────────────────────

describe('parseComponentFile — struktur dasar', () => {
  const src = `
    class Auth {
      constructor(master) { this.please = master }

      async login(email, password) {
        await please.fill('input email', '#email', email)
        await please.fill('input password', '#password', password)
        await please.click('button login', '//button[@type="submit"]')
      }

      async logout() {
        await please.click('menu profil', '.user-menu')
      }
    }
    module.exports = Auth
  `

  it('menghasilkan component object', () => {
    const { component, warnings } = parseComponentFile(src)
    expect(component).not.toBeNull()
    expect(warnings).toHaveLength(0)
  })

  it('name dari nama class', () => {
    const { component } = parseComponentFile(src)
    expect(component.name).toBe('Auth')
  })

  it('exportName adalah uppercase dari name', () => {
    const { component } = parseComponentFile(src)
    expect(component.exportName).toBe('AUTH')
  })

  it('methods tidak menyertakan constructor', () => {
    const { component } = parseComponentFile(src)
    const names = component.methods.map(m => m.name)
    expect(names).not.toContain('constructor')
  })

  it('menghasilkan semua method', () => {
    const { component } = parseComponentFile(src)
    const names = component.methods.map(m => m.name)
    expect(names).toContain('login')
    expect(names).toContain('logout')
  })

  it('params method dipetakan dengan benar', () => {
    const { component } = parseComponentFile(src)
    const login = component.methods.find(m => m.name === 'login')
    expect(login.params).toEqual(['email', 'password'])
  })

  it('method tanpa params punya params array kosong', () => {
    const { component } = parseComponentFile(src)
    const logout = component.methods.find(m => m.name === 'logout')
    expect(logout.params).toEqual([])
  })
})

// ── Steps dalam method ────────────────────────────────────────────

describe('parseComponentFile — steps dalam method', () => {
  const src = `
    class Auth {
      constructor(master) { this.please = master }
      async login(email, password) {
        await please.fill('email', '#email', email)
        await please.click('btn', '#submit')
        await please.verifyPage(PAGE.dashboard)
      }
    }
    module.exports = Auth
  `

  it('menghasilkan steps dari body method', () => {
    const { component } = parseComponentFile(src)
    const steps = component.methods[0].steps
    expect(steps).toHaveLength(3)
  })

  it('step pertama adalah action.fill', () => {
    const { component } = parseComponentFile(src)
    expect(component.methods[0].steps[0].blockId).toBe('action.fill')
  })

  it('step terakhir adalah nav.checkWhere (verifyPage)', () => {
    const { component } = parseComponentFile(src)
    const steps = component.methods[0].steps
    expect(steps[steps.length - 1].blockId).toBe('nav.checkWhere')
  })
})

// ── this.method() → self component call ──────────────────────────

describe('parseComponentFile — this.method() resolusi', () => {
  const src = `
    class Auth {
      constructor(master) { this.please = master }
      async loginAndVerify(email, password) {
        await this.login(email, password)
        await please.verifyPage(PAGE.dashboard)
      }
      async login(email, password) {
        await please.fill('email', '#email', email)
      }
    }
    module.exports = Auth
  `

  it('this.method() dipetakan ke comp.<name>.<calledMethod>', () => {
    // this.login() → blockId = comp.auth.login (method yang dipanggil, bukan method yang memanggil)
    const { component } = parseComponentFile(src)
    const step = component.methods.find(m => m.name === 'loginAndVerify').steps[0]
    expect(step.blockId).toBe('comp.auth.login')
  })
})

// ── Multiple class warning ─────────────────────────────────────────

describe('parseComponentFile — multiple class', () => {
  it('hanya mengimpor class pertama dan memberi warning', () => {
    const src = `
      class A { constructor(m) {} async doA() {} }
      class B { constructor(m) {} async doB() {} }
      module.exports = A
    `
    const { component, warnings } = parseComponentFile(src)
    expect(component.name).toBe('A')
    expect(warnings.some(w => w.includes('2 class'))).toBe(true)
  })
})
