import { describe, it, expect } from 'vitest'
import { createValidator, required, v } from './validationHelpers.js'

// ── required() ─────────────────────────────────────────────────────

describe('required', () => {
  it('returns error message when field is undefined', () => {
    const check = required('selector', 'Selector wajib')
    expect(check({})).toBe('Selector wajib')
  })

  it('returns error message when field is null', () => {
    const check = required('selector', 'Selector wajib')
    expect(check({ selector: null })).toBe('Selector wajib')
  })

  it('returns error message when field is empty string', () => {
    const check = required('selector', 'Selector wajib')
    expect(check({ selector: '' })).toBe('Selector wajib')
  })

  it('returns null when field has value', () => {
    const check = required('selector', 'Selector wajib')
    expect(check({ selector: '#btn' })).toBeNull()
  })

  it('uses fallback message when none provided', () => {
    const check = required('myField')
    expect(check({})).toBe('myField wajib diisi')
  })
})

// ── createValidator() ──────────────────────────────────────────────

describe('createValidator', () => {
  it('returns null when all checks pass', () => {
    const validate = createValidator(
      required('selector', 'Selector wajib'),
      required('value', 'Value wajib')
    )
    expect(validate({ selector: '#x', value: 'test' })).toBeNull()
  })

  it('returns first failing check error', () => {
    const validate = createValidator(
      required('selector', 'Selector wajib'),
      required('value', 'Value wajib')
    )
    expect(validate({ selector: '', value: 'test' })).toBe('Selector wajib')
  })

  it('stops at first error (short-circuit)', () => {
    const validate = createValidator(
      required('selector', 'Selector wajib'),
      required('value', 'Value wajib')
    )
    expect(validate({ selector: '', value: '' })).toBe('Selector wajib')
  })

  it('works with zero checks (always null)', () => {
    const validate = createValidator()
    expect(validate({})).toBeNull()
  })
})

// ── v shortcuts ────────────────────────────────────────────────────

describe('v shortcuts', () => {
  it('v.selector returns error for missing selector', () => {
    expect(v.selector()({ selector: '' })).toBeTruthy()
    expect(v.selector()({ selector: '#btn' })).toBeNull()
  })

  it('v.value returns error for missing value', () => {
    expect(v.value()({ value: '' })).toBeTruthy()
    expect(v.value()({ value: 'x' })).toBeNull()
  })

  it('v.varName returns error for missing varName', () => {
    expect(v.varName()({ varName: '' })).toBeTruthy()
    expect(v.varName()({ varName: 'myVar' })).toBeNull()
  })

  it('v.actual returns error for missing actual', () => {
    expect(v.actual()({ actual: '' })).toBeTruthy()
    expect(v.actual()({ actual: 'val' })).toBeNull()
  })

  it('v.expected returns default error message', () => {
    expect(v.expected()({ expected: '' })).toBe('Nilai yang diharapkan wajib diisi')
  })

  it('v.expected accepts custom message', () => {
    expect(v.expected('Custom msg')({ expected: '' })).toBe('Custom msg')
  })

  it('v.path returns error for missing path', () => {
    expect(v.path()({ path: '' })).toBeTruthy()
    expect(v.path()({ path: '/tmp/file.jpg' })).toBeNull()
  })
})
