<script setup>
import { computed } from 'vue'
import { useRunnerStore } from '@/stores/runnerStore.js'
import { useCanvasStore  } from '@/stores/canvasStore.js'

const runner = useRunnerStore()
const canvas = useCanvasStore()

const emit = defineEmits(['close'])

const passRate = computed(() => {
  const total = runner.stats.total
  if (!total) return 0
  return Math.round((runner.stats.passed / total) * 100)
})

const passRateColor = computed(() => {
  if (passRate.value === 100) return '#10b981'
  if (passRate.value >= 70)   return '#f59e0b'
  return '#ef4444'
})

// Breakdown per feature: label + array TC dengan status
const featureBreakdown = computed(() => {
  return canvas.features.map(feature => {
    const tcs = feature.testCases.map(tc => ({
      id:     tc.id,
      label:  tc.label,
      result: runner.tcResults[tc.id] || 'pending',
      enabled: feature.enabled !== false
    }))
    const passed  = tcs.filter(t => t.result === 'pass').length
    const failed  = tcs.filter(t => t.result === 'fail').length
    const skipped = tcs.filter(t => !t.enabled).length
    return { id: feature.id, label: feature.label, enabled: feature.enabled !== false, tcs, passed, failed, skipped }
  })
})

const statusLabel = computed(() => {
  if (runner.status === 'passed') return 'Semua Test Lulus'
  if (runner.status === 'failed') return `${runner.stats.failed} Test Gagal`
  if (runner.status === 'stopped') return 'Runner Dihentikan'
  return 'Hasil Test'
})

const statusColor = computed(() => {
  if (runner.status === 'passed') return '#10b981'
  if (runner.status === 'failed') return '#ef4444'
  if (runner.status === 'stopped') return '#f59e0b'
  return '#94a3b8'
})

function tcIcon(result) {
  if (result === 'pass')    return '✓'
  if (result === 'fail')    return '✗'
  if (result === 'pending') return '·'
  return '⏸'
}
</script>

