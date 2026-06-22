# Please Blocks — Rencana Pengembangan

> **Terakhir diperbarui:** 2026-06-23  
> **Legend:** ✅ Selesai · 🔄 Sebagian · ⏳ Belum dimulai

---

## v1 — MVP (Fungsionalitas Inti)

| Status | Fitur |
|:---:|---|
| ✅ | Block Palette — tampilkan blok berdasarkan kategori, search, drag-to-canvas |
| ✅ | Canvas Editor — hierarki Feature → Test Case → Steps, reorder, collapse |
| ✅ | Block Inspector — edit properti blok, semua tipe input (text, selector, value, dataref, varref) |
| ✅ | Code Preview — live preview kode JS hasil generate |
| ✅ | Data Manager — editor UI untuk `data/*.js`, CRUD Group/Entry/Field, multi-file |
| ✅ | Component Builder — buat component baru secara visual, susun steps per method |
| ✅ | Code Generator — canvas → `spec.js`, `index.js`, `data.js`, `component.js` |
| ✅ | Test Runner — jalankan test, stream log real-time |
| ✅ | Env Editor — baca/tulis file `.env` dari dalam IDE |
| ✅ | Validasi Blok — highlight merah blok yang konfigurasinya tidak lengkap |

---

## v2 — Produktivitas

| Status | Fitur |
|:---:|---|
| ✅ | Feature Toggle — enable/disable feature per canvas, mengontrol `index.js` |
| ✅ | Canvas Variable — pipe output `Get Text`/`Get Value` ke blok assertion berikutnya |
| ✅ | Selector Inspector — auto-detect tipe selector, validasi syntax, hint interaktif |
| ✅ | Report Viewer — modal ringkasan visual hasil test (pass rate, breakdown per TC) |
| ✅ | Reverse Codegen — import `.spec.js` → canvas nodes via AST parser |
| ✅ | Import by Project — buka folder existing → rekonstruksi canvas + data + components |
| ✅ | Multi-browser — pilih Chrome / Firefox / Edge dari topbar |
| ✅ | Project Gate — layar New/Open Project sebelum masuk canvas |
| ✅ | Save to Project — tulis semua file ke disk via server, prune file basi |
| ✅ | Workspace Persistence — `projectPath` persist ke localStorage, boot-sync dari disk |
| ✅ | Topbar redesign — menu File & Workspace seperti app desktop |
| ✅ | Refactor arsitektur MVVM — Model / ViewModel / View terpisah bersih |
| ✅ | Distribusi via NPM global — `npm install -g please-blocks` → `please-blocks` |

---

## v3 — Eksekusi Lanjutan

| Status | Fitur |
|:---:|---|
| ⏳ | Selective Test Execution — pilih satu fitur atau test case tertentu untuk dijalankan |
| ⏳ | Distribusi Electron — installer `.dmg` / `.exe` / `.AppImage`, tidak perlu Node.js |
| ⏳ | Gherkin Generator — export canvas ke format `Given / When / Then` (.feature) |

---

## v4 — AI dan Cloud

| Status | Fitur |
|:---:|---|
| ⏳ | Browser Recorder — record aksi di browser → otomatis jadi blok di canvas |
| ⏳ | AI Selector Suggester — screenshot halaman → AI return selector terbaik |
| ⏳ | Natural Language to Blocks — ketik deskripsi → AI generate sequence blok |
| ⏳ | Cloud Runner — jalankan test di BrowserStack/Sauce Labs, parallel multi-browser |
| ⏳ | CI/CD Integration — export konfigurasi GitHub Actions / GitLab CI otomatis |

---

## Keputusan Arsitektur

**Canvas sebagai source of truth, bukan `.spec.js`**  
State canvas disimpan di `localStorage` (dan nantinya `.blocks/*.json`). File spec adalah output yang di-generate ulang, bukan sumber data.

**DataRef, bukan nilai literal**  
Blok menyimpan `{ type: 'dataref', path: 'ACCOUNT.valid' }`, bukan nilai `'student'`. Nilai di-resolve saat code generation, sehingga perubahan di Data Manager otomatis berlaku ke semua blok.

**MVVM — wajib untuk semua development ke depan**  
- **Model** (`src/model/`): state, domain, I/O. Tidak boleh impor Vue.  
- **ViewModel** (`src/composables/`): orkestrasi multi-store, semua `fetch`.  
- **View** (`src/components/`): bind ke composable, render saja. Tidak ada `fetch` di `.vue`.
