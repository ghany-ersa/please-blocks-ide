<script setup>
/**
 * ProjectImportModal.vue — Import by Project (Reverse Codegen)
 * Menyisipkan isi project LAIN ke workspace yang sedang aktif.
 * TIDAK mengubah folder workspace (projectPath). Default: gabung (merge);
 * opsi "ganti" untuk menimpa canvas/data/component aktif.
 */
import { ref } from 'vue'
import DirectoryPicker     from '@/components/shared/DirectoryPicker.vue'
import { useProjectImport } from '@/composables/useProjectImport.js'

const emit = defineEmits(['close'])

const showPicker = ref(false)
const {
  projectPath, loading, error, replace, analysis,
  serverOk, summary, canImport,
  load, doImport, blockLabel
} = useProjectImport()

async function onSelectFolder(path) {
  showPicker.value = false
  await load(path)
}

function confirmImport() {
  if (doImport()) emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">

      <div class="modal-header">
        <span class="modal-title">📁 Import Project</span>
        <span class="hint">Rekonstruksi canvas + data + components dari folder project</span>
        <button class="modal-close" @click="emit('close')">×</button>
      </div>

      <!-- Folder picker bar -->
      <div class="path-bar">
        <span class="path-label">Folder project</span>
        <code class="path-value" :class="{ empty: !projectPath }">
          {{ projectPath || 'Belum dipilih' }}
        </code>
        <button class="btn-pick" :disabled="!serverOk" @click="showPicker = true">
          {{ projectPath ? 'Ganti' : 'Pilih Folder' }}
        </button>
        <button v-if="projectPath" class="btn-reload" :disabled="loading" @click="load">
          {{ loading ? '⏳' : '↻' }}
        </button>
      </div>

      <div v-if="!serverOk" class="server-warn">
        ⚠ Server tidak aktif — Import Project memerlukan server lokal untuk membaca folder.
      </div>

      <div class="body">
        <p v-if="loading" class="state">⏳ Membaca project…</p>
        <p v-else-if="error" class="state err">⚠ {{ error }}</p>
        <p v-else-if="!analysis" class="state">Pilih folder project untuk melihat preview.</p>

        <template v-else>
          <!-- Ringkasan -->
          <div class="summary">
            <span class="chip">{{ summary.features }} feature</span>
            <span class="chip">{{ summary.testCases }} TC</span>
            <span class="chip">{{ summary.steps }} step</span>
            <span class="chip data">{{ summary.dataFiles }} data file</span>
            <span class="chip comp">{{ summary.components }} component</span>
            <span v-if="summary.rawCode" class="chip raw">{{ summary.rawCode }} raw code</span>
          </div>

          <div class="cols">
            <!-- Features -->
            <div class="col">
              <div class="col-label">Canvas</div>
              <div class="col-scroll">
                <div v-for="(f, fi) in analysis.features" :key="fi" class="feat">
                  <div class="feat-label">🧩 {{ f.label }} <span v-if="f.enabled === false" class="off">⏸</span></div>
                  <div v-for="(tc, ti) in f.testCases" :key="ti" class="tc">
                    <div class="tc-label">🧪 {{ tc.label }}</div>
                    <div
                      v-for="(s, si) in tc.steps" :key="si"
                      class="step" :class="{ raw: s.blockId === 'util.rawCode' }"
                    >{{ blockLabel(s.blockId) }}</div>
                  </div>
                </div>
                <p v-if="!analysis.features.length" class="empty">Tidak ada feature.</p>
              </div>
            </div>

            <!-- Data + Components -->
            <div class="col">
              <div class="col-label">Data &amp; Components</div>
              <div class="col-scroll">
                <div class="sub">DATA FILES</div>
                <div v-for="(f, k) in analysis.files" :key="k" class="data-file">
                  📊 {{ f.filename }}.js
                  <span class="muted">({{ Object.keys(f.groups).length }} group)</span>
                </div>
                <p v-if="!Object.keys(analysis.files).length" class="empty">—</p>

                <div class="sub" style="margin-top:8px">COMPONENTS</div>
                <div v-for="(c, ci) in analysis.components" :key="ci" class="data-file">
                  📦 {{ c.exportName }}
                  <span class="muted">({{ c.methods.length }} method)</span>
                </div>
                <p v-if="!analysis.components.length" class="empty">—</p>

                <div class="sub" style="margin-top:8px">ENV</div>
                <div v-for="(v, ek) in analysis.env" :key="ek" class="data-file env">
                  ⚙️ {{ ek }}
                </div>
                <p v-if="!Object.keys(analysis.env).length" class="empty">—</p>
              </div>
            </div>
          </div>

          <!-- Warnings -->
          <div v-if="analysis.warnings.length" class="warnings">
            <div class="warn-head">⚠ {{ analysis.warnings.length }} peringatan</div>
            <div class="warn-scroll">
              <div v-for="(w, wi) in analysis.warnings" :key="wi" class="warn-item">{{ w }}</div>
            </div>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <label class="replace-toggle" :class="{ on: replace }">
          <input type="checkbox" v-model="replace" />
          {{ replace ? 'Ganti seluruh project' : 'Gabung ke yang ada' }}
        </label>
        <span class="spacer"></span>
        <button class="btn-cancel" @click="emit('close')">Batal</button>
        <button class="btn-import" :disabled="!canImport" @click="confirmImport">
          📥 Import Project
        </button>
      </div>

    </div>

    <DirectoryPicker v-if="showPicker" @select="onSelectFolder" @close="showPicker = false" />
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
.hint        { font-size: var(--text-sm); color: var(--color-text-faint); flex: 1; }
.modal-close { background: none; border: none; cursor: pointer; color: var(--color-text-faint); font-size: var(--text-icon); line-height: var(--leading-none); padding: 0; }
.modal-close:hover { color: var(--color-text-primary); }

/* Path bar */
.path-bar {
  display: flex; align-items: center; gap: var(--space-2-5);
  padding: var(--space-2) var(--space-4); background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.path-label { font-size: var(--text-sm); color: var(--color-text-muted); }
.path-value { flex: 1; font-family: monospace; font-size: var(--text-sm); color: var(--syntax-data-key); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.path-value.empty { color: var(--color-text-faint); }
.btn-pick, .btn-reload {
  padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); cursor: pointer;
  background: var(--color-info-bg); border: 1px solid var(--color-info-border);
  color: var(--color-info-light); font-size: var(--text-sm); font-weight: var(--font-semibold);
}
.btn-pick:disabled { opacity: 0.4; cursor: default; }
.btn-reload { padding: var(--space-1) 9px; }

.server-warn { padding: 6px var(--space-4); font-size: var(--text-sm); color: var(--color-warning); background: var(--color-warning-bg); border-bottom: 1px solid var(--color-border-subtle); }

/* Body */
.body { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: var(--space-2-5) 14px; gap: var(--space-2); }
.state { font-size: var(--text-base); color: var(--color-text-muted); text-align: center; padding: 30px; }
.state.err { color: var(--color-danger); }

.summary { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.chip { font-size: var(--text-sm); color: var(--color-primary-light); background: var(--color-primary-bg); padding: 2px 9px; border-radius: 10px; }
.chip.data { color: var(--color-info-light); background: var(--color-info-bg); }
.chip.comp { color: var(--color-comp); background: var(--color-comp-bg); }
.chip.raw  { color: var(--color-warning); background: var(--color-warning-bg); }

.cols { flex: 1; display: flex; gap: var(--space-2); min-height: 0; }
.col { flex: 1; display: flex; flex-direction: column; min-width: 0; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); overflow: hidden; }
.col-label { font-size: var(--text-xs); font-weight: var(--font-bold); text-transform: uppercase; letter-spacing: var(--tracking-widest); color: var(--color-text-dimmed); padding: 5px var(--space-2-5); background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle); }
.col-scroll { flex: 1; overflow: auto; padding: var(--space-2) var(--space-2-5); }

.feat { margin-bottom: var(--space-2); }
.feat-label { font-size: var(--text-base); font-weight: var(--font-bold); color: var(--color-primary-light); }
.off { color: #4b5563; font-size: var(--text-xs); }
.tc { margin: 3px 0 5px var(--space-2); }
.tc-label { font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--color-warning); }
.step { font-size: var(--text-sm); color: var(--color-text-secondary); padding: 1px var(--space-2); margin-left: var(--space-2-5); border-left: 2px solid var(--color-border-subtle); font-family: monospace; }
.step.raw { border-left-color: var(--color-warning); color: var(--color-warning-text); }

.sub { font-size: 10.5px; font-weight: var(--font-bold); letter-spacing: var(--tracking-widest); color: var(--color-text-faint); }
.data-file { font-size: var(--text-sm); color: var(--color-text-secondary); padding: 2px 0; }
.data-file.env { color: var(--syntax-data-key); }
.muted { color: var(--color-text-faint); font-size: var(--text-xs); }
.empty { font-size: var(--text-sm); color: var(--color-text-faint); padding: 2px 0; }

.warnings { flex-shrink: 0; border-top: 1px dashed var(--color-border-subtle); padding-top: 6px; max-height: 110px; display: flex; flex-direction: column; }
.warn-head { font-size: var(--text-sm); font-weight: var(--font-bold); color: var(--color-warning); margin-bottom: 3px; }
.warn-scroll { overflow: auto; }
.warn-item { font-size: var(--text-xs); color: var(--color-warning-muted); font-family: monospace; padding: 1px 0; word-break: break-all; }

.modal-footer {
  display: flex; align-items: center; gap: var(--space-2-5);
  padding: var(--space-2) var(--space-4); background: var(--color-bg-deepest); border-top: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.spacer { flex: 1; }
.replace-toggle { display: flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--color-text-muted); cursor: pointer; user-select: none; }
.replace-toggle.on { color: var(--color-danger); }
.btn-cancel { padding: var(--pad-btn-y) 14px; border-radius: var(--radius-md); cursor: pointer; background: transparent; border: 1px solid var(--color-border-subtle); color: var(--color-text-muted); font-size: var(--text-base); }
.btn-cancel:hover { color: var(--color-text-secondary); border-color: var(--color-border-default); }
.btn-import { padding: var(--pad-btn-y) var(--space-4); border-radius: var(--radius-md); cursor: pointer; background: var(--color-success-bg); border: 1px solid var(--color-success-border); color: var(--color-success-light); font-size: var(--text-base); font-weight: var(--font-bold); }
.btn-import:hover:not(:disabled) { background: rgba(16,185,129,0.25); }
.btn-import:disabled { opacity: 0.4; cursor: default; }
</style>
