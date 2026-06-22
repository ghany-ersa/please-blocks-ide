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
import ImportModal       from '@/components/export/ImportModal.vue'
import ExportModal       from '@/components/export/ExportModal.vue'
import ProjectImportModal from '@/components/export/ProjectImportModal.vue'
import ReportViewer      from '@/components/runner/ReportViewer.vue'
import TopbarMenu        from '@/components/layout/TopbarMenu.vue'
import ActivityBar       from '@/components/layout/ActivityBar.vue'
import DirectoryPicker   from '@/components/shared/DirectoryPicker.vue'
import { useRunnerStore }     from '@/model/stores/runnerStore.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useComponentStore } from '@/model/stores/componentStore.js'
import { useSaveProject }      from '@/composables/useSaveProject.js'
import { useProjectWorkspace } from '@/composables/useProjectWorkspace.js'
import { useTestRunnerControl }from '@/composables/useTestRunnerControl.js'
import { usePanelResize }      from '@/composables/usePanelResize.js'

const runner    = useRunnerStore()
const canvas    = useCanvasStore()   // dipakai template untuk guard tombol (ada feature?)
const compStore = useComponentStore()

// ── ViewModel (composables) ────────────────────────────────────
const { saveState, saveMessage, isDirty, markSaved, triggerSave } = useSaveProject()
const { showReloadConfirm, openProject, syncOnBoot, loadFromDisk, keepLocal } =
  useProjectWorkspace({ onKeepLocal: triggerSave })
const { validate } = useTestRunnerControl()
const { inspectorHeightPct, isResizing, panelRef, startResize } = usePanelResize(55)

// Setelah boot-sync (canvas == disk) → tandai tersimpan agar tidak tampak dirty.
onMounted(async () => { await syncOnBoot(); markSaved() })

// ── State UI lokal (murni presentasi) ──────────────────────────
// View area utama: 'canvas' | 'data' | 'components' | 'env'
const activeView           = ref('canvas')
const builderInitialCompId = ref(null)
const showExportModal      = ref(false)
const showImportModal      = ref(false)
const showProjectImportModal = ref(false)
const showRightPanel       = ref(true)

// Open Project dari menu File → picker folder → buka sebagai workspace baru
const showOpenPicker = ref(false)
async function onOpenProject(path) {
  showOpenPicker.value = false
  const res = await openProject(path)
  if (res?.ok) markSaved()   // baru dibuka dari disk → belum dirty
}

