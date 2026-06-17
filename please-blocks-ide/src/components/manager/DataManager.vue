<script setup>
/**
 * DataManager.vue — Modal multi-file data manager.
 *
 * Layout:
 *   [File Tabs: main.js | users.js | + Add File]
 *   ─────────────────────────────────────────────
 *   [Groups] | [Entries] | [Field Editor] | [File Info]
 *
 * Setiap file punya scope groups-nya sendiri.
 * Code Preview menampilkan output JS per file yang aktif.
 */
import { ref, computed } from 'vue'
import { useDataRegistry }  from '@/model/stores/dataRegistry.js'
import { generateDataFile }  from '@/model/core/factory/DataFactory.js'

const props  = defineProps({ mode: { type: String, default: 'modal' } })  // 'modal' | 'panel'
const emit   = defineEmits(['close'])
const dataReg = useDataRegistry()

// Navigasi
const activeFileId   = ref(Object.keys(dataReg.files)[0] || 'main')
const activeGroupName = ref('')
const activeEntryName = ref('')
const activeTab      = ref('data')   // 'data' | 'preview' (env kini di tab activity bar)

// Selalu reset group/entry saat pindah file
function selectFile(id) {
  activeFileId.value    = id
  activeGroupName.value = ''
  activeEntryName.value = ''
}

const activeFile = computed(() => dataReg.files[activeFileId.value] || null)

// ── Add File ──────────────────────────────────────────────────────
const addingFile  = ref(false)
const newFileName = ref('')
const newFileLabel = ref('')

function submitNewFile() {
  const name = newFileName.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  if (!name) return
  const id = dataReg.addFile(name, newFileLabel.value.trim() || name)
  if (id) selectFile(id)
  addingFile.value  = false
  newFileName.value = ''
  newFileLabel.value = ''
}

// ── Group actions ─────────────────────────────────────────────────
const addingGroup  = ref(false)
const newGroupName = ref('')

function selectGroup(name) {
  activeGroupName.value = name
  activeEntryName.value = ''
}

function submitNewGroup() {
  const name = newGroupName.value.trim().toUpperCase()
  if (!name) return
  dataReg.addGroup(activeFileId.value, name)
  activeGroupName.value = name
  addingGroup.value     = false
  newGroupName.value    = ''
}

function removeGroup(name) {
  if (!confirm(`Hapus group "${name}"? Semua entry di dalamnya akan terhapus.`)) return
  dataReg.removeGroup(activeFileId.value, name)
  if (activeGroupName.value === name) {
    activeGroupName.value = Object.keys(activeFile.value?.groups || {})[0] || ''
    activeEntryName.value = ''
  }
}

// ── Entry actions ─────────────────────────────────────────────────
const addingEntry  = ref(false)
const newEntryName = ref('')

function selectEntry(name) {
  activeEntryName.value = name
}

function submitNewEntry() {
  const name = newEntryName.value.trim()
  if (!name || !activeGroupName.value) return
  // Tebak field default berdasarkan nama group
  const defaultFields = guessDefaultFields(activeGroupName.value)
  dataReg.addEntry(activeFileId.value, activeGroupName.value, name, defaultFields)
  activeEntryName.value = name
  addingEntry.value     = false
  newEntryName.value    = ''
}

function removeEntry(name) {
  dataReg.removeEntry(activeFileId.value, activeGroupName.value, name)
  if (activeEntryName.value === name) activeEntryName.value = ''
}

function guessDefaultFields(groupName) {
  const g = groupName.toUpperCase()
  if (g === 'URL')                   return { url: '', title: '' }
  if (g.includes('ACCOUNT') || g.includes('USER')) return { username: '', password: '' }
  if (g.includes('PRODUCT'))         return { name: '', price: 0 }
  return {}
}

// ── Field actions ─────────────────────────────────────────────────
const currentFields = computed(() => {
  if (!activeFile.value || !activeGroupName.value || !activeEntryName.value) return {}
  return activeFile.value.groups[activeGroupName.value]?.[activeEntryName.value] ?? {}
})

