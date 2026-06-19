<script setup>
/**
 * TestRunner.vue — Sprint 5
 * Panel test runner dengan log stream real-time (simulasi browser).
 * Saat Electron tersedia, gantikan runSimulation() dengan IPC ke main process.
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useRunnerStore }    from '@/model/stores/runnerStore.js'
import { useCanvasStore  }   from '@/model/stores/canvasStore.js'
import { useTestRunnerControl } from '@/composables/useTestRunnerControl.js'

const runner   = useRunnerStore()
const canvas   = useCanvasStore()
const { runReal } = useTestRunnerControl()

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
  runReal()   // mocha sungguhan via server (fallback simulasi bila server mati)
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
          :title="runner.canRunReal ? 'Jalankan test sungguhan (playwright via server)' : 'Server tidak aktif — fallback simulasi'"
        >
          ▶ Run Real
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
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  overflow: hidden;
}

/* Header */
.runner-header {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  padding: 0 var(--space-3);
  height: 38px;
  background: var(--color-bg-deepest);
  border-bottom: 1px solid var(--color-bg-base);
  flex-shrink: 0;
}
.runner-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}
.runner-icon { color: var(--color-success); font-size: var(--text-sm); }
.runner-status {
  font-weight: var(--font-normal);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.spin {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Stats */
.runner-stats {
  display: flex;
  gap: var(--space-2);
  flex: 1;
}
.stat {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: 1px 7px;
  border-radius: 10px;
}
.stat.pass { background: var(--color-success-bg); color: var(--color-success); }
.stat.fail { background: var(--color-danger-bg);  color: var(--color-danger); }
.stat.skip { background: var(--color-warning-bg); color: var(--color-warning); }
.stat.dur  { background: rgba(71,85,105,0.15); color: var(--color-text-faint); }

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
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  padding: var(--space-1) var(--space-2-5);
  transition: all 0.12s;
}
.btn-run {
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  color: var(--color-success);
}
.btn-run:hover:not(:disabled) {
  background: rgba(16,185,129,0.25);
}
.btn-run:disabled { opacity: 0.35; cursor: default; }

.btn-stop {
  background: rgba(239,68,68,0.15);
  border: 1px solid var(--color-danger-border);
  color: var(--color-danger);
}
.btn-stop:hover { background: rgba(239,68,68,0.25); }

.btn-clear {
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-faint);
  padding: var(--space-1) 7px;
}
.btn-clear:hover:not(:disabled) { color: var(--color-text-secondary); border-color: var(--color-border-default); }
.btn-clear:disabled { opacity: 0.35; cursor: default; }

.btn-close {
  background: none;
  border: none;
  color: var(--color-text-faint);
  font-size: 18px;
  padding: 0 var(--space-1);
}
.btn-close:hover { color: var(--color-text-primary); }

/* Progress bar */
.runner-progress {
  height: 2px;
  background: var(--color-bg-base);
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
  padding: var(--space-2-5) 14px;
  min-height: 0;
}
.runner-empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-border-subtle);
  font-size: var(--text-sm);
  padding-top: var(--space-2);
}
.hint { color: var(--color-bg-base); font-size: var(--text-xs); }

.log-entry {
  display: flex;
  gap: var(--space-2-5);
  line-height: var(--leading-relaxed);
  white-space: pre;
  font-size: 12.5px;
}
.log-time { color: var(--color-border-subtle); flex-shrink: 0; font-size: var(--text-xs); }
.log-text  { flex: 1; }

.log-pass { color: var(--color-success); }
.log-fail { color: var(--color-danger); }
.log-warn { color: var(--color-warning); }
.log-cmd  { color: var(--color-primary-light); }
.log-info { color: var(--color-text-faint); }

.log-cursor {
  color: var(--color-success);
  animation: blink 1s step-end infinite;
  line-height: var(--leading-relaxed);
  font-size: var(--text-sm);
}
@keyframes blink { 50% { opacity: 0 } }

/* TC result grid */
.tc-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-bg-base);
  flex-shrink: 0;
  max-height: 90px;
  overflow-y: auto;
}
.tc-result {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: 4px;
  font-size: var(--text-xs);
  border: 1px solid transparent;
  max-width: 180px;
}
.tc-result.pass {
  background: var(--color-success-bg);
  border-color: rgba(16,185,129,0.2);
  color: var(--color-success);
}
.tc-result.fail {
  background: var(--color-danger-bg);
  border-color: rgba(239,68,68,0.2);
  color: var(--color-danger);
}
.tc-result.running {
  background: var(--color-warning-bg);
  border-color: rgba(245,158,11,0.2);
  color: var(--color-warning);
}
.tc-result.pending {
  background: rgba(71,85,105,0.08);
  border-color: var(--color-border-subtle);
  color: var(--color-text-faint);
}
.tc-icon { flex-shrink: 0; font-size: var(--text-sm); }
.tc-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