// Buka view Components otomatis saat double-click block component di canvas
watch(() => compStore.builderTargetCompId, (compId) => {
  if (compId) {
    builderInitialCompId.value = compId
    activeView.value = 'components'
  }
})

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
          <div class="menu-head">Project</div>
          <button class="menu-item" @click="showOpenPicker = true">
            <span class="mi">📂</span> Open/New Project
          </button>
          <div class="menu-sep"></div>
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
      </div>

      <div class="topbar-center">
        <span class="project-name" :title="runner.projectPath || 'Belum ada folder project'">{{ runner.projectName }}</span>
      </div>

      <div class="topbar-right">
        <!-- Save (primary) -->
        <button
          v-if="runner.serverAvailable"
          class="topbar-btn save"
          :class="[saveState, { dirty: isDirty && saveState === 'idle' }]"
          :disabled="saveState === 'saving' || canvas.features.length === 0"
          @click="triggerSave"
          :title="isDirty ? 'Ada perubahan belum tersimpan' : (runner.projectPath ? `Simpan semua file ke ${runner.projectPath}` : 'Pilih folder lalu simpan')"
        >
          {{ saveState === 'saving' ? '⏳ Menyimpan...'
           : saveState === 'saved' ? `✓ ${saveMessage}`
           : saveState === 'error' ? `✗ ${saveMessage}`
           : isDirty ? '💾 Simpan •'
           : '💾 Simpan' }}
        </button>

        <!-- Toggle Inspector & Code -->
        <button
          class="topbar-btn"
          :class="{ active: showRightPanel }"
          @click="showRightPanel = !showRightPanel"
          title="Toggle Inspector & Code Preview"
        >
          🔍 Inspector
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

        <!-- Validate (primary) — simulasi cek alur test -->
        <button
          class="topbar-btn run"
          :class="{ running: runner.isRunning }"
          :disabled="runner.isRunning || canvas.features.length === 0"
          @click="validate"
          title="Validasi alur test (simulasi, tanpa browser)"
        >
          {{ runner.isRunning ? '⏳ Berjalan...' : '▶ Validate' }}
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
      <ActivityBar v-model="activeView" />

      <!-- Palette hanya relevan untuk canvas -->
      <BlockPalette v-show="activeView === 'canvas'" />

      <!-- Canvas + Runner stack (v-show agar state/scroll terjaga saat pindah view) -->
      <div class="canvas-stack" v-show="activeView === 'canvas'">
        <CanvasEditor />
        <div v-if="runner.visible" class="runner-pane">
          <TestRunner />
        </div>
      </div>

      <!-- View manager menggantikan canvas di area utama -->
      <DataManager       v-if="activeView === 'data'"       mode="panel" />
      <ComponentBuilder  v-if="activeView === 'components'"  mode="panel" :initial-comp-id="builderInitialCompId" />
      <EnvEditor         v-if="activeView === 'env'"         mode="panel" />

      <!-- Right panel: Inspector + CodePreview (hanya untuk canvas) -->
      <div
        v-if="showRightPanel && activeView === 'canvas'"
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

    <!-- Modals (Import/Export/Report) -->
    <ImportModal       v-if="showImportModal"      @close="showImportModal = false" />
    <ExportModal       v-if="showExportModal"      @close="showExportModal = false" />
    <ReportViewer      v-if="runner.showReport"   @close="runner.showReport = false" />
    <DirectoryPicker   v-if="showOpenPicker"        @select="onOpenProject" @close="showOpenPicker = false" />

    <!-- Status bar -->
    <footer class="statusbar">
      <span>please-test v1.0.0</span>
      <span>·</span>
      <span>playwright test</span>
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

  <!-- Project Import — di luar shell agar bisa dibuka dari gate maupun topbar -->
  <ProjectImportModal v-if="showProjectImportModal" @close="showProjectImportModal = false" />

  <!-- Konfirmasi reload: perubahan belum tersimpan vs isi disk -->
  <div v-if="showReloadConfirm" class="confirm-overlay">
    <div class="confirm-card">
      <div class="confirm-title">⚠ Perubahan belum tersimpan</div>
      <p class="confirm-body">
        Canvas berbeda dengan isi folder project di disk. Muat ulang dari disk
        akan <strong>membuang perubahan yang belum di-Save</strong>.
      </p>
      <div class="confirm-actions">
        <button class="c-btn keep" @click="keepLocal">Pertahankan perubahan</button>
        <button class="c-btn load" @click="loadFromDisk">Muat dari disk</button>
      </div>
    </div>
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
  padding: 0 var(--space-4);
  height: 40px;
  background: var(--color-bg-base);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
  gap: var(--space-3);
}
.topbar-left   { display: flex; align-items: center; gap: var(--space-1-5); flex: 1; }
.topbar-center { flex: 1; text-align: center; }
.topbar-right  { display: flex; align-items: center; gap: 5px; flex: 1; justify-content: flex-end; }

.app-version {
  font-size: var(--text-sm); color: var(--color-text-dimmed);
  background: var(--color-border-subtle);
  padding: 2px 7px; border-radius: 10px;
}
.project-name { font-size: var(--text-base); color: var(--color-text-muted); font-family: monospace; }

.topbar-btn {
  padding: var(--space-1) 10px;
  background: var(--color-border-subtle);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}
