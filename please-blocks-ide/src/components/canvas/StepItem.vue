<script setup>
import { computed } from 'vue'
import { useBlockRegistry } from '@/stores/blockRegistry.js'
import { useCanvasStore } from '@/stores/canvasStore.js'

const props = defineProps({
  step:       { type: Object, required: true },
  testCaseId: { type: String, required: true },
  index:      { type: Number, required: true }
})

const emit = defineEmits(['select'])

const registry = useBlockRegistry()
const canvas   = useCanvasStore()

const block = computed(() => registry.getById(props.step.blockId))

const isActive = computed(() => canvas.activeStepId === props.step.id)

function onSelect() {
  canvas.selectStep(props.step.id)
  emit('select', props.step)
}

function onRemove(e) {
  e.stopPropagation()
  canvas.removeStep(props.step.id)
}

// Drag untuk reorder steps
function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('step-reorder', JSON.stringify({
    stepId:     props.step.id,
    testCaseId: props.testCaseId,
    fromIndex:  props.index
  }))
}
</script>

<template>
  <div
    v-if="block"
    class="step-item"
    :class="{ active: isActive }"
    :style="{ '--step-color': block.color, '--step-bg': block.colorBg }"
    draggable="true"
    @dragstart="onDragStart"
    @click="onSelect"
  >
    <span class="step-num">{{ index + 1 }}</span>
    <span class="step-icon">{{ block.icon }}</span>
    <span class="step-label">{{ block.label }}</span>

    <!-- Preview input utama jika ada -->
    <span v-if="step.inputs.selector" class="step-selector">{{ step.inputs.selector }}</span>
    <span v-else-if="step.inputs.urlTarget?.path" class="step-selector">{{ step.inputs.urlTarget.path }}</span>
    <span v-else-if="step.inputs.urlExpected?.path" class="step-selector">{{ step.inputs.urlExpected.path }}</span>

    <button class="step-remove" @click="onRemove" title="Hapus step">×</button>
  </div>

  <!-- Fallback jika block ID tidak ditemukan -->
  <div v-else class="step-item step-unknown">
    <span class="step-num">{{ index + 1 }}</span>
    <span>⚠️ Block tidak dikenal: {{ step.blockId }}</span>
    <button class="step-remove" @click="onRemove">×</button>
  </div>
</template>

<style scoped>
.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 5px;
  background: var(--step-bg);
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
  margin-bottom: 3px;
  user-select: none;
  position: relative;
}
.step-item:hover { border-color: var(--step-color); }
.step-item.active {
  border-color: var(--step-color);
  background: color-mix(in srgb, var(--step-bg) 200%, transparent);
}
.step-item:hover .step-remove { opacity: 1; }

.step-num {
  font-size: 9px;
  color: #475569;
  font-family: monospace;
  min-width: 14px;
  text-align: right;
  flex-shrink: 0;
}
.step-icon  { font-size: 11px; flex-shrink: 0; }
.step-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--step-color);
  flex-shrink: 0;
}
.step-selector {
  font-size: 9px;
  color: #475569;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.step-remove {
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.1s, color 0.1s;
  flex-shrink: 0;
  margin-left: auto;
}
.step-remove:hover { color: #ef4444; opacity: 1; }
.step-unknown {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.3);
  color: #fca5a5;
  font-size: 10px;
}
</style>
