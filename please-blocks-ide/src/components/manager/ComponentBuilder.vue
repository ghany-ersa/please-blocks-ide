<script setup>
/**
 * ComponentBuilder.vue — Modal untuk membuat/edit Component secara visual.
 *
 * Layout:
 *   [Komponen list] | [Method list] | [Step builder + Code Preview]
 *
 * Flow:
 *   QA buat component → tambah method → drag block ke step list
 *   → Save → ComponentFactory generate block defs → blok muncul di palette
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useComponentStore } from '@/model/stores/componentStore.js'
import { useBlockRegistry }  from '@/model/stores/blockRegistry.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { generateComponentFile } from '@/model/core/factory/ComponentFactory.js'
import { useCodeHighlight } from '@/composables/useCodeHighlight.js'
import { usePaletteFilter } from '@/composables/usePaletteFilter.js'
import StepCard from '@/components/shared/StepCard.vue'

const props = defineProps({
  initialCompId: { type: String, default: null },
  mode:          { type: String, default: 'modal' }   // 'modal' | 'panel'
})
const emit   = defineEmits(['close'])
const compStore = useComponentStore()
const registry  = useBlockRegistry()
const canvas    = useCanvasStore()
const dataReg   = useDataRegistry()

// Navigasi — jika dibuka via double-click, langsung ke component tsb
const activeCompId   = ref(props.initialCompId || compStore.components[0]?.id || null)
const activeMethodId = ref(null)
const editingName    = ref(false)
const draftName      = ref('')

// Mini palette — search + filter kategori (lewat composable bersama)
const paletteSearch  = ref('')
const expandedCats   = ref({})   // { [catId]: boolean }
const { filteredCategories: filteredPalette } = usePaletteFilter(paletteSearch)

function isCatOpen(catId) {
  return expandedCats.value[catId] !== false  // default open
}
function toggleCat(catId) {
  expandedCats.value[catId] = !isCatOpen(catId)
}

// Drag dari mini palette — sama persis dengan BlockCard: setData('text/plain', blockId)
function onPaletteDragStart(e, block) {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('text/plain', block.id)
}

// Highlight drop zone
const isDropOver = ref(false)

// Computed helpers
const activeComp = computed(() =>
  compStore.components.find(c => c.id === activeCompId.value) || null
)
const activeMethod = computed(() =>
  activeComp.value?.methods.find(m => m.id === activeMethodId.value) || null
)

// Code preview — pass registry agar codegen step berjalan penuh
const previewCode = computed(() =>
  activeComp.value
    ? generateComponentFile(activeComp.value, registry)
    : '// Pilih component'
)

const { highlight } = useCodeHighlight()
const highlightedPreview = computed(() => highlight(previewCode.value))

// Copy
const copied = ref(false)
async function copyPreview() {
  try {
    await navigator.clipboard.writeText(previewCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch { /* ignore */ }
}

// ── Component actions ─────────────────────────────────────────────
function addComponent() {
  const name = prompt('Nama class component (PascalCase, misal: Checkout):')
  if (!name?.trim()) return
  const comp = compStore.addComponent(name.trim())
  activeCompId.value   = comp.id
  activeMethodId.value = null
}

function removeComponent(id) {
  if (!confirm('Hapus component ini? Semua blok terkait akan hilang dari palette.')) return
  compStore.removeComponent(id)
  activeCompId.value   = compStore.components[0]?.id || null
  activeMethodId.value = null
}

function startEditName(comp) {
  draftName.value  = comp.name
  editingName.value = true
}

function saveCompName() {
  if (draftName.value.trim() && activeComp.value) {
    compStore.updateComponent(activeComp.value.id, {
      name:       draftName.value.trim(),
      exportName: draftName.value.trim().toUpperCase()
    })
  }
  editingName.value = false
}

// ── Method actions ─────────────────────────────────────────────────
function selectComp(id) {
  activeCompId.value   = id
  activeMethodId.value = null
}

