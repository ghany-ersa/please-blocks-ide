import { describe, it, expect } from 'vitest'
import { flattenDataTree, flattenAllFiles } from './flattenDataTree.js'

// ── flattenDataTree ────────────────────────────────────────────────

describe('flattenDataTree — struktur dasar', () => {
  const entries = flattenDataTree(
    { login: { url: 'https://app.com/login', title: 'Login' } },
    'URL', 'main', 'data/main.js'
  )

  it('menghasilkan entry untuk parent object', () => {
    const parent = entries.find(e => e.path === 'URL.login')
    expect(parent).toBeDefined()
    expect(parent.type).toBe('object')
    expect(parent.group).toBe('URL')
    expect(parent.fileId).toBe('main')
    expect(parent.filePath).toBe('data/main.js')
  })

  it('menghasilkan entry untuk setiap field child', () => {
    const urlField = entries.find(e => e.path === 'URL.login.url')
    expect(urlField).toBeDefined()
    expect(urlField.type).toBe('string')
    expect(urlField.value).toBe('https://app.com/login')
  })

  it('parent object memiliki fields array', () => {
    const parent = entries.find(e => e.path === 'URL.login')
    expect(parent.fields).toContain('url')
    expect(parent.fields).toContain('title')
  })

  it('leaf entry tidak punya fields (null)', () => {
    const leaf = entries.find(e => e.path === 'URL.login.url')
    expect(leaf.fields).toBeNull()
  })

  it('label sama dengan path', () => {
    const entry = entries.find(e => e.path === 'URL.login')
    expect(entry.label).toBe('URL.login')
  })
})

describe('flattenDataTree — tipe data', () => {
  const entries = flattenDataTree(
    { item: { name: 'laptop', qty: 5, active: true, deleted: null } },
    'PRODUCT', 'main', 'data/main.js'
  )

  it('mendeteksi tipe number', () => {
    const e = entries.find(e => e.path === 'PRODUCT.item.qty')
    expect(e.type).toBe('number')
  })

  it('mendeteksi tipe boolean', () => {
    const e = entries.find(e => e.path === 'PRODUCT.item.active')
    expect(e.type).toBe('boolean')
  })
})

describe('flattenDataTree — nested dalam', () => {
  const entries = flattenDataTree(
    { valid: { user: { email: 'a@b.com', role: 'admin' } } },
    'ACCOUNT', 'main', 'data/main.js'
  )

  it('menghasilkan semua level', () => {
    const paths = entries.map(e => e.path)
    expect(paths).toContain('ACCOUNT.valid')
    expect(paths).toContain('ACCOUNT.valid.user')
    expect(paths).toContain('ACCOUNT.valid.user.email')
  })
})

describe('flattenDataTree — compatibleWith', () => {
  const entries = flattenDataTree(
    { login: { url: 'x', title: 'y' } },
    'URL', 'main', 'data/main.js'
  )

  it('object entry hanya kompatibel dengan dataref', () => {
    const obj = entries.find(e => e.path === 'URL.login')
    expect(obj.compatibleWith).toEqual(['dataref'])
  })

  it('string entry kompatibel dengan value/text/selector/dataref', () => {
    const str = entries.find(e => e.path === 'URL.login.url')
    expect(str.compatibleWith).toContain('value')
    expect(str.compatibleWith).toContain('dataref')
  })
})

// ── flattenAllFiles ────────────────────────────────────────────────

describe('flattenAllFiles', () => {
  const files = {
    main: {
      filename: 'main',
      groups: {
        URL:     { login: { url: 'https://app.com/login', title: 'Login' } },
        ACCOUNT: { valid: { username: 'student', password: 'Password123' } }
      }
    },
    products: {
      filename: 'products',
      groups: {
        PRODUCT: { laptop: { name: 'Laptop', price: 999 } }
      }
    }
  }

  const entries = flattenAllFiles(files)

  it('menghasilkan entries dari semua file', () => {
    const paths = entries.map(e => e.path)
    expect(paths).toContain('URL.login')
    expect(paths).toContain('ACCOUNT.valid')
    expect(paths).toContain('PRODUCT.laptop')
  })

  it('filePath sesuai dengan filename', () => {
    const urlEntry = entries.find(e => e.path === 'URL.login')
    expect(urlEntry.filePath).toBe('data/main.js')

    const productEntry = entries.find(e => e.path === 'PRODUCT.laptop')
    expect(productEntry.filePath).toBe('data/products.js')
  })

  it('fileId sesuai dengan key file', () => {
    const urlEntry = entries.find(e => e.path === 'URL.login')
    expect(urlEntry.fileId).toBe('main')
  })

  it('handles empty files object', () => {
    expect(flattenAllFiles({})).toEqual([])
  })
})
