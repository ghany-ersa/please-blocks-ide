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
  background: var(--color-bg-scrim);
  display: flex; align-items: center; justify-content: center;
  z-index: var(--z-modal);
}
.modal {
  width: 860px; max-width: 96vw;
  height: 600px; max-height: 92vh;
  background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-2xl); display: flex; flex-direction: column;
  overflow: hidden; box-shadow: var(--shadow-xl);
}
/* Mode panel — tampil in-area (lebar penuh), bukan overlay */
.panel-root { flex: 1; min-width: 0; height: 100%; display: flex; }
.panel-box {
  flex: 1; min-width: 0; height: 100%;
  background: var(--color-bg-surface); display: flex; flex-direction: column; overflow: hidden;
}

/* Header */
.modal-header {
  display: flex; align-items: center; gap: var(--space-2);
  padding: 0 14px; height: 46px;
  background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.modal-title { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text-primary); white-space: nowrap; }

/* File tabs */
.file-tabs { display: flex; align-items: center; flex: 1; overflow-x: auto; gap: 2px; padding: 0 6px; }
.file-tab {
  display: flex; align-items: center; gap: var(--space-1);
  padding: var(--space-1) var(--space-2-5); border-radius: var(--radius-md); border: 1px solid transparent;
  font-size: 12.5px; font-family: monospace; font-weight: var(--font-semibold);
  color: var(--color-text-faint); background: transparent; cursor: pointer;
  white-space: nowrap; transition: all var(--transition-base);
}
.file-tab:hover  { color: var(--color-text-secondary); background: var(--color-white-3); }
.file-tab.active { background: var(--color-info-bg); border-color: var(--color-info-border); color: var(--color-info-light); }
.ft-name { flex: 1; }
.ft-del  { color: var(--color-text-dimmed); font-size: var(--text-md); line-height: var(--leading-none); margin-left: var(--space-1); transition: color var(--transition-fast); }
.ft-del:hover { color: var(--color-danger); }
.file-tab-add {
  padding: var(--space-1) var(--space-2); border-radius: var(--radius-md); border: 1px dashed var(--color-border-subtle);
  font-size: var(--text-sm); color: var(--color-text-dimmed); background: transparent; cursor: pointer;
  white-space: nowrap; transition: all var(--transition-base);
}
.file-tab-add:hover { border-color: var(--color-border-default); color: var(--color-text-muted); }
.ft-input {
  width: 90px; background: var(--color-bg-base); border: 1px solid var(--color-info);
  border-radius: 4px; padding: 3px 7px; font-size: var(--text-sm); color: var(--color-text-primary);
  outline: none; font-family: monospace;
}
.ft-ok {
  background: var(--color-success-bg); border: 1px solid var(--color-success-border);
  border-radius: 4px; color: var(--color-success); font-size: var(--text-base); cursor: pointer; padding: 2px 7px;
}

/* Right tabs */
.right-tabs  { display: flex; gap: 2px; }
.mtab {
  padding: var(--space-1) var(--space-2-5); border-radius: var(--radius-md); border: none;
  font-size: 12.5px; font-weight: var(--font-semibold); cursor: pointer;
  color: var(--color-text-muted); background: transparent; transition: all var(--transition-base);
}
.mtab.active { background: var(--color-info-bg); color: var(--color-info); }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-faint); font-size: var(--text-icon); line-height: var(--leading-none); padding: 0;
}
.modal-close:hover { color: var(--color-text-primary); }

/* File meta bar */
.file-meta {
  display: flex; align-items: center; gap: var(--space-2-5);
  padding: var(--pad-btn-y) 14px; background: var(--color-info-bg);
  border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; flex-wrap: wrap;
}
.fm-path  { font-size: var(--text-sm); font-family: monospace; color: var(--color-info-light); white-space: nowrap; }
.fm-desc  { display: none; }
.fm-desc-input {
  flex: 1; min-width: 160px; background: transparent; border: none;
  font-size: var(--text-sm); color: var(--color-text-muted); outline: none;
}
.fm-desc-input::placeholder { color: var(--color-text-dimmed); }
.fm-refs { display: flex; align-items: center; gap: 5px; margin-left: auto; }
.fm-refs-label { font-size: var(--text-xs); color: var(--color-text-dimmed); }
.fm-ref {
  font-family: monospace; font-size: var(--text-xs);
  background: var(--color-info-bg); color: var(--color-info-light);
  padding: var(--pad-badge-y) var(--pad-badge-x); border-radius: var(--radius-sm);
}
.fm-ref-more { font-size: var(--text-xs); color: var(--color-text-dimmed); }

