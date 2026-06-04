<script setup>
import { computed } from 'vue'
import { useBlockRegistry } from '@/stores/blockRegistry.js'
import { useCanvasStore } from '@/stores/canvasStore.js'
import { useDataRegistry } from '@/stores/dataRegistry.js'
import { validateStep } from '@/core/blocks/stepValidator.js'

const props = defineProps({
  step:       { type: Object, required: true },
  testCaseId: { type: String, required: true },
  index:      { type: Number, required: true }
})

const emit = defineEmits(['select'])

const registry = useBlockRegistry()
const canvas   = useCanvasStore()
const dataReg  = useDataRegistry()

const block = computed(() => registry.getById(props.step.blockId))

const isActive = computed(() => canvas.activeStepId === props.step.id)

const validation = computed(() => {
  if (!block.value) return { valid: false, errorCount: 1, errors: {} }
  return validateStep(props.step, block.value, dataReg.entries)
})
const hasError = computed(() => !validation.value.valid)

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
    :class="{ active: isActive, 'has-error': hasError }"
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

    <!-- Validation error badge -->
    <span
      v-if="hasError"
      class="step-error-badge"
      :title="Object.values(validation.errors).join('\n')"
    >
      ⚠ {{ validation.errorCount }}
    </span>

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
.step-item.has-error {
  border-color: rgba(239,68,68,0.5) !important;
  background: rgba(239,68,68,0.05);
}
.step-item.has-error.active {
  border-color: rgba(239,68,68,0.8) !important;
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
.step-error-badge {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
  flex-shrink: 0;
  cursor: help;
  white-space: nowrap;
}
.step-unknown {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.3);
  color: #fca5a5;
  font-size: 10px;
}
</style>
