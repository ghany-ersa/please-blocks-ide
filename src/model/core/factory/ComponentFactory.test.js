import { describe, it, expect } from 'vitest'
import { buildComponentBlocks, generateComponentFile } from './ComponentFactory.js'

// ── Fixtures ──────────────────────────────────────────────────────

const authComp = {
  id: 'comp-auth',
  name: 'Auth',
  exportName: 'AUTH',
  methods: [
    { name: 'login',  params: ['email', 'password'], steps: [] },
    { name: 'logout', params: [],                   steps: [] }
  ]
}

const registryMap = {}
const registry = {
  getById: (id) => registryMap[id] ?? null
}

// ── buildComponentBlocks ──────────────────────────────────────────

describe('buildComponentBlocks — struktur', () => {
  const blocks = buildComponentBlocks(authComp)

  it('menghasilkan satu block per method', () => {
    expect(blocks).toHaveLength(2)
  })

  it('id block mengikuti pola comp.<name>.<method>', () => {
    expect(blocks[0].id).toBe('comp.auth.login')
    expect(blocks[1].id).toBe('comp.auth.logout')
  })

  it('label block adalah EXPORTNAME.method', () => {
    expect(blocks[0].label).toBe('AUTH.login')
    expect(blocks[1].label).toBe('AUTH.logout')
  })

  it('type adalah component', () => {
    expect(blocks[0].type).toBe('component')
  })

  it('inputs sesuai dengan params method', () => {
    const loginBlock = blocks[0]
    expect(loginBlock.inputs).toHaveLength(2)
    expect(loginBlock.inputs[0].name).toBe('email')
    expect(loginBlock.inputs[1].name).toBe('password')
  })

  it('method tanpa params punya inputs kosong', () => {
    expect(blocks[1].inputs).toHaveLength(0)
  })

  it('semua inputs required=true', () => {
    blocks[0].inputs.forEach(inp => expect(inp.required).toBe(true))
  })
})

describe('buildComponentBlocks — codegen', () => {
  const blocks = buildComponentBlocks(authComp)
  const loginBlock = blocks.find(b => b.id === 'comp.auth.login')

  it('generates await EXPORTNAME.method(args)', () => {
    const code = loginBlock.codegen({ email: 'x@y.com', password: 'secret' })
    expect(code).toBe("await AUTH.login('x@y.com', 'secret')")
  })

  it('resolves dataref value', () => {
    const code = loginBlock.codegen({
      email:    { type: 'dataref', path: 'ACCOUNT.valid.email' },
      password: { type: 'dataref', path: 'ACCOUNT.valid.password' }
    })
    expect(code).toBe('await AUTH.login(ACCOUNT.valid.email, ACCOUNT.valid.password)')
  })

  it('resolves varref value', () => {
    const code = loginBlock.codegen({
      email:    { type: 'varref', varName: 'emailVar' },
      password: 'secret'
    })
    expect(code).toBe("await AUTH.login(emailVar, 'secret')")
  })

  it('generates await EXPORTNAME.method() untuk method tanpa params', () => {
    const logoutBlock = blocks.find(b => b.id === 'comp.auth.logout')
    expect(logoutBlock.codegen({})).toBe('await AUTH.logout()')
  })
})

describe('buildComponentBlocks — validate', () => {
  const blocks = buildComponentBlocks(authComp)
  const loginBlock = blocks.find(b => b.id === 'comp.auth.login')

  it('returns error when required param missing', () => {
    expect(loginBlock.validate({ email: '', password: '' })).toBeTruthy()
  })

  it('returns null when all params filled', () => {
    expect(loginBlock.validate({ email: 'x@y.com', password: 'secret' })).toBeNull()
  })
})

// ── generateComponentFile ─────────────────────────────────────────

describe('generateComponentFile — struktur file', () => {
  const code = generateComponentFile(authComp)

  it('mengandung deklarasi class', () => {
    expect(code).toContain('class Auth {')
  })

  it('constructor menerima please dan assign ke this.please', () => {
    expect(code).toContain('constructor(please)')
    expect(code).toContain('this.please = please')
  })

  it('mengandung async method', () => {
    expect(code).toContain('async login(email, password)')
    expect(code).toContain('async logout()')
  })

  it('module.exports dari nama class', () => {
    expect(code).toContain('module.exports = Auth')
  })
})

