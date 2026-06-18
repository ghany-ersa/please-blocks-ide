<script setup>
import { ref } from 'vue'
import BlockCard from './BlockCard.vue'

defineProps({
  category: { type: Object, required: true }  // { id, meta, blocks[] }
})

const open = ref(true)
</script>

<template>
  <div class="category">
    <button class="cat-header" @click="open = !open">
      <span class="cat-icon">{{ category.meta.icon }}</span>
      <span class="cat-label">{{ category.meta.label }}</span>
      <span class="cat-count">{{ category.blocks.length }}</span>
      <span class="cat-arrow" :class="{ rotated: !open }">›</span>
    </button>
    <div class="cat-blocks" v-show="open">
      <BlockCard
        v-for="block in category.blocks"
        :key="block.id"
        :block="block"
      />
    </div>
  </div>
</template>

<style scoped>
.category {
  margin-bottom: var(--space-1);
}
.cat-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--pad-btn-y) var(--space-1-5);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  transition: background var(--transition-fast), color var(--transition-fast);
  text-align: left;
}
.cat-header:hover {
  background: var(--color-white-4);
  color: var(--color-text-secondary);
}
.cat-icon  { font-size: var(--text-md); }
.cat-label { font-size: var(--text-sm); font-weight: var(--font-bold); letter-spacing: var(--tracking-wider); text-transform: uppercase; flex: 1; }
.cat-count {
  font-size: var(--text-xs);
  background: var(--color-white-6);
  border-radius: var(--radius-pill);
  padding: var(--pad-badge-y) var(--pad-badge-x);
  color: var(--color-text-faint);
}
.cat-arrow {
  font-size: var(--text-xl);
  transition: transform var(--transition-slow);
  display: inline-block;
}
.cat-arrow.rotated { transform: rotate(90deg); }
.cat-blocks { padding: var(--space-1) 0 var(--space-1) var(--space-1); }
</style>
