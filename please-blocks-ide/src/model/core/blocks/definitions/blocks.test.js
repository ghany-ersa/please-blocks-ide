import { describe, it, expect } from 'vitest'
import actions    from './actions.js'
import navigation from './navigation.js'
import assertions from './assertions.js'
import utilities  from './utilities.js'
import { validateSchema } from '../schemaValidator.js'

// ── helpers ───────────────────────────────────────────────────────
function block(defs, id) {
  const b = defs.find(d => d.id === id)
  if (!b) throw new Error(`Block '${id}' tidak ditemukan`)
  return b
}

// ── Actions ───────────────────────────────────────────────────────

describe('action.click — codegen', () => {
  const b = block(actions, 'action.click')

  it('generates basic click', () => {
    expect(b.codegen({ label: 'tombol', selector: '#btn' }))
      .toBe("await please.click('tombol', '#btn')")
  })

  it('appends wait when provided', () => {
    expect(b.codegen({ label: 'tombol', selector: '#btn', wait: 1000 }))
      .toBe("await please.click('tombol', '#btn', 1000)")
  })
})

describe('action.click — validate', () => {
  const b = block(actions, 'action.click')

  it('returns error when selector is empty', () => {
    expect(b.validate({ label: 'btn', selector: '' })).toBeTruthy()
  })

  it('returns null when valid', () => {
    expect(b.validate({ label: 'btn', selector: '#btn' })).toBeNull()
  })
})

describe('action.fill — codegen', () => {
  const b = block(actions, 'action.fill')

  it('generates fill with plain value', () => {
    expect(b.codegen({ label: 'email', selector: '#email', value: 'test@mail.com' }))
      .toBe("await please.fill('email', '#email', 'test@mail.com')")
  })

  it('generates fill with dataref value', () => {
    expect(b.codegen({ label: 'email', selector: '#email', value: { type: 'dataref', path: 'ACCOUNT.valid.email' } }))
      .toBe("await please.fill('email', '#email', ACCOUNT.valid.email)")
  })
})

describe('action.fill — validate', () => {
  const b = block(actions, 'action.fill')

  it('returns error when selector missing', () => {
    expect(b.validate({ label: 'x', selector: '', value: 'v' })).toBeTruthy()
  })

  it('returns error when value missing', () => {
    expect(b.validate({ label: 'x', selector: '#x', value: '' })).toBeTruthy()
  })

  it('returns null when valid', () => {
    expect(b.validate({ label: 'x', selector: '#x', value: 'hello' })).toBeNull()
  })
})

describe('action.fillAndEnter — codegen', () => {
  const b = block(actions, 'action.fillAndEnter')

  it('generates fillAndEnter', () => {
    expect(b.codegen({ label: 'search', selector: '#q', value: 'kata kunci' }))
      .toBe("await please.fillAndEnter('search', '#q', 'kata kunci')")
  })
})

describe('action.clear — codegen', () => {
  const b = block(actions, 'action.clear')

  it('generates clear', () => {
    expect(b.codegen({ label: 'input', selector: '#name' }))
      .toBe("await please.clear('input', '#name')")
  })
})

describe('action.datepicker — codegen', () => {
  const b = block(actions, 'action.datepicker')

  it('generates datepicker', () => {
    expect(b.codegen({ label: 'tanggal lahir', selector: '#birthdate', value: '2000-01-01' }))
      .toBe("await please.datepicker('tanggal lahir', '#birthdate', '2000-01-01')")
  })
})

describe('action.uploadFile — codegen', () => {
  const b = block(actions, 'action.uploadFile')

  it('generates uploadFile with path', () => {
    expect(b.codegen({ label: 'foto', selector: 'input[type=file]', path: '/tmp/foto.jpg' }))
      .toBe("await please.uploadFile('foto', 'input[type=file]', '/tmp/foto.jpg')")
  })
})

describe('action.scrollTo — codegen', () => {
  const b = block(actions, 'action.scrollTo')

  it('generates scrollTo', () => {
    expect(b.codegen({ label: 'footer', selector: '#footer' }))
      .toBe("await please.scrollTo('footer', '#footer')")
  })
})

// ── Navigation ────────────────────────────────────────────────────

describe('nav.goTo — codegen', () => {
  const b = block(navigation, 'nav.goTo')

  it('generates goto with dataref', () => {
    expect(b.codegen({ urlTarget: { type: 'dataref', path: 'PAGE.login' } }))
      .toBe('await please.goto(PAGE.login)')
  })

  it('generates goto with inline object string (fallback plain)', () => {
    expect(b.codegen({ urlTarget: 'PAGE.dashboard' }))
      .toBe("await please.goto('PAGE.dashboard')")
  })
})

