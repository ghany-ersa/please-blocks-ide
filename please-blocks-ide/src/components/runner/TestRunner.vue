<script setup>
/**
 * TestRunner.vue — Sprint 5
 * Panel test runner dengan log stream real-time (simulasi browser).
 * Saat Electron tersedia, gantikan runSimulation() dengan IPC ke main process.
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useRunnerStore } from '@/stores/runnerStore.js'
import { useCanvasStore  } from '@/stores/canvasStore.js'

const runner = useRunnerStore()
const canvas = useCanvasStore()

const logEl = ref(null)

// Auto-scroll ke bawah saat ada log baru
watch(() => runner.logs.length, async () => {
  await nextTick()
  if (logEl.value) {
    logEl.value.scrollTop = logEl.value.scrollHeight
  }
})

const statusLabel = computed(() => {
  switch (runner.status) {
    case 'idle':    return 'Siap'
    case 'running': return 'Berjalan...'
    case 'passed':  return 'Semua lulus'
    case 'failed':  return 'Ada kegagalan'
    case 'stopped': return 'Dihentikan'
    default:        return runner.status
  }
})

const statusColor = computed(() => {
  switch (runner.status) {
    case 'idle':    return '#475569'
    case 'running': return '#f59e0b'
    case 'passed':  return '#10b981'
    case 'failed':  return '#ef4444'
    case 'stopped': return '#6b7280'
    default:        return '#475569'
  }
})

function run() {
  runner.runSimulation(canvas.features)
}
function stop() {
  runner.stopRun()
}
function clear() {
  runner.clearLogs()
  runner.status = 'idle'
}

// Warna per level log
const levelColor = {
  info: '#64748b',
  pass: '#10b981',
  fail: '#ef4444',
  warn: '#f59e0b',
  cmd:  '#818cf8'
}
</script>

<template>
  <div class="runner-panel">

    <!-- Header -->
    <div class="runner-header">
      <div class="runner-title">
        <span class="runner-icon">▶</span>
        <span>Test Runner</span>
        <span class="runner-status" :style="{ color: statusColor }">
          <span v-if="runner.isRunning" class="spin">⏳</span>
          {{ statusLabel }}
        </span>
      </div>

      <!-- Stats badge -->
      <div v-if="runner.stats.total > 0 && !runner.isRunning" class="runner-stats">
        <span class="stat pass">✓ {{ runner.stats.passed }}</span>
        <span class="stat fail">✗ {{ runner.stats.failed }}</span>
        <span v-if="runner.stats.skipped" class="stat skip">⏸ {{ runner.stats.skipped }}</span>
        <span class="stat dur">{{ runner.stats.duration }}ms</span>
      </div>

      <!-- Controls -->
      <div class="runner-controls">
        <button
          v-if="!runner.isRunning"
          class="btn-run"
          :disabled="canvas.features.length === 0"
          @click="run"
          title="Jalankan semua test"
        >
          ▶ Run
        </button>
        <button
          v-else
          class="btn-stop"
          @click="stop"
          title="Hentikan runner"
        >
          ⏹ Stop
        </button>
        <button
          class="btn-clear"
          :disabled="runner.isRunning"
          @click="clear"
          title="Bersihkan log"
        >
          🗑
        </button>
        <button class="btn-close" @click="runner.close()" title="Tutup">×</button>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="runner-progress" v-if="runner.isRunning || runner.stats.total > 0">
      <div
        class="runner-progress-bar"
        :style="{
          width: runner.stats.total
            ? ((runner.stats.passed + runner.stats.failed) / runner.stats.total * 100) + '%'
            : '0%',
          background: runner.stats.failed > 0 ? '#ef4444' : '#10b981'
        }"
      ></div>
    </div>

    <!-- Log output -->
    <div class="runner-log" ref="logEl">
      <div v-if="runner.logs.length === 0" class="runner-empty">
        <span>Log output akan muncul di sini saat test dijalankan.</span>
        <span v-if="canvas.features.length === 0" class="hint">Tambahkan feature di canvas terlebih dahulu.</span>
      </div>

      <div
        v-for="entry in runner.logs"
        :key="entry.id"
        class="log-entry"
        :style="{ color: levelColor[entry.level] || '#64748b' }"
      >
        <span class="log-time">{{ entry.time }}</span>
        <span class="log-text" :class="`log-${entry.level}`">{{ entry.text }}</span>
      </div>

      <!-- Cursor blink saat running -->
      <div v-if="runner.isRunning" class="log-cursor">▌</div>
    </div>

    <!-- TC Results grid (muncul setelah run) -->
    <div v-if="Object.keys(runner.tcResults).length > 0" class="tc-grid">
      <template v-for="feature in canvas.features" :key="feature.id">
        <template v-for="tc in feature.testCases" :key="tc.id">
          <div
            v-if="runner.tcResults[tc.id]"
            class="tc-result"
            :class="runner.tcResults[tc.id]"
            :title="`${feature.label} › ${tc.label}`"
          >
            <span class="tc-icon">
              {{ runner.tcResults[tc.id] === 'pass' ? '✓'
               : runner.tcResults[tc.id] === 'fail' ? '✗'
               : runner.tcResults[tc.id] === 'running' ? '◌'
               : '·' }}
            </span>
            <span class="tc-name">{{ tc.label }}</span>
          </div>
        </template>
      </template>
    </div>

  </div>
</template>

<style scoped>
.runner-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #080c12;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: #94a3b8;
  overflow: hidden;
}

/* Header */
.runner-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  height: 38px;
  background: #0a0f18;
  border-bottom: 1px solid #0f172a;
  flex-shrink: 0;
}
.runner-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #e2e8f0;
}
.runner-icon { color: #10b981; font-size: 10px; }
.runner-status {
  font-weight: 400;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Stats */
.runner-stats {
  display: flex;
  gap: 8px;
  flex: 1;
}
.stat {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}
.stat.pass { background: rgba(16,185,129,0.1); color: #10b981; }
.stat.fail { background: rgba(239,68,68,0.1);  color: #ef4444; }
.stat.skip { background: rgba(245,158,11,0.1); color: #f59e0b; }
.stat.dur  { background: rgba(71,85,105,0.15); color: #475569; }

/* Controls */
.runner-controls {
  display: flex;
  gap: 5px;
  margin-left: auto;
  align-items: center;
}
.btn-run, .btn-stop, .btn-clear, .btn-close {
  border: none;
  cursor: pointer;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
  transition: all 0.12s;
}
.btn-run {
  background: rgba(16,185,129,0.15);
  border: 1px solid rgba(16,185,129,0.3);
  color: #10b981;
}
.btn-run:hover:not(:disabled) {
  background: rgba(16,185,129,0.25);
}
.btn-run:disabled { opacity: 0.35; cursor: default; }

.btn-stop {
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
}
.btn-stop:hover { background: rgba(239,68,68,0.25); }

.btn-clear {
  background: transparent;
  border: 1px solid #1e293b;
  color: #475569;
  padding: 4px 7px;
}
.btn-clear:hover:not(:disabled) { color: #94a3b8; border-color: #334155; }
.btn-clear:disabled { opacity: 0.35; cursor: default; }

.btn-close {
  background: none;
  border: none;
  color: #475569;
  font-size: 16px;
  padding: 0 4px;
}
.btn-close:hover { color: #e2e8f0; }

/* Progress bar */
.runner-progress {
  height: 2px;
  background: #0f172a;
  flex-shrink: 0;
}
.runner-progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

/* Log area */
.runner-log {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  min-height: 0;
}
.runner-empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #1e293b;
  font-size: 10px;
  padding-top: 8px;
}
.hint { color: #0f172a; font-size: 9px; }

.log-entry {
  display: flex;
  gap: 10px;
  line-height: 1.7;
  white-space: pre;
  font-size: 10.5px;
}
.log-time { color: #1e293b; flex-shrink: 0; font-size: 9px; }
.log-text  { flex: 1; }

.log-pass { color: #10b981; }
.log-fail { color: #ef4444; }
.log-warn { color: #f59e0b; }
.log-cmd  { color: #818cf8; }
.log-info { color: #475569; }

.log-cursor {
  color: #10b981;
  animation: blink 1s step-end infinite;
  line-height: 1.7;
  font-size: 10px;
}
@keyframes blink { 50% { opacity: 0 } }

/* TC result grid */
.tc-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 8px 12px;
  border-top: 1px solid #0f172a;
  flex-shrink: 0;
  max-height: 90px;
  overflow-y: auto;
}
.tc-result {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  border: 1px solid transparent;
  max-width: 180px;
}
.tc-result.pass {
  background: rgba(16,185,129,0.08);
  border-color: rgba(16,185,129,0.2);
  color: #10b981;
}
.tc-result.fail {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.2);
  color: #ef4444;
}
.tc-result.running {
  background: rgba(245,158,11,0.08);
  border-color: rgba(245,158,11,0.2);
  color: #f59e0b;
}
.tc-result.pending {
  background: rgba(71,85,105,0.08);
  border-color: #1e293b;
  color: #475569;
}
.tc-icon { flex-shrink: 0; font-size: 10px; }
.tc-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
