<script setup>
/**
 * ImportModal.vue — Reverse Codegen
 * Tempel atau muat file `.spec.js`, parse jadi struktur canvas, tampilkan
 * preview + warning, lalu impor ke canvas (replace atau append).
 */
import { ref, computed } from 'vue'
import { useCanvasStore }   from '@/stores/canvasStore.js'
import { useBlockRegistry } from '@/stores/blockRegistry.js'
import { parseSpec }        from '@/core/codegen/specParser.js'

const emit = defineEmits(['close'])

const canvas   = useCanvasStore()
const registry = useBlockRegistry()

const source   = ref('')
const replace  = ref(false)
const fileInput = ref(null)

// Parse reaktif tiap kali source berubah
const result = computed(() => {
  if (!source.value.trim()) return { features: [], warnings: [] }
  try {
    return parseSpec(source.value, { blockRegistry: registry })
  } catch (err) {
    return { features: [], warnings: [`Gagal parse: ${err.message}`] }
  }
})

const stats = computed(() => {
  const features = result.value.features
  let tc = 0, steps = 0, raw = 0
  for (const f of features) {
    tc += f.testCases.length
    for (const c of f.testCases) {
      steps += c.steps.length
      raw += c.steps.filter(s => s.blockId === 'util.rawCode').length
    }
  }
  return { features: features.length, testCases: tc, steps, raw }
})

const canImport = computed(() => result.value.features.length > 0)

function loadFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { source.value = String(reader.result || '') }
  reader.readAsText(file)
}

function doImport() {
  if (!canImport.value) return
  canvas.importFeatures(result.value.features, {
    blockRegistry: registry,
    replace: replace.value
  })
  emit('close')
}

