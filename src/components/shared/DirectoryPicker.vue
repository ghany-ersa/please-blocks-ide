<script setup>
/**
 * DirectoryPicker.vue
 * Modal browser direktori — navigasi folder via service browseDirectory().
 * Emit 'select' dengan absolute path folder yang dipilih.
 */
import { ref, onMounted } from 'vue'
import { browseDirectory } from '@/model/services/runnerService.js'

const emit = defineEmits(['select', 'close'])

const currentPath = ref('')
const crumbs      = ref([])
const items       = ref([])
const loading     = ref(false)
const error       = ref('')
const selected    = ref('')   // path yang sedang di-highlight

async function browse(path = '') {
  loading.value = true
  error.value   = ''
  const res = await browseDirectory(path)
  loading.value = false
  if (!res.ok) { error.value = res.error; return }
  currentPath.value = res.data.path
  crumbs.value      = res.data.crumbs
  items.value       = res.data.items
  selected.value    = res.data.path   // default pilih folder saat ini
}

function enter(item) {
  if (!item.isDir) return
  selected.value = item.path
  browse(item.path)
}

function highlight(item) {
  if (!item.isDir) return
  selected.value = item.path
}

function confirmSelect() {
  if (selected.value) emit('select', selected.value)
}

onMounted(() => browse())
</script>

<template>
  <div class="picker-overlay" @click.self="emit('close')">
    <div class="picker-modal">

      <!-- Header -->
      <div class="picker-header">
        <span class="picker-title">📁 Pilih Folder Project</span>
        <button class="btn-x" @click="emit('close')">×</button>
      </div>

      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <button
          v-for="(crumb, i) in crumbs"
          :key="crumb.path"
          class="crumb-btn"
          @click="browse(crumb.path)"
        >
          {{ crumb.name }}
          <span v-if="i < crumbs.length - 1" class="crumb-sep">›</span>
        </button>
      </div>

      <!-- Current path display -->
      <div class="current-path">
        <span class="path-label">Path:</span>
        <span class="path-value">{{ currentPath }}</span>
      </div>

      <!-- Error -->
      <div v-if="error" class="picker-error">⚠ {{ error }}</div>

      <!-- Directory listing -->
      <div class="dir-list" v-if="!loading">
        <!-- Tombol ke parent dir -->
        <button
          v-if="crumbs.length > 1"
          class="dir-item parent"
          @click="browse(crumbs[crumbs.length - 2].path)"
        >
          <span class="item-icon">↑</span>
          <span class="item-name">..</span>
        </button>

        <button
          v-for="item in items"
          :key="item.path"
          class="dir-item"
          :class="{
            selected:  selected === item.path,
            project:   item.isProject,
            'is-file': !item.isDir
          }"
          @click="highlight(item)"
          @dblclick="enter(item)"
        >
          <span class="item-icon">
            {{ item.isProject ? '🧪' : item.isDir ? '📁' : '📄' }}
          </span>
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.isProject" class="project-badge">project</span>
          <span v-if="item.isDir" class="enter-hint">double-click untuk masuk</span>
        </button>

        <div v-if="items.length === 0" class="dir-empty">
          Folder kosong
        </div>
      </div>

      <div v-else class="dir-loading">
        <span class="spin">⏳</span> Memuat...
      </div>

      <!-- Selected preview -->
      <div class="selected-preview" :class="{ active: !!selected }">
        <span class="sel-label">Dipilih:</span>
        <span class="sel-path">{{ selected || '—' }}</span>
      </div>

      <!-- Footer actions -->
      <div class="picker-footer">
        <button class="btn-cancel" @click="emit('close')">Batal</button>
        <button
          class="btn-select"
          :disabled="!selected"
          @click="confirmSelect"
        >
          Pilih Folder Ini
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.picker-overlay {
  position: fixed; inset: 0;
  background: var(--color-black);
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
  backdrop-filter: blur(2px);
}

.picker-modal {
  width: 560px;
  max-width: 95vw;
  max-height: 82vh;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(0,0,0,0.55);
}

/* Header */
.picker-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 var(--space-4); height: 44px;
  background: var(--color-bg-base); border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
}
.picker-title { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text-primary); }
.btn-x {
  background: none; border: none; color: var(--color-text-faint);
  font-size: var(--text-icon); cursor: pointer; padding: 0; line-height: var(--leading-none);
}
.btn-x:hover { color: var(--color-text-primary); }