<template>
  <div class="report-overlay" @click.self="emit('close')">
    <div class="report-modal">

      <!-- Header -->
      <div class="report-header">
        <div class="report-title">
          <span class="report-icon">📋</span>
          <span>Laporan Test</span>
        </div>
        <button class="btn-close" @click="emit('close')" title="Tutup">×</button>
      </div>

      <!-- Summary bar -->
      <div class="report-summary">
        <div class="summary-status" :style="{ color: statusColor }">
          {{ statusLabel }}
        </div>

        <!-- Pass rate ring -->
        <div class="summary-ring-wrap">
          <svg class="ring-svg" viewBox="0 0 80 80">
            <circle class="ring-bg"    cx="40" cy="40" r="34" />
            <circle
              class="ring-fill"
              cx="40" cy="40" r="34"
              :stroke="passRateColor"
              :stroke-dasharray="`${passRate * 2.136} 213.6`"
            />
          </svg>
          <div class="ring-label">
            <span class="ring-pct" :style="{ color: passRateColor }">{{ passRate }}%</span>
            <span class="ring-sub">lulus</span>
          </div>
        </div>

        <!-- Stats row -->
        <div class="summary-stats">
          <div class="stat-item pass">
            <span class="stat-num">{{ runner.stats.passed }}</span>
            <span class="stat-lbl">Lulus</span>
          </div>
          <div class="stat-sep"></div>
          <div class="stat-item fail">
            <span class="stat-num">{{ runner.stats.failed }}</span>
            <span class="stat-lbl">Gagal</span>
          </div>
          <div class="stat-sep"></div>
          <div class="stat-item skip">
            <span class="stat-num">{{ runner.stats.skipped }}</span>
            <span class="stat-lbl">Lewat</span>
          </div>
          <div class="stat-sep"></div>
          <div class="stat-item dur">
            <span class="stat-num">{{ runner.stats.duration }}</span>
            <span class="stat-lbl">ms</span>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="summary-bar">
          <div
            class="summary-bar-pass"
            :style="{
              width: runner.stats.total ? (runner.stats.passed / runner.stats.total * 100) + '%' : '0%'
            }"
          ></div>
          <div
            class="summary-bar-fail"
            :style="{
              width: runner.stats.total ? (runner.stats.failed / runner.stats.total * 100) + '%' : '0%'
            }"
          ></div>
        </div>
      </div>

      <!-- Feature breakdown -->
      <div class="report-body">
        <div
          v-for="feature in featureBreakdown"
          :key="feature.id"
          class="feature-section"
          :class="{ disabled: !feature.enabled }"
        >
          <div class="feature-header">
            <span class="feature-icon">📁</span>
            <span class="feature-label">{{ feature.label }}</span>
            <div class="feature-badges">
              <span v-if="feature.passed"  class="badge pass">✓ {{ feature.passed }}</span>
              <span v-if="feature.failed"  class="badge fail">✗ {{ feature.failed }}</span>
              <span v-if="feature.skipped" class="badge skip">⏸ {{ feature.skipped }}</span>
              <span v-if="!feature.enabled" class="badge disabled-lbl">dinonaktifkan</span>
            </div>
          </div>

          <div class="tc-list">
            <div
              v-for="tc in feature.tcs"
              :key="tc.id"
              class="tc-row"
              :class="tc.result"
            >
              <span class="tc-icon">{{ tcIcon(tc.result) }}</span>
              <span class="tc-label">{{ tc.label }}</span>
              <span class="tc-result-label">
                {{ tc.result === 'pass' ? 'lulus'
                 : tc.result === 'fail' ? 'gagal'
                 : tc.result === 'pending' && !tc.enabled ? 'dilewati'
                 : '' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="featureBreakdown.length === 0" class="empty-state">
          Tidak ada data test untuk ditampilkan.
        </div>
      </div>

      <!-- Footer -->
      <div class="report-footer">
        <span class="footer-time">Selesai: {{ new Date().toLocaleTimeString('id-ID') }}</span>
        <button class="btn-secondary" @click="emit('close')">Tutup</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.report-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.report-modal {
  width: 520px;
  max-width: 95vw;
  max-height: 85vh;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}

/* Header */
.report-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 44px;
  background: #0f1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.report-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
  flex: 1;
}
.report-icon { font-size: 14px; }
.btn-close {
  background: none;
  border: none;
  color: #475569;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.btn-close:hover { color: #e2e8f0; }

/* Summary section */
.report-summary {
  padding: 20px 24px 16px;
  background: #0d1424;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.summary-status {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* Ring chart */
.summary-ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
}
.ring-svg {
  width: 80px;
  height: 80px;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: #1e293b;
  stroke-width: 8;
}
.ring-fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}
.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-pct {
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}
.ring-sub {
  font-size: 9px;
  color: #475569;
  margin-top: 2px;
}

/* Stats row */
.summary-stats {
  display: flex;
  align-items: center;
  gap: 0;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px;
}
.stat-num {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}
.stat-lbl {
  font-size: 9px;
  color: #475569;
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.stat-item.pass .stat-num { color: #10b981; }
.stat-item.fail .stat-num { color: #ef4444; }
.stat-item.skip .stat-num { color: #f59e0b; }
.stat-item.dur  .stat-num { color: #64748b; }
.stat-sep {
  width: 1px;
  height: 28px;
  background: #1e293b;
}

/* Progress bar */
.summary-bar {
  height: 4px;
  width: 100%;
  background: #1e293b;
  border-radius: 2px;
  overflow: hidden;
  display: flex;
}
.summary-bar-pass {
  background: #10b981;
  transition: width 0.5s ease;
}
.summary-bar-fail {
  background: #ef4444;
  transition: width 0.5s ease;
}

/* Body */
.report-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.feature-section {
  margin-bottom: 8px;
  border: 1px solid #1e293b;
  border-radius: 6px;
  overflow: hidden;
}
.feature-section.disabled {
  opacity: 0.45;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  background: #0f1828;
  border-bottom: 1px solid #1e293b;
}
.feature-icon { font-size: 12px; }
.feature-label {
  font-size: 11px;
  font-weight: 600;
  color: #cbd5e1;
  flex: 1;
}
.feature-badges {
  display: flex;
  gap: 4px;
}
.badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}
.badge.pass { background: rgba(16,185,129,0.12); color: #10b981; }
.badge.fail { background: rgba(239,68,68,0.12);  color: #ef4444; }
.badge.skip { background: rgba(245,158,11,0.12); color: #f59e0b; }
.badge.disabled-lbl { background: rgba(71,85,105,0.12); color: #475569; }

.tc-list {
  padding: 4px 0;
  background: #0a0f18;
}
.tc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  font-size: 11px;
}
.tc-icon {
  width: 14px;
  font-size: 10px;
  flex-shrink: 0;
  font-weight: 700;
}
.tc-label { flex: 1; color: #94a3b8; }
.tc-result-label { font-size: 9px; font-weight: 600; }

.tc-row.pass .tc-icon       { color: #10b981; }
.tc-row.pass .tc-result-label { color: #10b981; }
.tc-row.fail .tc-icon       { color: #ef4444; }
.tc-row.fail .tc-label      { color: #fca5a5; }
.tc-row.fail .tc-result-label { color: #ef4444; }
.tc-row.pending .tc-icon    { color: #334155; }
.tc-row.pending .tc-label   { color: #475569; }

/* Empty */
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #334155;
  font-size: 12px;
}

/* Footer */
.report-footer {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid #1e293b;
  background: #0f1117;
  flex-shrink: 0;
  gap: 10px;
}
.footer-time {
  font-size: 10px;
  color: #334155;
  flex: 1;
  font-family: monospace;
}
.btn-secondary {
  padding: 6px 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 5px;
  font-size: 11px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-secondary:hover { background: #293548; color: #e2e8f0; }
</style>