// Label blok untuk preview (fallback ke blockId mentah)
function blockLabel(blockId) {
  const b = registry.getById(blockId)
  return b ? `${b.icon || ''} ${b.label}`.trim() : blockId
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">

      <div class="modal-header">
        <span class="modal-title">📥 Import Spec</span>
        <span class="hint">Tempel kode .spec.js atau muat file</span>
        <div class="modal-actions">
          <button class="btn-file" @click="fileInput.click()">⬆ Muat File</button>
          <input ref="fileInput" type="file" accept=".js,.spec.js" hidden @change="loadFile" />
        </div>
        <button class="modal-close" @click="emit('close')">×</button>
      </div>

      <div class="body">
        <!-- Editor sumber -->
        <div class="pane source-pane">
          <div class="pane-label">Kode .spec.js</div>
          <textarea
            v-model="source"
            class="source-input"
            spellcheck="false"
            placeholder="describe('Login', () => {&#10;  it('login berhasil', async () => {&#10;    await please.goTo(URL.login)&#10;  })&#10;})"
          ></textarea>
        </div>

        <!-- Preview hasil parse -->
        <div class="pane preview-pane">
          <div class="pane-label">
            Preview
            <span v-if="canImport" class="stat-chip">
              {{ stats.features }} feature · {{ stats.testCases }} TC · {{ stats.steps }} step
            </span>
          </div>

          <div class="preview-scroll">
            <p v-if="!source.trim()" class="empty">Tempel atau muat kode untuk melihat preview.</p>
            <p v-else-if="!canImport" class="empty">Tidak ada feature yang bisa diimpor.</p>

            <div v-for="(f, fi) in result.features" :key="fi" class="feat">
              <div class="feat-label">🧩 {{ f.label }}</div>
              <div v-for="(tc, ti) in f.testCases" :key="ti" class="tc">
                <div class="tc-label">🧪 {{ tc.label }}</div>
                <div
                  v-for="(s, si) in tc.steps"
                  :key="si"
                  class="step"
                  :class="{ raw: s.blockId === 'util.rawCode' }"
                >
                  <span class="step-block">{{ blockLabel(s.blockId) }}</span>
                  <span v-if="s.note" class="step-note">📝 {{ s.note }}</span>
                </div>
              </div>
            </div>

            <!-- Warnings -->
            <div v-if="result.warnings.length" class="warnings">
              <div class="warn-head">⚠ {{ result.warnings.length }} peringatan</div>
              <div v-for="(w, wi) in result.warnings" :key="wi" class="warn-item">{{ w }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <label class="replace-toggle" :class="{ on: replace }">
          <input type="checkbox" v-model="replace" />
          {{ replace ? 'Ganti seluruh canvas' : 'Tambah ke canvas' }}
        </label>
        <span v-if="stats.raw" class="raw-note">{{ stats.raw }} baris jadi Raw Code</span>
        <span class="spacer"></span>
        <button class="btn-cancel" @click="emit('close')">Batal</button>
        <button class="btn-import" :disabled="!canImport" @click="doImport">
          📥 Import {{ canImport ? `(${stats.steps} step)` : '' }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  width: 900px; max-width: 96vw;
  height: 640px; max-height: 92vh;
  background: #111827; border: 1px solid #1e293b;
  border-radius: 12px; display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
}

.modal-header {
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px; height: 46px;
  background: #0f1117; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.modal-title { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.hint        { font-size: 10px; color: #475569; }
.modal-actions { flex: 1; display: flex; justify-content: flex-end; }
.btn-file {
  padding: 5px 14px; border-radius: 5px; cursor: pointer;
  background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
  color: #818cf8; font-size: 11px; font-weight: 600; transition: all 0.15s;
}
.btn-file:hover { background: rgba(99,102,241,0.25); }
.modal-close { background: none; border: none; cursor: pointer; color: #475569; font-size: 20px; line-height: 1; padding: 0; }
.modal-close:hover { color: #e2e8f0; }

/* Body: dua kolom */
.body { flex: 1; display: flex; min-height: 0; }
.pane { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.source-pane { border-right: 1px solid #1e293b; }
.pane-label {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: #334155; padding: 6px 12px; background: #0f1117; border-bottom: 1px solid #1e293b;
  flex-shrink: 0; display: flex; align-items: center; gap: 8px;
}
.stat-chip { font-size: 9px; color: #818cf8; background: rgba(99,102,241,0.12); padding: 1px 7px; border-radius: 8px; text-transform: none; letter-spacing: 0; }

.source-input {
  flex: 1; resize: none; border: none; outline: none;
  background: #0a0d14; color: #94a3b8;
  font-family: 'SF Mono','Fira Code',monospace; font-size: 11px; line-height: 1.7;
  padding: 12px 14px;
}

/* Preview */
.preview-scroll { flex: 1; overflow: auto; padding: 10px 12px; }
.empty { font-size: 11px; color: #475569; padding: 20px 4px; text-align: center; }

.feat { margin-bottom: 12px; }
.feat-label { font-size: 11px; font-weight: 700; color: #818cf8; margin-bottom: 4px; }
.tc { margin: 4px 0 6px 8px; }
.tc-label { font-size: 10px; font-weight: 600; color: #f59e0b; margin-bottom: 3px; }
.step {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 10px; color: #94a3b8; padding: 2px 8px; margin-left: 10px;
  border-left: 2px solid #1e293b;
}
.step.raw { border-left-color: #f59e0b; color: #fbbf24; }
.step-block { font-family: monospace; }
.step-note  { font-size: 9px; color: #64748b; font-style: italic; }

.warnings { margin-top: 10px; border-top: 1px dashed #1e293b; padding-top: 8px; }
.warn-head { font-size: 10px; font-weight: 700; color: #f59e0b; margin-bottom: 4px; }
.warn-item { font-size: 9.5px; color: #94734b; font-family: monospace; padding: 1px 0; word-break: break-all; }

/* Footer */
.modal-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; background: #0a0d14;
  border-top: 1px solid #1e293b; flex-shrink: 0;
}
.spacer { flex: 1; }
.replace-toggle {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; color: #64748b; cursor: pointer; user-select: none;
}
.replace-toggle.on { color: #ef4444; }
.raw-note { font-size: 9px; color: #f59e0b; }
.btn-cancel {
  padding: 5px 14px; border-radius: 5px; cursor: pointer;
  background: transparent; border: 1px solid #1e293b; color: #64748b; font-size: 11px;
}
.btn-cancel:hover { color: #94a3b8; border-color: #334155; }
.btn-import {
  padding: 5px 16px; border-radius: 5px; cursor: pointer;
  background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3);
  color: #34d399; font-size: 11px; font-weight: 700; transition: all 0.15s;
}
.btn-import:hover:not(:disabled) { background: rgba(16,185,129,0.25); }
.btn-import:disabled { opacity: 0.4; cursor: default; }
</style>
