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
  margin-bottom: 4px;
}
.cat-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  color: #64748b;
  transition: background 0.1s, color 0.1s;
  text-align: left;
}
.cat-header:hover {
  background: rgba(255,255,255,0.04);
  color: #94a3b8;
}
.cat-icon  { font-size: 12px; }
.cat-label { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; flex: 1; }
.cat-count {
  font-size: 9px;
  background: rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 1px 5px;
  color: #475569;
}
.cat-arrow {
  font-size: 14px;
  transition: transform 0.2s;
  display: inline-block;
}
.cat-arrow.rotated { transform: rotate(90deg); }
.cat-blocks { padding: 4px 0 4px 4px; }
</style>
