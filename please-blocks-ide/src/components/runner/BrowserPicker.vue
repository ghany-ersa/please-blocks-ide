<script setup>
import { ref } from 'vue'
import { useRunnerStore } from '@/model/stores/runnerStore.js'

const runner = useRunnerStore()
const open   = ref(false)

const BROWSERS = [
  { id: 'chromium', label: 'Chromium', icon: '🟡', available: true  },
  { id: 'firefox',  label: 'Firefox',  icon: '🟠', available: true  },
  { id: 'webkit',   label: 'WebKit',   icon: '🔵', available: true  },
]

const current = () => BROWSERS.find(b => b.id === runner.browserTarget) || BROWSERS[0]

function select(browser) {
  if (!browser.available) return
  runner.setBrowserTarget(browser.id)
  open.value = false
}

function toggle() {
  if (runner.isRunning) return
  open.value = !open.value
}

function onClickOutside() {
  open.value = false
}
</script>

<template>
  <div class="browser-picker" v-click-outside="onClickOutside">
    <button
      class="picker-btn"
      :class="{ open, disabled: runner.isRunning }"
      @click="toggle"
      :title="runner.isRunning ? 'Tidak bisa ganti browser saat running' : 'Pilih browser'"
    >
      <span class="browser-icon">{{ current().icon }}</span>
      <span class="browser-label">{{ current().label }}</span>
      <span class="picker-arrow" :class="{ open }">▾</span>
    </button>

    <div v-if="open" class="picker-dropdown">
      <div class="picker-header">Pilih Browser</div>
      <button
        v-for="b in BROWSERS"
        :key="b.id"
        class="picker-option"
        :class="{ active: b.id === runner.browserTarget, unavailable: !b.available }"
        @click="select(b)"
        :title="!b.available ? 'Belum tersedia' : ''"
      >
        <span class="opt-icon">{{ b.icon }}</span>
        <span class="opt-label">{{ b.label }}</span>
        <span v-if="b.id === runner.browserTarget" class="opt-check">✓</span>
        <span v-if="!b.available" class="opt-soon">segera</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.browser-picker {
  position: relative;
}

.picker-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: var(--space-1) 9px;
  background: var(--color-border-subtle);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
  height: 28px;
}
.picker-btn:hover:not(.disabled) { color: #cbd5e1; border-color: var(--color-border-strong); }
.picker-btn.open   { border-color: var(--color-primary); color: var(--color-primary-light); background: var(--color-primary-bg); }
.picker-btn.disabled { opacity: 0.5; cursor: default; }

.browser-icon { font-size: var(--text-base); line-height: var(--leading-none); }
.browser-label { font-weight: var(--font-semibold); }
.picker-arrow {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  transition: transform var(--transition-base);
  display: inline-block;
}
.picker-arrow.open { transform: rotate(180deg); }

/* Dropdown */
.picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 160px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: 7px;
  box-shadow: 0 8px 32px var(--color-black-50);
  z-index: 500;
  overflow: hidden;
}

.picker-header {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  color: var(--color-text-dimmed);
  padding: 7px var(--space-3) 5px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.picker-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  text-align: left;
  transition: background var(--transition-fast);
}
.picker-option:hover:not(.unavailable) { background: var(--color-border-subtle); color: var(--color-text-primary); }
.picker-option.active  { color: var(--color-text-primary); }
.picker-option.unavailable { opacity: 0.35; cursor: default; }

.opt-icon  { font-size: var(--text-lg); flex-shrink: 0; }
.opt-label { flex: 1; font-weight: var(--font-medium); }
.opt-check { color: var(--color-success); font-size: var(--text-base); font-weight: var(--font-bold); }
.opt-soon  {
  font-size: var(--text-2xs);
  background: var(--color-border-subtle);
  color: var(--color-text-faint);
  padding: 1px 5px;
  border-radius: 8px;
  font-weight: var(--font-semibold);
}
</style>
