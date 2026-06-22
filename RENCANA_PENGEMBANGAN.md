# Please Blocks — Rencana Pengembangan IDE

> Block-based visual IDE untuk QA Automation berbasis `please-test` dan `create-please-test`
>
> **Dibuat oleh:** Ghany Abdillah Ersa  
> **Versi dokumen:** 1.0  
> **Tanggal:** 2026-06-04

---

## Daftar Isi

1. [Konsep dan Latar Belakang](#1-konsep-dan-latar-belakang)
2. [Tech Stack](#2-tech-stack)
3. [Arsitektur Folder Project](#3-arsitektur-folder-project)
4. [Sistem Blok (Block System)](#4-sistem-blok-block-system)
5. [Data Factory](#5-data-factory)
6. [Component Factory](#6-component-factory)
7. [Code Generator](#7-code-generator)
8. [Alur Kerja Aplikasi](#8-alur-kerja-aplikasi)
9. [Roadmap Pengembangan](#9-roadmap-pengembangan)

---

## 1. Konsep dan Latar Belakang

### Masalah

QA engineer sering kesulitan menulis automated test script karena:

- Harus memahami sintaks JavaScript dan Selenium WebDriver
- Perlu tahu selector strategy (XPath, CSS, id) secara manual
- Struktur project yang tidak konsisten antar QA
- Kurva belajar tinggi untuk QA non-programmer

### Solusi: Please Blocks

Please Blocks adalah **visual block-based IDE** di mana setiap langkah test direpresentasikan sebagai blok yang bisa di-drag-and-drop. QA menyusun blok → IDE menghasilkan kode JavaScript yang valid secara otomatis.

Setiap blok mapping 1:1 ke method `please-test`, sebuah library abstraksi Selenium WebDriver dengan sintaks ekspresif dan pesan error dalam Bahasa Indonesia.

### Prinsip Utama

- **No-code first** — QA cukup menyusun blok, tidak perlu menulis kode
- **Code-accessible** — kode yang dihasilkan tetap bisa diedit manual oleh QA advance
- **Data terpusat** — perubahan data test di satu tempat otomatis berlaku di semua test
- **Component reusable** — aksi berulang (login, logout) dibuat sekali, dipakai berkali-kali
- **Bahasa manusia** — label dan pesan error dalam Bahasa Indonesia

---

## 2. Tech Stack

### Frontend (IDE Interface)

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Framework UI | Vue 3 + Vite | Composition API + `<script setup>` |
| Canvas drag-drop | `@vue-flow/core` | Port dari react-flow, API hampir identik |
| Code preview | `vue-monaco-editor` | Monaco Editor dengan wrapper Vue |
| State management | Pinia | Menggantikan Vuex, lebih ringan dan reaktif |
| Routing | Vue Router | Navigasi antar halaman IDE |
| Desktop app | Electron | Akses file system dan child process |

### Backend / Runtime

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Runtime | Node.js | Sudah tersedia via Electron main process |
| File watcher | `chokidar` | Watch perubahan di `components/` dan `data/` |
| Test runner | `child_process` | Jalankan `mocha` dari dalam IDE |
| Live log | WebSocket | Stream stdout test runner ke renderer |
| AST parser | `@babel/parser` | Parse file JS untuk ekstrak class dan method |

### Test Engine (please-test Stack)

| Komponen | Package | Keterangan |
|---|---|---|
| Test framework | `mocha` | Runner utama |
| Assertion | built-in Node `assert` | Dibungkus oleh please-test |
| Browser driver | `selenium-webdriver` | Otomasi browser |
| Abstraksi | `please-test` | Wrapper ekspresif di atas Selenium |
| Scaffolding | `create-please-test` | Generator struktur project awal |
| Reporter | `mochawesome` | HTML report dengan chart |

---

## 3. Arsitektur Folder Project

### Struktur Aplikasi IDE (Electron + Vue)

```
please-blocks/
├── electron/
│   ├── main.js               # Entry point Electron, setup window
│   ├── ipc/
│   │   ├── fileSystem.js     # Handler baca/tulis file project
│   │   ├── testRunner.js     # Jalankan mocha via child_process
│   │   └── watcher.js        # chokidar watch components/ dan data/
│   └── preload.js            # Bridge IPC antara main dan renderer
│
├── src/
│   ├── main.js               # Entry Vue app
│   ├── App.vue
│   │
│   ├── stores/               # Pinia stores
│   │   ├── blockRegistry.js  # Semua definisi blok (built-in + dynamic)
│   │   ├── dataRegistry.js   # Semua DataRef dari data/*.js
│   │   ├── canvasStore.js    # State canvas aktif (nodes, edges, features)
│   │   ├── projectStore.js   # Info project (path, nama, env variables)
│   │   └── runnerStore.js    # Status test runner, log, hasil
│   │
│   ├── core/
│   │   ├── blocks/
│   │   │   ├── definitions/  # Definisi tiap built-in block
│   │   │   │   ├── navigation.js
│   │   │   │   ├── actions.js
│   │   │   │   ├── assertions.js
│   │   │   │   └── utilities.js
│   │   │   └── BlockRegistry.js  # Class registry + register/unregister
│   │   │
│   │   ├── factory/
│   │   │   ├── DataFactory.js       # Parse data/*.js → DataRef entries
│   │   │   ├── ComponentFactory.js  # Parse components/*.js → block defs
│   │   │   └── flattenDataTree.js   # Helper: nested object → flat paths
│   │   │
│   │   └── codegen/
│   │       ├── specGenerator.js     # Canvas nodes → feature/*.spec.js
│   │       ├── componentGenerator.js# Component Builder → components/*.js
│   │       ├── dataGenerator.js     # Data Manager → data/main.js
│   │       ├── indexGenerator.js    # Feature toggles → index.js
│   │       └── dataResolver.js      # DataRef/varref/inline → JS string
│   │
│   ├── components/           # Vue components
│   │   ├── layout/
│   │   │   ├── AppShell.vue
│   │   │   ├── SidebarPalette.vue
│   │   │   ├── BottomRunner.vue
│   │   │   └── RightInspector.vue
│   │   │
│   │   ├── canvas/
│   │   │   ├── CanvasEditor.vue      # @vue-flow wrapper utama
│   │   │   ├── FeatureContainer.vue  # Node: describe()
│   │   │   ├── TestCaseNode.vue      # Node: it()
│   │   │   └── StepNode.vue          # Node: please.* / COMP.*
│   │   │
│   │   ├── inspector/
│   │   │   ├── BlockInspector.vue    # Panel kanan, edit properti blok
│   │   │   ├── inputs/
│   │   │   │   ├── TextInput.vue
│   │   │   │   ├── SelectorInput.vue # Input + tombol inspector 🔍
│   │   │   │   ├── DataRefSelect.vue # Dropdown dari dataRegistry
│   │   │   │   ├── VarRefSelect.vue  # Dropdown canvas variables
│   │   │   │   └── NumberInput.vue
│   │   │   └── ValidationBadge.vue
│   │   │
│   │   ├── palette/
│   │   │   ├── BlockPalette.vue
│   │   │   ├── BlockCard.vue
│   │   │   └── CategorySection.vue
│   │   │
│   │   ├── manager/
│   │   │   ├── DataManager.vue       # Editor data/main.js
│   │   │   ├── ComponentBuilder.vue  # Builder components/*.js
│   │   │   └── EnvEditor.vue         # Editor .env
│   │   │
│   │   └── runner/
│   │       ├── TestRunner.vue        # Panel run + log
│   │       ├── LogStream.vue         # Live stdout WebSocket
│   │       └── ReportViewer.vue      # Embed mochawesome
│   │
│   └── views/
│       ├── EditorView.vue            # Tampilan utama IDE
│       ├── DataView.vue              # Data Manager fullscreen
│       └── ComponentView.vue        # Component Builder fullscreen
│
├── package.json
└── vite.config.js
```

### Struktur Project Test yang Di-generate

Mengikuti template `create-please-test`:

```
[nama-project]/
├── app.js                    # Setup driver + instance please + import components
├── index.js                  # Toggle feature mana yang dijalankan
├── .env                      # Variabel environment (BASE_URL, credentials)
├── .env.example
│
├── components/               # Reusable action classes
│   ├── auth.js               # Class Auth { login(), logout() }
│   └── checkout.js           # Class Checkout { addToCart(), proceed() }
│
├── data/                     # Test data dan URL
│   └── main.js               # { URL: {...}, ACCOUNT: {...} }
│
└── feature/                  # Test spec files
    ├── login.spec.js
    └── checkout.spec.js
```

---

## 4. Sistem Blok (Block System)

### Schema Dasar Setiap Blok

Setiap blok didefinisikan sebagai objek JavaScript dengan struktur berikut:

```js
{
  id:       String,    // Unique ID, e.g. 'action.click'
  type:     String,    // 'navigation' | 'action' | 'assertion' | 'component' | 'data' | 'flow' | 'util'
  label:    String,    // Nama tampil di palette, e.g. 'Click'
  icon:     String,    // Emoji icon
  color:    String,    // Hex warna kategori

  inputs: [            // Array field yang bisa diisi QA
    {
      name:        String,   // Nama field internal
      type:        String,   // 'text' | 'selector' | 'value' | 'dataref' | 'varref' | 'number' | 'boolean'
      placeholder: String,
      required:    Boolean
    }
  ],

  output: String|null, // null = tidak return; 'text' | 'value' = simpan ke canvas variable

  codegen(inputs): String,  // Fungsi: input QA → baris kode JS
  validate(inputs): String|null  // Fungsi: return pesan error atau null
}
```

### Kategori Blok dan Mapping ke please-test API

#### Navigation
| Blok | Method | Deskripsi |
|---|---|---|
| Go To | `please.goto(urlObj)` | Buka URL + assert URL & title otomatis |
| Verify Page | `please.verifyPage(urlObj)` | Assert URL dan title halaman saat ini |

#### Actions
| Blok | Method | Deskripsi |
|---|---|---|
| Click | `please.click(label, selector, wait?)` | Klik element |
| Fill | `please.fill(label, selector, value)` | Isi field |
| Fill & Enter | `please.fillAndEnter(label, selector, value)` | Isi field + tekan Enter |
| Clear Input | `please.clear(label, selector)` | Kosongkan field |
| Date Picker | `please.datepicker(label, selector, value)` | Isi input date |
| Upload File | `please.uploadFile(label, selector, path)` | Upload file |
| Scroll To | `please.scrollTo(label, selector)` | Scroll ke element |

#### Assertions
| Blok | Method | Deskripsi |
|---|---|---|
| See Text | `getText` + `equal` | Assert teks di element |
| Assert Equal | `please.equal(actual, expected, msg?)` | Assert nilai sama |
| Assert Not Equal | `please.notEqual(actual, expected, msg?)` | Assert nilai berbeda |
| Get Text | `please.getText(label, selector)` | Ambil teks, simpan ke canvas variable |
| Get Value | `please.getValue(label, selector)` | Ambil value input, simpan ke canvas variable |
| Force Fail | `please.fail(message?)` | Gagalkan test secara eksplisit |

#### Flow / Structure
| Blok | Ekuivalen | Deskripsi |
|---|---|---|
| Feature | `describe()` | Container satu feature, maps ke satu `.spec.js` |
| Test Case | `it()` | Satu skenario test, berisi sequence steps |

#### Utilities
| Blok | Method | Deskripsi |
|---|---|---|
| Wait | `please.wait(ms?)` | Pause eksekusi N milidetik |

### Tipe Input Field

| Type | Tampil sebagai | Penggunaan |
|---|---|---|
| `text` | Input teks | Label deskriptif element |
| `selector` | Input + tombol 🔍 Inspector | XPath, CSS, #id, link= |
| `value` | Input teks / dropdown DataRef | Nilai yang diisi ke form |
| `dataref` | Dropdown dari Data Registry | `ACCOUNT.valid`, `URL.login` |
| `varref` | Dropdown canvas variables | Hasil `getText` blok sebelumnya |
| `number` | Input angka | Wait time (ms) |
| `boolean` | Toggle switch | Opsi true/false |

### Sumber Blok di Registry

```
Block Registry (Pinia)
├── Built-in blocks     → hardcoded, mapping 1:1 ke please-test methods
├── Component blocks    → dynamic, di-parse dari components/*.js saat project dibuka
└── Data blocks         → dynamic, di-parse dari data/*.js
```

---

## 5. Data Factory

### Konsep: DataRef

Blok tidak menyimpan nilai data secara langsung, melainkan menyimpan **referensi** (DataRef) ke path data. Nilai aslinya di-resolve saat code generation, bukan saat QA mengisi blok.

Manfaat: jika QA mengubah data di Data Manager, semua blok yang mereferensikan data tersebut otomatis ikut berubah tanpa perlu edit canvas.

### 4 Jenis Data yang Bisa Menjadi Input

| Jenis | Sumber | Contoh |
|---|---|---|
| Static Data | `data/main.js` | `URL.login`, `ACCOUNT.valid` |
| Env Variable | `.env` | `process.env.BASE_URL` |
| Canvas Variable | Output blok sebelumnya | `$headerText` dari `getText` |
| Inline Value | Diketik langsung di inspector | `'Your username is invalid!'` |

### Pipeline Data Factory

```
Trigger (chokidar / project open)
    ↓
② Parser — require(filePath) dengan cache-bust
    ↓
    Hasil: { URL: { login: { url, title }, ... }, ACCOUNT: { valid: {...}, ... } }
    ↓
③ flattenDataTree() — nested object → flat path array
    ↓
    [
      { path: 'URL.login',           type: 'object', value: { url, title } },
      { path: 'URL.login.url',       type: 'string', value: 'https://...' },
      { path: 'ACCOUNT.valid',       type: 'object', value: { username, password } },
      { path: 'ACCOUNT.valid.username', type: 'string', value: 'student' },
      ...
    ]
    ↓
④ Schema Builder — tambah metadata (id, label, group, icon, compatibleWith)
    ↓
⑤ Register ke Data Registry (Pinia) — reaktif, dropdown di inspector otomatis update
```

### Implementasi flattenDataTree

```js
function flattenDataTree(obj, prefix = '', result = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    const type = typeof value === 'object' && value !== null ? 'object' : typeof value

    result.push({ path, type, value })

    if (type === 'object') {
      flattenDataTree(value, path, result)  // rekursif
    }
  }
  return result
}
```

### resolveCompatibility — Menentukan Blok Mana yang Boleh Pakai DataRef Ini

```js
function resolveCompatibility(entry) {
  if (entry.type === 'object') {
    // Object cocok untuk input dataref (parameter component method)
    return ['dataref']
  }
  if (entry.type === 'string' || entry.type === 'number') {
    // Primitif cocok untuk value, text, atau selector
    return ['value', 'text', 'selector']
  }
  return []
}
```

---

## 6. Component Factory

### Konsep

Setiap file di folder `components/` merepresentasikan satu **Component** (contoh: `Auth`, `Checkout`). Setiap method dalam class menjadi satu **blok** di palette IDE.

### Pipeline Component Factory

```
Trigger (chokidar watch components/**/*.js)
    ↓
② AST Parser (@babel/parser) — parse class, ekstrak method + parameter
    ↓
    {
      className: 'Auth',
      exportName: 'AUTH',
      methods: [
        { name: 'login',  params: ['user'] },
        { name: 'logout', params: [] }
      ]
    }
    ↓
③ Block Factory — buildComponentBlock() per method
    ↓
    {
      id:    'comp.auth.login',
      type:  'component',
      label: 'AUTH.login',
      inputs: [{ name: 'user', type: 'dataref' }],
      codegen: (inputs) => `await AUTH.login(${inputs.user})`
    }
    ↓
④ Register ke Block Registry — blok muncul otomatis di palette
```

### Component Builder — Cara QA Membuat Component Baru

1. QA buka Component Builder
2. Tentukan nama component (misal: `Checkout`)
3. Tambah method: `addToCart(product)`, `proceed()`, `fillShipping(address)`
4. Untuk tiap method, susun blok action dari palette ke area method
5. Tekan **Save & Generate**
6. IDE menulis `components/checkout.js` ke disk
7. `chokidar` mendeteksi file baru → pipeline di atas berjalan otomatis
8. Blok `CHECKOUT.addToCart`, `CHECKOUT.proceed`, `CHECKOUT.fillShipping` muncul di palette

---

## 7. Code Generator

### Prinsip: Canvas sebagai Source of Truth

State canvas disimpan sebagai JSON di `.blocks/*.json` — bukan file `.spec.js`. File spec adalah **output** yang di-generate ulang setiap kali canvas berubah.

```
.blocks/
├── login.json        # State canvas feature login
└── checkout.json     # State canvas feature checkout
```

### Alur Generate Spec File

```
Canvas JSON (nodes + inputs)
    ↓
specGenerator.generateSpec(featureNode)
    ├── resolveImports()     → scan semua DataRef → generate baris require()
    └── generateTestCase()   → per it() node
        └── per step node:
            blockDef.codegen(resolveInput(node.inputs))
    ↓
String kode JS valid → tulis ke feature/*.spec.js
```

### dataResolver — Resolusi Semua Jenis Input ke String JS

```js
function resolveInput(inputDef, canvasScope) {
  switch (inputDef.type) {
    case 'dataref':
      return inputDef.path               // 'ACCOUNT.valid'

    case 'varref':
      return inputDef.varName            // 'headerText' (canvas variable)

    case 'inline':
      return typeof inputDef.value === 'string'
        ? `'${inputDef.value}'`          // "'Your username is invalid!'"
        : inputDef.value                 // 2000

    case 'selector':
      return `'${inputDef.value}'`       // "'#username'"
  }
}
```

### Auto-Import Detection

```js
function resolveImports(featureNode) {
  const usedRefs   = findAllDataRefs(featureNode)    // ['ACCOUNT', 'URL']
  const usedComps  = findAllComponents(featureNode)  // ['AUTH']

  return [
    `const { please, ${usedComps.join(', ')} } = require('../app')`,
    `const { ${usedRefs.join(', ')} } = require('../data/main')`
  ].join('\n')
}
```

### File yang Di-generate Otomatis

| File | Generator | Trigger |
|---|---|---|
| `feature/*.spec.js` | `specGenerator` | Canvas berubah |
| `components/*.js` | `componentGenerator` | Component Builder save |
| `data/main.js` | `dataGenerator` | Data Manager save |
| `index.js` | `indexGenerator` | Feature di-toggle on/off |

---

## 8. Alur Kerja Aplikasi

### Alur Kerja QA (End-to-End)

```
1. SETUP PROJECT
   ├── Buka IDE → pilih atau buat folder project
   ├── IDE menjalankan create-please-test (jika project baru)
   └── Isi BASE_URL dan credentials di Env Editor

2. DEFINE DATA
   ├── Buka Data Manager
   ├── Tambah URL entries: { url, title } per halaman
   ├── Tambah ACCOUNT entries: { username, password } per skenario
   └── Save → dataGenerator menulis data/main.js → Data Factory parse + register

3. BUILD COMPONENTS (opsional, untuk aksi berulang)
   ├── Buka Component Builder
   ├── Buat component (misal: Auth)
   ├── Tambah method login(user): susun blok fill + click
   ├── Tambah method logout(): susun blok click
   └── Save → componentGenerator menulis components/auth.js
              → Component Factory parse → blok AUTH.* muncul di palette

4. CREATE FEATURE
   ├── Di canvas, drag blok "Feature" → beri nama
   └── IDE akan generate feature/[nama].spec.js

5. ADD TEST CASES
   ├── Drag blok "Test Case" ke dalam Feature
   └── Beri nama skenario (misal: "login berhasil")

6. SUSUN STEPS
   ├── Drag blok dari palette ke dalam Test Case
   ├── Konfigurasi tiap blok di Block Inspector kanan:
   │   ├── Input type dataref → pilih dari dropdown (ACCOUNT.valid, URL.login)
   │   ├── Input type selector → ketik atau pakai Selector Inspector 🔍
   │   └── Input type inline → ketik nilai langsung
   └── Repeat untuk semua Test Case

7. REVIEW KODE (opsional)
   └── Buka Code Preview di panel kanan untuk cek kode yang di-generate

8. RUN TEST
   ├── Tekan tombol ▶ Run Test
   ├── IDE generate semua file (spec, index) → jalankan mocha
   ├── Log stream real-time tampil di panel bawah
   └── Blok yang gagal di-highlight merah di canvas

9. REVIEW REPORT
   └── Setelah selesai, buka Report Viewer → tampilkan mochawesome HTML report
```

### Reaktivitas Internal IDE

```
QA edit canvas
    → canvasStore berubah (Pinia reaktif)
    → specGenerator dipanggil (debounced 300ms)
    → feature/*.spec.js ditulis ke disk
    → Code Preview di-update otomatis

QA save Data Manager
    → data/main.js ditulis
    → chokidar trigger DataFactory.reload()
    → dataRegistry di-update (Pinia reaktif)
    → Semua dropdown DataRef di inspector otomatis ikut update

QA save Component Builder
    → components/*.js ditulis
    → chokidar trigger ComponentFactory.reload()
    → blockRegistry di-update (Pinia reaktif)
    → Blok baru muncul di palette tanpa reload IDE
```

---

## 9. Roadmap Pengembangan

> **Terakhir diperbarui:** 2026-06-22
>
> **Legend:** ✅ Selesai · 🔄 Sebagian / perlu penyempurnaan · ⏳ Belum dimulai

### MVP (v1) — Fungsionalitas Inti

Prioritas: IDE bisa digunakan end-to-end untuk membuat dan menjalankan test.

| Status | Fitur | Deskripsi | Sprint |
|:---:|---|---|:---:|
| ✅ | Block Palette | Tampilkan semua built-in block berdasarkan kategori, search, drag-and-drop ke canvas | 1 |
| ✅ | Canvas Editor | Drag-and-drop blok, hierarki Feature → Test Case → Steps, reorder, collapse, note per step | 1–2 |
| ✅ | Block Inspector | Panel edit properti blok aktif, semua input types (text, number, selector, value, dataref, varref) | 2 |
| ✅ | Code Preview | Live preview kode JS hasil generate (read-only) | 2 |
| ✅ | Data Manager | UI editor untuk file data, URL dan Account entries, multi-file support | 3 |
| ✅ | Data Factory | Parse → flatten → register DataRef ke Pinia dengan schema validation | 3 |
| ✅ | Component Factory | Parse `components/*.js` → register blok dinamis ke blockRegistry | 3 |
| ✅ | Component Builder | UI visual untuk membuat component baru, extract steps dari canvas | 4 |
| ✅ | Code Generator | Canvas → spec.js, index.js, data.js, component.js via ExportModal | 4 |
| ✅ | Test Runner | Jalankan mocha, stream log real-time | 5 |
| ✅ | Env Editor | UI untuk baca/tulis file `.env` | 5 |
| ✅ | Validasi Blok | Highlight merah blok yang konfigurasinya tidak lengkap, error badge per step | 5 |

### Penyempurnaan Teknis (selesai setelah MVP)

| Status | Item | Keterangan |
|:---:|---|---|
| ✅ | Shared CSS input components | `fieldInput.css` — menghapus ~200 baris CSS duplikat dari 6 komponen input |
| ✅ | Input template factory | `inputTemplates.js` — definisi input block tidak lagi ditulis manual per field |
| ✅ | Validation helpers | `validationHelpers.js` — `createValidator()` menggantikan if-chain berulang |
| ✅ | Codegen helpers | `codegenHelpers.js` — factory `codegenLabelSelector`, `codegenAssert`, dll |
| ✅ | Dropdown composable | `useDropdownControl.js` — logika buka/tutup/posisi dropdown tersentralisasi |
| ✅ | Step actions composable | `useStepActions.js` — handler remove/update/reorder step tidak duplikat |
| ✅ | DropdownOptionGroup component | Komponen shared untuk render grup item di semua dropdown |
| ✅ | Merge HybridValueInput + DataRefSelect | Digabung menjadi `ValueInput.vue` — satu komponen untuk semua tipe value input |

### v2 — Produktivitas

| Status | Fitur | Deskripsi |
|:---:|---|---|
| ✅ | Feature Toggle | Visual toggle untuk enable/disable feature di canvas |
| ✅ | Canvas Variable | Blok `getText`/`getValue` bisa di-pipe ke blok assertion berikutnya |
| ✅ | Selector Inspector UI | Field selector dengan auto-detect tipe (XPath/ID/CSS/Link), validasi syntax, tombol copy, hint chips interaktif, dan contoh format per tipe |
| ✅ | Report Viewer | Modal ringkasan visual hasil test (pass rate ring, breakdown per feature & TC, stats) muncul otomatis setelah runner selesai; bisa dibuka ulang via tombol 📋 Laporan di topbar |
| ✅ | Reverse Codegen | Import `.spec.js` (AST via @babel/parser) → canvas nodes. Tombol 📥 Import di topbar: tempel/muat file, preview + warning, append/replace. Method built-in, pola `seeText`, `getText`/`getValue` (varref), component call, komentar → note, fallback Raw Code |
| ✅ | Import by Project | Tombol 📁 Import Project: pilih folder → server baca `feature/*.spec.js` + `data/*.js` + `components/*.js` + `.env` + `index.js` → rekonstruksi penuh ke canvas + dataRegistry + componentStore (urutan: data → components(register) → spec). Parser data (round-trip `process.env`) & component (class → def) berbagi `statementParser`. Preview ringkasan + warning, replace/merge |
| ✅ | Multi-browser | Dropdown BrowserPicker di topbar untuk pilih Chrome/Firefox/Edge (Safari segera); browser tampil di log runner saat run |
| ✅ | Project Gate (New/Open) | Layar awal saat belum ada `projectPath`: **New Project** (folder kosong, opsi demo via tombol canvas) atau **Open Project** (baca folder existing → jadikan workspace). Canvas terkunci sampai project dipilih. Server wajib aktif (selain itu kembali ke gate dengan pesan `npm run dev`). Menu File → Close Project untuk kembali ke gate |
| ✅ | Save to Project | Tombol 💾 Simpan menulis seluruh file ke folder workspace via server (`POST /api/files/write` dengan `prune`). Sinkron penuh: rename/hapus feature ikut menghapus file basi di `feature/`/`data/`/`components/`. Nama project mengikuti basename folder |
| ✅ | Workspace persistence + boot sync | `projectPath` & `browserTarget` persist ke localStorage. Saat reload: disk = sumber kebenaran — baca folder, bandingkan dengan canvas; jika beda tampilkan konfirmasi (Muat dari disk / Pertahankan perubahan = Save). Server mati saat reload → kembali ke gate |
| ✅ | Topbar redesign + dual menu | Menu teks **File** & **Workspace** (TopbarMenu reusable) di kiri seperti app desktop; aksi (Simpan/Run/Laporan/toggle) di kanan. Brand pindah ke header sidebar untuk hindari duplikasi |
| ✅ | **Refactor arsitektur MVVM** | **Model** dipindah ke `src/model/{core,services,stores}`. **ViewModel** = composables di `src/composables/` (`useProjectWorkspace`, `useSaveProject`, `useTestRunnerControl`, `usePanelResize`, `useProjectImport`, `useCodeHighlight`, `usePaletteFilter`). **View** `.vue` jadi tipis (AppShell 217→78, ProjectImportModal 83→29 baris). Duplikasi `highlight()` (×3) & filter palette (×2) dihapus. Lihat [Rencana Refactor MVVM](#rencana-refactor-mvvm) |

### v3 — Distribusi, Eksekusi Lanjutan, dan Interoperabilitas

| Status | Fitur | Deskripsi |
|:---:|---|---|
| ⏳ | **Easy Install / Distribusi** | Packaging aplikasi agar bisa diinstall dan dijalankan oleh banyak orang tanpa setup manual — misalnya binary Electron (`.dmg`, `.exe`, `.AppImage`), installer wizard, atau distribusi via npm global |
| ⏳ | **Selective Test Execution** | Jalankan testcase secara spesifik: pilih satu fitur, satu atau beberapa test case tertentu, atau filter berdasarkan tag — bukan hanya "jalankan semua" |
| ⏳ | **Gherkin Generator** | Export canvas ke sintaks Gherkin (`.feature`) format `Given / When / Then` untuk kompatibilitas dengan tools BDD seperti Cucumber, Behave, atau Playwright BDD |

### v4 — AI dan Cloud

| Status | Fitur | Deskripsi |
|:---:|---|---|
| ⏳ | Browser Recorder | Record aksi user di browser secara real-time → otomatis jadi sequence blok di canvas. Capture click, fill, navigate via CDP; selector di-detect otomatis dengan fallback hierarchy (ID → name → CSS → XPath); hasil tampil di staging area sebelum di-append ke Test Case aktif |
| ⏳ | AI Selector Suggester | Screenshot halaman → AI return selector terbaik (CSS/XPath) |
| ⏳ | Natural Language to Blocks | Ketik "login dengan username salah" → AI generate sequence blok |
| ⏳ | Cloud Runner | Jalankan test di BrowserStack/Sauce Labs, parallel multi-browser |
| ⏳ | CI/CD Integration | Export konfigurasi GitHub Actions / GitLab CI otomatis |
| ⏳ | Test Coverage Dashboard | Visualisasi feature mana yang sudah punya test dan mana yang belum |

---

## Catatan Implementasi

### Urutan Development yang Direkomendasikan

1. **Block Schema + Registry** — fondasi semua fitur, harus dikerjakan pertama
2. **Data Factory** — diperlukan sebelum Canvas bisa di-demo dengan data nyata
3. **Canvas + Inspector** — fitur paling terlihat, demo-able setelah no. 1–2
4. **Code Generator** — menghubungkan canvas ke file test nyata
5. **Test Runner** — closing the loop, QA bisa lihat test berjalan
6. **Component Factory + Builder** — meningkatkan reusability
7. **Selector Inspector** — UX killer feature untuk v2

### Keputusan Arsitektur Kunci

**Canvas sebagai source of truth, bukan file .spec.js**  
State disimpan di `.blocks/*.json`. File JS adalah output. Ini mencegah konflik antara edit manual dan perubahan canvas.

**DataRef bukan nilai literal**  
Blok menyimpan `{ type: 'dataref', path: 'ACCOUNT.valid' }`, bukan string `'student'`. Ini membuat data terpusat dan test tetap sinkron saat data berubah.

**chokidar sebagai event bus**  
Perubahan file di disk (baik dari IDE maupun editor eksternal) selalu ter-deteksi dan factory di-reload otomatis. IDE tidak pernah meng-assume state file, selalu baca dari disk.

**Pinia sebagai reactive backbone**  
Semua store (blockRegistry, dataRegistry, canvasStore) berbasis Pinia. Komponen Vue langsung reaktif terhadap perubahan — tidak ada event bus manual.

**Pemisahan MVVM (Model ▸ ViewModel ▸ View) — WAJIB untuk semua development ke depan**

> ⚠️ **Aturan baku.** Setiap fitur/perubahan baru HARUS mengikuti pemisahan ini. PR yang melanggar (mis. `fetch` di dalam `.vue`) dianggap belum selesai.

- **Model** (`src/model/`): `core/` (codegen, factory, parser, blocks), `services/` (I/O ke server), `stores/` (Pinia). Tanpa Vue UI — dapat dites tanpa mount. **Dilarang** mengimpor `vue` atau `@/components`.
- **ViewModel** (`src/composables/useXxx.js`): memegang **semua** `fetch`/`service`, orkestrasi multi-store, dan aturan domain; mengembalikan state reaktif + method siap-pakai. Inilah satu-satunya tempat View boleh mengambil data sisi-server / mengoordinasi banyak store.
- **View** (`src/components/*.vue`): bind ke composable + render. **Dilarang**: `fetch()` mentah, memanggil `@/model/services/*`, atau orkestrasi multi-store (mis. `importProject`, reset beberapa store sekaligus) langsung di komponen.

**Yang boleh & tidak boleh di View:**
| Boleh di View | Harus lewat ViewModel/Service |
|---|---|
| Panggil **fungsi murni** Model (codegen `generateSpec`/`exportProject`, validator `validateStep`) — stateless, tanpa IO | `fetch`/HTTP → service (`runnerService`) |
| Baca 1 store untuk binding/guard (mis. `canvas.features.length`) | Orkestrasi 2+ store (open/new project, import, save+prune) → composable |
| State UI lokal (tab aktif, toggle, posisi dropdown) | Boot-sync, dirty-detection, alur lintas-store |

- Komponen yang isinya **murni state UI lokal** tidak dipaksa jadi composable; ekstraksi hanya untuk orkestrasi/I-O dan logika terduplikasi.
- **Penamaan:** composable selalu `useXxx.js` di `src/composables/`; service di `src/model/services/`; tak ada `fetch` di luar `src/model/services/`.

---

## Rencana Refactor MVVM

### Masalah saat ini
Logika orkestrasi menumpuk di dalam komponen `.vue`, bukan di lapisan tersendiri — sehingga View, aturan bisnis, dan akses data tercampur. Contoh konkret (jumlah baris `<script>`):

| Komponen | Baris script | Logika yang seharusnya tidak di View |
|---|---:|---|
| `manager/ComponentBuilder.vue` | 349 | CRUD component/method/param, validasi, registrasi blok |
| `layout/AppShell.vue` | 217 | Save+prune, boot-sync disk, gate, open/close project, run, resize |
| `manager/DataManager.vue` | 199 | CRUD file/group/entry/field data, generate preview |
| `inspector/inputs/ValueInput.vue` | 174 | Resolusi dataref/varref, parsing tipe nilai |

### Target struktur (Model ▸ ViewModel ▸ View)

```
src/
  model/                    ← MODEL: state + aturan domain (tanpa Vue UI)
    stores/                 (Pinia: canvas, dataRegistry, blockRegistry, runner, component)
    core/                   (codegen, factory, parser — sudah murni, pindahkan ke sini)
    services/               (runnerService, dll — I/O ke server)
  viewmodels/               ← VIEWMODEL: composables useXxx() yang menjembatani
    useProjectWorkspace.js  (open/new/close, boot-sync disk, save+prune, projectName)
    useSaveProject.js       (state idle/saving/saved/error → satu sumber)
    useComponentBuilder.js  (semua CRUD + validasi dari ComponentBuilder.vue)
    useDataManager.js       (CRUD data + preview)
    useCanvasEditor.js      (add/drop feature, demo)
    useTestRunner.js        (trigger run real/sim, parsing log → stats)
  views/ (atau components/) ← VIEW: .vue hanya bind ke viewmodel + render
```

**Aturan pembagian:**
- **Model** tidak tahu soal komponen/DOM. Boleh dites tanpa me-mount Vue (parser sudah begini).
- **ViewModel** = composable `useXxx()` yang mengembalikan state reaktif + method siap-pakai. Semua `fetch`, orkestrasi multi-store, dan aturan (mis. urutan data→component→spec saat import) tinggal di sini.
- **View** = `.vue` tipis: `const vm = useXxx()` lalu template bind. Idealnya `<script>` < ~40 baris, tanpa `fetch`/akses store langsung yang kompleks.

### Urutan pengerjaan (inkremental, build tetap hijau tiap langkah)
1. **Buat folder `viewmodels/`** + pindahkan logika `AppShell.vue` paling dulu (paling banyak menyentuh banyak store): `useProjectWorkspace` + `useSaveProject`. AppShell tinggal memanggil composable.
2. **`useComponentBuilder` & `useDataManager`** — ekstrak CRUD dari dua manager besar.
3. **`useCanvasEditor`, `useTestRunner`, `useInspectorInput`** — sisanya.
4. **Pindahkan `core/`, `services/`, `stores/` ke `model/`** (rename folder + update path alias `@/model/...`). Lakukan terakhir agar diff import terisolasi.
5. **Konvensi & lint guard** — dokumentasikan aturan; opsional tambah aturan ESLint ringan (mis. larang `fetch` di dalam `components/`).

### Prinsip
- Refactor **murni struktural** — tidak mengubah perilaku. Setiap langkah diverifikasi dengan `npx vite build` + smoke test alur (gate → open → edit → save → reload).
- Tidak ada framework baru; cukup composable Vue + Pinia yang sudah ada. MVVM di sini = pola, bukan dependensi.
