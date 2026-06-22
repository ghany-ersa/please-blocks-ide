<script setup>
/**
 * ImportModal.vue — Reverse Codegen
 * Tempel atau muat file `.spec.js`, parse jadi struktur canvas, tampilkan
 * preview + warning, lalu impor ke canvas (replace atau append).
 */
import { ref, computed } from 'vue'
import { useCanvasStore }   from '@/model/stores/canvasStore.js'
import { useBlockRegistry } from '@/model/stores/blockRegistry.js'
import { parseSpec }        from '@/model/core/codegen/specParser.js'

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
            placeholder="describe('Login', () => {&#10;  it('login berhasil', async () => {&#10;    await please.goto(URL.login)&#10;  })&#10;})"
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
  background: var(--color-black);
  display: flex; align-items: center; justify-content: center;
  z-index: var(--z-modal);
}
.modal {
  width: 900px; max-width: 96vw;
  height: 640px; max-height: 92vh;
  background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-2xl); display: flex; flex-direction: column;
  overflow: hidden; box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex; align-items: center; gap: var(--space-2-5);
  padding: 0 var(--space-4); height: 46px;
  background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.modal-title { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text-primary); }
.hint        { font-size: var(--text-sm); color: var(--color-text-faint); }
.modal-actions { flex: 1; display: flex; justify-content: flex-end; }
.btn-file {
  padding: var(--pad-btn-y) 14px; border-radius: var(--radius-md); cursor: pointer;
  background: var(--color-primary-bg); border: 1px solid rgba(99,102,241,0.3);
  color: var(--color-primary-light); font-size: var(--text-base); font-weight: var(--font-semibold); transition: all var(--transition-base);
}
.btn-file:hover { background: rgba(99,102,241,0.25); }
.modal-close { background: none; border: none; cursor: pointer; color: var(--color-text-faint); font-size: var(--text-icon); line-height: var(--leading-none); padding: 0; }
.modal-close:hover { color: var(--color-text-primary); }

/* Body: dua kolom */
.body { flex: 1; display: flex; min-height: 0; }
.pane { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.source-pane { border-right: 1px solid var(--color-border-subtle); }
.pane-label {
  font-size: var(--text-xs); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: var(--tracking-widest);
  color: var(--color-text-dimmed); padding: 6px var(--space-3); background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0; display: flex; align-items: center; gap: var(--space-2);
}
.stat-chip { font-size: var(--text-xs); color: var(--color-primary-light); background: var(--color-primary-bg); padding: 1px 7px; border-radius: 8px; text-transform: none; letter-spacing: 0; }

.source-input {
  flex: 1; resize: none; border: none; outline: none;
  background: var(--color-bg-deepest); color: var(--color-text-secondary);
  font-family: var(--font-mono); font-size: var(--text-base); line-height: var(--leading-relaxed);
  padding: var(--space-3) 14px;
}

/* Preview */
.preview-scroll { flex: 1; overflow: auto; padding: var(--space-2-5) var(--space-3); }
.empty { font-size: var(--text-base); color: var(--color-text-faint); padding: 20px 4px; text-align: center; }

.feat { margin-bottom: var(--space-3); }
.feat-label { font-size: var(--text-base); font-weight: var(--font-bold); color: var(--color-primary-light); margin-bottom: var(--space-1); }
.tc { margin: var(--space-1) 0 6px var(--space-2); }
.tc-label { font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--color-warning); margin-bottom: 3px; }
.step {
  display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap;
  font-size: var(--text-sm); color: var(--color-text-secondary); padding: 2px var(--space-2); margin-left: var(--space-2-5);
  border-left: 2px solid var(--color-border-subtle);
}
.step.raw { border-left-color: var(--color-warning); color: var(--color-warning-text); }
.step-block { font-family: monospace; }
.step-note  { font-size: var(--text-xs); color: var(--color-text-muted); font-style: italic; }

.warnings { margin-top: var(--space-2-5); border-top: 1px dashed var(--color-border-subtle); padding-top: var(--space-2); }
.warn-head { font-size: var(--text-sm); font-weight: var(--font-bold); color: var(--color-warning); margin-bottom: var(--space-1); }
.warn-item { font-size: 11.5px; color: var(--color-warning-muted); font-family: monospace; padding: 1px 0; word-break: break-all; }

/* Footer */
.modal-footer {
  display: flex; align-items: center; gap: var(--space-2-5);
  padding: var(--space-2) var(--space-4); background: var(--color-bg-deepest);
  border-top: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.spacer { flex: 1; }
.replace-toggle {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--text-sm); color: var(--color-text-muted); cursor: pointer; user-select: none;
}
.replace-toggle.on { color: var(--color-danger); }
.raw-note { font-size: var(--text-xs); color: var(--color-warning); }
.btn-cancel {
  padding: var(--pad-btn-y) 14px; border-radius: var(--radius-md); cursor: pointer;
  background: transparent; border: 1px solid var(--color-border-subtle); color: var(--color-text-muted); font-size: var(--text-base);
}
.btn-cancel:hover { color: var(--color-text-secondary); border-color: var(--color-border-default); }
.btn-import {
  padding: var(--pad-btn-y) var(--space-4); border-radius: var(--radius-md); cursor: pointer;
  background: var(--color-success-bg); border: 1px solid var(--color-success-border);
  color: var(--color-success-light); font-size: var(--text-base); font-weight: var(--font-bold); transition: all var(--transition-base);
}
.btn-import:hover:not(:disabled) { background: rgba(16,185,129,0.25); }
.btn-import:disabled { opacity: 0.4; cursor: default; }
</style>