describe('nav.goTo — validate', () => {
  const b = block(navigation, 'nav.goTo')

  it('returns error when urlTarget is missing', () => {
    expect(b.validate({ urlTarget: null })).toBeTruthy()
  })

  it('returns null when urlTarget is provided', () => {
    expect(b.validate({ urlTarget: { type: 'dataref', path: 'URL.login' } })).toBeNull()
  })
})

describe('nav.goTo — URL_SCHEMA errorMessage', () => {
  // Akses schema dari input definition block nav.goTo
  const b = block(navigation, 'nav.goTo')
  const inputDef = b.inputs[0]  // urlTarget — satu-satunya input, punya schema

  const accountEntry = {
    path: 'ACCOUNT.valid',
    type: 'object',
    fields: ['username', 'password']  // tidak punya 'url' dan 'title'
  }

  const partialEntry = {
    path: 'DATA.partial',
    type: 'object',
    fields: ['url']  // punya 'url' tapi tidak punya 'title'
  }

  it('errorMessage menyebutkan semua field yang hilang (url dan title)', () => {
    const value = { type: 'dataref', path: 'ACCOUNT.valid' }
    const result = validateSchema(value, inputDef, [accountEntry])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('"url"')
    expect(result.message).toContain('"title"')
  })

  it('errorMessage menyebutkan hanya field yang memang hilang', () => {
    const value = { type: 'dataref', path: 'DATA.partial' }
    const result = validateSchema(value, inputDef, [partialEntry])
    expect(result.valid).toBe(false)
    expect(result.message).toContain('"title"')
    expect(result.message).not.toContain('"url"')
  })

  it('tidak ada error ketika entry punya url dan title', () => {
    const urlEntry = { path: 'URL.login', type: 'object', fields: ['url', 'title'] }
    const value = { type: 'dataref', path: 'URL.login' }
    const result = validateSchema(value, inputDef, [urlEntry])
    expect(result.valid).toBe(true)
  })
})

describe('nav.checkWhere — codegen', () => {
  const b = block(navigation, 'nav.checkWhere')

  it('generates verifyPage with dataref', () => {
    expect(b.codegen({ urlExpected: { type: 'dataref', path: 'PAGE.dashboard' } }))
      .toBe('await please.verifyPage(PAGE.dashboard)')
  })
})

// ── Assertions ────────────────────────────────────────────────────

describe('assert.seeText — codegen', () => {
  const b = block(assertions, 'assert.seeText')

  it('generates see dengan expected langsung', () => {
    expect(b.codegen({ label: 'pesan', selector: '#msg', expected: 'Berhasil!' }))
      .toBe("await please.see('pesan', '#msg', 'Berhasil!')")
  })

  it('resolves dataref expected', () => {
    expect(b.codegen({
      label: 'pesan',
      selector: '#msg',
      expected: { type: 'dataref', path: 'DATA.expected.msg' }
    })).toBe("await please.see('pesan', '#msg', DATA.expected.msg)")
  })
})

describe('assert.getText — codegen', () => {
  const b = block(assertions, 'assert.getText')

  it('generates see assignment (read text)', () => {
    expect(b.codegen({ label: 'judul', selector: 'h1', varName: 'pageTitle' }))
      .toBe("const pageTitle = await please.see('judul', 'h1')")
  })
})

describe('assert.equal — codegen', () => {
  const b = block(assertions, 'assert.equal')

  it('generates expect().toBe() without message', () => {
    expect(b.codegen({ actual: { type: 'varref', varName: 'pageTitle' }, expected: 'Dashboard' }))
      .toBe("expect(pageTitle).toBe('Dashboard')")
  })

  it('generates expect().toBe() with message', () => {
    expect(b.codegen({ actual: { type: 'varref', varName: 'pageTitle' }, expected: 'Dashboard', message: 'judul salah' }))
      .toBe("expect(pageTitle, 'judul salah').toBe('Dashboard')")
  })
})

describe('assert.notEqual — codegen', () => {
  const b = block(assertions, 'assert.notEqual')

  it('generates expect().not.toBe()', () => {
    expect(b.codegen({ actual: { type: 'varref', varName: 'status' }, expected: 'error' }))
      .toBe("expect(status).not.toBe('error')")
  })
})

