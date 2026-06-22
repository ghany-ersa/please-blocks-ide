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
    ? generateComponentFile(activeComp.value, registry, dataReg.entries)
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
  // Jika ini drag reorder antar-step, biarkan StepCard yang handle
  if (e.dataTransfer.types.includes('step-reorder')) return
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
  isDropOver.value = true
}

function onStepDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDropOver.value = false
  }
}

// Pesan penolakan drop (mis. nested component yang circular) — transient
const dropError = ref('')
let dropErrorTimer = null
function rejectDrop(msg) {
  dropError.value = msg
  clearTimeout(dropErrorTimer)
  dropErrorTimer = setTimeout(() => { dropError.value = '' }, 4000)
}

/** blockId method component → 'comp.<name>.<method>' (atau null jika bukan). */
function methodIdOf(blockId) {
  const parts = String(blockId).split('.')
  return parts[0] === 'comp' && parts.length >= 3 ? blockId : null
}

/** Node graf = blockId 'comp.<name>.<method>' → daftar method yang dipanggilnya. */
function methodCallees(methodNodeId) {
  const parts = methodNodeId.split('.')       // comp.<name>.<method>
  const comp = compStore.components.find(c => c.name.toLowerCase() === parts[1])
  const method = comp?.methods.find(m => m.name === parts.slice(2).join('.'))
  const out = []
  for (const s of method?.steps || []) {
    const id = methodIdOf(s.blockId)
    if (id) out.push(id)
  }
  return out
}

// nodeId method yang sedang aktif (tujuan drop): 'comp.<name>.<method>'
const activeMethodNodeId = computed(() =>
  activeComp.value && activeMethod.value
    ? `comp.${activeComp.value.name.toLowerCase()}.${activeMethod.value.name}`
    : null
)

/**
 * Apakah menambahkan pemanggilan ke `targetId` dari method `ownerId` membentuk
 * rekursi/siklus? DFS pada graf pemanggilan ANTAR-METHOD (lintas component juga):
 * - target == owner → rekursi langsung (method memanggil dirinya).
 * - dari target, bisa kembali ke owner → siklus tak langsung.
 * Pemanggilan ke method LAIN dalam class yang sama TETAP diizinkan.
 */
function wouldRecurse(ownerId, targetId) {
  if (targetId === ownerId) return true
  const seen = new Set()
  const stack = [targetId]
  while (stack.length) {
    const node = stack.pop()
    if (node === ownerId) return true
    if (seen.has(node)) continue
    seen.add(node)
    for (const callee of methodCallees(node)) stack.push(callee)
  }
  return false
}

function onStepDrop(e) {
  // Drop reorder sudah ditangani oleh StepCard (stopPropagation); lewati.
  if (e.dataTransfer.types.includes('step-reorder')) return
  e.preventDefault()
  isDropOver.value = false
  const blockId = e.dataTransfer.getData('text/plain')
  if (!blockId || !activeMethod.value) return

  // Pemanggilan method component (sekelas via this, atau component lain):
  // boleh, KECUALI menimbulkan rekursi/siklus.
  const targetId = methodIdOf(blockId)
  if (targetId && activeMethodNodeId.value && wouldRecurse(activeMethodNodeId.value, targetId)) {
    rejectDrop(targetId === activeMethodNodeId.value
      ? `Method "${activeMethod.value.name}" tidak boleh memanggil dirinya sendiri (rekursi).`
      : `Penyisipan ditolak: akan membentuk pemanggilan method yang melingkar (rekursi).`)
    return
  }

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

function moveStep(from, to) {
  compStore.moveMethodStep(activeCompId.value, activeMethodId.value, from, to)
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
          <!-- <div class="palette-preview" v-if="activeComp">
            <div class="pp-title">Blok di Palette:</div>
            <div v-for="m in activeComp.methods" :key="m.id" class="pp-block">
              📦 {{ activeComp.exportName }}.{{ m.name }}
            </div>
            <div v-if="!activeComp.methods.length" class="pp-empty">
              Tambah method untuk membuat blok
            </div>
          </div> -->
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
              :key="step.id || idx"
              :step="step"
              :index="idx"
              :editable="true"
              :draggable="true"
              :test-case-id="activeMethodId"
              :method-params="methodParamsWithSchema"
              @remove="removeStep(idx)"
              @update-input="(field, val) => updateStepInput(idx, field, val)"
              @update-note="(note) => updateStepNote(idx, note)"
              @reorder="(from, to) => moveStep(from, to)"
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

          <div v-if="dropError" class="drop-error">⚠ {{ dropError }}</div>

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
  background: var(--color-bg-scrim);
  display: flex; align-items: center; justify-content: center;
  z-index: var(--z-modal);
}
.modal {
  width: 1060px; max-width: 97vw;
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
  display: flex; align-items: center; gap: var(--space-3);
  padding: 0 var(--space-4); height: 46px;
  background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.modal-title { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text-primary); margin-right: var(--space-2); }
.modal-tabs  { display: flex; flex: 1; gap: 2px; }
.mtab {
  padding: var(--pad-btn-y) var(--pad-btn-x); border-radius: var(--radius-md); border: none;
  font-size: var(--text-base); font-weight: var(--font-semibold); cursor: pointer;
  color: var(--color-text-muted); background: transparent; transition: all var(--transition-base);
}
.mtab.active { background: var(--color-comp-bg); color: var(--color-comp); }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-faint); font-size: var(--text-icon); line-height: var(--leading-none); padding: 0; margin-left: auto;
}
.modal-close:hover { color: var(--color-text-primary); }

