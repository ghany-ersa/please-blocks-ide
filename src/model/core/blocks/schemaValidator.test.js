import { describe, it, expect } from 'vitest'
import { validateSchema, checkEntryCompatibility } from './schemaValidator.js'

const URL_SCHEMA = {
  requiredFields: ['url', 'title'],
  description: 'Object URL',
  errorMessage: (missing) => `Field hilang: ${missing.join(', ')}`
}

const inputDef = { name: 'urlTarget', type: 'dataref', schema: URL_SCHEMA }
const inputDefNoSchema = { name: 'label', type: 'text' }

const urlEntry = {
  path: 'URL.login',
  type: 'object',
  fields: ['url', 'title']
}

const accountEntry = {
  path: 'ACCOUNT.valid',
  type: 'object',
  fields: ['username', 'password']
}

const stringEntry = {
  path: 'ACCOUNT.valid.username',
  type: 'string',
  fields: null
}

// ── validateSchema ─────────────────────────────────────────────────

describe('validateSchema', () => {
  it('returns null when inputDef has no schema', () => {
    const value = { type: 'dataref', path: 'URL.login' }
    expect(validateSchema(value, inputDefNoSchema, [])).toBeNull()
  })

  it('returns null when value is not a dataref', () => {
    expect(validateSchema('plain string', inputDef, [])).toBeNull()
    expect(validateSchema(null, inputDef, [])).toBeNull()
    expect(validateSchema({ type: 'varref', varName: 'x' }, inputDef, [])).toBeNull()
  })

  it('returns not_found when entry does not exist in registry', () => {
    const value = { type: 'dataref', path: 'URL.nonexistent' }
    const result = validateSchema(value, inputDef, [urlEntry])
    expect(result.valid).toBe(false)
    expect(result.type).toBe('not_found')
    expect(result.message).toContain('URL.nonexistent')
  })

  it('returns not_object when entry is a string type', () => {
    const value = { type: 'dataref', path: 'ACCOUNT.valid.username' }
    const result = validateSchema(value, inputDef, [stringEntry])
    expect(result.valid).toBe(false)
    expect(result.type).toBe('not_object')
  })

  it('returns ok when all required fields are present', () => {
    const value = { type: 'dataref', path: 'URL.login' }
    const result = validateSchema(value, inputDef, [urlEntry])
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ok')
    expect(result.missing).toEqual([])
  })

  it('returns missing_fields when entry lacks required fields', () => {
    const value = { type: 'dataref', path: 'ACCOUNT.valid' }
    const result = validateSchema(value, inputDef, [accountEntry])
    expect(result.valid).toBe(false)
    expect(result.type).toBe('missing_fields')
    expect(result.missing).toContain('url')
    expect(result.missing).toContain('title')
  })

  it('uses custom errorMessage function', () => {
    const value = { type: 'dataref', path: 'ACCOUNT.valid' }
    const result = validateSchema(value, inputDef, [accountEntry])
    expect(result.message).toBe('Field hilang: url, title')
  })

  it('uses fallback message when errorMessage is not a function', () => {
    const schemaNoFn = { requiredFields: ['url', 'title'], description: 'URL object' }
    const def = { name: 'urlTarget', type: 'dataref', schema: schemaNoFn }
    const value = { type: 'dataref', path: 'ACCOUNT.valid' }
    const result = validateSchema(value, def, [accountEntry])
    expect(result.message).toContain('url')
    expect(result.message).toContain('title')
  })
})

// ── checkEntryCompatibility ────────────────────────────────────────

describe('checkEntryCompatibility', () => {
  it('returns ok when no schema', () => {
    expect(checkEntryCompatibility(urlEntry, null)).toBe('ok')
    expect(checkEntryCompatibility(urlEntry, {})).toBe('ok')
  })

  it('returns ok when entry has all required fields', () => {
    expect(checkEntryCompatibility(urlEntry, URL_SCHEMA)).toBe('ok')
  })

  it('returns wrong_type when entry is not an object', () => {
    expect(checkEntryCompatibility(stringEntry, URL_SCHEMA)).toBe('wrong_type')
  })

  it('returns wrong_type when object entry has no fields array', () => {
    const badEntry = { path: 'X', type: 'object', fields: null }
    expect(checkEntryCompatibility(badEntry, URL_SCHEMA)).toBe('wrong_type')
  })

  it('returns missing_fields when entry lacks some required fields', () => {
    expect(checkEntryCompatibility(accountEntry, URL_SCHEMA)).toBe('missing_fields')
  })
})
