<script setup>
/**
 * EnvEditor.vue — Sprint 5
 * UI editor untuk variabel environment (.env).
 * Membaca/menyimpan dari dataRegistry.env (sinkron ke localStorage).
 * Format output sesuai format .env standar (KEY=VALUE).
 */
import { ref, computed } from 'vue'
import { useDataRegistry } from '@/model/stores/dataRegistry.js'

const props = defineProps({ mode: { type: String, default: 'modal' } })  // 'modal' | 'panel'
const emit = defineEmits(['close'])
const dataReg = useDataRegistry()

// Working copy lokal agar perubahan bisa di-cancel.
// env flat (KEY→string) → spread cukup; hindari structuredClone pada proxy
// reactive Pinia (bisa lempar DataCloneError → komponen blank).
const localEnv = ref({ ...dataReg.env })

// State tambah entry baru
const newKey   = ref('')
const newValue = ref('')
const addError = ref('')

// Sanitasi nama variabel saat diketik: hanya A-Z 0-9 _, tak boleh diawali angka,
// otomatis uppercase. Mencegah input di luar kaidah nama ENV sejak awal.
function sanitizeKey(raw) {
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '')   // buang karakter ilegal (spasi, simbol, dll)
    .replace(/^[0-9]+/, '')        // tak boleh diawali angka
}

function onNewKeyInput(e) {
  const clean = sanitizeKey(e.target.value)
  newKey.value = clean
  e.target.value = clean         // pantulkan ke input agar karakter ilegal tak tampil
}

// Mode tampil (hidden/visible) per key — untuk password
const showValue = ref({})

function toggleShow(key) {
  showValue.value[key] = !showValue.value[key]
}

function isSecret(key) {
  return /password|secret|token|key|pass/i.test(key)
}

const envLines = computed(() => Object.entries(localEnv.value))

// Mode panel: auto-save langsung ke store tiap perubahan (tanpa tombol Simpan).
// Mode modal: ubah working-copy dulu, di-apply saat tombol Simpan.
const autoSave = computed(() => props.mode === 'panel')

function commit() {
  if (!autoSave.value) return
  dataReg.env = { ...localEnv.value }
  dataReg.persist?.()
}

function updateValue(key, val) {
  localEnv.value[key] = val
  commit()
}

function addEntry() {
  addError.value = ''
  const k = sanitizeKey(newKey.value)   // sudah disaring saat input; ini backstop
  if (!k) { addError.value = 'Nama variabel wajib diisi (huruf, angka, underscore)'; return }
  if (localEnv.value[k] !== undefined) {
    addError.value = 'Variabel sudah ada'; return
  }
  localEnv.value[k] = newValue.value
  newKey.value   = ''
  newValue.value = ''
  commit()
}

function removeEntry(key) {
  const clone = { ...localEnv.value }
  delete clone[key]
  localEnv.value = clone
  commit()
}

function save() {
  dataReg.env = { ...localEnv.value }
  dataReg.persist?.()
  if (props.mode === 'modal') emit('close')
}

function cancel() {
  if (props.mode === 'modal') {
    emit('close')
  } else {
    // Panel: revert working copy ke env tersimpan, tetap di view
    localEnv.value = { ...dataReg.env }
  }
}

// Preview .env teks
const envPreview = computed(() =>
  ['# .env', '# Auto-generated oleh Please Blocks IDE', '']
    .concat(envLines.value.map(([k, v]) => `${k}=${v}`))
    .join('\n')
)

const copied = ref(false)
async function copyEnv() {
  await navigator.clipboard.writeText(envPreview.value).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1600)
}