/* Body */
.modal-body  { flex: 1; overflow: hidden; display: flex; }
.four-col    { flex-direction: row; }

/* Columns */
.col-palette { width: 240px; min-width: 240px; border-right: 1px solid var(--color-border-subtle); display: flex; flex-direction: column; overflow: hidden; background: var(--color-bg-base); }
.col-comps   { width: 200px; min-width: 200px; border-right: 1px solid var(--color-border-subtle); display: flex; flex-direction: column; overflow: hidden; }
.col-methods { width: 200px; min-width: 200px; border-right: 1px solid var(--color-border-subtle); display: flex; flex-direction: column; overflow: hidden; }
.col-steps   { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* Mini palette */
.palette-search-wrap { padding: var(--pad-btn-y) 7px; border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0; }
.palette-search-input {
  width: 100%; background: var(--color-white-4); border: 1px solid var(--color-border-subtle);
  border-radius: 4px; padding: var(--space-1) 7px; font-size: var(--text-sm); color: var(--color-text-primary);
  outline: none; transition: border-color 0.12s;
}
.palette-search-input:focus { border-color: var(--color-border-default); }
.palette-scroll { flex: 1; overflow-y: auto; padding: var(--space-1) 0; }
.palette-empty  { font-size: var(--text-sm); color: var(--color-border-subtle); padding: var(--space-3) var(--space-2-5); text-align: center; }

.mini-cat { margin-bottom: 2px; }
.mini-cat-header {
  width: 100%; display: flex; align-items: center; gap: var(--space-1);
  padding: var(--space-1) var(--space-2); background: none; border: none; cursor: pointer;
  color: var(--color-text-faint); transition: color var(--transition-fast); text-align: left;
}
.mini-cat-header:hover { color: var(--color-text-muted); }
.mini-cat-label { font-size: var(--text-xs); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: var(--tracking-wider); flex: 1; }
.mini-cat-count { font-size: var(--text-2xs); color: var(--color-text-dimmed); background: var(--color-white-4); border-radius: 8px; padding: 0 var(--space-1); }
.mini-cat-arrow { font-size: 14px; transition: transform var(--transition-slow); display: inline-block; transform: rotate(90deg); }
.mini-cat-arrow.open { transform: rotate(90deg); }
.mini-cat-blocks { padding: 2px 4px 2px var(--space-2); }

.mini-block {
  display: flex; align-items: center; gap: 5px;
  padding: var(--space-1) 7px; border-radius: var(--radius-md);
  background: var(--bg); border: 1px solid transparent;
  cursor: grab; transition: border-color 0.12s;
  user-select: none; margin-bottom: 2px;
}
.mini-block:hover { border-color: var(--bc); }
.mini-block:active { cursor: grabbing; }
.mini-block-icon  { font-size: var(--text-sm); flex-shrink: 0; }
.mini-block-label {
  font-size: 11.5px; font-weight: var(--font-semibold); color: var(--bc);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.col-title {
  font-size: 11.5px; font-weight: var(--font-bold); letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--color-text-faint); padding: var(--pad-col-y) var(--pad-col-x) 6px;
  border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}
.comp-title-name  { color: var(--color-comp); font-size: var(--text-base); text-transform: none; flex: 1; }
.comp-title-export{ font-size: var(--text-xs); color: var(--color-purple-comp); background: var(--color-comp-bg); border-radius: var(--radius-sm); padding: var(--pad-badge-y) var(--pad-badge-x); text-transform: none; letter-spacing: 0; }
.name-input {
  flex: 1; background: var(--color-comp-bg); border: 1px solid var(--color-comp);
  border-radius: 4px; padding: 2px 6px; font-size: var(--text-base); color: var(--color-text-primary); outline: none;
  text-transform: none;
}

/* Component items */
.comp-item, .method-item {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--pad-item-y) var(--pad-item-x); cursor: pointer;
  transition: background var(--transition-fast); border-radius: 4px; margin: 2px 4px;
}
.comp-item:hover, .method-item:hover { background: var(--color-white-3); }
.comp-item.active  { background: var(--color-comp-bg); }
.method-item.active{ background: var(--color-comp-bg); }
.comp-item:hover .item-del, .method-item:hover .item-del { opacity: 1; }

