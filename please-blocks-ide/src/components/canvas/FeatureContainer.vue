<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/model/stores/canvasStore.js'
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
  border-radius: var(--radius-xl);
  flex-shrink: 0;
  transition: border-color var(--transition-base), box-shadow var(--transition-base), opacity var(--transition-slow);
}
.feature.active {
  border-color: rgba(168,85,247,0.45);
  box-shadow: 0 0 0 1px rgba(168,85,247,0.15);
}

.feat-toggle {
  background: none; border: none; cursor: pointer;
  font-size: var(--text-base); padding: 0 var(--space-1); flex-shrink: 0;
  color: var(--color-text-faint); transition: color var(--transition-base);
}
.feat-toggle.enabled { color: var(--color-success); }
.feat-toggle:not(.enabled) { color: var(--color-text-ghost); }
.feat-toggle:hover { opacity: 0.8; }

.feat-label.disabled,
.feat-stats.disabled { opacity: 0.4; text-decoration: line-through; }

.feat-header {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: var(--space-2-5) var(--pad-col-x);
  border-bottom: 1px solid rgba(168,85,247,0.15);
  cursor: pointer;
  border-radius: 9px 9px 0 0;
  transition: background var(--transition-fast);
}
.feat-header:hover { background: rgba(168,85,247,0.05); }

.feat-icon { font-size: var(--text-xl); flex-shrink: 0; }
.feat-label {
  font-size: var(--text-md);
  font-weight: var(--font-bold);
  color: var(--color-purple);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feat-label-input {
  flex: 1;
  background: var(--color-purple-bg-mid);
  border: 1px solid var(--color-purple);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-1-5);
  font-size: var(--text-md);
  color: var(--color-text-primary);
  outline: none;
}
.feat-stats {
  font-size: var(--text-xs);
  color: var(--color-purple-comp);
  background: var(--color-purple-bg-mid);
  border-radius: var(--radius-pill);
  padding: var(--space-0-5) 7px;
  white-space: nowrap;
  flex-shrink: 0;
}
.feat-collapse {
  background: none; border: none; cursor: pointer;
  color: var(--color-purple-dark); font-size: var(--text-2xl); line-height: var(--leading-none);
  padding: 0; flex-shrink: 0;
}
.feat-remove {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-faint); font-size: var(--text-2xl); line-height: var(--leading-none);
  opacity: 0; padding: 0 var(--space-0-5);
  transition: opacity var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}
.feat-header:hover .feat-remove { opacity: 1; }
.feat-remove:hover { color: var(--color-danger); }

.feat-body { padding: var(--space-2-5); }

.feat-empty {
  font-size: var(--text-sm);
  color: var(--color-text-ghost);
  text-align: center;
  padding: var(--pad-col-y) var(--space-2);
  border: 1px dashed #1f2937;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2);
}

.feat-add-tc {
  width: 100%;
  background: none;
  border: 1px dashed rgba(168,85,247,0.25);
  border-radius: var(--radius-lg);
  padding: var(--space-1-5);
  font-size: var(--text-sm);
  color: var(--color-purple-comp);
  cursor: pointer;
  transition: border-color var(--transition-base), color var(--transition-base), background var(--transition-base);
}
.feat-add-tc:hover {
  border-color: var(--color-purple);
  color: var(--color-purple-light);
  background: rgba(168,85,247,0.06);
}
</style>
