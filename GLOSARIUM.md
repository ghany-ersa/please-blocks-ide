# Glosarium Please Blocks

Kosa-kata yang perlu dipahami dalam project ini.

---

## Konsep Utama

**Block**  
Unit terkecil dalam Please Blocks. Merepresentasikan satu langkah test dan mapping 1:1 ke satu method `please-test`. QA menyusun blok di canvas; kode JavaScript di-generate otomatis.

**Canvas**  
Area utama IDE. Tempat QA menyusun test secara visual dalam hierarki: Feature → Test Case → Steps. Canvas adalah **source of truth** — file `.spec.js` adalah outputnya.

**Feature**  
Container level pertama di canvas. Setara dengan `describe()` di Mocha. Satu Feature menghasilkan satu file `feature/[nama].spec.js`.

**Test Case**  
Container level kedua di dalam Feature. Setara dengan `it()` di Mocha. Berisi urutan Steps yang dieksekusi secara berurutan.

**Step**  
Satu blok yang sudah dikonfigurasi di dalam Test Case. Merepresentasikan satu baris kode dalam test.

**Component**  
Kelas JavaScript reusable yang berisi kumpulan aksi yang sering diulang (contoh: `Auth` berisi `login()`, `logout()`). Disimpan di folder `components/`. Setiap method menjadi satu blok di palette.

**DataRef**  
Referensi ke path data, bukan nilai literal. Blok menyimpan `{ type: 'dataref', path: 'ACCOUNT.valid' }` — nilai aslinya di-resolve saat code generation. Jika data berubah di Data Manager, semua blok yang mereferensikannya ikut berubah otomatis.

**Canvas Variable**  
Variabel yang dibuat dari output blok `Get Text` atau `Get Value`. Bisa direferensikan oleh blok lain menggunakan input type `varref`. Contoh: `$headerText`.

**Selector**  
String untuk menemukan elemen HTML. Format yang didukung: CSS (`.class`, `#id`), XPath (`//tag[@attr]`), dan Link Text (`link=teks`).

---

## Arsitektur (MVVM)

**Model**  
Lapisan state dan domain. Berisi stores (Pinia), core (codegen, factory, parser), dan services (HTTP). Tidak boleh mengimpor Vue.  
Lokasi: `src/model/`

**ViewModel**  
Composable (`useXxx.js`) yang mengorkestrasikan multi-store, memanggil service, dan memegang aturan domain. Satu-satunya tempat `fetch` boleh dipanggil.  
Lokasi: `src/composables/`

**View**  
Komponen `.vue` yang hanya binding ke ViewModel dan render tampilan. Tidak ada `fetch()` atau orkestrasi multi-store langsung di komponen.  
Lokasi: `src/components/`

**Store**  
State global berbasis Pinia. Store utama: `canvasStore`, `dataRegistry`, `blockRegistry`, `runnerStore`, `componentStore`.

---

## Fitur IDE

**Block Palette** — panel kiri, daftar semua blok yang bisa di-drag ke canvas.

**Block Inspector** — panel kanan, muncul saat step dipilih untuk mengisi properti blok.

**Data Manager** — UI editor untuk file `data/*.js` (URL, akun, data test).

**Component Builder** — UI untuk membuat component baru secara visual.

**Env Editor** — UI untuk baca/tulis file `.env`.

**Project Gate** — layar awal (New Project / Open Project) sebelum masuk canvas.

**Feature Toggle** — tombol enable/disable per Feature, mengontrol isi `index.js`.

**Reverse Codegen** — import file `.spec.js` yang sudah ada → canvas nodes.

**Boot Sync** — proses saat reload: bandingkan canvas di localStorage dengan file di disk, tawarkan pilihan jika ada perbedaan.

**Save & Prune** — simpan ke disk sekaligus hapus file basi (feature/data/component yang sudah tidak ada di canvas).

---

## Tipe Input Field

| Tipe | Keterangan |
|---|---|
| `text` | Label deskriptif elemen (muncul di pesan error saat test gagal) |
| `selector` | XPath, CSS, atau link text untuk menemukan elemen |
| `value` | Nilai fleksibel: inline string, DataRef, atau Canvas Variable |
| `dataref` | Dropdown pilihan dari Data Registry |
| `varref` | Dropdown Canvas Variables dari blok sebelumnya |
| `number` | Angka, contoh: durasi Wait dalam milidetik |
| `boolean` | Toggle true/false |
