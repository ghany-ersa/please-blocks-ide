<script setup>
import { useCanvasStore } from '@/stores/canvasStore.js'

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
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--block-bg);
  border: 1px solid transparent;
  cursor: grab;
  transition: border-color 0.15s, transform 0.1s;
  user-select: none;
  margin-bottom: 4px;
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
  font-size: 13px;
  flex-shrink: 0;
}
.label {
  font-size: 11px;
  font-weight: 600;
  color: var(--block-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
