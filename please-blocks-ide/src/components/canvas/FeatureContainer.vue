<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore.js'
import TestCaseBlock from './TestCaseBlock.vue'

const props = defineProps({
  feature: { type: Object, required: true }
})

const canvas  = useCanvasStore()
const editing = ref(false)
const draftLabel = ref('')

const isActive = computed(() => canvas.activeFeatureId === props.feature.id)

function startEdit() {
  draftLabel.value = props.feature.label
  editing.value    = true
}

function saveLabel() {
  if (draftLabel.value.trim()) {
    canvas.updateFeatureLabel(props.feature.id, draftLabel.value.trim())
  }
  editing.value = false
}

function addTestCase() {
  canvas.addTestCase(props.feature.id)
}

function onRemove() {
  if (confirm(`Hapus feature "${props.feature.label}"?\nSemua test case di dalamnya akan terhapus.`)) {
    canvas.removeFeature(props.feature.id)
  }
}

function onSelect() {
  canvas.selectFeature(props.feature.id)
}
</script>

<template>
  <div
    class="feature"
    :class="{ active: isActive }"
    @click.self="onSelect"
  >
    <!-- Feature Header -->
    <div class="feat-header" @click="onSelect">
      <!-- Toggle enabled/disabled -->
      <button
        class="feat-toggle"
        :class="{ enabled: feature.enabled !== false }"
        @click.stop="canvas.toggleFeatureEnabled(feature.id)"
        :title="feature.enabled !== false ? 'Klik untuk nonaktifkan (comment di index.js)' : 'Klik untuk aktifkan'"
      >
        {{ feature.enabled !== false ? '▶' : '⏸' }}
      </button>

      <span v-if="!editing" class="feat-label" @dblclick.stop="startEdit"
        :class="{ disabled: feature.enabled === false }">
        {{ feature.label }}
      </span>
      <input
        v-else
        v-model="draftLabel"
        class="feat-label-input"
        @blur="saveLabel"
        @keyup.enter="saveLabel"
        @keyup.escape="editing = false"
        @click.stop
        autofocus
      />

      <span class="feat-stats" :class="{ disabled: feature.enabled === false }">
        {{ feature.testCases.length }} TC ·
        {{ feature.testCases.reduce((s, tc) => s + tc.steps.length, 0) }} step
      </span>

      <button
        class="feat-collapse"
        @click.stop="canvas.toggleFeatureCollapse(feature.id)"
        :title="feature.collapsed ? 'Buka' : 'Tutup'"
      >
        {{ feature.collapsed ? '›' : '⌄' }}
      </button>

      <button class="feat-remove" @click.stop="onRemove" title="Hapus feature">×</button>
    </div>

    <!-- Test Cases -->
    <div v-show="!feature.collapsed" class="feat-body">
      <TestCaseBlock
        v-for="tc in feature.testCases"
        :key="tc.id"
        :test-case="tc"
        :feature-id="feature.id"
      />

      <!-- Empty state -->
      <div v-if="feature.testCases.length === 0" class="feat-empty">
        Belum ada test case. Klik tombol di bawah untuk menambahkan.
      </div>

      <!-- Add Test Case button -->
      <button class="feat-add-tc" @click="addTestCase">
        + Tambah Test Case
      </button>
    </div>
  </div>
</template>

<style scoped>
.feature {
  width: 320px;
  min-width: 320px;
  background: rgba(168,85,247,0.03);
  border: 1px solid rgba(168,85,247,0.2);
  border-radius: 10px;
  flex-shrink: 0;
  transition: border-color 0.15s, box-shadow 0.15s, opacity 0.2s;
}
.feature.active {
  border-color: rgba(168,85,247,0.45);
  box-shadow: 0 0 0 1px rgba(168,85,247,0.15);
}

/* Toggle button */
.feat-toggle {
  background: none; border: none; cursor: pointer;
  font-size: 11px; padding: 0 4px; flex-shrink: 0;
  color: #475569; transition: color 0.15s;
}
.feat-toggle.enabled { color: #10b981; }
.feat-toggle:not(.enabled) { color: #4b5563; }
.feat-toggle:hover { opacity: 0.8; }

/* Dim labels when disabled */
.feat-label.disabled,
.feat-stats.disabled { opacity: 0.4; text-decoration: line-through; }

.feat-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(168,85,247,0.15);
  cursor: pointer;
  border-radius: 9px 9px 0 0;
  transition: background 0.1s;
}
.feat-header:hover { background: rgba(168,85,247,0.05); }

.feat-icon { font-size: 14px; flex-shrink: 0; }
.feat-label {
  font-size: 12px;
  font-weight: 700;
  color: #a855f7;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feat-label-input {
  flex: 1;
  background: rgba(168,85,247,0.1);
  border: 1px solid #a855f7;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  color: #e2e8f0;
  outline: none;
}
.feat-stats {
  font-size: 9px;
  color: #6b21a8;
  background: rgba(168,85,247,0.1);
  border-radius: 10px;
  padding: 2px 7px;
  white-space: nowrap;
  flex-shrink: 0;
}
.feat-collapse {
  background: none; border: none; cursor: pointer;
  color: #7c3aed; font-size: 16px; line-height: 1;
  padding: 0; flex-shrink: 0;
}
.feat-remove {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 16px; line-height: 1;
  opacity: 0; padding: 0 2px;
  transition: opacity 0.1s, color 0.1s;
  flex-shrink: 0;
}
.feat-header:hover .feat-remove { opacity: 1; }
.feat-remove:hover { color: #ef4444; }

.feat-body {
  padding: 10px;
}

.feat-empty {
  font-size: 10px;
  color: #374151;
  text-align: center;
  padding: 12px 8px;
  border: 1px dashed #1f2937;
  border-radius: 6px;
  margin-bottom: 8px;
}

.feat-add-tc {
  width: 100%;
  background: none;
  border: 1px dashed rgba(168,85,247,0.25);
  border-radius: 6px;
  padding: 6px;
  font-size: 10px;
  color: #6b21a8;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.feat-add-tc:hover {
  border-color: #a855f7;
  color: #c084fc;
  background: rgba(168,85,247,0.06);
}
</style>
