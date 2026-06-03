<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore.js'
import StepItem from './StepItem.vue'

const props = defineProps({
  testCase:  { type: Object, required: true },
  featureId: { type: String, required: true }
})

const canvas   = useCanvasStore()
const editing  = ref(false)
const draftLabel = ref('')
const isDropOver = ref(false)

const isActive = computed(() => canvas.activeTestCaseId === props.testCase.id)

function startEdit() {
  draftLabel.value = props.testCase.label
  editing.value    = true
}

function saveLabel() {
  if (draftLabel.value.trim()) {
    canvas.updateTestCaseLabel(props.testCase.id, draftLabel.value.trim())
  }
  editing.value = false
}

function onRemove() {
  canvas.removeTestCase(props.testCase.id)
}

function onSelect() {
  canvas.selectTestCase(props.testCase.id, props.featureId)
}

// Drag-and-drop dari palette ke test case
function onDragOver(e) {
  e.preventDefault()
  e.stopPropagation()           // cegah CanvasEditor ikut merespons dragover
  e.dataTransfer.dropEffect = 'copy'
  isDropOver.value = true
}

function onDragLeave(e) {
  // Hanya reset jika kursor benar-benar keluar dari container,
  // bukan saat masuk ke child element (step item di dalam)
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDropOver.value = false
  }
}

function onDrop(e) {
  e.preventDefault()
  e.stopPropagation()           // ← kunci: cegah event naik ke CanvasEditor
  isDropOver.value = false

  // Drop dari palette (block baru)
  const blockId = e.dataTransfer.getData('text/plain')
  if (blockId) {
    canvas.addStep(props.testCase.id, blockId)
    canvas.clearDrag()
    return
  }

  // Drop dari reorder (step yang dipindah)
  const reorderData = e.dataTransfer.getData('step-reorder')
  if (reorderData) {
    // Reorder belum diimplementasi di Sprint 1, skip
    return
  }
}
</script>

<template>
  <div
    class="test-case"
    :class="{ active: isActive, 'drop-over': isDropOver }"
    @click.self="onSelect"
  >
    <!-- Header -->
    <div class="tc-header" @click="onSelect">
      <button
        class="tc-collapse"
        @click.stop="canvas.toggleTestCaseCollapse(testCase.id)"
        :title="testCase.collapsed ? 'Buka' : 'Tutup'"
      >
        {{ testCase.collapsed ? '›' : '⌄' }}
      </button>

      <span v-if="!editing" class="tc-label" @dblclick.stop="startEdit">
        🧪 {{ testCase.label }}
      </span>
      <input
        v-else
        v-model="draftLabel"
        class="tc-label-input"
        @blur="saveLabel"
        @keyup.enter="saveLabel"
        @keyup.escape="editing = false"
        @click.stop
        autofocus
      />

      <span class="tc-count">{{ testCase.steps.length }} step</span>
      <button class="tc-remove" @click.stop="onRemove" title="Hapus test case">×</button>
    </div>

    <!-- Steps (drop target) -->
    <div
      v-show="!testCase.collapsed"
      class="tc-steps"
      :class="{ 'drop-active': isDropOver }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <StepItem
        v-for="(step, idx) in testCase.steps"
        :key="step.id"
        :step="step"
        :test-case-id="testCase.id"
        :index="idx"
      />

      <!-- Drop zone hint -->
      <div v-if="testCase.steps.length === 0 || isDropOver" class="drop-hint">
        <span v-if="testCase.steps.length === 0 && !isDropOver">
          Drag blok dari palette ke sini
        </span>
        <span v-else-if="isDropOver" class="drop-hint-active">
          ＋ Lepas untuk tambah blok
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-case {
  background: rgba(168,85,247,0.04);
  border: 1px solid rgba(168,85,247,0.18);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
.test-case.active {
  border-color: rgba(168,85,247,0.5);
}
.test-case.drop-over {
  border-color: #a855f7;
  background: rgba(168,85,247,0.08);
}

.tc-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  cursor: pointer;
  border-radius: 7px 7px 0 0;
  transition: background 0.1s;
}
.tc-header:hover { background: rgba(168,85,247,0.06); }

.tc-collapse {
  background: none; border: none; cursor: pointer;
  color: #7c3aed; font-size: 14px; line-height: 1;
  padding: 0; flex-shrink: 0;
}
.tc-label {
  font-size: 11px;
  font-weight: 600;
  color: #c084fc;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tc-label-input {
  flex: 1;
  background: rgba(168,85,247,0.1);
  border: 1px solid #a855f7;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  color: #e2e8f0;
  outline: none;
}
.tc-count {
  font-size: 9px;
  color: #6b21a8;
  background: rgba(168,85,247,0.1);
  border-radius: 10px;
  padding: 1px 6px;
  flex-shrink: 0;
}
.tc-remove {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 15px; line-height: 1;
  opacity: 0; padding: 0 2px;
  transition: opacity 0.1s, color 0.1s;
  flex-shrink: 0;
}
.tc-header:hover .tc-remove { opacity: 1; }
.tc-remove:hover { color: #ef4444; }

.tc-steps {
  padding: 4px 8px 8px;
  min-height: 36px;
  border-radius: 0 0 7px 7px;
  transition: background 0.1s;
}
.tc-steps.drop-active {
  background: rgba(168,85,247,0.06);
}
.drop-hint {
  text-align: center;
  padding: 6px 0 2px;
}
.drop-hint span {
  font-size: 9.5px;
  color: #4b5563;
}
.drop-hint-active {
  color: #a855f7 !important;
  font-weight: 600;
}
</style>