function updateField(fieldName, value) {
  dataReg.updateField(activeFileId.value, activeGroupName.value, activeEntryName.value, fieldName, value)
}

// Inline form untuk tambah field baru (ganti prompt())
const addingField   = ref(false)
const newFieldName  = ref('')
const newFieldValue = ref('')
const fieldInputRef = ref(null)

function openAddField() {
  newFieldName.value  = ''
  newFieldValue.value = ''
  addingField.value   = true
  // Focus input setelah DOM update
  setTimeout(() => fieldInputRef.value?.focus(), 50)
}

function submitNewField() {
  const name = newFieldName.value.trim()
  if (!name) return
  dataReg.addField(
    activeFileId.value,
    activeGroupName.value,
    activeEntryName.value,
    name,
    newFieldValue.value
  )
  newFieldName.value  = ''
  newFieldValue.value = ''
  addingField.value   = false
}

function cancelAddField() {
  addingField.value   = false
  newFieldName.value  = ''
  newFieldValue.value = ''
}

function removeField(fieldName) {
  dataReg.removeField(activeFileId.value, activeGroupName.value, activeEntryName.value, fieldName)
}

// ── Preview ───────────────────────────────────────────────────────
const previewCode = computed(() =>
  activeFile.value ? generateDataFile(activeFile.value, dataReg.env) : ''
)

// DataRef path yang bisa dipakai di canvas
const allPaths = computed(() =>
  dataReg.entriesForFile(activeFileId.value)
    .filter(e => e.type === 'object')
    .map(e => e.path)
)

const copied = ref(false)
async function copyPreview() {
  await navigator.clipboard.writeText(previewCode.value).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1800)
}
</script>

