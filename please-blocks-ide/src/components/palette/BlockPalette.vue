<script setup>
import { ref, computed } from 'vue'
import { useBlockRegistry } from '@/stores/blockRegistry.js'
import CategorySection from './CategorySection.vue'

const registry = useBlockRegistry()
const search = ref('')

const filteredCategories = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return registry.byCategory

  return registry.byCategory
    .map(cat => ({
      ...cat,
      blocks: cat.blocks.filter(b =>
        b.label.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      )
    }))
    .filter(cat => cat.blocks.length > 0)
})
</script>

<template>
  <aside class="palette">
    <div class="palette-header">
      <span class="palette-title">🧩 Blok</span>
    </div>

    <div class="palette-search">
      <input
        v-model="search"
        placeholder="Cari blok..."
        class="search-input"
      />
    </div>

    <div class="palette-body">
      <CategorySection
        v-for="cat in filteredCategories"
        :key="cat.id"
        :category="cat"
      />

      <div v-if="filteredCategories.length === 0" class="empty-search">
        Tidak ada blok untuk "<strong>{{ search }}</strong>"
      </div>

      <div class="palette-hint">
        <p>💡 Drag blok ke dalam Test Case di canvas</p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.palette {
  width: 196px;
  min-width: 196px;
  height: 100%;
  background: #111827;
  border-right: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.palette-header {
  padding: 12px 12px 8px;
  border-bottom: 1px solid #1e293b;
}
.palette-title {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}
.palette-search {
  padding: 8px 10px;
  border-bottom: 1px solid #1e293b;
}
.search-input {
  width: 100%;
  background: #0f1117;
  border: 1px solid #334155;
  border-radius: 5px;
  padding: 5px 9px;
  font-size: 11px;
  color: #e2e8f0;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: #6366f1; }
.search-input::placeholder { color: #475569; }
.palette-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px 0;
}
.empty-search {
  font-size: 11px;
  color: #475569;
  text-align: center;
  padding: 16px 8px;
}
.palette-hint {
  margin-top: 12px;
  padding: 10px 8px 14px;
  border-top: 1px solid #1e293b;
}
.palette-hint p {
  font-size: 10px;
  color: #334155;
  line-height: 1.5;
}
</style>
