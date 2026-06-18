<script setup>
import { computed } from 'vue'
import { useRunnerStore } from '@/model/stores/runnerStore.js'
import { useCanvasStore  } from '@/model/stores/canvasStore.js'

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
  background: var(--color-black);
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
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 80px var(--color-black);
}

/* Header */
.report-header {
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  height: 44px;
  background: var(--color-bg-base);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}
.report-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  flex: 1;
}
.report-icon { font-size: var(--text-xl); }
.btn-close {
  background: none;
  border: none;
  color: var(--color-text-faint);
  font-size: var(--text-icon);
  cursor: pointer;
  padding: 0 var(--space-1);
  line-height: var(--leading-none);
}
.btn-close:hover { color: var(--color-text-primary); }

/* Summary section */
.report-summary {
  padding: 20px 24px 16px;
  background: #0d1424;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.summary-status {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
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
  stroke: var(--color-border-subtle);
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
  font-size: var(--text-3xl);
  font-weight: var(--font-extrabold);
  line-height: var(--leading-none);
}
.ring-sub {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
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
  font-size: var(--text-icon);
  font-weight: var(--font-extrabold);
  line-height: var(--leading-none);
}
.stat-lbl {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  margin-top: 3px;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
}
.stat-item.pass .stat-num { color: var(--color-success); }
.stat-item.fail .stat-num { color: var(--color-danger); }
.stat-item.skip .stat-num { color: var(--color-warning); }
.stat-item.dur  .stat-num { color: var(--color-text-muted); }
.stat-sep {
  width: 1px;
  height: 28px;
  background: var(--color-border-subtle);
}

/* Progress bar */
.summary-bar {
  height: 4px;
  width: 100%;
  background: var(--color-border-subtle);
  border-radius: 2px;
  overflow: hidden;
  display: flex;
}
.summary-bar-pass {
  background: var(--color-success);
  transition: width 0.5s ease;
}
.summary-bar-fail {
  background: var(--color-danger);
  transition: width 0.5s ease;
}

/* Body */
.report-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
}

.feature-section {
  margin-bottom: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.feature-section.disabled {
  opacity: 0.45;
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: var(--space-2) var(--space-3);
  background: #0f1828;
  border-bottom: 1px solid var(--color-border-subtle);
}
.feature-icon { font-size: var(--text-md); }
.feature-label {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: #cbd5e1;
  flex: 1;
}
.feature-badges {
  display: flex;
  gap: var(--space-1);
}
.badge {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  padding: 1px 7px;
  border-radius: 10px;
}
.badge.pass { background: rgba(16,185,129,0.12); color: var(--color-success); }
.badge.fail { background: rgba(239,68,68,0.12);  color: var(--color-danger); }
.badge.skip { background: rgba(245,158,11,0.12); color: var(--color-warning); }
.badge.disabled-lbl { background: rgba(71,85,105,0.12); color: var(--color-text-faint); }

.tc-list {
  padding: var(--space-1) 0;
  background: var(--color-bg-deepest);
}
.tc-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 5px 14px;
  font-size: var(--text-base);
}
.tc-icon {
  width: 14px;
  font-size: var(--text-sm);
  flex-shrink: 0;
  font-weight: var(--font-bold);
}
.tc-label { flex: 1; color: var(--color-text-secondary); }
.tc-result-label { font-size: var(--text-xs); font-weight: var(--font-semibold); }

.tc-row.pass .tc-icon       { color: var(--color-success); }
.tc-row.pass .tc-result-label { color: var(--color-success); }
.tc-row.fail .tc-icon       { color: var(--color-danger); }
.tc-row.fail .tc-label      { color: var(--color-danger-lighter); }
.tc-row.fail .tc-result-label { color: var(--color-danger); }
.tc-row.pending .tc-icon    { color: var(--color-border-default); }
.tc-row.pending .tc-label   { color: var(--color-text-faint); }

/* Empty */
.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--color-text-dimmed);
  font-size: var(--text-md);
}

/* Footer */
.report-footer {
  display: flex;
  align-items: center;
  padding: var(--space-2-5) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-base);
  flex-shrink: 0;
  gap: var(--space-2-5);
}
.footer-time {
  font-size: var(--text-sm);
  color: var(--color-text-dimmed);
  flex: 1;
  font-family: monospace;
}
.btn-secondary {
  padding: 6px var(--space-4);
  background: var(--color-border-subtle);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
}
.btn-secondary:hover { background: #293548; color: var(--color-text-primary); }
</style>