.topbar-btn:hover               { color: var(--color-text-secondary); border-color: var(--color-border-strong); }
.topbar-btn.active              { background: var(--color-primary-bg); border-color: var(--color-primary); color: var(--color-primary-light); }
.topbar-divider {
  width: 1px; height: 20px; background: var(--color-border-subtle); margin: 0 var(--space-1); flex-shrink: 0;
}
.topbar-btn.save                { background: var(--color-success-bg); border-color: var(--color-success-border); color: var(--color-success-light); }
.topbar-btn.save:hover:not(:disabled) { background: rgba(16,185,129,0.18); }
.topbar-btn.save:disabled       { opacity: 0.6; cursor: default; }
.topbar-btn.save.saved          { background: rgba(16,185,129,0.2); border-color: var(--color-success); color: var(--color-success-lighter); }
.topbar-btn.save.error          { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger-light); }
/* ada perubahan belum tersimpan — aksen oranye + titik */
.topbar-btn.save.dirty          { background: var(--color-warning-bg); border-color: rgba(245,158,11,0.35); color: var(--color-warning-text); }
.topbar-btn.save.dirty:hover:not(:disabled) { background: rgba(245,158,11,0.2); }
.topbar-btn.run                 { background: var(--color-success-bg); border-color: var(--color-success-border); color: var(--color-success); }
.topbar-btn.run:hover:not(:disabled) { background: rgba(16,185,129,0.2); border-color: var(--color-success); }
.topbar-btn.run.running         { background: var(--color-warning-bg); border-color: var(--color-warning-border); color: var(--color-warning); cursor: default; }
.topbar-btn.run:disabled        { opacity: 0.7; cursor: default; }
.topbar-btn.runner-toggle       { padding: var(--space-1) var(--space-2); font-size: var(--text-xl); }
.topbar-btn.report              { background: rgba(99,102,241,0.08); border-color: var(--color-primary-border); color: var(--color-primary-light); }
.topbar-btn.report:hover        { background: rgba(99,102,241,0.18); }
.topbar-btn.report.failed       { background: var(--color-danger-bg); border-color: var(--color-danger-border); color: var(--color-danger); }

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
  border-top: 1px solid var(--color-border-subtle);
  overflow: hidden;
}

/* RIGHT PANEL */
.right-panel {
  width: 268px;
  min-width: 268px;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
  border-left: 1px solid var(--color-border-subtle);
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
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-dimmed);
  padding: 5px var(--space-3) 4px;
  background: var(--color-bg-base);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

/* Drag resize handle */
.resize-handle {
  height: 5px;
  background: var(--color-border-subtle);
  cursor: row-resize;
  flex-shrink: 0;
  transition: background var(--transition-base);
  position: relative;
}
.resize-handle::after {
  content: '';
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  width: 28px; height: 2px;
  background: var(--color-border-default); border-radius: 1px;
}
.resize-handle:hover           { background: var(--color-primary-bg); }
.resize-handle:hover::after    { background: var(--color-primary); }

/* STATUS BAR */
.statusbar {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: 0 14px;
  height: 24px;
  background: var(--color-bg-deepest);
  border-top: 1px solid var(--color-border-subtle);
  font-size: var(--text-sm);
  color: var(--color-text-dimmed);
  flex-shrink: 0;
}
.spacer { flex: 1; }
.status-dot {
  width: 6px; height: 6px;
  background: var(--color-success);
  border-radius: 50%;
  transition: background 0.3s;
}
.status-dot.running { background: var(--color-warning); animation: pulse 1s ease-in-out infinite; }
.status-dot.failed  { background: var(--color-danger); }
.status-dot.stopped { background: #6b7280; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.status-runner {
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: opacity var(--transition-base);
}
.status-runner:hover { opacity: 0.75; }

/* Server badge di statusbar */
.server-badge {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: 1px 7px;
  border-radius: 8px;
  letter-spacing: 0.04em;
}
.server-badge.online  { color: var(--color-success); background: var(--color-success-bg); }
.server-badge.offline { color: var(--color-border-strong); background: rgba(71,85,105,0.1); }

/* Run real button */
.topbar-btn.run.run-real {
  background: rgba(16,185,129,0.18);
  border-color: var(--color-success-border);
  color: var(--color-success-light);
  font-weight: var(--font-bold);
}

/* Konfirmasi reload */
.confirm-overlay {
  position: fixed; inset: 0; z-index: var(--z-dropdown);
  background: var(--color-black);
  display: flex; align-items: center; justify-content: center;
}
.confirm-card {
  width: 380px; max-width: 92vw;
  background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-2xl);
  padding: 22px; box-shadow: var(--shadow-xl);
}
.confirm-title { font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-warning); margin-bottom: var(--space-2); }
.confirm-body  { font-size: var(--text-md); color: var(--color-text-secondary); line-height: 1.6; }
.confirm-body strong { color: var(--color-text-primary); }
.confirm-actions { display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: 18px; }
.c-btn { padding: var(--space-1-5) 14px; border-radius: var(--radius-lg); font-size: var(--text-base); font-weight: var(--font-semibold); cursor: pointer; transition: all var(--transition-base); }
.c-btn.keep { background: transparent; border: 1px solid var(--color-border-default); color: var(--color-text-secondary); }
.c-btn.keep:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
.c-btn.load { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.35); color: var(--color-danger-light); }
.c-btn.load:hover { background: rgba(239,68,68,0.25); }

</style>
