import { describe, it, expect } from 'vitest'
import { parseDataFile } from './dataFileParser.js'

// ── Error handling ────────────────────────────────────────────────

describe('parseDataFile — error handling', () => {
  it('returns null + warning untuk syntax error', () => {
    const { file, warnings } = parseDataFile('{{{ invalid', 'main.js')
    expect(file).toBeNull()
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('returns null ketika tidak ada module.exports', () => {
    const { file, warnings } = parseDataFile('const x = 1', 'main.js')
    expect(file).toBeNull()
    expect(warnings[0]).toContain('module.exports')
  })
})

// ── Parse basic ──────────────────────────────────────────────────

describe('parseDataFile — struktur dasar', () => {
  const src = `
    module.exports = {
      URL: {
        login: { url: 'https://app.com/login', title: 'Login' }
      },
      ACCOUNT: {
        valid: { username: 'student', password: 'Password123' }
      }
    }
  `

  it('menghasilkan file object', () => {
    const { file, warnings } = parseDataFile(src, 'main.js')
    expect(file).not.toBeNull()
    expect(warnings).toHaveLength(0)
  })

  it('id dan filename dari nama file (tanpa ekstensi)', () => {
    const { file } = parseDataFile(src, 'main.js')
    expect(file.id).toBe('main')
    expect(file.filename).toBe('main')
  })

  it('menghasilkan groups dengan struktur nested', () => {
    const { file } = parseDataFile(src, 'main.js')
    expect(file.groups.URL).toBeDefined()
    expect(file.groups.URL.login.url).toBe('https://app.com/login')
    expect(file.groups.URL.login.title).toBe('Login')
    expect(file.groups.ACCOUNT.valid.username).toBe('student')
  })
})

// ── Tipe nilai ────────────────────────────────────────────────────

describe('parseDataFile — tipe nilai', () => {
  it('parse string literal', () => {
    const src = `module.exports = { DATA: { item: { name: 'laptop' } } }`
    const { file } = parseDataFile(src, 'main')
    expect(file.groups.DATA.item.name).toBe('laptop')
  })

  it('parse numeric literal', () => {
    const src = `module.exports = { DATA: { item: { price: 999 } } }`
    const { file } = parseDataFile(src, 'main')
    expect(file.groups.DATA.item.price).toBe(999)
  })

  it('parse boolean literal', () => {
    const src = `module.exports = { DATA: { item: { active: true } } }`
    const { file } = parseDataFile(src, 'main')
    expect(file.groups.DATA.item.active).toBe(true)
  })

  it('parse null literal', () => {
    const src = `module.exports = { DATA: { item: { deleted: null } } }`
    const { file } = parseDataFile(src, 'main')
    expect(file.groups.DATA.item.deleted).toBeNull()
  })
})

// ── process.env ────────────────────────────────────────────────────

describe('parseDataFile — process.env', () => {
  it('process.env.X disimpan sebagai string "process.env.X"', () => {
    const src = `module.exports = { ACCOUNT: { admin: { user: process.env.ADMIN_USER } } }`
    const { file } = parseDataFile(src, 'main')
    expect(file.groups.ACCOUNT.admin.user).toBe('process.env.ADMIN_USER')
  })

  it('template literal dengan process.env di-resolve sebagai string gabungan', () => {
    const src = 'module.exports = { URL: { home: { url: `${process.env.BASE_URL}/home` } } }'
    const { file } = parseDataFile(src, 'main')
    expect(file.groups.URL.home.url).toBe('process.env.BASE_URL/home')
  })
})

// ── Round-trip ─────────────────────────────────────────────────────

describe('parseDataFile — round-trip dengan DataFactory', () => {
  it('dapat di-parse ulang setelah di-generate', async () => {
    const { generateDataFile } = await import('../factory/DataFactory.js')

    const fileDef = {
      filename: 'main',
      groups: {
        URL:     { login: { url: 'https://app.com/login', title: 'Login'    } },
        ACCOUNT: { valid: { username: 'student',          password: 'Pass1' } }
      }
    }

    const code = generateDataFile(fileDef, {})
    const { file, warnings } = parseDataFile(code, 'main.js')

    expect(warnings).toHaveLength(0)
    expect(file.groups.URL.login.title).toBe('Login')
    expect(file.groups.ACCOUNT.valid.username).toBe('student')
  })
})
