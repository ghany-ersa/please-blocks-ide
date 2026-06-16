<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import BlockPalette      from '@/components/palette/BlockPalette.vue'
import CanvasEditor      from '@/components/canvas/CanvasEditor.vue'
import BlockInspector    from '@/components/inspector/BlockInspector.vue'
import CodePreview       from '@/components/canvas/CodePreview.vue'
import DataManager       from '@/components/manager/DataManager.vue'
import ComponentBuilder  from '@/components/manager/ComponentBuilder.vue'
import EnvEditor         from '@/components/manager/EnvEditor.vue'
import TestRunner        from '@/components/runner/TestRunner.vue'
import ExportModal       from '@/components/export/ExportModal.vue'
import ImportModal       from '@/components/export/ImportModal.vue'
import ProjectImportModal from '@/components/export/ProjectImportModal.vue'
import ReportViewer      from '@/components/runner/ReportViewer.vue'
import DirectoryPicker   from '@/components/shared/DirectoryPicker.vue'
import TopbarMenu        from '@/components/layout/TopbarMenu.vue'
import { exportProject } from '@/core/codegen/projectExporter.js'
import { writeProject }  from '@/services/runnerService.js'
import { useRunnerStore }     from '@/stores/runnerStore.js'
import { useCanvasStore  }   from '@/stores/canvasStore.js'
import { useBlockRegistry }  from '@/stores/blockRegistry.js'
import { useDataRegistry  }  from '@/stores/dataRegistry.js'
import { useComponentStore } from '@/stores/componentStore.js'

const runner    = useRunnerStore()
const canvas    = useCanvasStore()
const registry  = useBlockRegistry()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()

const showDataManager      = ref(false)
const showComponentBuilder = ref(false)
const builderInitialCompId = ref(null)

// Buka ComponentBuilder otomatis saat double-click block component di canvas
watch(() => compStore.builderTargetCompId, (compId) => {
  if (compId) {
    builderInitialCompId.value = compId
    showComponentBuilder.value = true
  }
})

function closeComponentBuilder() {
  showComponentBuilder.value = false
  builderInitialCompId.value = null
  compStore.clearBuilderTarget()
}
const showEnvEditor        = ref(false)
const showExportModal      = ref(false)
const showImportModal      = ref(false)
const showProjectImportModal = ref(false)
const showDirectoryPicker  = ref(false)

// Cek ketersediaan server saat app boot
onMounted(() => runner.checkServer())

// ── Simpan ke Project (tulis semua file ke disk) ───────────────
const saveState   = ref('idle')   // 'idle' | 'saving' | 'saved' | 'error'
const saveMessage = ref('')
const pendingSave = ref(false)    // tandai picker dibuka demi save

async function triggerSave() {
  if (!runner.serverAvailable) {
    saveState.value = 'error'
    saveMessage.value = 'Server tidak aktif — jalankan npm run dev.'
    return
  }
  // Belum ada folder → minta pilih dulu, lalu lanjut save
  if (!runner.projectPath) {
    pendingSave.value = true
    showDirectoryPicker.value = true
    return
  }
  await doSave()
}

async function doSave() {
  saveState.value = 'saving'
  saveMessage.value = ''
  const files = exportProject(canvas, registry, dataReg, compStore)
  const res = await writeProject(runner.projectPath, files)

  if (res.ok && (!res.errors || res.errors.length === 0)) {
    saveState.value = 'saved'
    saveMessage.value = `${res.written?.length || files.length} file tersimpan`
  } else if (res.ok) {
    saveState.value = 'error'
    saveMessage.value = `${res.errors.length} file gagal ditulis`
  } else {
    saveState.value = 'error'
    saveMessage.value = res.error || 'Gagal menyimpan'
  }
  setTimeout(() => { if (saveState.value !== 'saving') saveState.value = 'idle' }, 2500)
}

function triggerRun() {
  runner.open()
  if (runner.canRunReal) {
    const files = exportProject(canvas, registry, dataReg, compStore)
    runner.runReal(files, runner.projectPath)
  } else {
    runner.runSimulation(canvas.features, registry, dataReg.entries)
  }
}

function onDirectorySelected(path) {
  runner.projectPath        = path
  showDirectoryPicker.value = false
  if (pendingSave.value) {
    pendingSave.value = false
    doSave()
  }
}