function addMethod() {
  if (!activeCompId.value) return
  const name = prompt('Nama method (camelCase, misal: addToCart):')
  if (!name?.trim()) return
  const m = compStore.addMethod(activeCompId.value, name.trim())
  activeMethodId.value = m.id
}

function removeMethod(methodId) {
  compStore.removeMethod(activeCompId.value, methodId)
  if (activeMethodId.value === methodId) activeMethodId.value = null
}

// Inline edit nama method
const editingMethodId  = ref(null)
const draftMethodName  = ref('')

function startEditMethod(method, e) {
  e.stopPropagation()
  editingMethodId.value = method.id
  draftMethodName.value = method.name
}

function saveMethodName(methodId) {
  const newName = draftMethodName.value.trim()
  const oldName = activeMethod.value?.name
  if (newName && newName !== oldName && activeComp.value) {
    const compKey  = activeComp.value.name.toLowerCase()
    const oldBlockId = `comp.${compKey}.${oldName}`
    const newBlockId = `comp.${compKey}.${newName}`
    // Update method di store (processAndRegister otomatis di-call)
    compStore.updateMethod(activeCompId.value, methodId, { name: newName })
    // Update semua step di canvas yang pakai blockId lama
    canvas.renameStepBlockId(oldBlockId, newBlockId)
  }
  editingMethodId.value = null
}

// ── Parameter actions ──────────────────────────────────────────────
function addParam() {
  if (!activeMethod.value) return
  const name = prompt('Nama parameter (camelCase, misal: user):')
  if (name?.trim()) {
    compStore.addParam(activeCompId.value, activeMethodId.value, name.trim())
  }
}

function removeParam(paramName) {
  compStore.removeParam(activeCompId.value, activeMethodId.value, paramName)
}

// ── Param type dropdown ────────────────────────────────────────────

// Semua object entries dari dataRegistry (type === 'object' && fields != null)
const dataObjectOptions = computed(() => {
  return dataReg.entries
    .filter(e => e.type === 'object' && e.fields?.length)
    .map(e => ({
      path:   e.path,
      fields: e.fields,
      group:  e.group,
      schema: { requiredFields: e.fields, description: `${e.path} object`, example: e.path }
    }))
})

// Nilai saat ini untuk satu param: 'string' | 'URL' | 'Account' | 'URL.login' | ...
function getParamValue(paramName) {
  const ps = activeMethod.value?.paramSchemas?.[paramName]
  if (!ps || ps.inputType === 'value') return 'string'
  // Cek apakah ini specific object (punya path di schema.example)
  if (ps.schema?.example) return ps.schema.example
  return ps.inputType
}

function getParamDisplayLabel(paramName) {
  return getParamValue(paramName)
}

// Param type dropdown state — satu dropdown per param (pakai paramName sebagai key)
const openParamDropdown = ref(null)   // nama param yang dropdownnya terbuka
const paramDropStyle    = ref({})
const paramTriggerRefs  = ref({})     // { [paramName]: el }

function toggleParamDropdown(paramName, event) {
  event.stopPropagation()
  if (openParamDropdown.value === paramName) {
    openParamDropdown.value = null
    return
  }
  openParamDropdown.value = paramName
  nextTick(() => {
    const el = paramTriggerRefs.value[paramName]
    if (!el) return
    const rect = el.getBoundingClientRect()
    paramDropStyle.value = {
      top:   `${rect.bottom + window.scrollY}px`,
      left:  `${rect.left  + window.scrollX}px`,
      minWidth: `140px`
    }
  })
}

function closeParamDropdown() {
  openParamDropdown.value = null
}

function onParamDropdownOutside(e) {
  if (!e.target.closest('.ptd-trigger') && !e.target.closest('.ptd-dropdown')) {
    closeParamDropdown()
  }
}

watch(openParamDropdown, (val) => {
  if (val) document.addEventListener('click', onParamDropdownOutside)
  else     document.removeEventListener('click', onParamDropdownOutside)
})