function downloadEnv() {
  const blob = new Blob([envPreview.value], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = '.env'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div :class="mode === 'panel' ? 'panel-root' : 'overlay'" @click.self="mode === 'modal' && cancel()">
    <div :class="mode === 'panel' ? 'panel-box' : 'modal'">

      <!-- Header -->
      <div class="modal-header">
        <span class="modal-icon">⚙️</span>
        <span class="modal-title">Environment Variables</span>
        <span class="modal-sub">.env</span>
        <div class="header-actions">
          <button class="btn-copy" :class="{ done: copied }" @click="copyEnv">
            {{ copied ? '✓ Copied' : '⎘ Copy .env' }}
          </button>
          <button class="btn-dl" @click="downloadEnv">⬇ .env</button>
        </div>
        <button v-if="mode === 'modal'" class="btn-x" @click="cancel">×</button>
      </div>

      <!-- Body: 2 kolom — table kiri, preview kanan -->
      <div class="modal-body">

        <!-- Kolom kiri: editor -->
        <div class="editor-col">
          <div class="col-label">Variabel</div>

          <div class="env-table">
            <div class="env-row header-row">
              <span class="col-key">Nama</span>
              <span class="col-val">Nilai</span>
              <span class="col-act"></span>
            </div>

            <div
              v-for="[key, val] in envLines"
              :key="key"
              class="env-row"
            >
              <span class="col-key" :class="{ secret: isSecret(key) }">
                <span class="key-icon" v-if="isSecret(key)">🔒</span>
                {{ key }}
              </span>
              <div class="col-val val-input-wrap">
                <input
                  class="val-input"
                  :type="isSecret(key) && !showValue[key] ? 'password' : 'text'"
                  :value="val"
                  @input="updateValue(key, $event.target.value)"
                  :placeholder="`nilai ${key}`"
                />
                <button
                  v-if="isSecret(key)"
                  class="btn-show"
                  @click="toggleShow(key)"
                  :title="showValue[key] ? 'Sembunyikan' : 'Tampilkan'"
                >
                  {{ showValue[key] ? '🙈' : '👁' }}
                </button>
              </div>
              <div class="col-act">
                <button class="btn-rm" @click="removeEntry(key)" title="Hapus variabel">×</button>
              </div>
            </div>

            <!-- Tambah baris baru -->
            <div class="env-row add-row">
              <input
                class="new-key-input"
                :value="newKey"
                placeholder="NAMA_VARIABEL"
                @input="onNewKeyInput"
                @keyup.enter="addEntry"
                spellcheck="false"
              />
              <input
                class="new-val-input"
                v-model="newValue"
                placeholder="nilai"
                @keyup.enter="addEntry"
              />
              <button class="btn-add" @click="addEntry">+</button>
            </div>

            <div v-if="addError" class="add-error">{{ addError }}</div>
          </div>

          <!-- Info .env -->
          <div class="env-note">
            <span>💡</span>
            <span>Nilai dengan <code>process.env.*</code> dibaca dari file .env saat runtime.
            Jangan commit file .env ke version control.</span>
          </div>
        </div>

        <!-- Kolom kanan: preview -->
        <div class="preview-col">
          <div class="col-label">Preview .env</div>
          <pre class="env-preview">{{ envPreview }}</pre>
        </div>

      </div>

      <!-- Footer: hanya di mode modal (panel auto-save) -->
      <div v-if="mode === 'modal'" class="modal-footer">
        <div class="footer-info">
          {{ envLines.length }} variabel · Perubahan hanya tersimpan di IDE (localStorage)
        </div>
        <div class="footer-actions">
          <button class="btn-cancel" @click="cancel">Batal</button>
          <button class="btn-save" @click="save">💾 Simpan</button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex; align-items: center; justify-content: center;
  z-index: 110;
}
.modal {
  width: 860px; max-width: 96vw;
  height: 560px; max-height: 92vh;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 12px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
}
/* Mode panel — tampil in-area (lebar penuh), bukan overlay */
.panel-root { flex: 1; min-width: 0; height: 100%; display: flex; }
.panel-box {
  flex: 1; min-width: 0; height: 100%;
  background: #111827; display: flex; flex-direction: column; overflow: hidden;
}

/* Header */
.modal-header {
  display: flex; align-items: center; gap: 8px;
  padding: 0 16px; height: 44px;
  background: #0f1117; border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.modal-icon  { font-size: 14px; }
.modal-title { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.modal-sub   { font-size: 10px; color: #334155; font-family: monospace; }
.header-actions { flex: 1; display: flex; justify-content: flex-end; gap: 6px; }
.btn-copy {
  padding: 4px 12px; font-size: 10px; border-radius: 4px; cursor: pointer;
  border: 1px solid rgba(99,102,241,0.3);
  background: rgba(99,102,241,0.1); color: #818cf8;
  transition: all 0.12s;
}
.btn-copy.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.btn-dl {
  padding: 4px 12px; font-size: 10px; border-radius: 4px; cursor: pointer;
  border: 1px solid #1e293b; background: rgba(255,255,255,0.03); color: #475569;
  transition: all 0.12s;
}
.btn-dl:hover { color: #94a3b8; border-color: #334155; }
.btn-x {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 20px; line-height: 1; padding: 0;
}
.btn-x:hover { color: #e2e8f0; }

/* Body */
.modal-body {
  flex: 1; display: flex; min-height: 0; overflow: hidden;
}
.editor-col {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
  border-right: 1px solid #1e293b;
}
.preview-col {
  width: 300px; flex-shrink: 0;
  display: flex; flex-direction: column;
  background: #0a0d14;
}
.col-label {
  padding: 6px 14px;
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  color: #334155; letter-spacing: 0.08em;
  border-bottom: 1px solid #1e293b; flex-shrink: 0;
}

/* Table */
.env-table {
  flex: 1; overflow-y: auto;
  padding: 6px 0;
}
.env-row {
  display: grid;
  grid-template-columns: 180px 1fr 36px;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.02);
}
.env-row:hover { background: rgba(255,255,255,0.015); }
.header-row {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  color: #334155; letter-spacing: 0.05em;
  padding-bottom: 6px;
}

.col-key {
  font-family: monospace; font-size: 10px;
  color: #64748b; display: flex; align-items: center; gap: 5px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.col-key.secret { color: #f59e0b; }
.key-icon { font-size: 9px; flex-shrink: 0; }

.col-val { display: flex; align-items: center; }
.val-input-wrap { flex: 1; display: flex; align-items: center; gap: 4px; }
.val-input {
  flex: 1; background: rgba(255,255,255,0.04);
  border: 1px solid #1e293b; border-radius: 4px;
  padding: 4px 8px; font-size: 10px; font-family: monospace;
  color: #e2e8f0; outline: none; transition: border-color 0.12s;
}
.val-input:focus { border-color: #334155; background: rgba(255,255,255,0.06); }
.btn-show {
  background: none; border: none; cursor: pointer;
  font-size: 11px; padding: 0 3px; flex-shrink: 0;
  opacity: 0.6; transition: opacity 0.1s;
}
.btn-show:hover { opacity: 1; }

.col-act { display: flex; justify-content: center; }
.btn-rm {
  background: none; border: none; cursor: pointer;
  color: #374151; font-size: 14px; line-height: 1;
  transition: color 0.1s;
}
.btn-rm:hover { color: #ef4444; }

/* Add row */
.add-row {
  margin-top: 6px;
  background: rgba(99,102,241,0.03);
  border-top: 1px solid rgba(99,102,241,0.1) !important;
}
.new-key-input, .new-val-input {
  background: rgba(255,255,255,0.04);
  border: 1px solid #1e293b; border-radius: 4px;
  padding: 4px 8px; font-size: 10px; font-family: monospace;
  color: #e2e8f0; outline: none; width: 100%;
  transition: border-color 0.12s;
}
.new-key-input { text-transform: uppercase; }
.new-key-input:focus, .new-val-input:focus {
  border-color: rgba(99,102,241,0.4);
}
.btn-add {
  white-space: nowrap;
  padding: 4px 10px; font-size: 9px; font-weight: 600;
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.25);
  border-radius: 4px; color: #818cf8; cursor: pointer;
  transition: all 0.12s;
}
.btn-add:hover { background: rgba(99,102,241,0.22); }

.add-error {
  padding: 4px 12px;
  font-size: 9px; color: #ef4444;
}

/* Note */
.env-note {
  display: flex; gap: 6px; align-items: flex-start;
  padding: 8px 12px;
  border-top: 1px solid #0f172a;
  font-size: 9px; color: #334155; flex-shrink: 0;
  line-height: 1.5;
}
.env-note code {
  background: rgba(255,255,255,0.05);
  border-radius: 2px; padding: 0 3px;
  font-size: 8.5px; color: #475569;
}

/* Preview */
.env-preview {
  flex: 1; overflow: auto;
  margin: 0; padding: 12px 14px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 10px; line-height: 1.8;
  color: #475569; white-space: pre;
}

/* Footer */
.modal-footer {
  display: flex; align-items: center;
  padding: 8px 16px; gap: 12px;
  background: #0a0d14; border-top: 1px solid #1e293b;
  flex-shrink: 0;
}
.footer-info { flex: 1; font-size: 9px; color: #334155; }
.footer-actions { display: flex; gap: 8px; }
.btn-cancel {
  padding: 5px 14px; font-size: 11px; border-radius: 5px;
  background: transparent; border: 1px solid #1e293b;
  color: #475569; cursor: pointer; transition: all 0.12s;
}
.btn-cancel:hover { border-color: #334155; color: #94a3b8; }
.btn-save {
  padding: 5px 16px; font-size: 11px; font-weight: 700;
  border-radius: 5px; border: none; cursor: pointer;
  background: rgba(99,102,241,0.2);
  border: 1px solid rgba(99,102,241,0.35);
  color: #818cf8; transition: all 0.12s;
}
.btn-save:hover { background: rgba(99,102,241,0.3); }
</style>
