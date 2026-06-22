<script setup>
/**
 * ExportModal.vue — Sprint 4
 * Menampilkan semua file yang di-generate dalam satu modal.
 * Tiap file punya tab sendiri + tombol copy.
 * Juga menyediakan "Download Semua" sebagai ZIP via browser API.
 */
import { ref, computed } from 'vue'
import JSZip              from 'jszip'
import { useCanvasStore }     from '@/model/stores/canvasStore.js'
import { useBlockRegistry }   from '@/model/stores/blockRegistry.js'
import { useDataRegistry }    from '@/model/stores/dataRegistry.js'
import { useComponentStore }  from '@/model/stores/componentStore.js'
import { useRunnerStore }     from '@/model/stores/runnerStore.js'
import { exportProject }      from '@/model/core/codegen/projectExporter.js'
import { useCodeHighlight }   from '@/composables/useCodeHighlight.js'

const emit = defineEmits(['close'])

const canvas    = useCanvasStore()
const registry  = useBlockRegistry()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()
const runner    = useRunnerStore()

// Generate semua file
const files = computed(() => exportProject(canvas, registry, dataReg, compStore, runner.projectName))

// Navigasi tab
const activeFile = ref(null)
const activeIdx  = computed(() =>
  activeFile.value !== null ? activeFile.value : 0
)
const current = computed(() => files.value[activeIdx.value] || null)

// Category color
const catColor = {
  spec:      '#818cf8',
  index:     '#a855f7',
  data:      '#0ea5e9',
  component: '#ec4899',
  config:    '#64748b',
  readme:    '#10b981'
}
const catIcon = {
  spec:      '🧪',
  index:     '📋',
  data:      '📊',
  component: '📦',
  config:    '⚙️',
  readme:    '📖'
}

// Copy
const copied = ref(false)
async function copyFile() {
  if (!current.value) return
  await navigator.clipboard.writeText(current.value.content).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1800)
}

const projectName = computed(() => runner.projectName)
const { highlight } = useCodeHighlight()

// Download semua sebagai ZIP dengan struktur folder lengkap
const downloading = ref(false)
async function downloadAll() {
  downloading.value = true
  try {
    const zip    = new JSZip()
    const folder = zip.folder(projectName.value)

    for (const f of files.value) {
      folder.file(f.path, f.content)
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    triggerDownload(blob, `${projectName.value}.zip`)
  } finally {
    downloading.value = false
  }
}

// Download file tunggal
function downloadSingle(file) {
  const mime = file.path.endsWith('.json') ? 'application/json'
             : file.path.endsWith('.md')   ? 'text/markdown'
             : 'text/plain'
  const blob = new Blob([file.content], { type: mime })
  triggerDownload(blob, file.path.split('/').pop())
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">

      <!-- Header -->
      <div class="modal-header">
        <span class="modal-title">📦 Project Export</span>
        <span class="file-count">{{ files.length }} file</span>
        <div class="modal-actions">
          <button class="btn-dl" @click="downloadAll" :disabled="downloading">
            {{ downloading ? '⏳ Membuat ZIP...' : '⬇ Download ZIP' }}
          </button>
        </div>
        <button class="modal-close" @click="emit('close')">×</button>
      </div>

      <!-- File tabs -->
      <div class="file-tabs-bar">
        <button
          v-for="(f, idx) in files"
          :key="f.path"
          :class="['file-tab', { active: activeIdx === idx }]"
          :style="{ '--cat': catColor[f.category] }"
          @click="activeFile = idx"
        >
          <span class="tab-icon">{{ catIcon[f.category] }}</span>
          <span class="tab-name">{{ f.path.split('/').pop() }}</span>
          <span v-if="f.enabled === false" class="tab-disabled">⏸</span>
        </button>
      </div>

      <!-- File content -->
      <div class="file-body" v-if="current">
        <div class="file-toolbar">
          <span class="file-path">
            <span class="cat-badge" :style="{ background: catColor[current.category] + '22', color: catColor[current.category] }">
              {{ current.category }}
            </span>
            {{ current.path }}
          </span>
          <span v-if="current.enabled === false" class="disabled-badge">⏸ Dinonaktifkan di index.js</span>
          <div class="toolbar-right">
            <button class="btn-copy" :class="{ done: copied }" @click="copyFile">
              {{ copied ? '✓ Copied' : '⎘ Copy' }}
            </button>
            <button class="btn-dl-single" @click="downloadSingle(current)">⬇</button>
          </div>
        </div>

        <div class="code-wrap">
          <pre class="code" v-html="highlight(current.content)"></pre>
        </div>
      </div>

      <!-- Footer stats -->
      <div class="modal-footer">
        <span>{{ canvas.features.length }} feature</span>
        <span>·</span>
        <span>{{ canvas.totalTestCases }} test case</span>
        <span>·</span>
        <span>{{ canvas.totalSteps }} step</span>
        <span>·</span>
        <span>{{ canvas.features.filter(f => f.enabled !== false).length }} aktif</span>
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

/* Header */
.modal-header {
  display: flex; align-items: center; gap: var(--space-2-5);
  padding: 0 var(--space-4); height: 46px;
  background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.modal-title  { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text-primary); }
.file-count   { font-size: var(--text-sm); color: var(--color-text-faint); background: var(--color-border-subtle); padding: 2px var(--space-2); border-radius: 10px; }
.modal-actions{ flex: 1; display: flex; justify-content: flex-end; gap: var(--space-2); }
.btn-dl {
  padding: var(--pad-btn-y) 14px; border-radius: var(--radius-md); border: none; cursor: pointer;
  background: var(--color-primary-bg); border: 1px solid rgba(99,102,241,0.3);
  color: var(--color-primary-light); font-size: var(--text-base); font-weight: var(--font-semibold);
  transition: all var(--transition-base);
}
.btn-dl:hover:not(:disabled) { background: rgba(99,102,241,0.25); }
.btn-dl:disabled { opacity: 0.5; cursor: default; }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-faint); font-size: var(--text-icon); line-height: var(--leading-none); padding: 0;
}
.modal-close:hover { color: var(--color-text-primary); }