function selectParamType(paramName, choice) {
  // choice: 'string' | 'dataref' | path dari object (misal 'URL.login')
  if (choice === 'string') {
    compStore.setParamSchema(activeCompId.value, activeMethodId.value, paramName, 'value', null)
  } else if (choice === 'dataref') {
    compStore.setParamSchema(activeCompId.value, activeMethodId.value, paramName, 'dataref', null)
  } else {
    // Specific object — cari dari dataObjectOptions
    const obj = dataObjectOptions.value.find(o => o.path === choice)
    if (obj) {
      compStore.setParamSchema(activeCompId.value, activeMethodId.value, paramName, 'dataref', obj.schema)
    }
  }
  closeParamDropdown()
}

function getParamSchema(paramName) {
  return activeMethod.value?.paramSchemas?.[paramName] || null
}

// Computed: extraVars dengan schema untuk StepCard
const methodParamsWithSchema = computed(() => {
  if (!activeMethod.value) return []
  return activeMethod.value.params.map(name => {
    const ps = activeMethod.value.paramSchemas?.[name]
    return {
      varName:   name,
      label:     name,
      inputType: ps?.inputType || 'value',
      schema:    ps?.schema    || null
    }
  })
})

// ── Step drag & drop dalam method ──────────────────────────────────
function onStepDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
  isDropOver.value = true
}

function onStepDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDropOver.value = false
  }
}

function onStepDrop(e) {
  e.preventDefault()
  isDropOver.value = false
  const blockId = e.dataTransfer.getData('text/plain')
  if (!blockId || !activeMethod.value) return
  compStore.addMethodStep(activeCompId.value, activeMethodId.value, blockId)
}

function removeStep(stepIdx) {
  compStore.removeMethodStep(activeCompId.value, activeMethodId.value, stepIdx)
}

function updateStepInput(stepIdx, fieldName, value) {
  compStore.updateMethodStepInputs(
    activeCompId.value,
    activeMethodId.value,
    stepIdx,
    { [fieldName]: value }
  )
}

function updateStepNote(stepIdx, note) {
  compStore.updateMethodStepNote(activeCompId.value, activeMethodId.value, stepIdx, note)
}

// Tab: 'builder' | 'preview'
const activeTab = ref('builder')
</script>

