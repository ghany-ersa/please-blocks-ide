<script setup>
import { useCanvasStore } from '@/model/stores/canvasStore.js'

const props = defineProps({
  block: { type: Object, required: true }
})

const canvas = useCanvasStore()

function onDragStart(event) {
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', props.block.id)
  canvas.setDraggingBlock(props.block.id)
}

function onDragEnd() {
  canvas.clearDrag()
}
</script>

<template>
  <div
    class="block-card"
    :style="{ '--block-color': block.color, '--block-bg': block.colorBg }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    :title="block.description"
  >
    <span class="icon">{{ block.icon }}</span>
    <span class="label">{{ block.label }}</span>
  </div>
</template>

<style scoped>
.block-card {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: var(--space-1-5) var(--space-2-5);
  border-radius: var(--radius-lg);
  background: var(--block-bg);
  border: 1px solid transparent;
  cursor: grab;
  transition: border-color var(--transition-base), transform var(--transition-fast);
  user-select: none;
  margin-bottom: var(--space-1);
}
.block-card:hover {
  border-color: var(--block-color);
  transform: translateX(2px);
}
.block-card:active {
  cursor: grabbing;
  transform: scale(0.97);
}
.icon {
  font-size: var(--text-lg);
  flex-shrink: 0;
}
.label {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--block-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
