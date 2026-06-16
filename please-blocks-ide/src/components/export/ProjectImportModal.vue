<script setup>
/**
 * ProjectImportModal.vue — Import by Project (Reverse Codegen)
 * Pilih folder project → baca via server → preview rekonstruksi penuh
 * (canvas + data + components) → konfirmasi import.
 */
import { ref, computed } from 'vue'
import DirectoryPicker      from '@/components/shared/DirectoryPicker.vue'
import { readProject }      from '@/services/runnerService.js'
import { analyzeProject, importProject } from '@/core/codegen/projectImporter.js'
import { useCanvasStore }    from '@/stores/canvasStore.js'
import { useBlockRegistry }  from '@/stores/blockRegistry.js'
import { useDataRegistry }   from '@/stores/dataRegistry.js'
import { useComponentStore } from '@/stores/componentStore.js'
import { useRunnerStore }    from '@/stores/runnerStore.js'

const emit = defineEmits(['close'])

const canvas    = useCanvasStore()
const registry  = useBlockRegistry()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()
const runner    = useRunnerStore()

const projectPath  = ref(runner.projectPath || '')
const showPicker   = ref(false)
const loading      = ref(false)
const error        = ref('')
const replace      = ref(true)
const projectFiles = ref(null)   // raw dari server
const analysis     = ref(null)   // hasil analyzeProject

const serverOk = computed(() => runner.serverAvailable)

async function onSelectFolder(path) {
  showPicker.value = false
  projectPath.value = path
  await load()
}

async function load() {
  if (!projectPath.value) return
  loading.value = true
  error.value   = ''
  analysis.value = null
  projectFiles.value = null

  const res = await readProject(projectPath.value)
  loading.value = false
  if (!res.ok) { error.value = res.error; return }

  projectFiles.value = res.data.files
  try {
    analysis.value = analyzeProject(res.data.files)
    // gabungkan warning dari server (file dilewati, folder hilang)
    if (res.data.warnings?.length) analysis.value.warnings.unshift(...res.data.warnings)
    if (res.data.skipped?.length) {
      for (const s of res.data.skipped) analysis.value.warnings.push(`File dilewati (${s.reason}): ${s.name}`)
    }
  } catch (err) {
    error.value = `Gagal menganalisis project: ${err.message}`
  }
}

const summary    = computed(() => analysis.value?.summary || null)
const canImport  = computed(() => !!summary.value && summary.value.features + summary.value.dataFiles + summary.value.components > 0)

function doImport() {
  if (!projectFiles.value || !canImport.value) return
  importProject(projectFiles.value, {
    dataRegistry: dataReg, componentStore: compStore, blockRegistry: registry, canvas
  }, { replace: replace.value })
  // sinkronkan projectPath agar real-run langsung bisa dipakai
  runner.projectPath = projectPath.value
  emit('close')
}

function blockLabel(blockId) {
  const b = registry.getById(blockId)
  return b ? `${b.icon || ''} ${b.label}`.trim() : blockId
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
        <button class="btn-import" :disabled="!canImport" @click="doImport">
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
.hint        { font-size: 10px; color: #475569; flex: 1; }
.modal-close { background: none; border: none; cursor: pointer; color: #475569; font-size: 20px; line-height: 1; padding: 0; }
.modal-close:hover { color: #e2e8f0; }

/* Path bar */
.path-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; background: #0f1117; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.path-label { font-size: 10px; color: #64748b; }
.path-value { flex: 1; font-family: monospace; font-size: 10px; color: #7dd3fc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.path-value.empty { color: #475569; }
.btn-pick, .btn-reload {
  padding: 4px 12px; border-radius: 5px; cursor: pointer;
  background: rgba(14,165,233,0.12); border: 1px solid rgba(14,165,233,0.3);
  color: #38bdf8; font-size: 10px; font-weight: 600;
}
.btn-pick:disabled { opacity: 0.4; cursor: default; }
.btn-reload { padding: 4px 9px; }

.server-warn { padding: 6px 16px; font-size: 10px; color: #f59e0b; background: rgba(245,158,11,0.06); border-bottom: 1px solid #1e293b; }

/* Body */
.body { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 10px 14px; gap: 8px; }
.state { font-size: 11px; color: #64748b; text-align: center; padding: 30px; }
.state.err { color: #ef4444; }

.summary { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.chip { font-size: 10px; color: #818cf8; background: rgba(99,102,241,0.12); padding: 2px 9px; border-radius: 10px; }
.chip.data { color: #38bdf8; background: rgba(14,165,233,0.12); }
.chip.comp { color: #ec4899; background: rgba(236,72,153,0.12); }
.chip.raw  { color: #f59e0b; background: rgba(245,158,11,0.12); }

.cols { flex: 1; display: flex; gap: 8px; min-height: 0; }
.col { flex: 1; display: flex; flex-direction: column; min-width: 0; border: 1px solid #1e293b; border-radius: 6px; overflow: hidden; }
.col-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #334155; padding: 5px 10px; background: #0f1117; border-bottom: 1px solid #1e293b; }
.col-scroll { flex: 1; overflow: auto; padding: 8px 10px; }

.feat { margin-bottom: 8px; }
.feat-label { font-size: 11px; font-weight: 700; color: #818cf8; }
.off { color: #4b5563; font-size: 9px; }
.tc { margin: 3px 0 5px 8px; }
.tc-label { font-size: 10px; font-weight: 600; color: #f59e0b; }
.step { font-size: 10px; color: #94a3b8; padding: 1px 8px; margin-left: 10px; border-left: 2px solid #1e293b; font-family: monospace; }
.step.raw { border-left-color: #f59e0b; color: #fbbf24; }

.sub { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; color: #475569; }
.data-file { font-size: 10px; color: #94a3b8; padding: 2px 0; }
.data-file.env { color: #7dd3fc; }
.muted { color: #475569; font-size: 9px; }
.empty { font-size: 10px; color: #475569; padding: 2px 0; }

.warnings { flex-shrink: 0; border-top: 1px dashed #1e293b; padding-top: 6px; max-height: 110px; display: flex; flex-direction: column; }
.warn-head { font-size: 10px; font-weight: 700; color: #f59e0b; margin-bottom: 3px; }
.warn-scroll { overflow: auto; }
.warn-item { font-size: 9px; color: #94734b; font-family: monospace; padding: 1px 0; word-break: break-all; }

.modal-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; background: #0a0d14; border-top: 1px solid #1e293b; flex-shrink: 0;
}
.spacer { flex: 1; }
.replace-toggle { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #64748b; cursor: pointer; user-select: none; }
.replace-toggle.on { color: #ef4444; }
.btn-cancel { padding: 5px 14px; border-radius: 5px; cursor: pointer; background: transparent; border: 1px solid #1e293b; color: #64748b; font-size: 11px; }
.btn-cancel:hover { color: #94a3b8; border-color: #334155; }
.btn-import { padding: 5px 16px; border-radius: 5px; cursor: pointer; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 11px; font-weight: 700; }
.btn-import:hover:not(:disabled) { background: rgba(16,185,129,0.25); }
.btn-import:disabled { opacity: 0.4; cursor: default; }
</style>