<template>
  <div :class="mode === 'panel' ? 'panel-root' : 'modal-overlay'" @click.self="mode === 'modal' && emit('close')">
    <div :class="mode === 'panel' ? 'panel-box' : 'modal'">

      <!-- Header -->
      <div class="modal-header">
        <span class="modal-title">📦 Component Builder</span>
        <div class="modal-tabs">
          <button :class="['mtab', { active: activeTab === 'builder' }]" @click="activeTab = 'builder'">Builder</button>
          <button :class="['mtab', { active: activeTab === 'preview' }]" @click="activeTab = 'preview'">Code Preview</button>
        </div>
        <button v-if="mode === 'modal'" class="modal-close" @click="emit('close')">×</button>
      </div>

      <!-- BUILDER TAB -->
      <div v-if="activeTab === 'builder'" class="modal-body four-col">

        <!-- Kolom 0: Mini Palette -->
        <div class="col-palette">
          <div class="col-title">🧩 Blok</div>
          <div class="palette-search-wrap">
            <input
              v-model="paletteSearch"
              class="palette-search-input"
              placeholder="Cari blok..."
            />
          </div>
          <div class="palette-scroll">
            <div
              v-for="cat in filteredPalette"
              :key="cat.id"
              class="mini-cat"
            >
              <button class="mini-cat-header" @click="toggleCat(cat.id)">
                <span>{{ cat.meta.icon }}</span>
                <span class="mini-cat-label">{{ cat.meta.label }}</span>
                <span class="mini-cat-count">{{ cat.blocks.length }}</span>
                <span class="mini-cat-arrow" :class="{ open: isCatOpen(cat.id) }">›</span>
              </button>
              <div v-show="isCatOpen(cat.id)" class="mini-cat-blocks">
                <div
                  v-for="block in cat.blocks"
                  :key="block.id"
                  class="mini-block"
                  :style="{ '--bc': block.color, '--bg': block.colorBg }"
                  draggable="true"
                  @dragstart="onPaletteDragStart($event, block)"
                  :title="block.description"
                >
                  <span class="mini-block-icon">{{ block.icon }}</span>
                  <span class="mini-block-label">{{ block.label }}</span>
                </div>
              </div>
            </div>
            <div v-if="filteredPalette.length === 0" class="palette-empty">
              Tidak ada blok
            </div>
          </div>
        </div>

        <!-- Kolom 1: Component list -->
        <div class="col-comps">
          <div class="col-title">Components</div>

          <div
            v-for="comp in compStore.components"
            :key="comp.id"
            :class="['comp-item', { active: activeCompId === comp.id }]"
            @click="selectComp(comp.id)"
          >
            <span class="comp-icon">📦</span>
            <div class="comp-meta">
              <span class="comp-name">{{ comp.name }}</span>
              <span class="comp-export">{{ comp.exportName }}</span>
            </div>
            <button class="item-del" @click.stop="removeComponent(comp.id)">×</button>
          </div>

          <button class="add-btn" @click="addComponent">+ Component</button>

          <!-- Info blok yang di-generate -->
          <div class="palette-preview" v-if="activeComp">
            <div class="pp-title">Blok di Palette:</div>
            <div v-for="m in activeComp.methods" :key="m.id" class="pp-block">
              📦 {{ activeComp.exportName }}.{{ m.name }}
            </div>
            <div v-if="!activeComp.methods.length" class="pp-empty">
              Tambah method untuk membuat blok
            </div>
          </div>
        </div>

        <!-- Kolom 2: Method list -->
        <div class="col-methods" v-if="activeComp">
          <!-- Component name header -->
          <div class="col-title">
            <template v-if="!editingName">
              <span class="comp-title-name" @dblclick="startEditName(activeComp)">
                class {{ activeComp.name }}
              </span>
              <span class="comp-title-export">{{ activeComp.exportName }}</span>
            </template>
            <input
              v-else v-model="draftName"
              class="name-input"
              @blur="saveCompName"
              @keyup.enter="saveCompName"
              @keyup.escape="editingName = false"
              autofocus
            />
          </div>

          <div
            v-for="method in activeComp.methods"
            :key="method.id"
            :class="['method-item', { active: activeMethodId === method.id }]"
            @click="activeMethodId = method.id"
          >
            <div class="method-sig">
              <template v-if="editingMethodId === method.id">
                <input
                  v-model="draftMethodName"
                  class="method-name-input"
                  @blur="saveMethodName(method.id)"
                  @keyup.enter="saveMethodName(method.id)"
                  @keyup.escape="editingMethodId = null"
                  @click.stop
                  autofocus
                />
              </template>
              <template v-else>
                <span class="method-name" @dblclick="startEditMethod(method, $event)" title="Double-click untuk ubah nama">{{ method.name }}</span>
                <span class="method-params">({{ method.params.join(', ') || '' }})</span>
              </template>
            </div>
            <span class="method-count">{{ method.steps.length }} step</span>
            <button class="item-del" @click.stop="removeMethod(method.id)">×</button>
          </div>

          <div v-if="!activeComp.methods.length" class="empty-col-msg">
            Belum ada method. Tambah untuk mulai.
          </div>

          <button class="add-btn" @click="addMethod">+ Method</button>
        </div>

        <div class="col-methods empty-col" v-else>
          <div class="empty-hint">← Pilih atau buat component</div>
        </div>

        <!-- Kolom 3: Step builder -->
        <div class="col-steps" v-if="activeMethod">
          <div class="col-title">
            {{ activeComp?.exportName }}.{{ activeMethod.name }}()
            <div class="param-tags">
              <span
                v-for="p in activeMethod.params" :key="p"
                class="param-tag"
              >
                {{ p }}:
                <!-- Dropdown tipe param -->
                <button
                  :ref="el => { if (el) paramTriggerRefs[p] = el }"
                  class="ptd-trigger"
                  :class="{ active: openParamDropdown === p }"
                  @click="toggleParamDropdown(p, $event)"
                  :title="`Tipe param ${p}`"
                >{{ getParamDisplayLabel(p) }} ›</button>
                <button @click.stop="removeParam(p)" class="param-del">×</button>
              </span>
              <button class="param-add" @click="addParam">+ param</button>
            </div>
          </div>

          <!-- Param type dropdown — teleport ke body -->
          <Teleport to="body">
            <div
              v-if="openParamDropdown"
              class="ptd-dropdown"
              :style="paramDropStyle"
            >
              <!-- String -->
              <div class="ptd-option" :class="{ active: getParamValue(openParamDropdown) === 'string' }" @click="selectParamType(openParamDropdown, 'string')">
                <span class="ptd-icon">T</span>
                <span class="ptd-label">String</span>
                <span class="ptd-desc">nilai teks biasa</span>
              </div>

              <!-- Data Ref generik -->
              <!-- <div class="ptd-option" :class="{ active: getParamValue(openParamDropdown) === 'dataref' }" @click="selectParamType(openParamDropdown, 'dataref')">
                <span class="ptd-icon">🔗</span>
                <span class="ptd-label">Data Ref</span>
                <span class="ptd-desc">object apapun dari data</span>
              </div> -->

              <!-- Separator + list data objects -->
              <template v-if="dataObjectOptions.length">
                <div class="ptd-separator">Data Objects</div>
                <div
                  v-for="obj in dataObjectOptions"
                  :key="obj.path"
                  class="ptd-option ptd-option-obj"
                  :class="{ active: getParamValue(openParamDropdown) === obj.path }"
                  @click="selectParamType(openParamDropdown, obj.path)"
                >
                  <span class="ptd-icon">📦</span>
                  <div class="ptd-body">
                    <span class="ptd-label">{{ obj.path }}</span>
                    <span class="ptd-desc">{{ obj.fields.join(', ') }}</span>
                  </div>
                </div>
              </template>
              <div v-else class="ptd-empty">Belum ada data object. Buka Data Manager.</div>
            </div>
          </Teleport>

          <!-- Step list (drop target) -->
          <div
            class="step-list"
            :class="{ 'drop-active': isDropOver }"
            @dragover="onStepDragOver"
            @dragleave="onStepDragLeave"
            @drop="onStepDrop"
          >
            <StepCard
              v-for="(step, idx) in activeMethod.steps"
              :key="idx"
              :step="step"
              :index="idx"
              :editable="true"
              :draggable="false"
              :method-params="methodParamsWithSchema"
              @remove="removeStep(idx)"
              @update-input="(field, val) => updateStepInput(idx, field, val)"
              @update-note="(note) => updateStepNote(idx, note)"
            />

            <div
              v-if="!activeMethod.steps.length || isDropOver"
              class="drop-hint"
              :class="{ 'drop-hint--active': isDropOver }"
            >
              <span v-if="isDropOver">＋ Lepas untuk tambah step</span>
              <span v-else>Drag blok dari palette di kiri ke sini</span>
            </div>
            <div v-else-if="activeMethod.steps.length" class="drop-hint-small">
              <span>+ Drag blok untuk tambah step</span>
            </div>
          </div>

          <div class="step-hint">
            💡 Block ini akan di-generate sebagai method <code>{{ activeMethod.name }}()</code> di file <code>components/{{ activeComp?.name?.toLowerCase() }}.js</code>
          </div>
        </div>

        <div class="col-steps empty-col" v-else-if="activeComp">
          <div class="empty-hint">← Pilih atau buat method</div>
        </div>
        <div class="col-steps empty-col" v-else></div>

      </div>

      <!-- PREVIEW TAB -->
      <div v-else-if="activeTab === 'preview'" class="modal-body preview-body">
        <div class="preview-actions">
          <span class="preview-file">
            components/{{ activeComp?.name?.toLowerCase() || '?' }}.js
          </span>
          <button class="preview-copy" :class="{ done: copied }" @click="copyPreview">
            {{ copied ? '✓ Copied' : '⎘ Copy' }}
          </button>
        </div>
        <pre class="preview-code" v-html="highlightedPreview"></pre>
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
  width: 1060px; max-width: 97vw;
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
  display: flex; align-items: center; gap: 12px;
  padding: 0 16px; height: 46px;
  background: #0f1117; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.modal-title { font-size: 13px; font-weight: 700; color: #e2e8f0; margin-right: 8px; }