<template>
  <div :class="mode === 'panel' ? 'panel-root' : 'modal-overlay'" @click.self="mode === 'modal' && emit('close')">
    <div :class="mode === 'panel' ? 'panel-box' : 'modal'">

      <!-- Modal header -->
      <div class="modal-header">
        <span class="modal-title">📊 Data Manager</span>

        <!-- File tabs -->
        <div class="file-tabs">
          <button
            v-for="(fileDef, fileId) in dataReg.files"
            :key="fileId"
            :class="['file-tab', { active: activeFileId === fileId }]"
            @click="selectFile(fileId)"
          >
            <span class="ft-name">{{ fileDef.filename }}.js</span>
            <span
              v-if="fileId !== 'main'"
              class="ft-del"
              @click.stop="dataReg.removeFile(fileId); selectFile('main')"
              title="Hapus file"
            >×</span>
          </button>

          <!-- Add file form -->
          <template v-if="addingFile">
            <input
              v-model="newFileName"
              class="ft-input"
              placeholder="filename"
              @keyup.enter="submitNewFile"
              @keyup.escape="addingFile = false"
              autofocus
            />
            <input
              v-model="newFileLabel"
              class="ft-input"
              placeholder="label (opsional)"
              @keyup.enter="submitNewFile"
              @keyup.escape="addingFile = false"
            />
            <button class="ft-ok" @click="submitNewFile">✓</button>
          </template>
          <button v-else class="file-tab-add" @click="addingFile = true; newFileName = ''">
            + File
          </button>
        </div>

        <!-- Right tabs -->
        <div class="right-tabs">
          <button :class="['mtab', { active: activeTab === 'data' }]"    @click="activeTab = 'data'">Data</button>
          <button :class="['mtab', { active: activeTab === 'preview' }]" @click="activeTab = 'preview'">Preview</button>
        </div>
        <button v-if="mode === 'modal'" class="modal-close" @click="emit('close')">×</button>
      </div>

      <!-- File description row -->
      <div class="file-meta" v-if="activeFile">
        <span class="fm-path">📄 data/{{ activeFile.filename }}.js</span>
        <span class="fm-desc">{{ activeFile.description || activeFile.label }}</span>
        <input
          class="fm-desc-input"
          :value="activeFile.description"
          placeholder="Deskripsi file (opsional)..."
          @input="dataReg.updateFile(activeFileId, { description: $event.target.value })"
        />
        <!-- DataRef paths tersedia -->
        <div class="fm-refs" v-if="allPaths.length">
          <span class="fm-refs-label">DataRef:</span>
          <code v-for="p in allPaths.slice(0,5)" :key="p" class="fm-ref">{{ p }}</code>
          <span v-if="allPaths.length > 5" class="fm-ref-more">+{{ allPaths.length - 5 }} lagi</span>
        </div>
      </div>

      <!-- DATA TAB -->
      <div v-if="activeTab === 'data'" class="modal-body three-col">

        <!-- Kolom 1: Group list -->
        <div class="col-groups">
          <div class="col-title">Groups</div>
          <div
            v-for="(_, gName) in activeFile?.groups"
            :key="gName"
            :class="['group-item', { active: activeGroupName === gName }]"
            @click="selectGroup(gName)"
          >
            <span class="group-name">{{ gName }}</span>
            <span class="group-count">
              {{ Object.keys(activeFile.groups[gName] || {}).length }}
            </span>
            <button class="item-del" @click.stop="removeGroup(gName)">×</button>
          </div>

          <div v-if="addingGroup" class="add-form">
            <input v-model="newGroupName" class="add-input" placeholder="NAMA_GROUP"
              @keyup.enter="submitNewGroup" @keyup.escape="addingGroup = false" autofocus />
            <button class="add-ok" @click="submitNewGroup">✓</button>
          </div>
          <button class="add-btn" @click="addingGroup = true; newGroupName = ''">+ Group</button>
        </div>

        <!-- Kolom 2: Entry list -->
        <div class="col-entries">
          <div class="col-title">{{ activeGroupName || '—' }} entries</div>

          <template v-if="activeGroupName && activeFile">
            <div
              v-for="(_, eName) in activeFile.groups[activeGroupName]"
              :key="eName"
              :class="['entry-item', { active: activeEntryName === eName }]"
              @click="selectEntry(eName)"
            >
              <span class="entry-icon">📦</span>
              <span class="entry-name">{{ activeGroupName }}.{{ eName }}</span>
              <button class="item-del" @click.stop="removeEntry(eName)">×</button>
            </div>

            <div v-if="addingEntry" class="add-form">
              <input v-model="newEntryName" class="add-input"
                :placeholder="`e.g. ${activeGroupName === 'URL' ? 'dashboard' : 'admin'}`"
                @keyup.enter="submitNewEntry" @keyup.escape="addingEntry = false" autofocus />
              <button class="add-ok" @click="submitNewEntry">✓</button>
            </div>
            <button class="add-btn" @click="addingEntry = true; newEntryName = ''">+ Entry</button>
          </template>
          <div v-else class="empty-col-msg">← Pilih group</div>
        </div>

        <!-- Kolom 3: Field editor -->
        <div class="col-fields" v-if="activeEntryName">
          <div class="col-title">
            {{ activeGroupName }}.{{ activeEntryName }}
            <span class="ref-badge">{{ activeGroupName }}.{{ activeEntryName }}</span>
          </div>

          <!-- Field list -->
          <div class="field-list">
            <div v-for="(val, fieldName) in currentFields" :key="fieldName" class="field-row">
              <span class="field-key">{{ fieldName }}</span>
              <input
                class="field-val"
                :value="val"
                @input="updateField(fieldName, $event.target.value)"
              />
              <button class="item-del small" @click="removeField(fieldName)" title="Hapus field">×</button>
            </div>
            <div v-if="!Object.keys(currentFields).length && !addingField" class="no-fields">
              Belum ada field. Klik "+ Field" untuk menambahkan.
            </div>

            <!-- Inline form tambah field baru -->
            <div v-if="addingField" class="add-field-form">
              <div class="aff-row">
                <span class="aff-label">Field</span>
                <input
                  ref="fieldInputRef"
                  v-model="newFieldName"
                  class="aff-input"
                  placeholder="nama field (e.g. url, price)"
                  @keyup.enter="submitNewField"
                  @keyup.escape="cancelAddField"
                />
              </div>
              <div class="aff-row">
                <span class="aff-label">Nilai</span>
                <input
                  v-model="newFieldValue"
                  class="aff-input"
                  placeholder="nilai awal (opsional)"
                  @keyup.enter="submitNewField"
                  @keyup.escape="cancelAddField"
                />
              </div>
              <div class="aff-actions">
                <button class="aff-ok" @click="submitNewField">✓ Tambah</button>
                <button class="aff-cancel" @click="cancelAddField">Batal</button>
              </div>
            </div>
          </div>

          <!-- Tombol + Field -->
          <button v-if="!addingField" class="add-btn" @click="openAddField">+ Field</button>

          <!-- Usage hint -->
          <div class="field-usage-hint">
            <div class="hint-title">DataRef path:</div>
            <div class="hint-code">{{ activeGroupName }}.{{ activeEntryName }}</div>
            <div class="hint-sub">
              File: <strong>data/{{ activeFile?.filename }}.js</strong><br>
              Require: <code>require('../data/{{ activeFile?.filename }}')</code>
            </div>
          </div>
        </div>

        <div class="col-fields empty-col" v-else>
          <div class="empty-hint">← Pilih entry untuk edit</div>
        </div>

      </div>

      <!-- ENV TAB -->
      <!-- PREVIEW TAB -->
      <div v-else-if="activeTab === 'preview'" class="modal-body preview-body">
        <div class="preview-actions">
          <span class="preview-file">data/{{ activeFile?.filename }}.js</span>
          <button class="cp-copy" :class="{ done: copied }" @click="copyPreview">
            {{ copied ? '✓ Copied' : '⎘ Copy' }}
          </button>
        </div>
        <pre class="preview-code">{{ previewCode }}</pre>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  width: 860px; max-width: 96vw;
  height: 600px; max-height: 92vh;
  background: #111827; border: 1px solid #1e293b;
  border-radius: 12px; display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
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
  padding: 0 14px; height: 46px;
  background: #0f1117; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.modal-title { font-size: 13px; font-weight: 700; color: #e2e8f0; white-space: nowrap; }

