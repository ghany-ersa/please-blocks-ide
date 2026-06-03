# Please Blocks

> Visual block-based IDE for QA Automation — no code required.

Please Blocks is a drag-and-drop IDE where each test step is represented as a block. QA engineers arrange blocks on a canvas; the IDE generates valid JavaScript test scripts automatically. Every block maps 1:1 to a `please-test` method — a Selenium WebDriver abstraction with expressive, human-readable syntax.

---

## The Problem

QA engineers struggle to write automated test scripts because they need to:

- Understand JavaScript and Selenium WebDriver syntax
- Know selector strategies (XPath, CSS, id) manually
- Maintain consistent project structure across the team
- Climb a steep learning curve if they are not programmers

## The Solution

Arrange blocks → get working test code. No JavaScript knowledge required.

```
[Navigate To: URL.login]
[Fill Input: "Username" · #username · ACCOUNT.valid.username]
[Fill Input: "Password" · #password · ACCOUNT.valid.password]
[Click: "Login Button" · button[type=submit]]
[See Text: "Welcome" · .dashboard-header]
```

Generates:

```js
const { please } = require('../app')
const { URL, ACCOUNT } = require('../data/main')

describe('Login', () => {
  it('login berhasil', async () => {
    await please.goTo(URL.login)
    await please.fill('Username', '#username', ACCOUNT.valid.username)
    await please.fill('Password', '#password', ACCOUNT.valid.password)
    await please.click('Login Button', 'button[type=submit]')
    const text = await please.getText('Header', '.dashboard-header')
    please.equal(text, 'Welcome')
  })
})
```

---

## Key Principles

| Principle | Description |
|---|---|
| **No-code first** | QA only needs to arrange blocks — no writing code |
| **Code-accessible** | Generated code is clean and editable by advanced QA |
| **Centralized data** | Change test data once, all tests update automatically |
| **Reusable components** | Repeated actions (login, logout) built once, used everywhere |

---

## Architecture

```
Please Blocks IDE (Electron + Vue 3)
│
├── Block Palette          — categorized built-in blocks + dynamic component blocks
├── Canvas Editor          — drag-and-drop: Feature → Test Case → Steps
├── Block Inspector        — configure each block's inputs (data refs, selectors, values)
├── Data Manager           — visual editor for test data (URLs, accounts, etc.)
├── Component Builder      — build reusable action classes visually
├── Code Preview           — live Monaco editor view of generated code
└── Test Runner            — run mocha, stream live logs, view mochawesome report
```

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | Vue 3 + Vite + `<script setup>` |
| Canvas | `@vue-flow/core` |
| Code preview | `vue-monaco-editor` |
| State | Pinia |
| Desktop | Electron |
| Test runner | `mocha` + `selenium-webdriver` |
| Test abstraction | `please-test` |
| Scaffolding | `create-please-test` |
| Reporting | `mochawesome` |

---

## Block Categories

| Category | Blocks |
|---|---|
| Navigation | Navigate To, Verify Page |
| Actions | Click, Fill Input, Fill & Enter, Clear, Date Picker, Upload File, Scroll To |
| Assertions | See Text, Assert Equal, Assert Not Equal, Get Text, Get Value, Force Fail |
| Flow | Feature (`describe`), Test Case (`it`) |
| Utilities | Wait |
| Components | Dynamic blocks generated from `components/*.js` |

---

## How Test Data Works

Blocks reference data by path, not by value:

```
Block stores:  { type: 'dataref', path: 'ACCOUNT.valid' }
Resolves to:   ACCOUNT.valid   (in generated code)
```

This means changing `ACCOUNT.valid.username` in the Data Manager automatically updates every block that references it — no canvas edits needed.

Four input types are supported: **Static Data** (`data/main.js`), **Environment Variables** (`.env`), **Canvas Variables** (output of a previous block), and **Inline Values** (typed directly).

---

## Generated Project Structure

Please Blocks generates and manages a standard `create-please-test` project:

```
[project-name]/
├── app.js                 # Driver setup + please instance + component imports
├── index.js               # Toggle which features run
├── .env                   # BASE_URL, credentials
├── components/            # Reusable action classes
│   └── auth.js            # class Auth { login(user), logout() }
├── data/
│   └── main.js            # { URL: {...}, ACCOUNT: {...} }
└── feature/
    ├── login.spec.js      # Generated from canvas
    └── checkout.spec.js
```

Canvas state is stored as JSON in `.blocks/*.json`. Spec files are **output** — regenerated automatically whenever the canvas changes.

---

## Roadmap

### v1 — MVP (Core functionality)
- Block palette, canvas editor, block inspector
- Data Manager + Data Factory
- Component Builder + Component Factory
- Code generator (spec, index, data, component files)
- Test runner with live log streaming
- Block validation (highlight incomplete blocks)

### v2 — Productivity
- Selector Inspector (browser extension: click element → selector auto-fills)
- Mochawesome report viewer embedded in IDE
- Canvas variables (pipe `getText` output to assertion blocks)
- Reverse codegen (parse manually edited `.spec.js` back to canvas)
- Feature toggle UI, multi-browser support

### v3 — AI & Cloud
- AI Selector Suggester (screenshot → best selector)
- Natural language to blocks ("login with wrong username" → block sequence)
- Cloud runner (BrowserStack/Sauce Labs, parallel multi-browser)
- CI/CD config export (GitHub Actions, GitLab CI)

---

## Project Structure (IDE Source)

```
please-blocks-ide/
├── src/
│   ├── core/
│   │   ├── blocks/definitions/    # Built-in block definitions
│   │   ├── factory/               # DataFactory, ComponentFactory
│   │   └── codegen/               # specGenerator, dataResolver, etc.
│   ├── stores/                    # Pinia: blockRegistry, canvasStore, dataRegistry
│   └── components/                # Vue components: canvas, palette, inspector, runner
└── electron/
    ├── main.js                    # Electron entry point
    ├── preload.js                 # IPC bridge
    └── ipc/                       # fileSystem, testRunner, watcher handlers
```

---

**Author:** Ghany Abdillah Ersa  
**Stack:** Vue 3 · Electron · please-test · Selenium WebDriver
