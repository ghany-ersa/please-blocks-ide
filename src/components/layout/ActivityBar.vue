<script setup>
/**
 * ActivityBar.vue — strip ikon vertikal di paling kiri (gaya VSCode).
 * Mengganti view di area utama: Canvas / Data / Components / .env.
 * View tipis: hanya v-model, tanpa logika store.
 */
defineProps({
  modelValue: { type: String, default: 'canvas' }
})
const emit = defineEmits(['update:modelValue'])

const items = [
  { id: 'canvas',     icon: '🧩', label: 'Canvas' },
  { id: 'data',       icon: '📊', label: 'Data Manager' },
  { id: 'components', icon: '📦', label: 'Components' },
  { id: 'env',        icon: '⚙️', label: 'Environment (.env)' },
]
</script>

<template>
  <nav class="activity-bar">
    <button
      v-for="item in items"
      :key="item.id"
      class="ab-item"
      :class="{ active: modelValue === item.id }"
      :title="item.label"
      @click="emit('update:modelValue', item.id)"
    >
      <span class="ab-icon">{{ item.icon }}</span>
    </button>
  </nav>
</template>

<style scoped>
.activity-bar {
  width: 48px;
  min-width: 48px;
  background: var(--color-bg-deepest);
  border-right: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6px;
  gap: 2px;
  flex-shrink: 0;
}
.ab-item {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity var(--transition-base), background var(--transition-base), border-color var(--transition-base);
}
.ab-item:hover { opacity: 0.9; background: var(--color-white-3); }
.ab-item.active {
  opacity: 1;
  border-left-color: var(--color-primary);
  background: var(--color-primary-bg);
}
.ab-icon { font-size: var(--text-3xl); }
</style>