describe('assert.fail — codegen', () => {
  const b = block(assertions, 'assert.fail')

  it('generates throw new Error with message', () => {
    expect(b.codegen({ message: 'sengaja gagal' }))
      .toBe("throw new Error('sengaja gagal')")
  })

  it('generates throw new Error without message', () => {
    expect(b.codegen({}))
      .toBe("throw new Error('Test digagalkan secara eksplisit')")
  })
})

// ── Utilities ─────────────────────────────────────────────────────

describe('util.wait — codegen', () => {
  const b = block(utilities, 'util.wait')

  it('generates wait with duration', () => {
    expect(b.codegen({ duration: 3000 }))
      .toBe('await please.wait(3000)')
  })

  it('generates wait without duration (default)', () => {
    expect(b.codegen({}))
      .toBe('await please.wait()')
  })
})

describe('util.rawCode — codegen', () => {
  const b = block(utilities, 'util.rawCode')

  it('returns raw code string', () => {
    expect(b.codegen({ code: 'await please.customMethod()' }))
      .toBe('await please.customMethod()')
  })

  it('returns placeholder when code is empty', () => {
    expect(b.codegen({ code: '' }))
      .toBe('// (kode kosong)')
  })
})

describe('util.rawCode — validate', () => {
  const b = block(utilities, 'util.rawCode')

  it('returns error when code is empty', () => {
    expect(b.validate({ code: '' })).toBeTruthy()
  })

  it('returns null when code is filled', () => {
    expect(b.validate({ code: 'await please.wait()' })).toBeNull()
  })
})

// ── Utility blocks baru (Playwright) ─────────────────────────────

describe('util.untilShow — codegen', () => {
  const b = block(utilities, 'util.untilShow')

  it('generates untilShow tanpa timeout', () => {
    expect(b.codegen({ label: 'spinner', selector: '.spinner' }))
      .toBe("await please.untilShow('spinner', '.spinner')")
  })

  it('generates untilShow dengan custom timeout', () => {
    expect(b.codegen({ label: 'spinner', selector: '.spinner', time: 5000 }))
      .toBe("await please.untilShow('spinner', '.spinner', 5000)")
  })

  it('returns error when selector kosong', () => {
    expect(b.validate({ label: 'x', selector: '' })).toBeTruthy()
  })

  it('returns null when valid', () => {
    expect(b.validate({ label: 'x', selector: '.x' })).toBeNull()
  })
})

describe('util.screenshot — codegen', () => {
  const b = block(utilities, 'util.screenshot')

  it('generates screenshot dengan label', () => {
    expect(b.codegen({ label: 'halaman login' }))
      .toBe("await please.screenshot('halaman login')")
  })

  it('generates screenshot tanpa label', () => {
    expect(b.codegen({})).toBe('await please.screenshot()')
  })
})

describe('util.newTab — codegen', () => {
  const b = block(utilities, 'util.newTab')

  it('generates newTab assignment ke variabel', () => {
    expect(b.codegen({ varName: 'tab2' }))
      .toBe('const tab2 = await please.newTab()')
  })

  it('returns error when varName kosong', () => {
    expect(b.validate({ varName: '' })).toBeTruthy()
  })

  it('returns null when varName diisi', () => {
    expect(b.validate({ varName: 'tab2' })).toBeNull()
  })
})

describe('util.switchTab — codegen', () => {
  const b = block(utilities, 'util.switchTab')

  it('generates switchTab dari varref', () => {
    expect(b.codegen({ tab: { type: 'varref', varName: 'tab2' } }))
      .toBe('await please.switchTab(tab2)')
  })

  it('returns error when tab kosong', () => {
    expect(b.validate({ tab: '' })).toBeTruthy()
  })
})

describe('util.closeTab — codegen', () => {
  const b = block(utilities, 'util.closeTab')

  it('generates closeTab dari varref', () => {
    expect(b.codegen({ tab: { type: 'varref', varName: 'tab2' } }))
      .toBe('await please.closeTab(tab2)')
  })
})

describe('util.acceptDialog — codegen', () => {
  const b = block(utilities, 'util.acceptDialog')

  it('generates acceptDialog tanpa teks', () => {
    expect(b.codegen({})).toBe('await please.acceptDialog()')
  })

  it('generates acceptDialog dengan teks prompt', () => {
    expect(b.codegen({ text: 'konfirmasi' }))
      .toBe("await please.acceptDialog('konfirmasi')")
  })
})

describe('util.dismissDialog — codegen', () => {
  const b = block(utilities, 'util.dismissDialog')

  it('generates dismissDialog', () => {
    expect(b.codegen({})).toBe('await please.dismissDialog()')
  })
})