.modal-tabs  { display: flex; flex: 1; gap: 2px; }
.mtab {
  padding: 5px 12px; border-radius: 5px; border: none;
  font-size: 11px; font-weight: 600; cursor: pointer;
  color: #64748b; background: transparent; transition: all 0.15s;
}
.mtab.active { background: rgba(236,72,153,0.1); color: #ec4899; }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 20px; line-height: 1; padding: 0; margin-left: auto;
}
.modal-close:hover { color: #e2e8f0; }

/* Body */
.modal-body  { flex: 1; overflow: hidden; display: flex; }
.four-col    { flex-direction: row; }

/* Columns */
.col-palette { width: 160px; min-width: 160px; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden; background: #0f1117; }
.col-comps   { width: 170px; min-width: 170px; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden; }
.col-methods { width: 190px; min-width: 190px; border-right: 1px solid #1e293b; display: flex; flex-direction: column; overflow: hidden; }
.col-steps   { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* Mini palette */
.palette-search-wrap { padding: 5px 7px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.palette-search-input {
  width: 100%; background: rgba(255,255,255,0.04); border: 1px solid #1e293b;
  border-radius: 4px; padding: 4px 7px; font-size: 10px; color: #e2e8f0;
  outline: none; transition: border-color 0.12s;
}
.palette-search-input:focus { border-color: #334155; }
.palette-scroll { flex: 1; overflow-y: auto; padding: 4px 0; }
.palette-empty  { font-size: 10px; color: #1e293b; padding: 12px 10px; text-align: center; }

.mini-cat { margin-bottom: 2px; }
.mini-cat-header {
  width: 100%; display: flex; align-items: center; gap: 4px;
  padding: 4px 8px; background: none; border: none; cursor: pointer;
  color: #475569; transition: color 0.1s; text-align: left;
}
.mini-cat-header:hover { color: #64748b; }
.mini-cat-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; flex: 1; }
.mini-cat-count { font-size: 8px; color: #334155; background: rgba(255,255,255,0.04); border-radius: 8px; padding: 0 4px; }
.mini-cat-arrow { font-size: 12px; transition: transform 0.2s; display: inline-block; transform: rotate(90deg); }
.mini-cat-arrow.open { transform: rotate(90deg); }
.mini-cat-blocks { padding: 2px 4px 2px 8px; }

.mini-block {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 7px; border-radius: 5px;
  background: var(--bg); border: 1px solid transparent;
  cursor: grab; transition: border-color 0.12s;
  user-select: none; margin-bottom: 2px;
}
.mini-block:hover { border-color: var(--bc); }
.mini-block:active { cursor: grabbing; }
.mini-block-icon  { font-size: 10px; flex-shrink: 0; }
.mini-block-label {
  font-size: 9.5px; font-weight: 600; color: var(--bc);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.col-title {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  color: #475569; padding: 8px 12px 6px;
  border-bottom: 1px solid #1e293b; flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}
.comp-title-name  { color: #ec4899; font-size: 11px; text-transform: none; flex: 1; }
.comp-title-export{ font-size: 9px; color: #6b21a8; background: rgba(236,72,153,0.1); border-radius: 3px; padding: 1px 5px; text-transform: none; letter-spacing: 0; }
.name-input {
  flex: 1; background: rgba(236,72,153,0.1); border: 1px solid #ec4899;
  border-radius: 4px; padding: 2px 6px; font-size: 11px; color: #e2e8f0; outline: none;
  text-transform: none;
}

/* Component items */
.comp-item, .method-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; cursor: pointer;
  transition: background 0.1s; border-radius: 4px; margin: 2px 4px;
}
.comp-item:hover, .method-item:hover { background: rgba(255,255,255,0.03); }
.comp-item.active  { background: rgba(236,72,153,0.08); }
.method-item.active{ background: rgba(236,72,153,0.08); }
.comp-item:hover .item-del, .method-item:hover .item-del { opacity: 1; }

.comp-icon  { font-size: 13px; flex-shrink: 0; }
.comp-meta  { flex: 1; min-width: 0; }
.comp-name  { display: block; font-size: 11px; font-weight: 600; color: #f472b6; }
.comp-export{ display: block; font-size: 9px; color: #6b21a8; font-family: monospace; }

.method-sig { flex: 1; min-width: 0; overflow: hidden; }
.method-name{ font-size: 10.5px; font-weight: 600; color: #6ee7b7; font-family: monospace; }
.method-params { font-size: 9.5px; color: #475569; font-family: monospace; }
.method-count {
  font-size: 8.5px; color: #334155;
  background: rgba(255,255,255,0.04); border-radius: 8px; padding: 1px 5px; flex-shrink: 0;
}

.item-del {
  background: none; border: none; cursor: pointer;
  color: #334155; font-size: 14px; line-height: 1; padding: 0 2px;
  opacity: 0; transition: opacity 0.1s, color 0.1s; flex-shrink: 0;
}
.item-del.small { font-size: 12px; }
.item-del:hover { color: #ef4444; opacity: 1 !important; }

.add-btn {
  margin: 6px 8px 4px;
  background: none; border: 1px dashed #1e293b;
  border-radius: 5px; padding: 5px 10px;
  font-size: 10px; color: #334155; cursor: pointer;
  transition: all 0.15s; text-align: left;
}
.add-btn:hover { border-color: #334155; color: #64748b; }

/* Palette preview */
.palette-preview {
  margin: 8px 8px 0;
  padding: 8px; background: rgba(236,72,153,0.04);
  border: 1px solid rgba(236,72,153,0.15); border-radius: 6px;
}
.pp-title { font-size: 9px; color: #475569; margin-bottom: 5px; font-weight: 700; }
.pp-block { font-size: 9.5px; color: #f472b6; font-family: monospace; padding: 2px 0; }
.pp-empty { font-size: 9px; color: #334155; }

/* Params */
.param-tags  { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-left: 6px; }
.param-tag {
  font-size: 9px; background: rgba(16,185,129,0.1); color: #10b981;
  border-radius: 3px; padding: 1px 5px; display: flex; align-items: center; gap: 3px;
  font-family: monospace;
}
.param-del { background: none; border: none; cursor: pointer; color: #10b981; font-size: 10px; padding: 0; }

/* Param type trigger button */
.ptd-trigger {
  background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
  border-radius: 3px; color: #6ee7b7; font-size: 8px; padding: 1px 4px;
  cursor: pointer; font-family: monospace; white-space: nowrap;
  max-width: 80px; overflow: hidden; text-overflow: ellipsis;
  transition: border-color 0.1s;
}
.ptd-trigger:hover, .ptd-trigger.active { border-color: rgba(16,185,129,0.5); background: rgba(16,185,129,0.14); }

/* Param type dropdown */
.ptd-dropdown {
  position: fixed; z-index: 9999;
  background: #111827; border: 1px solid #1e293b;
  border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  min-width: 180px; padding: 4px 0;
  overflow: hidden;
}
.ptd-option {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 10px; cursor: pointer;
  transition: background 0.1s;
}
.ptd-option:hover    { background: rgba(255,255,255,0.04); }
.ptd-option.active   { background: rgba(16,185,129,0.08); }
.ptd-option-obj      { padding-left: 10px; }
.ptd-icon {
  font-size: 10px; width: 14px; text-align: center;
  color: #10b981; font-weight: 700; flex-shrink: 0;
}
.ptd-body { display: flex; flex-direction: column; min-width: 0; }
.ptd-label {
  font-size: 10px; font-weight: 600; color: #e2e8f0;
  font-family: monospace;
}
.ptd-option-obj .ptd-label { color: #38bdf8; font-size: 10px; }
.ptd-desc {
  font-size: 8.5px; color: #334155;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ptd-separator {
  font-size: 8px; font-weight: 700; color: #334155;
  padding: 6px 10px 2px; text-transform: uppercase; letter-spacing: 0.06em;
  border-top: 1px solid #1e293b; margin-top: 2px;
}
.ptd-empty { font-size: 9px; color: #334155; padding: 8px 10px; text-align: center; }
.param-add {
  font-size: 9px; background: none; border: 1px dashed rgba(16,185,129,0.3);
  border-radius: 3px; padding: 1px 5px; color: #10b981; cursor: pointer;
}

/* Steps */
.step-list {
  flex: 1; overflow-y: auto; padding: 8px 12px;
  min-height: 80px;
}
/* Inline edit nama method */
.method-name-input {
  flex: 1; background: rgba(255,255,255,0.05);
  border: 1px solid #334155; border-radius: 3px;
  padding: 1px 5px; font-size: 10.5px; font-weight: 600;
  color: #6ee7b7; font-family: monospace; outline: none;
}

.drop-hint, .drop-hint-small {
  text-align: center; padding: 10px 8px;
  border: 1px dashed #1e293b; border-radius: 5px;
  transition: border-color 0.15s, background 0.15s;
}
.drop-hint span, .drop-hint-small span { font-size: 10px; color: #374151; }
.drop-hint-small { margin-top: 4px; }
.drop-hint--active {
  border-color: #ec4899;
  background: rgba(236,72,153,0.06);
}
.drop-hint--active span { color: #ec4899; font-weight: 600; }

.step-list.drop-active { background: rgba(236,72,153,0.03); }

.step-hint {
  padding: 8px 12px; border-top: 1px solid #1e293b; flex-shrink: 0;
  font-size: 9.5px; color: #374151; line-height: 1.5;
}
.step-hint code {
  font-family: monospace; background: rgba(255,255,255,0.05);
  padding: 1px 4px; border-radius: 3px; font-size: 9px; color: #94a3b8;
}

.empty-col     { align-items: center; justify-content: center; }
.empty-hint    { font-size: 11px; color: #1e293b; }
.empty-col-msg { font-size: 10px; color: #374151; text-align: center; padding: 16px 12px; }

/* Preview tab */
.preview-body { flex-direction: column; background: #0a0d14; }
.preview-actions {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 36px;
  border-bottom: 1px solid #1e293b; flex-shrink: 0;
  background: #111827;
}
.preview-file { font-family: monospace; font-size: 10px; color: #64748b; flex: 1; }
.preview-copy {
  padding: 3px 8px; font-size: 9.5px;
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
  border-radius: 4px; color: #6366f1; cursor: pointer; white-space: nowrap;
  transition: all 0.15s;
}
.preview-copy.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.preview-copy:hover:not(.done) { background: rgba(99,102,241,0.2); }
.preview-code {
  flex: 1; overflow: auto; margin: 0;
  padding: 12px 16px;
  font-family: 'SF Mono','Fira Code','Consolas',monospace; font-size: 10px;
  line-height: 1.75; color: #94a3b8;
  white-space: pre; background: #0a0d14;
}
/* Syntax token colors — identik dengan canvas CodePreview */
.preview-code :deep(.cm)       { color: #334155; font-style: italic; }
.preview-code :deep(.kw)       { color: #c084fc; }
.preview-code :deep(.str)      { color: #fbbf24; }
.preview-code :deep(.fn)       { color: #6ee7b7; }
.preview-code :deep(.obj)      { color: #6ee7b7; }
.preview-code :deep(.data)     { color: #38bdf8; }
.preview-code :deep(.data-key) { color: #7dd3fc; }
</style>