/* Body */
.modal-body  { flex: 1; overflow: hidden; display: flex; }
.three-col   { flex-direction: row; }

/* Columns */
.col-groups  { width: 240px; min-width: 240px; border-right: 1px solid var(--color-border-subtle); display: flex; flex-direction: column; overflow: hidden; }
.col-entries { width: 240px; min-width: 240px; border-right: 1px solid var(--color-border-subtle); display: flex; flex-direction: column; overflow: hidden; }
.col-fields  { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.col-title {
  font-size: 11.5px; font-weight: var(--font-bold); letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--color-text-faint); padding: var(--pad-col-y) var(--pad-col-x) 6px;
  border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}
.ref-badge {
  font-size: 10.5px; font-family: monospace;
  background: var(--color-info-bg); color: var(--color-info-light);
  padding: var(--pad-badge-y) 6px; border-radius: var(--radius-sm); margin-left: auto;
  text-transform: none; letter-spacing: 0;
}

/* Items */
.group-item, .entry-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px var(--space-2-5); cursor: pointer;
  transition: background var(--transition-fast); border-radius: 4px; margin: 1px 4px;
}
.group-item:hover, .entry-item:hover { background: var(--color-white-3); }
.group-item.active { background: var(--color-info-bg); }
.entry-item.active { background: var(--color-info-bg); }
.group-item:hover .item-del, .entry-item:hover .item-del { opacity: 1; }
.group-name  { font-size: var(--text-base); font-weight: var(--font-bold); color: var(--color-info-light); flex: 1; font-family: monospace; }
.group-count { font-size: var(--text-xs); color: var(--color-text-dimmed); background: var(--color-white-5); border-radius: 8px; padding: 1px 5px; }
.entry-icon  { font-size: var(--text-base); flex-shrink: 0; }
.entry-name  { font-size: var(--text-sm); color: var(--color-text-secondary); flex: 1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.item-del {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-dimmed); font-size: 16px; line-height: var(--leading-none); padding: 0 2px;
  opacity: 0; transition: opacity var(--transition-fast), color var(--transition-fast); flex-shrink: 0;
}
.item-del.small { font-size: 14px; }
.item-del:hover { color: var(--color-danger); opacity: 1 !important; }

.add-form { display: flex; gap: var(--space-1); padding: var(--space-1) var(--space-2); }
.add-input {
  flex: 1; background: var(--color-bg-base); border: 1px solid var(--color-border-default);
  border-radius: 4px; padding: var(--space-1) 7px; font-size: var(--text-sm); color: var(--color-text-primary);
  outline: none; font-family: monospace;
}
.add-input:focus { border-color: var(--color-info); }
.add-ok {
  background: var(--color-success-bg); border: 1px solid var(--color-success-border);
  border-radius: 4px; color: var(--color-success); font-size: var(--text-base); cursor: pointer; padding: 0 7px;
}
.add-btn {
  margin: 6px 8px 4px;
  background: none; border: 1px dashed var(--color-border-subtle);
  border-radius: var(--radius-md); padding: var(--pad-btn-y) var(--space-2-5);
  font-size: var(--text-sm); color: var(--color-text-dimmed); cursor: pointer;
  transition: all var(--transition-base); text-align: left;
}
.add-btn:hover { border-color: var(--color-border-default); color: var(--color-text-muted); }

