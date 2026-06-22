import { describe, it, expect } from 'vitest'
import { generateDataFile, generateAllDataFiles, processDataFiles } from './DataFactory.js'

// ── generateDataFile ──────────────────────────────────────────────

describe('generateDataFile — struktur output', () => {
  const fileDef = {
    filename: 'main',
    groups: {
      URL: { login: { url: 'https://app.com/login', title: 'Login' } },
      ACCOUNT: { valid: { username: 'student', password: 'Password123' } }
    }
  }

  const code = generateDataFile(fileDef, {})

  it('mengandung require dotenv', () => {
    expect(code).toContain("require('dotenv')")
  })

  it('mengandung module.exports', () => {
    expect(code).toContain('module.exports = {')
  })

  it('mengandung nama group', () => {
    expect(code).toContain('URL:')
    expect(code).toContain('ACCOUNT:')
  })

  it('mengandung nilai field sebagai string literal', () => {
    expect(code).toContain("'Login'")
    expect(code).toContain("'student'")
    expect(code).toContain("'Password123'")
  })

  it('mengandung nama entry', () => {
    expect(code).toContain('login:')
    expect(code).toContain('valid:')
  })
})

describe('generateDataFile — env substitution', () => {
  const fileDef = {
    filename: 'main',
    groups: {
      URL: { login: { url: 'https://app.com/login', title: 'Login' } }
    }
  }

  it('url field dengan BASE_URL menggunakan template literal', () => {
    const code = generateDataFile(fileDef, { BASE_URL: 'https://app.com' })
    expect(code).toContain('`${process.env.BASE_URL}/login`')
  })

  it('url field tanpa BASE_URL tetap plain string', () => {
    const code = generateDataFile(fileDef, {})
    expect(code).toContain("'https://app.com/login'")
  })
})

describe('generateDataFile — process.env values', () => {
  const fileDef = {
    filename: 'main',
    groups: {
      ACCOUNT: { admin: { username: 'process.env.ADMIN_USER', password: 'process.env.ADMIN_PASS' } }
    }
  }

  it('nilai process.env.X ditulis langsung', () => {
    const code = generateDataFile(fileDef, {})
    expect(code).toContain('process.env.ADMIN_USER')
    expect(code).toContain('process.env.ADMIN_PASS')
  })

  it('nilai process.env.X/path ditulis sebagai template literal', () => {
    const fileDef2 = {
      filename: 'main',
      groups: { URL: { home: { url: 'process.env.BASE_URL/home', title: 'Home' } } }
    }
    const code = generateDataFile(fileDef2, {})
    expect(code).toContain('`${process.env.BASE_URL}/home`')
  })
})

// ── generateAllDataFiles ──────────────────────────────────────────

describe('generateAllDataFiles', () => {
  const files = {
    main:     { filename: 'main',     groups: { URL: { home: { url: 'https://x.com', title: 'Home' } } } },
    products: { filename: 'products', groups: { PRODUCT: { laptop: { name: 'Laptop', price: 999 } } } }
  }

  const result = generateAllDataFiles(files, {})

  it('menghasilkan entry per fileId', () => {
    expect(result.main).toBeDefined()
    expect(result.products).toBeDefined()
  })

  it('setiap entry adalah string kode', () => {
    expect(typeof result.main).toBe('string')
    expect(result.main).toContain('module.exports')
  })

  it('handles empty files', () => {
    expect(generateAllDataFiles({}, {})).toEqual({})
  })
})

// ── processDataFiles ──────────────────────────────────────────────

describe('processDataFiles', () => {
  const files = {
    main: {
      filename: 'main',
      groups: {
        URL: { login: { url: '$BASE_URL/login', title: 'Login' } }
      }
    }
  }

  it('mengembalikan flat entries', () => {
    const entries = processDataFiles(files, { BASE_URL: 'https://app.com' })
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('meresolvasi $ENV ke nilai env', () => {
    const entries = processDataFiles(files, { BASE_URL: 'https://app.com' })
    const urlEntry = entries.find(e => e.path === 'URL.login.url')
    expect(urlEntry.value).toBe('https://app.com/login')
  })

  it('handles empty env', () => {
    const entries = processDataFiles(files, {})
    const urlEntry = entries.find(e => e.path === 'URL.login.url')
    // $BASE_URL tidak ter-resolve → tetap literal
    expect(urlEntry.value).toContain('login')
  })
})