/* File tabs */
.file-tabs { display: flex; align-items: center; flex: 1; overflow-x: auto; gap: 2px; padding: 0 6px; }
.file-tab {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 5px; border: 1px solid transparent;
  font-size: 10.5px; font-family: monospace; font-weight: 600;
  color: #475569; background: transparent; cursor: pointer;
  white-space: nowrap; transition: all 0.15s;
}
.file-tab:hover  { color: #94a3b8; background: rgba(255,255,255,0.03); }
.file-tab.active { background: rgba(14,165,233,0.1); border-color: rgba(14,165,233,0.3); color: #38bdf8; }
.ft-name { flex: 1; }
.ft-del  { color: #334155; font-size: 12px; line-height: 1; margin-left: 4px; transition: color 0.1s; }
.ft-del:hover { color: #ef4444; }
.file-tab-add {
  padding: 4px 8px; border-radius: 5px; border: 1px dashed #1e293b;
  font-size: 10px; color: #334155; background: transparent; cursor: pointer;
  white-space: nowrap; transition: all 0.15s;
}
.file-tab-add:hover { border-color: #334155; color: #64748b; }
.ft-input {
  width: 90px; background: #0f1117; border: 1px solid #0ea5e9;
  border-radius: 4px; padding: 3px 7px; font-size: 10px; color: #e2e8f0;
  outline: none; font-family: monospace;
}
.ft-ok {
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
  border-radius: 4px; color: #10b981; font-size: 11px; cursor: pointer; padding: 2px 7px;
}

/* Right tabs */
.right-tabs  { display: flex; gap: 2px; }
.mtab {
  padding: 4px 10px; border-radius: 5px; border: none;
  font-size: 10.5px; font-weight: 600; cursor: pointer;
  color: #64748b; background: transparent; transition: all 0.15s;
}
.mtab.active { background: rgba(14,165,233,0.1); color: #0ea5e9; }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 20px; line-height: 1; padding: 0;
}
.modal-close:hover { color: #e2e8f0; }

/* File meta bar */
.file-meta {
  display: flex; align-items: center; gap: 10px;
  padding: 5px 14px; background: rgba(14,165,233,0.04);
  border-bottom: 1px solid #1e293b; flex-shrink: 0; flex-wrap: wrap;
}
.fm-path  { font-size: 10px; font-family: monospace; color: #38bdf8; white-space: nowrap; }
.fm-desc  { display: none; }
.fm-desc-input {
  flex: 1; min-width: 160px; background: transparent; border: none;
  font-size: 10px; color: #64748b; outline: none;
}
.fm-desc-input::placeholder { color: #334155; }
.fm-refs { display: flex; align-items: center; gap: 5px; margin-left: auto; }
.fm-refs-label { font-size: 9px; color: #334155; }
.fm-ref {
  font-family: monospace; font-size: 9px;
  background: rgba(14,165,233,0.08); color: #38bdf8;
  padding: 1px 5px; border-radius: 3px;
}
.fm-ref-more { font-size: 9px; color: #334155; }

/* Body */
.modal-body  { flex: 1; overflow: hidden; display: flex; }
.three-col   { flex-direction: row; }

/* Columns */
.col-groups  { width: 150px; min-width: 150px; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden; }
.col-entries { width: 210px; min-width: 210px; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden; }
.col-fields  { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.col-title {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  color: #475569; padding: 8px 12px 6px;
  border-bottom: 1px solid #1e293b; flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}
.ref-badge {
  font-size: 8.5px; font-family: monospace;
  background: rgba(14,165,233,0.1); color: #38bdf8;
  padding: 1px 6px; border-radius: 3px; margin-left: auto;
  text-transform: none; letter-spacing: 0;
}

/* Items */
.group-item, .entry-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; cursor: pointer;
  transition: background 0.1s; border-radius: 4px; margin: 1px 4px;
}
.group-item:hover, .entry-item:hover { background: rgba(255,255,255,0.03); }
.group-item.active { background: rgba(14,165,233,0.08); }
.entry-item.active { background: rgba(14,165,233,0.08); }
.group-item:hover .item-del, .entry-item:hover .item-del { opacity: 1; }
.group-name  { font-size: 11px; font-weight: 700; color: #38bdf8; flex: 1; font-family: monospace; }
.group-count { font-size: 9px; color: #334155; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 1px 5px; }
.entry-icon  { font-size: 11px; flex-shrink: 0; }
.entry-name  { font-size: 10px; color: #94a3b8; flex: 1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.item-del {
  background: none; border: none; cursor: pointer;
  color: #334155; font-size: 14px; line-height: 1; padding: 0 2px;
  opacity: 0; transition: opacity 0.1s, color 0.1s; flex-shrink: 0;
}
.item-del.small { font-size: 12px; }
.item-del:hover { color: #ef4444; opacity: 1 !important; }

.add-form { display: flex; gap: 4px; padding: 4px 8px; }
.add-input {
  flex: 1; background: #0f1117; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 7px; font-size: 10px; color: #e2e8f0;
  outline: none; font-family: monospace;
}
.add-input:focus { border-color: #0ea5e9; }
.add-ok {
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
  border-radius: 4px; color: #10b981; font-size: 11px; cursor: pointer; padding: 0 7px;
}
.add-btn {
  margin: 6px 8px 4px;
  background: none; border: 1px dashed #1e293b;
  border-radius: 5px; padding: 5px 10px;
  font-size: 10px; color: #334155; cursor: pointer;
  transition: all 0.15s; text-align: left;
}
.add-btn:hover { border-color: #334155; color: #64748b; }

/* Field editor */
.field-list { flex: 1; overflow-y: auto; padding: 8px 12px; }
.field-row  { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.field-key  { font-size: 10px; font-family: monospace; color: #7dd3fc; width: 90px; min-width: 90px; flex-shrink: 0; }
.field-val  {
  flex: 1; background: #0f1117; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10px; color: #e2e8f0;
  outline: none; font-family: monospace;
}
.field-val:focus { border-color: #0ea5e9; }
.no-fields { font-size: 10px; color: #374151; text-align: center; padding: 16px; }

/* Inline add-field form */
.add-field-form {
  margin: 6px 0 4px;
  padding: 8px 10px;
  background: rgba(14,165,233,0.04);
  border: 1px solid rgba(14,165,233,0.2);
  border-radius: 6px;
}
.aff-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.aff-label {
  font-size: 9px; font-weight: 700; color: #475569;
  text-transform: uppercase; width: 36px; flex-shrink: 0; letter-spacing: 0.05em;
}
.aff-input {
  flex: 1; background: #0f1117; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10.5px; color: #e2e8f0;
  outline: none;
}
.aff-input.mono { font-family: monospace; }
.aff-input:focus { border-color: #0ea5e9; }
.aff-input::placeholder { color: #334155; }
.aff-actions { display: flex; gap: 6px; }
.aff-ok {
  padding: 4px 12px; border-radius: 4px; border: none; cursor: pointer;
  background: rgba(16,185,129,0.15); color: #10b981;
  font-size: 10px; font-weight: 600;
  transition: background 0.15s;
}
.aff-ok:hover { background: rgba(16,185,129,0.25); }
.aff-cancel {
  padding: 4px 10px; border-radius: 4px; cursor: pointer;
  background: transparent; color: #475569; border: 1px solid #1e293b;
  font-size: 10px; transition: color 0.15s;
}
.aff-cancel:hover { color: #94a3b8; }

.field-usage-hint {
  padding: 10px 12px; border-top: 1px solid #1e293b; flex-shrink: 0;
  background: rgba(14,165,233,0.03);
}
.hint-title { font-size: 9px; color: #475569; margin-bottom: 4px; }
.hint-code  { font-family: monospace; font-size: 12px; color: #38bdf8; font-weight: 700; margin-bottom: 4px; }
.hint-sub   { font-size: 9px; color: #374151; line-height: 1.6; }
.hint-sub strong { color: #475569; }
.hint-sub code {
  font-family: monospace; background: rgba(255,255,255,0.05);
  padding: 1px 4px; border-radius: 3px; color: #94a3b8; font-size: 9px;
}

.empty-col     { align-items: center; justify-content: center; }
.empty-hint    { font-size: 11px; color: #1e293b; }
.empty-col-msg { font-size: 10px; color: #374151; text-align: center; padding: 16px 12px; }

/* ENV tab */
.env-body   { flex-direction: column; }
.env-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.env-desc   { font-size: 11px; color: #475569; flex: 1; }
.env-desc code { font-family: monospace; background: rgba(255,255,255,0.05); padding: 1px 5px; border-radius: 3px; font-size: 10px; }
.env-list   { flex: 1; overflow-y: auto; padding: 12px 16px; }
.env-row    { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.env-key    { font-family: monospace; font-size: 10px; color: #c084fc; width: 180px; min-width: 180px; flex-shrink: 0; }
.env-eq     { color: #334155; font-size: 12px; flex-shrink: 0; }
.env-val    {
  flex: 1; background: #0f1117; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10px; color: #e2e8f0;
  outline: none; font-family: monospace;
}
.env-val:focus { border-color: #c084fc; }
.env-note   { padding: 10px 16px; font-size: 10px; color: #374151; }
.env-note code { font-family: monospace; background: rgba(255,255,255,0.05); padding: 1px 4px; border-radius: 3px; color: #c084fc; }

/* Preview tab */
.preview-body    { flex-direction: column; }
.preview-actions { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0; background: #0f1117; }
.preview-file    { font-family: monospace; font-size: 11px; color: #64748b; flex: 1; }
.cp-copy { padding: 3px 10px; font-size: 10px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); border-radius: 4px; color: #6366f1; cursor: pointer; }
.cp-copy.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.preview-code {
  flex: 1; overflow: auto; margin: 0;
  padding: 14px 16px;
  font-family: 'SF Mono','Fira Code',monospace; font-size: 10px;
  line-height: 1.7; color: #94a3b8; white-space: pre; background: #0a0d14;
}
</style>