/* Field editor */
.field-list { flex: 1; overflow-y: auto; padding: var(--space-2) var(--space-3); }
.field-row  { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.field-key  { font-size: var(--text-sm); font-family: monospace; color: var(--syntax-data-key); width: 90px; min-width: 90px; flex-shrink: 0; }
.field-val  {
  flex: 1; background: var(--color-bg-base); border: 1px solid var(--color-border-default);
  border-radius: 4px; padding: var(--space-1) var(--space-2); font-size: var(--text-sm); color: var(--color-text-primary);
  outline: none; font-family: monospace;
}
.field-val:focus { border-color: var(--color-info); }
.no-fields { font-size: var(--text-sm); color: var(--color-text-ghost); text-align: center; padding: var(--space-4); }

/* Inline add-field form */
.add-field-form {
  margin: 6px 0 4px;
  padding: var(--space-2) var(--space-2-5);
  background: var(--color-info-bg);
  border: 1px solid rgba(14,165,233,0.2);
  border-radius: var(--radius-lg);
}
.aff-row {
  display: flex; align-items: center; gap: var(--space-2); margin-bottom: 6px;
}
.aff-label {
  font-size: var(--text-xs); font-weight: var(--font-bold); color: var(--color-text-faint);
  text-transform: uppercase; width: 36px; flex-shrink: 0; letter-spacing: var(--tracking-wide);
}
.aff-input {
  flex: 1; background: var(--color-bg-base); border: 1px solid var(--color-border-default);
  border-radius: 4px; padding: var(--space-1) var(--space-2); font-size: 12.5px; color: var(--color-text-primary);
  outline: none;
}
.aff-input.mono { font-family: monospace; }
.aff-input:focus { border-color: var(--color-info); }
.aff-input::placeholder { color: var(--color-text-dimmed); }
.aff-actions { display: flex; gap: 6px; }
.aff-ok {
  padding: var(--space-1) var(--space-3); border-radius: 4px; border: none; cursor: pointer;
  background: var(--color-success-bg); color: var(--color-success);
  font-size: var(--text-sm); font-weight: var(--font-semibold);
  transition: background var(--transition-base);
}
.aff-ok:hover { background: rgba(16,185,129,0.25); }
.aff-cancel {
  padding: var(--space-1) var(--space-2-5); border-radius: 4px; cursor: pointer;
  background: transparent; color: var(--color-text-faint); border: 1px solid var(--color-border-subtle);
  font-size: var(--text-sm); transition: color var(--transition-base);
}
.aff-cancel:hover { color: var(--color-text-secondary); }

.field-usage-hint {
  padding: var(--space-2-5) var(--space-3); border-top: 1px solid var(--color-border-subtle); flex-shrink: 0;
  background: var(--color-info-bg);
}
.hint-title { font-size: var(--text-xs); color: var(--color-text-faint); margin-bottom: 4px; }
.hint-code  { font-family: monospace; font-size: var(--text-md); color: var(--color-info-light); font-weight: var(--font-bold); margin-bottom: 4px; }
.hint-sub   { font-size: var(--text-xs); color: var(--color-text-ghost); line-height: 1.6; }
.hint-sub strong { color: var(--color-text-faint); }
.hint-sub code {
  font-family: monospace; background: var(--color-white-5);
  padding: 1px 4px; border-radius: var(--radius-sm); color: var(--color-text-secondary); font-size: var(--text-xs);
}

.empty-col     { align-items: center; justify-content: center; }
.empty-hint    { font-size: var(--text-base); color: var(--color-border-subtle); }
.empty-col-msg { font-size: var(--text-sm); color: var(--color-text-ghost); text-align: center; padding: var(--space-4) var(--space-3); }

/* ENV tab */
.env-body   { flex-direction: column; }
.env-header { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; }
.env-desc   { font-size: var(--text-base); color: var(--color-text-faint); flex: 1; }
.env-desc code { font-family: monospace; background: var(--color-white-5); padding: 1px 5px; border-radius: var(--radius-sm); font-size: var(--text-sm); }
.env-list   { flex: 1; overflow-y: auto; padding: var(--space-3) var(--space-4); }
.env-row    { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 6px; }
.env-key    { font-family: monospace; font-size: var(--text-sm); color: var(--color-purple-light); width: 180px; min-width: 180px; flex-shrink: 0; }
.env-eq     { color: var(--color-text-dimmed); font-size: var(--text-md); flex-shrink: 0; }
.env-val    {
  flex: 1; background: var(--color-bg-base); border: 1px solid var(--color-border-default);
  border-radius: 4px; padding: var(--space-1) var(--space-2); font-size: var(--text-sm); color: var(--color-text-primary);
  outline: none; font-family: monospace;
}
.env-val:focus { border-color: var(--color-purple-light); }
.env-note   { padding: var(--space-2-5) var(--space-4); font-size: var(--text-sm); color: var(--color-text-ghost); }
.env-note code { font-family: monospace; background: var(--color-white-5); padding: 1px 4px; border-radius: var(--radius-sm); color: var(--color-purple-light); }

/* Preview tab */
.preview-body    { flex-direction: column; }
.preview-actions { display: flex; align-items: center; gap: var(--space-2-5); padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; background: var(--color-bg-base); }
.preview-file    { font-family: monospace; font-size: var(--text-base); color: var(--color-text-muted); flex: 1; }
.cp-copy { padding: 3px var(--space-2-5); font-size: var(--text-sm); background: var(--color-primary-bg); border: 1px solid var(--color-primary-border); border-radius: 4px; color: var(--color-primary); cursor: pointer; }
.cp-copy.done { background: var(--color-success-bg); border-color: var(--color-success-border); color: var(--color-success); }
.preview-code {
  flex: 1; overflow: auto; margin: 0;
  padding: 14px var(--space-4);
  font-family: var(--font-mono); font-size: var(--text-sm);
  line-height: var(--leading-relaxed); color: var(--color-text-secondary); white-space: pre; background: var(--color-bg-deepest);
}
</style>