.comp-icon  { font-size: var(--text-lg); flex-shrink: 0; }
.comp-meta  { flex: 1; min-width: 0; }
.comp-name  { display: block; font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--color-comp-light); }
.comp-export{ display: block; font-size: var(--text-xs); color: var(--color-purple-comp); font-family: monospace; }

.method-sig { flex: 1; min-width: 0; overflow: hidden; }
.method-name{ font-size: 12.5px; font-weight: var(--font-semibold); color: var(--color-success-lighter); font-family: monospace; }
.method-params { font-size: 11.5px; color: var(--color-text-faint); font-family: monospace; }
.method-count {
  font-size: 10.5px; color: var(--color-text-dimmed);
  background: var(--color-white-4); border-radius: 8px; padding: 1px 5px; flex-shrink: 0;
}

.item-del {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-dimmed); font-size: 16px; line-height: var(--leading-none); padding: 0 2px;
  opacity: 0; transition: opacity var(--transition-fast), color var(--transition-fast); flex-shrink: 0;
}
.item-del.small { font-size: 14px; }
.item-del:hover { color: var(--color-danger); opacity: 1 !important; }

.add-btn {
  margin: 6px 8px 4px;
  background: none; border: 1px dashed var(--color-border-subtle);
  border-radius: var(--radius-md); padding: var(--pad-btn-y) var(--space-2-5);
  font-size: var(--text-sm); color: var(--color-text-dimmed); cursor: pointer;
  transition: all var(--transition-base); text-align: left;
}
.add-btn:hover { border-color: var(--color-border-default); color: var(--color-text-muted); }

/* Palette preview */
.palette-preview {
  margin: var(--space-2) var(--space-2) 0;
  padding: var(--space-2); background: var(--color-comp-bg);
  border: 1px solid rgba(236,72,153,0.15); border-radius: var(--radius-lg);
}
.pp-title { font-size: var(--text-xs); color: var(--color-text-faint); margin-bottom: 5px; font-weight: var(--font-bold); }
.pp-block { font-size: 11.5px; color: var(--color-comp-light); font-family: monospace; padding: 2px 0; }
.pp-empty { font-size: var(--text-xs); color: var(--color-text-dimmed); }

/* Params */
.param-tags  { display: flex; align-items: center; gap: var(--space-1); flex-wrap: wrap; margin-left: 6px; }
.param-tag {
  font-size: var(--text-xs); background: var(--color-success-bg); color: var(--color-success);
  border-radius: var(--radius-sm); padding: var(--pad-badge-y) var(--pad-badge-x); display: flex; align-items: center; gap: 3px;
  font-family: monospace;
}
.param-del { background: none; border: none; cursor: pointer; color: var(--color-success); font-size: var(--text-sm); padding: 0; }

/* Param type trigger button */
.ptd-trigger {
  background: var(--color-success-bg); border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--radius-sm); color: var(--color-success-lighter); font-size: var(--text-2xs); padding: 1px 4px;
  cursor: pointer; font-family: monospace; white-space: nowrap;
  max-width: 80px; overflow: hidden; text-overflow: ellipsis;
  transition: border-color var(--transition-fast);
}
.ptd-trigger:hover, .ptd-trigger.active { border-color: var(--color-success-border); background: rgba(16,185,129,0.14); }