describe('generateComponentFile — dengan steps', () => {
  const comp = {
    id: 'comp-auth',
    name: 'Auth',
    exportName: 'AUTH',
    methods: [
      {
        name: 'login',
        params: ['email', 'password'],
        steps: [
          { blockId: 'action.fill',  inputs: { label: 'email',    selector: '#email',    value: 'email'    } },
          { blockId: 'action.fill',  inputs: { label: 'password', selector: '#password', value: 'password' } },
          { blockId: 'action.click', inputs: { label: 'submit',   selector: '#submit'   } }
        ]
      }
    ]
  }

  const blockReg = {
    getById: (id) => {
      const defs = {
        'action.fill':  { id: 'action.fill',  codegen: (inp) => `await please.fill('${inp.label}', '${inp.selector}', ${inp.value})` },
        'action.click': { id: 'action.click', codegen: (inp) => `await please.click('${inp.label}', '${inp.selector}')` }
      }
      return defs[id] ?? null
    }
  }

  it('menghasilkan kode step di dalam method dengan this.please', () => {
    const code = generateComponentFile(comp, blockReg)
    expect(code).toContain("await this.please.fill('email', '#email', email)")
    expect(code).toContain("await this.please.fill('password', '#password', password)")
    expect(code).toContain("await this.please.click('submit', '#submit')")
  })
})

describe('generateComponentFile — sibling component (nested)', () => {
  const cartComp = {
    id: 'comp-cart',
    name: 'Cart',
    exportName: 'CART',
    methods: [
      {
        name: 'addAndCheckout',
        params: ['item'],
        steps: [
          { blockId: 'action.click',        inputs: { label: 'add',  selector: '#add'  } },
          { blockId: 'comp.checkout.order', inputs: { item: 'item' } }
        ]
      }
    ]
  }

  const blockReg = {
    getById: (id) => {
      const defs = {
        'action.click':        {
          id: 'action.click', type: 'action',
          codegen: (inp) => `await please.click('${inp.label}', '${inp.selector}')`
        },
        'comp.checkout.order': {
          id: 'comp.checkout.order', type: 'component',
          componentName: 'Checkout', componentExport: 'CHECKOUT',
          codegen: (inp) => `await CHECKOUT.order(${inp.item})`
        }
      }
      return defs[id] ?? null
    }
  }

  const code = generateComponentFile(cartComp, blockReg)

  it('require sibling class', () => {
    expect(code).toContain("require('./checkout')")
  })

  it('instansiasi sibling di constructor sebagai this.EXPORTNAME', () => {
    expect(code).toContain('this.CHECKOUT = new Checkout(please)')
  })

  it('tidak ada module-level let variable', () => {
    expect(code).not.toContain('let please')
    expect(code).not.toContain('let CHECKOUT')
  })

  it('pemanggilan sibling di method menggunakan this.EXPORTNAME', () => {
    expect(code).toContain('await this.CHECKOUT.order(')
  })

  it('please.* di step non-sibling tetap jadi this.please.*', () => {
    expect(code).toContain("await this.please.click('add', '#add')")
  })
})

describe('generateComponentFile — self-call (method sekelas)', () => {
  const authComp2 = {
    id: 'comp-auth2',
    name: 'Auth',
    exportName: 'AUTH',
    methods: [
      {
        name: 'loginAndVerify',
        params: [],
        steps: [
          { blockId: 'comp.auth.login', inputs: {} }
        ]
      },
      { name: 'login', params: [], steps: [] }
    ]
  }

  const blockReg = {
    getById: (id) => id === 'comp.auth.login'
      ? { id, type: 'component', componentName: 'Auth', componentExport: 'AUTH',
          codegen: () => 'await AUTH.login()' }
      : null
  }

  it('pemanggilan method sekelas menggunakan this.method() bukan this.AUTH.login()', () => {
    const code = generateComponentFile(authComp2, blockReg)
    expect(code).toContain('await this.login()')
    expect(code).not.toContain('await this.AUTH.login()')
  })
})

describe('generateComponentFile — dengan require data', () => {
  const comp = {
    id: 'comp-nav',
    name: 'Nav',
    exportName: 'NAV',
    methods: [
      {
        name: 'goHome',
        params: [],
        steps: [
          { blockId: 'nav.goto', inputs: { urlTarget: { type: 'dataref', path: 'URL.home' } } }
        ]
      }
    ]
  }

  const dataEntries = [
    { path: 'URL.home', group: 'URL', fileId: 'main', filePath: 'data/main.js' }
  ]

  it('menghasilkan require data yang dipakai', () => {
    const blockReg = {
      getById: (id) => id === 'nav.goto'
        ? { id, codegen: (inp) => `await please.goto(${inp.urlTarget?.path ?? inp.urlTarget})` }
        : null
    }
    const code = generateComponentFile(comp, blockReg, dataEntries)
    expect(code).toContain("require('../data/main')")
    expect(code).toContain('URL')
  })
})
