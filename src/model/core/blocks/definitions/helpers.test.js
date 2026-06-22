import { describe, it, expect } from 'vitest'
import { resolveValue, resolveString } from './helpers.js'

describe('resolveValue', () => {
  it('returns empty string for null', () => {
    expect(resolveValue(null)).toBe("''")
  })

  it('returns empty string for undefined', () => {
    expect(resolveValue(undefined)).toBe("''")
  })

  it('returns empty string for empty string', () => {
    expect(resolveValue('')).toBe("''")
  })

  it('wraps plain string in single quotes', () => {
    expect(resolveValue('hello')).toBe("'hello'")
  })

  it('escapes single quotes inside string', () => {
    expect(resolveValue("it's")).toBe("'it\\'s'")
  })

  it('escapes backslashes inside string', () => {
    expect(resolveValue('C:\\Users')).toBe("'C:\\\\Users'")
  })

  it('returns number as-is without quotes', () => {
    expect(resolveValue(42)).toBe('42')
    expect(resolveValue(0)).toBe('0')
  })

  it('resolves dataref to its path', () => {
    expect(resolveValue({ type: 'dataref', path: 'ACCOUNT.valid' })).toBe('ACCOUNT.valid')
  })

  it('resolves varref to its varName', () => {
    expect(resolveValue({ type: 'varref', varName: 'headerText' })).toBe('headerText')
  })
})

describe('resolveString', () => {
  it('returns empty string for null', () => {
    expect(resolveString(null)).toBe("''")
  })

  it('returns empty string for undefined', () => {
    expect(resolveString(undefined)).toBe("''")
  })

  it('returns empty string for empty string', () => {
    expect(resolveString('')).toBe("''")
  })

  it('wraps plain string in single quotes', () => {
    expect(resolveString('input email')).toBe("'input email'")
  })

  it('escapes single quotes inside string', () => {
    expect(resolveString("user's name")).toBe("'user\\'s name'")
  })

  it('resolves dataref to its path (no quotes)', () => {
    expect(resolveString({ type: 'dataref', path: 'URL.login' })).toBe('URL.login')
  })

  it('resolves varref to its varName (no quotes)', () => {
    expect(resolveString({ type: 'varref', varName: 'mySelector' })).toBe('mySelector')
  })
})