/* Breadcrumb */
.breadcrumb {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0;
  padding: var(--space-1-5) 14px;
  background: #0d1424; border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0; min-height: 32px;
}
.crumb-btn {
  display: flex; align-items: center; gap: var(--space-1);
  background: none; border: none; cursor: pointer;
  font-size: var(--text-sm); color: var(--color-text-faint); padding: 2px var(--space-1);
  border-radius: var(--radius-sm); transition: color var(--transition-fast); font-family: monospace;
}
.crumb-btn:hover { color: var(--color-text-secondary); background: var(--color-border-subtle); }
.crumb-btn:last-child { color: var(--color-text-secondary); }
.crumb-sep { color: var(--color-border-subtle); font-size: var(--text-md); }

/* Current path */
.current-path {
  display: flex; align-items: center; gap: var(--space-1-5);
  padding: var(--pad-input-y) 14px;
  background: #080c12; border-bottom: 1px solid #0f172a;
  flex-shrink: 0;
}
.path-label { font-size: var(--text-xs); color: var(--color-text-dimmed); font-weight: var(--font-bold); text-transform: uppercase; }
.path-value { font-size: var(--text-sm); font-family: monospace; color: var(--color-text-faint); word-break: break-all; }

/* Error */
.picker-error {
  padding: var(--space-2) 14px; font-size: var(--text-base); color: var(--color-danger);
  background: rgba(239,68,68,0.05); border-bottom: 1px solid rgba(239,68,68,0.1);
  flex-shrink: 0;
}

/* Directory list */
.dir-list {
  flex: 1; overflow-y: auto; padding: var(--space-1) 0;
  min-height: 0;
}
.dir-item {
  display: flex; align-items: center; gap: var(--space-2);
  width: 100%; padding: var(--pad-item-y) var(--space-4);
  background: none; border: none; cursor: pointer;
  font-size: var(--text-base); color: var(--color-text-muted); text-align: left;
  transition: background var(--transition-fast);
  position: relative;
}
.dir-item:hover:not(.is-file) { background: var(--color-bg-surface); color: #cbd5e1; }
.dir-item.selected { background: var(--color-primary-bg); color: var(--color-primary-light); }
.dir-item.selected .item-icon { filter: none; }
.dir-item.project { color: var(--color-success-lighter); }
.dir-item.project.selected { background: var(--color-success-bg); color: var(--color-success-light); }
.dir-item.is-file { opacity: 0.35; cursor: default; }
.dir-item.parent { color: var(--color-text-faint); font-style: italic; }
.dir-item.parent:hover { background: var(--color-border-subtle); color: var(--color-text-secondary); }

.item-icon { font-size: var(--text-lg); flex-shrink: 0; width: 18px; text-align: center; }
.item-name { flex: 1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.project-badge {
  font-size: var(--text-2xs); font-weight: var(--font-bold);
  background: rgba(16,185,129,0.12); color: var(--color-success);
  padding: var(--pad-badge-y) 6px; border-radius: 8px; flex-shrink: 0;
}
.enter-hint {
  font-size: var(--text-2xs); color: var(--color-border-subtle); margin-left: auto;
  opacity: 0; transition: opacity var(--transition-base);
}
.dir-item:hover .enter-hint { opacity: 1; }

.dir-empty {
  padding: var(--space-6) var(--space-4); text-align: center;
  color: var(--color-border-subtle); font-size: var(--text-base);
}
.dir-loading {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-dimmed); font-size: var(--text-md); gap: var(--space-2);
}
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Selected preview */
.selected-preview {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--pad-item-y) 14px;
  background: #0a0f18; border-top: 1px solid var(--color-border-subtle);
  flex-shrink: 0; min-height: 32px;
}
.sel-label { font-size: var(--text-xs); color: var(--color-text-dimmed); font-weight: var(--font-bold); text-transform: uppercase; flex-shrink: 0; }
.sel-path  { font-size: var(--text-sm); font-family: monospace; color: var(--color-text-faint); word-break: break-all; }
.selected-preview.active .sel-path { color: var(--color-primary); }

/* Footer */
.picker-footer {
  display: flex; gap: var(--space-2); justify-content: flex-end;
  padding: var(--space-2-5) var(--space-4);
  background: var(--color-bg-base); border-top: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}
.btn-cancel {
  padding: 6px 16px; background: var(--color-border-subtle); border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md); font-size: var(--text-base); color: var(--color-text-muted); cursor: pointer;
}
.btn-cancel:hover { color: var(--color-text-secondary); }
.btn-select {
  padding: 6px 18px;
  background: var(--color-primary-bg); border: 1px solid rgba(99,102,241,0.35);
  border-radius: var(--radius-md); font-size: var(--text-base); color: var(--color-primary-light);
  cursor: pointer; font-weight: var(--font-semibold); transition: all var(--transition-base);
}
.btn-select:hover:not(:disabled) { background: rgba(99,102,241,0.28); color: var(--color-primary-light); }
.btn-select:disabled { opacity: 0.35; cursor: default; }
</style>