/* Param type dropdown */
.ptd-dropdown {
  position: fixed; z-index: var(--z-teleport);
  background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg); box-shadow: 0 8px 24px var(--color-black-50);
  min-width: 180px; padding: var(--space-1) 0;
  overflow: hidden;
}
.ptd-option {
  display: flex; align-items: center; gap: 7px;
  padding: var(--pad-btn-y) var(--space-2-5); cursor: pointer;
  transition: background var(--transition-fast);
}
.ptd-option:hover    { background: var(--color-white-4); }
.ptd-option.active   { background: var(--color-success-bg); }
.ptd-option-obj      { padding-left: var(--space-2-5); }
.ptd-icon {
  font-size: var(--text-sm); width: 14px; text-align: center;
  color: var(--color-success); font-weight: var(--font-bold); flex-shrink: 0;
}
.ptd-body { display: flex; flex-direction: column; min-width: 0; }
.ptd-label {
  font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--color-text-primary);
  font-family: monospace;
}
.ptd-option-obj .ptd-label { color: var(--color-info-light); font-size: var(--text-sm); }
.ptd-desc {
  font-size: 10.5px; color: var(--color-text-dimmed);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ptd-separator {
  font-size: var(--text-2xs); font-weight: var(--font-bold); color: var(--color-text-dimmed);
  padding: 6px var(--space-2-5) 2px; text-transform: uppercase; letter-spacing: var(--tracking-wider);
  border-top: 1px solid var(--color-border-subtle); margin-top: 2px;
}
.ptd-empty { font-size: var(--text-xs); color: var(--color-text-dimmed); padding: var(--space-2) var(--space-2-5); text-align: center; }
.param-add {
  font-size: var(--text-xs); background: none; border: 1px dashed var(--color-success-border);
  border-radius: var(--radius-sm); padding: var(--pad-badge-y) var(--pad-badge-x); color: var(--color-success); cursor: pointer;
}

/* Steps */
.step-list {
  flex: 1; overflow-y: auto; padding: var(--space-2) var(--space-3);
  min-height: 80px;
}
/* Inline edit nama method */
.method-name-input {
  flex: 1; background: var(--color-white-5);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-sm);
  padding: 1px 5px; font-size: 12.5px; font-weight: var(--font-semibold);
  color: var(--color-success-lighter); font-family: monospace; outline: none;
}

.drop-hint, .drop-hint-small {
  text-align: center; padding: var(--space-2-5) var(--space-2);
  border: 1px dashed var(--color-border-subtle); border-radius: var(--radius-md);
  transition: border-color var(--transition-base), background var(--transition-base);
}
.drop-hint span, .drop-hint-small span { font-size: var(--text-sm); color: var(--color-text-ghost); }
.drop-hint-small { margin-top: var(--space-1); }
.drop-hint--active {
  border-color: var(--color-comp);
  background: rgba(236,72,153,0.06);
}
.drop-hint--active span { color: var(--color-comp); font-weight: var(--font-semibold); }

.step-list.drop-active { background: rgba(236,72,153,0.03); }

.drop-error {
  margin: 6px var(--space-3) 0; padding: 6px var(--space-2-5); flex-shrink: 0;
  background: var(--color-danger-bg); border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-md); font-size: var(--text-sm); color: var(--color-danger-light);
}
.step-hint {
  padding: var(--space-2) var(--space-3); border-top: 1px solid var(--color-border-subtle); flex-shrink: 0;
  font-size: 11.5px; color: var(--color-text-ghost); line-height: var(--leading-normal);
}
.step-hint code {
  font-family: monospace; background: var(--color-white-5);
  padding: 1px 4px; border-radius: var(--radius-sm); font-size: var(--text-xs); color: var(--color-text-secondary);
}

.empty-col     { align-items: center; justify-content: center; }
.empty-hint    { font-size: var(--text-base); color: var(--color-border-subtle); }
.empty-col-msg { font-size: var(--text-sm); color: var(--color-text-ghost); text-align: center; padding: var(--space-4) var(--space-3); }

/* Preview tab */
.preview-body { flex-direction: column; background: var(--color-bg-deepest); }
.preview-actions {
  display: flex; align-items: center; gap: var(--space-2);
  padding: 0 var(--space-3); height: 36px;
  border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
  background: var(--color-bg-surface);
}
.preview-file { font-family: monospace; font-size: var(--text-sm); color: var(--color-text-muted); flex: 1; }
.preview-copy {
  padding: 3px var(--space-2); font-size: 11.5px;
  background: var(--color-primary-bg); border: 1px solid var(--color-primary-border);
  border-radius: 4px; color: var(--color-primary); cursor: pointer; white-space: nowrap;
  transition: all var(--transition-base);
}
.preview-copy.done { background: var(--color-success-bg); border-color: var(--color-success-border); color: var(--color-success); }
.preview-copy:hover:not(.done) { background: var(--color-primary-bg); }
.preview-code {
  flex: 1; overflow: auto; margin: 0;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-mono); font-size: var(--text-sm);
  line-height: 1.75; color: var(--color-text-secondary);
  white-space: pre; background: var(--color-bg-deepest);
}
/* Syntax token colors — identik dengan canvas CodePreview */
.preview-code :deep(.cm)       { color: var(--syntax-comment); font-style: italic; }
.preview-code :deep(.kw)       { color: var(--syntax-keyword); }
.preview-code :deep(.str)      { color: var(--syntax-string); }
.preview-code :deep(.fn)       { color: var(--syntax-function); }
.preview-code :deep(.obj)      { color: var(--syntax-function); }
.preview-code :deep(.data)     { color: var(--syntax-data); }
.preview-code :deep(.data-key) { color: var(--syntax-data-key); }
</style>
