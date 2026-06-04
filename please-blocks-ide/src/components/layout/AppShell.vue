<script setup>
import { ref, computed } from 'vue'
import BlockPalette      from '@/components/palette/BlockPalette.vue'
import CanvasEditor      from '@/components/canvas/CanvasEditor.vue'
import BlockInspector    from '@/components/inspector/BlockInspector.vue'
import CodePreview       from '@/components/canvas/CodePreview.vue'
import DataManager       from '@/components/manager/DataManager.vue'
import ComponentBuilder  from '@/components/manager/ComponentBuilder.vue'
import EnvEditor         from '@/components/manager/EnvEditor.vue'
import TestRunner        from '@/components/runner/TestRunner.vue'
import ExportModal       from '@/components/export/ExportModal.vue'
import { useRunnerStore }   from '@/stores/runnerStore.js'
import { useCanvasStore  }   from '@/stores/canvasStore.js'
import { useBlockRegistry }  from '@/stores/blockRegistry.js'
import { useDataRegistry  }  from '@/stores/dataRegistry.js'

const runner   = useRunnerStore()
const canvas   = useCanvasStore()
const registry = useBlockRegistry()
const dataReg  = useDataRegistry()

const showDataManager      = ref(false)
const showComponentBuilder = ref(false)
const showEnvEditor        = ref(false)
const showExportModal      = ref(false)

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
        <span class="logo">🧩</span>
        <span class="app-name">Please Blocks</span>
        <span class="app-version">v0.5 — Sprint 5</span>
      </div>
      <div class="topbar-center">
        <span class="project-name">my-automation-tests</span>
      </div>
      <div class="topbar-right">
        <button class="topbar-btn" :class="{ active: showDataManager }"      @click="showDataManager = true"      title="Data Manager">📊 Data</button>
        <button class="topbar-btn" :class="{ active: showComponentBuilder }" @click="showComponentBuilder = true" title="Component Builder">📦 Components</button>
        <button class="topbar-btn" :class="{ active: showEnvEditor }"        @click="showEnvEditor = true"        title="Environment Variables">⚙️ .env</button>
        <button
          class="topbar-btn"
          :class="{ active: showRightPanel }"
          @click="showRightPanel = !showRightPanel"
          title="Toggle Inspector & Code Preview"
        >
          🔍 Inspector
        </button>
        <button class="topbar-btn export" @click="showExportModal = true" title="Export project">📦 Export</button>

        <!-- Run button — langsung trigger runner -->
        <button
          class="topbar-btn run"
          :class="{ running: runner.isRunning }"
          :disabled="runner.isRunning"
          @click="runner.visible ? runner.runSimulation(canvas.features, registry, dataReg.entries) : (runner.open(), runner.runSimulation(canvas.features, registry, dataReg.entries))"
          title="Jalankan semua test"
        >
          {{ runner.isRunning ? '⏳ Berjalan...' : '▶ Run' }}
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
    <ComponentBuilder  v-if="showComponentBuilder" @close="showComponentBuilder = false" />
    <EnvEditor         v-if="showEnvEditor"        @close="showEnvEditor = false" />
    <ExportModal       v-if="showExportModal"      @close="showExportModal = false" />

    <!-- Status bar -->
    <footer class="statusbar">
      <span>please-test v1.0.0</span>
      <span>·</span>
      <span>mocha + selenium-webdriver</span>
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
      <span>Sprint 5 — Test Runner + Env Editor + Validasi</span>
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
.topbar-left   { display: flex; align-items: center; gap: 8px; flex: 1; }
.topbar-center { flex: 1; text-align: center; }
.topbar-right  { display: flex; align-items: center; gap: 5px; flex: 1; justify-content: flex-end; }

.logo      { font-size: 16px; }
.app-name  { font-size: 13px; font-weight: 700; color: #e2e8f0; }
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
.topbar-btn.export              { background: rgba(168,85,247,0.08); border-color: rgba(168,85,247,0.25); color: #a855f7; }
.topbar-btn.export:hover        { background: rgba(168,85,247,0.18); }
.topbar-btn.run                 { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.topbar-btn.run:hover:not(:disabled) { background: rgba(16,185,129,0.2); border-color: #10b981; }
.topbar-btn.run.running         { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #f59e0b; cursor: default; }
.topbar-btn.run:disabled        { opacity: 0.7; cursor: default; }
.topbar-btn.runner-toggle       { padding: 4px 8px; font-size: 14px; }

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
</style>