/* File tabs bar */
.file-tabs-bar {
  display: flex; gap: 2px; padding: 6px var(--space-3);
  overflow-x: auto; flex-shrink: 0;
  background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle);
}
.file-tab {
  display: flex; align-items: center; gap: var(--space-1);
  padding: var(--space-1) var(--space-2-5); border-radius: var(--radius-md); border: 1px solid transparent;
  font-size: var(--text-sm); font-family: monospace; cursor: pointer;
  color: var(--color-text-faint); background: transparent; white-space: nowrap;
  transition: all 0.12s;
}
.file-tab:hover  { background: var(--color-white-3); color: var(--color-text-secondary); }
.file-tab.active {
  background: color-mix(in srgb, var(--cat) 15%, transparent);
  border-color: color-mix(in srgb, var(--cat) 40%, transparent);
  color: var(--cat);
}
.tab-icon     { font-size: var(--text-base); }
.tab-name     { font-weight: var(--font-semibold); }
.tab-disabled { font-size: var(--text-xs); color: #4b5563; }

/* File body */
.file-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.file-toolbar {
  display: flex; align-items: center; gap: var(--space-2);
  padding: 6px 14px; background: var(--color-bg-base);
  border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.file-path  { font-size: var(--text-sm); font-family: monospace; color: var(--color-text-muted); flex: 1; display: flex; align-items: center; gap: 6px; }
.cat-badge  { font-size: 10.5px; padding: 1px 6px; border-radius: var(--radius-sm); font-weight: var(--font-bold); }
.disabled-badge {
  font-size: var(--text-xs); color: #4b5563; background: rgba(75,85,99,0.1);
  border-radius: 4px; padding: 2px 7px;
}
.toolbar-right { display: flex; gap: 6px; }
.btn-copy {
  padding: 3px var(--space-2-5); font-size: var(--text-sm);
  background: var(--color-primary-bg); border: 1px solid var(--color-primary-border);
  border-radius: 4px; color: var(--color-primary); cursor: pointer; transition: all var(--transition-base);
}
.btn-copy.done { background: var(--color-success-bg); border-color: var(--color-success-border); color: var(--color-success); }
.btn-dl-single {
  padding: 3px var(--space-2); font-size: var(--text-base);
  background: var(--color-white-4); border: 1px solid var(--color-border-subtle);
  border-radius: 4px; color: var(--color-text-faint); cursor: pointer;
}
.btn-dl-single:hover { color: var(--color-text-secondary); border-color: var(--color-border-default); }

.code-wrap { flex: 1; overflow: auto; background: var(--color-bg-deepest); }
.code {
  margin: 0; padding: 14px var(--space-4);
  font-family: var(--font-mono); font-size: var(--text-sm);
  line-height: 1.75; color: var(--color-text-secondary); white-space: pre;
}
.code :deep(.cm)       { color: var(--syntax-comment); font-style: italic; }
.code :deep(.kw)       { color: var(--syntax-keyword); }
.code :deep(.str)      { color: var(--syntax-string); }
.code :deep(.fn)       { color: var(--syntax-function); }
.code :deep(.obj)      { color: var(--syntax-function); }
.code :deep(.flow)     { color: var(--color-primary-light); }
.code :deep(.data)     { color: var(--syntax-data); }
.code :deep(.data-key) { color: var(--syntax-data-key); }

/* Footer */
.modal-footer {
  display: flex; align-items: center; gap: var(--space-2);
  padding: 6px var(--space-4); background: var(--color-bg-deepest);
  border-top: 1px solid var(--color-border-subtle); flex-shrink: 0;
  font-size: var(--text-sm); color: var(--color-text-dimmed);
}
</style>
