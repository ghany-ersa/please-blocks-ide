import { describe, it, expect } from 'vitest'
import {
  codegenLabelSelector,
  codegenLabelSelectorValue,
  codegenGetVar,
  codegenAssert
} from './codegenHelpers.js'

// ── codegenLabelSelector ───────────────────────────────────────────

describe('codegenLabelSelector', () => {
  it('generates basic label+selector call', () => {
    const codegen = codegenLabelSelector('click')
    expect(codegen({ label: 'tombol submit', selector: '#submit' }))
      .toBe("await please.click('tombol submit', '#submit')")
  })

  it('uses XPath selector as-is (no extra quotes)', () => {
    const codegen = codegenLabelSelector('scrollTo')
    expect(codegen({ label: 'elemen', selector: '//div[@id="main"]' }))
      .toBe("await please.scrollTo('elemen', '//div[@id=\"main\"]')")
  })

  it('appends optional field when present', () => {
    const codegen = codegenLabelSelector('click', 'wait')
    expect(codegen({ label: 'btn', selector: '#btn', wait: 500 }))
      .toBe("await please.click('btn', '#btn', 500)")
  })

  it('omits optional field when empty string', () => {
    const codegen = codegenLabelSelector('click', 'wait')
    expect(codegen({ label: 'btn', selector: '#btn', wait: '' }))
      .toBe("await please.click('btn', '#btn')")
  })

  it('omits optional field when undefined', () => {
    const codegen = codegenLabelSelector('click', 'wait')
    expect(codegen({ label: 'btn', selector: '#btn' }))
      .toBe("await please.click('btn', '#btn')")
  })

  it('resolves dataref selector', () => {
    const codegen = codegenLabelSelector('clear')
    expect(codegen({ label: 'field', selector: { type: 'dataref', path: 'SEL.email' } }))
      .toBe("await please.clear('field', SEL.email)")
  })
})

// ── codegenLabelSelectorValue ──────────────────────────────────────

describe('codegenLabelSelectorValue', () => {
  it('generates label+selector+value call', () => {
    const codegen = codegenLabelSelectorValue('fill')
    expect(codegen({ label: 'input email', selector: '#email', value: 'user@mail.com' }))
      .toBe("await please.fill('input email', '#email', 'user@mail.com')")
  })

  it('resolves dataref value', () => {
    const codegen = codegenLabelSelectorValue('fill')
    expect(codegen({
      label: 'input email',
      selector: '#email',
      value: { type: 'dataref', path: 'ACCOUNT.valid.email' }
    })).toBe("await please.fill('input email', '#email', ACCOUNT.valid.email)")
  })

  it('uses custom valueField (path)', () => {
    const codegen = codegenLabelSelectorValue('uploadFile', 'path')
    expect(codegen({ label: 'foto', selector: 'input[type=file]', path: '/tmp/foto.jpg' }))
      .toBe("await please.uploadFile('foto', 'input[type=file]', '/tmp/foto.jpg')")
  })

  it('resolves varref value', () => {
    const codegen = codegenLabelSelectorValue('fillAndEnter')
    expect(codegen({
      label: 'search',
      selector: '#q',
      value: { type: 'varref', varName: 'keyword' }
    })).toBe("await please.fillAndEnter('search', '#q', keyword)")
  })
})

// ── codegenGetVar ──────────────────────────────────────────────────

describe('codegenGetVar', () => {
  it('generates const assignment from getText', () => {
    const codegen = codegenGetVar('getText')
    expect(codegen({ label: 'header', selector: '//h1', varName: 'headerText' }))
      .toBe("const headerText = await please.getText('header', '//h1')")
  })

  it('falls back to "result" when varName is missing', () => {
    const codegen = codegenGetVar('getValue')
    expect(codegen({ label: 'input', selector: '#name' }))
      .toBe("const result = await please.getValue('input', '#name')")
  })
})

// ── codegenAssert ──────────────────────────────────────────────────

describe('codegenAssert', () => {
  it('generates equal call with plain expected', () => {
    const codegen = codegenAssert('equal')
    expect(codegen({ actual: { varName: 'headerText' }, expected: 'Selamat Datang' }))
      .toBe("await please.equal(headerText, 'Selamat Datang')")
  })

  it('generates notEqual call', () => {
    const codegen = codegenAssert('notEqual')
    expect(codegen({ actual: { varName: 'status' }, expected: 'error' }))
      .toBe("await please.notEqual(status, 'error')")
  })

  it('appends optional message', () => {
    const codegen = codegenAssert('equal')
    expect(codegen({ actual: { varName: 'val' }, expected: 'ok', message: 'harus ok' }))
      .toBe("await please.equal(val, 'ok', 'harus ok')")
  })

  it('uses plain string actual as-is', () => {
    const codegen = codegenAssert('equal')
    expect(codegen({ actual: 'myVar', expected: '1' }))
      .toBe("await please.equal(myVar, '1')")
  })

  it('resolves dataref expected', () => {
    const codegen = codegenAssert('equal')
    expect(codegen({
      actual: { varName: 'title' },
      expected: { type: 'dataref', path: 'DATA.expected.title' }
    })).toBe("await please.equal(title, DATA.expected.title)")
  })
})
