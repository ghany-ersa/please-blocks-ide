import { describe, it, expect } from 'vitest'
import { validateStep, validateTestCase, validateCanvas } from './stepValidator.js'

// ── Fixtures ──────────────────────────────────────────────────────

const clickBlock = {
  id: 'action.click',
  inputs: [
    { name: 'label',    type: 'text',     label: 'Label',    required: true  },
    { name: 'selector', type: 'selector', label: 'Selector', required: true  },
    { name: 'wait',     type: 'number',   label: 'Wait',     required: false }
  ],
  validate: (inputs) => inputs.selector ? null : 'Selector wajib diisi'
}

const navBlock = {
  id: 'nav.goto',
  inputs: [
    {
      name: 'urlTarget', type: 'dataref', label: 'URL target', required: true,
      schema: {
        requiredFields: ['url', 'title'],
        errorMessage: (m) => `Field hilang: ${m.join(', ')}`
      }
    }
  ],
  validate: (inputs) => inputs.urlTarget ? null : 'URL target wajib dipilih'
}

const registry = {
  getById: (id) => ({ 'action.click': clickBlock, 'nav.goto': navBlock }[id] ?? null)
}

const urlEntry = { path: 'URL.login', type: 'object', fields: ['url', 'title'] }
const accountEntry = { path: 'ACCOUNT.valid', type: 'object', fields: ['username', 'password'] }

// ── validateStep ──────────────────────────────────────────────────

describe('validateStep — block tidak ditemukan', () => {
  it('returns invalid with _block error', () => {
    const result = validateStep({ inputs: {} }, null)
    expect(result.valid).toBe(false)
    expect(result.errors._block).toBeTruthy()
    expect(result.errorCount).toBe(1)
  })
})

describe('validateStep — required fields', () => {
  it('returns invalid when required field missing', () => {
    const step = { inputs: { label: 'btn', selector: '' } }
    const result = validateStep(step, clickBlock)
    expect(result.valid).toBe(false)
    expect(result.errors.selector).toBeTruthy()
  })

  it('returns valid when all required fields filled', () => {
    const step = { inputs: { label: 'btn', selector: '#btn' } }
    const result = validateStep(step, clickBlock)
    expect(result.valid).toBe(true)
    expect(result.errorCount).toBe(0)
  })

  it('optional field missing does not cause error', () => {
    const step = { inputs: { label: 'btn', selector: '#btn' } }
    const result = validateStep(step, clickBlock)
    expect(result.errors.wait).toBeUndefined()
  })
})

describe('validateStep — schema validation', () => {
  it('returns error when dataref entry not found in registry', () => {
    const step = { inputs: { urlTarget: { type: 'dataref', path: 'URL.unknown' } } }
    const result = validateStep(step, navBlock, [urlEntry])
    expect(result.valid).toBe(false)
    expect(result.errors.urlTarget).toContain('URL.unknown')
  })

  it('returns error when dataref entry has wrong fields', () => {
    const step = { inputs: { urlTarget: { type: 'dataref', path: 'ACCOUNT.valid' } } }
    const result = validateStep(step, navBlock, [accountEntry])
    expect(result.valid).toBe(false)
    expect(result.errors.urlTarget).toContain('url')
  })

  it('returns valid when dataref entry matches schema', () => {
    const step = { inputs: { urlTarget: { type: 'dataref', path: 'URL.login' } } }
    const result = validateStep(step, navBlock, [urlEntry])
    expect(result.valid).toBe(true)
  })
})

describe('validateStep — errorCount', () => {
  it('counts multiple errors correctly', () => {
    const step = { inputs: {} }
    const result = validateStep(step, clickBlock)
    // label dan selector missing → 2 required errors + 1 custom validate
    expect(result.errorCount).toBeGreaterThanOrEqual(2)
  })
})

// ── validateTestCase ──────────────────────────────────────────────

describe('validateTestCase', () => {
  it('returns totalErrors=0 for all valid steps', () => {
    const tc = {
      steps: [
        { blockId: 'action.click', inputs: { label: 'btn', selector: '#btn' } }
      ]
    }
    const { totalErrors, stepResults } = validateTestCase(tc, registry, [])
    expect(totalErrors).toBe(0)
    expect(stepResults[0].valid).toBe(true)
  })

  it('accumulates errors across steps', () => {
    const tc = {
      steps: [
        { blockId: 'action.click', inputs: { label: '', selector: '' } },
        { blockId: 'action.click', inputs: { label: 'btn', selector: '#btn' } }
      ]
    }
    const { totalErrors } = validateTestCase(tc, registry, [])
    expect(totalErrors).toBeGreaterThan(0)
  })

  it('reports unknown block as error', () => {
    const tc = {
      steps: [{ blockId: 'unknown.block', inputs: {} }]
    }
    const { totalErrors } = validateTestCase(tc, registry, [])
    expect(totalErrors).toBeGreaterThan(0)
  })
})

// ── validateCanvas ─────────────────────────────────────────────────

describe('validateCanvas', () => {
  it('returns array per feature', () => {
    const features = [
      {
        id: 'f1',
        testCases: [
          { id: 'tc1', steps: [{ blockId: 'action.click', inputs: { label: 'btn', selector: '#btn' } }] }
        ]
      }
    ]
    const results = validateCanvas(features, registry, [])
    expect(results).toHaveLength(1)
    expect(results[0].featureId).toBe('f1')
    expect(results[0].featureErrors).toBe(0)
  })

  it('counts errors per feature', () => {
    const features = [
      {
        id: 'f1',
        testCases: [
          { id: 'tc1', steps: [{ blockId: 'action.click', inputs: { label: '', selector: '' } }] }
        ]
      }
    ]
    const results = validateCanvas(features, registry, [])
    expect(results[0].featureErrors).toBeGreaterThan(0)
  })

  it('handles empty features array', () => {
    expect(validateCanvas([], registry, [])).toEqual([])
  })
})