// Toggle right panel
const showRightPanel = ref(true)

// Resize handle — Inspector vs CodePreview
const inspectorHeightPct = ref(55)
const isResizing = ref(false)
const panelRef   = ref(null)

function startResize(e) {
  isResizing.value = true
  const startY   = e.clientY
  const startPct = inspectorHeightPct.value

  function onMove(ev) {
    if (!panelRef.value) return
    const panelH = panelRef.value.getBoundingClientRect().height
    const delta  = ev.clientY - startY
    const newPct = Math.min(80, Math.max(20, startPct + (delta / panelH) * 100))
    inspectorHeightPct.value = newPct
  }

  function onUp() {
    isResizing.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// Status bar label runner
const runnerStatusLabel = computed(() => {
  switch (runner.status) {
    case 'running': return `⏳ Berjalan (${runner.stats.passed + runner.stats.failed}/${runner.stats.total})`
    case 'passed':  return `✓ ${runner.stats.passed} lulus · ${runner.stats.duration}ms`
    case 'failed':  return `✗ ${runner.stats.failed} gagal, ${runner.stats.passed} lulus`
    case 'stopped': return '⏹ Dihentikan'
    default:        return null
  }
})
const runnerStatusColor = computed(() => {
  switch (runner.status) {
    case 'running': return '#f59e0b'
    case 'passed':  return '#10b981'
    case 'failed':  return '#ef4444'
    default:        return '#334155'
  }
})
</script>

<template>
  <div class="shell" :class="{ 'is-resizing': isResizing }">

    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">

        <!-- Menu: File (import / export / project) -->
        <TopbarMenu label="File" icon="📁">
          <div class="menu-head">Import</div>
          <button class="menu-item" @click="showImportModal = true">
            <span class="mi">📥</span> Import .spec.js
          </button>
          <button class="menu-item" @click="showProjectImportModal = true">
            <span class="mi">📁</span> Import Project
          </button>
          <div class="menu-sep"></div>
          <div class="menu-head">Export</div>
          <button class="menu-item" @click="showExportModal = true">
            <span class="mi">📦</span> Export ZIP
          </button>
        </TopbarMenu>

        <!-- Menu: Workspace (editor & panel) -->
        <TopbarMenu
          label="Workspace" icon="⊞"
          :active="showDataManager || showComponentBuilder || showEnvEditor"
        >
          <button class="menu-item" :class="{ active: showDataManager }" @click="showDataManager = true">
            <span class="mi">📊</span> Data Manager
          </button>
          <button class="menu-item" :class="{ active: showComponentBuilder }" @click="showComponentBuilder = true; builderInitialCompId = null">
            <span class="mi">📦</span> Components
          </button>
        </TopbarMenu>
      </div>

      <div class="topbar-center">
        <span class="project-name">my-automation-tests</span>
      </div>

      <div class="topbar-right">

        <!-- Toggle Inspector & Code -->
        <button
          class="topbar-btn"
          :class="{ active: showRightPanel }"
          @click="showRightPanel = !showRightPanel"
          title="Toggle Inspector & Code Preview"
        >
          🔍 Inspector
        </button>

        <!-- Folder project (di samping Simpan) -->
        <button
          v-if="runner.serverAvailable"
          class="topbar-btn folder"
          :class="{ 'has-path': !!runner.projectPath }"
          @click="showDirectoryPicker = true"
          :title="runner.projectPath || 'Pilih folder project'"
        >
          📂 {{ runner.projectPath ? '…' + runner.projectPath.slice(-16) : 'Set Folder' }}
        </button>

        <!-- Save (primary) -->
        <button
          v-if="runner.serverAvailable"
          class="topbar-btn save"
          :class="saveState"
          :disabled="saveState === 'saving' || canvas.features.length === 0"
          @click="triggerSave"
          :title="runner.projectPath ? `Simpan semua file ke ${runner.projectPath}` : 'Pilih folder lalu simpan'"
        >
          {{ saveState === 'saving' ? '⏳ Menyimpan...'
           : saveState === 'saved' ? `✓ ${saveMessage}`
           : saveState === 'error' ? `✗ ${saveMessage}`
           : '💾 Simpan' }}
        </button>

        <!-- Laporan (kontekstual) -->
        <button
          v-if="runner.status === 'passed' || runner.status === 'failed'"
          class="topbar-btn report"
          :class="runner.status"
          @click="runner.showReport = true"
          title="Lihat laporan test"
        >
          📋 Laporan
        </button>

        <!-- Run (primary) -->
        <button
          class="topbar-btn run"
          :class="{ running: runner.isRunning, 'run-real': runner.canRunReal }"
          :disabled="runner.isRunning || canvas.features.length === 0"
          @click="triggerRun"
          :title="runner.canRunReal ? 'Jalankan test sungguhan (mocha)' : 'Jalankan simulasi'"
        >
          {{ runner.isRunning ? '⏳ Berjalan...' : runner.canRunReal ? '▶ Run Real' : '▶ Run' }}
        </button>

        <!-- Toggle runner panel -->
        <button
          class="topbar-btn runner-toggle"
          :class="{ active: runner.visible }"
          @click="runner.toggle()"
          title="Toggle Test Runner panel"
        >
          ≡
        </button>
      </div>
    </header>

    <!-- Main area -->
    <div class="main" :class="{ 'runner-open': runner.visible }">
      <BlockPalette />

      <!-- Canvas + Runner stack -->
      <div class="canvas-stack">
        <CanvasEditor />

        <!-- Test Runner panel (bawah canvas) -->
        <div v-if="runner.visible" class="runner-pane">
          <TestRunner />
        </div>
      </div>

      <!-- Right panel: Inspector + CodePreview -->
      <div
        v-if="showRightPanel"
        class="right-panel"
        ref="panelRef"
      >
        <div class="right-top" :style="{ height: inspectorHeightPct + '%' }">
          <div class="panel-label">Inspector</div>
          <BlockInspector />
        </div>

        <div class="resize-handle" @mousedown.prevent="startResize" title="Drag untuk resize"></div>

        <div class="right-bottom">
          <div class="panel-label">Code Preview</div>
          <CodePreview />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <DataManager       v-if="showDataManager"      @close="showDataManager = false" />
    <ComponentBuilder
      v-if="showComponentBuilder"
      :initial-comp-id="builderInitialCompId"
      @close="closeComponentBuilder"
    />
    <EnvEditor         v-if="showEnvEditor"        @close="showEnvEditor = false" />
    <ExportModal       v-if="showExportModal"      @close="showExportModal = false" />
    <ImportModal       v-if="showImportModal"      @close="showImportModal = false" />
    <ProjectImportModal v-if="showProjectImportModal" @close="showProjectImportModal = false" />
    <ReportViewer      v-if="runner.showReport"   @close="runner.showReport = false" />
    <DirectoryPicker
      v-if="showDirectoryPicker"
      @select="onDirectorySelected"
      @close="showDirectoryPicker = false"
    />

    <!-- Status bar -->
    <footer class="statusbar">
      <span>please-test v1.0.0</span>
      <span>·</span>
      <span>mocha + selenium-webdriver</span>
      <span
        class="server-badge"
        :class="runner.serverAvailable ? 'online' : 'offline'"
        :title="runner.serverAvailable ? 'Server Express aktif — real run tersedia' : 'Server tidak aktif — mode simulasi'"
      >
        {{ runner.serverAvailable ? '● server' : '○ simulasi' }}
      </span>
      <span class="spacer"></span>

      <!-- Runner status inline di statusbar -->
      <span
        v-if="runnerStatusLabel"
        class="status-runner"
        :style="{ color: runnerStatusColor }"
        @click="runner.open()"
      >
        {{ runnerStatusLabel }}
      </span>
      <span v-if="runnerStatusLabel">·</span>

      <span class="status-dot" :class="runner.status"></span>
      <span>Sprint 8 — Real Runner (Jalur B)</span>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.shell.is-resizing { user-select: none; cursor: row-resize; }

/* TOP BAR */
.topbar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 40px;
  background: #0f1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  gap: 12px;
}
.topbar-left   { display: flex; align-items: center; gap: 6px; flex: 1; }
.topbar-center { flex: 1; text-align: center; }
.topbar-right  { display: flex; align-items: center; gap: 5px; flex: 1; justify-content: flex-end; }

.app-version {
  font-size: 10px; color: #334155;
  background: #1e293b;
  padding: 2px 7px; border-radius: 10px;
}
.project-name { font-size: 11px; color: #64748b; font-family: monospace; }

.topbar-btn {
  padding: 4px 10px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 5px;
  font-size: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.topbar-btn:hover               { color: #94a3b8; border-color: #475569; }
.topbar-btn.active              { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #818cf8; }
.topbar-divider {
  width: 1px; height: 20px; background: #1e293b; margin: 0 4px; flex-shrink: 0;
}
.topbar-btn.folder {
  max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: monospace; font-size: 9px;
  background: rgba(14,165,233,0.06); border-color: rgba(14,165,233,0.2); color: #38bdf8;
}
.topbar-btn.folder.has-path     { color: #7dd3fc; }
.topbar-btn.folder:hover        { background: rgba(14,165,233,0.16); }
.topbar-btn.save                { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25); color: #34d399; }
.topbar-btn.save:hover:not(:disabled) { background: rgba(16,185,129,0.18); }
.topbar-btn.save:disabled       { opacity: 0.6; cursor: default; }
.topbar-btn.save.saved          { background: rgba(16,185,129,0.2); border-color: #10b981; color: #6ee7b7; }
.topbar-btn.save.error          { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #f87171; }
.topbar-btn.run                 { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.topbar-btn.run:hover:not(:disabled) { background: rgba(16,185,129,0.2); border-color: #10b981; }
.topbar-btn.run.running         { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #f59e0b; cursor: default; }
.topbar-btn.run:disabled        { opacity: 0.7; cursor: default; }
.topbar-btn.runner-toggle       { padding: 4px 8px; font-size: 14px; }
.topbar-btn.report              { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.25); color: #818cf8; }
.topbar-btn.report:hover        { background: rgba(99,102,241,0.18); }
.topbar-btn.report.failed       { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); color: #ef4444; }

/* MAIN */
.main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* Canvas + Runner stack */
.canvas-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

/* Runner pane (bawah canvas, 240px) */
.runner-pane {
  height: 240px;
  min-height: 240px;
  flex-shrink: 0;
  border-top: 1px solid #1e293b;
  overflow: hidden;
}

/* RIGHT PANEL */
.right-panel {
  width: 268px;
  min-width: 268px;
  display: flex;
  flex-direction: column;
  background: #111827;
  border-left: 1px solid #1e293b;
  flex-shrink: 0;
  overflow: hidden;
}

.right-top {
  display: flex;
  flex-direction: column;
  min-height: 120px;
  overflow: hidden;
}
.right-bottom {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100px;
  overflow: hidden;
}

.panel-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #334155;
  padding: 5px 12px 4px;
  background: #0f1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

/* Drag resize handle */
.resize-handle {
  height: 5px;
  background: #1e293b;
  cursor: row-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  position: relative;
}
.resize-handle::after {
  content: '';
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  width: 28px; height: 2px;
  background: #334155; border-radius: 1px;
}
.resize-handle:hover           { background: rgba(99,102,241,0.15); }
.resize-handle:hover::after    { background: #6366f1; }

/* STATUS BAR */
.statusbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 24px;
  background: #0a0d14;
  border-top: 1px solid #1e293b;
  font-size: 10px;
  color: #334155;
  flex-shrink: 0;
}
.spacer { flex: 1; }
.status-dot {
  width: 6px; height: 6px;
  background: #10b981;
  border-radius: 50%;
  transition: background 0.3s;
}
.status-dot.running { background: #f59e0b; animation: pulse 1s ease-in-out infinite; }
.status-dot.failed  { background: #ef4444; }
.status-dot.stopped { background: #6b7280; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.status-runner {
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.status-runner:hover { opacity: 0.75; }

/* Server badge di statusbar */
.server-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 8px;
  letter-spacing: 0.04em;
}
.server-badge.online  { color: #10b981; background: rgba(16,185,129,0.1); }
.server-badge.offline { color: #475569; background: rgba(71,85,105,0.1); }

/* Run real button */
.topbar-btn.run.run-real {
  background: rgba(16,185,129,0.18);
  border-color: rgba(16,185,129,0.5);
  color: #34d399;
  font-weight: 700;
}

</style>
