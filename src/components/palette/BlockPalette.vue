<script setup>
import { ref } from 'vue'
import { usePaletteFilter } from '@/composables/usePaletteFilter.js'
import CategorySection from './CategorySection.vue'

const search = ref('')
const { filteredCategories } = usePaletteFilter(search)
</script>

<template>
  <aside class="palette">
    <div class="palette-header">
      <span class="brand-logo">🧩</span>
      <span class="brand-name">Please Blocks</span>
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
  width: 240px;
  min-width: 240px;
  height: 100%;
  background: var(--color-bg-surface);
  border-right: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.palette-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 40px;
  padding: 0 var(--space-3);
  box-sizing: border-box;
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}
.brand-logo { font-size: var(--text-2xl); }
.brand-name {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}
.palette-search {
  padding: var(--space-2) var(--space-2-5);
  border-bottom: 1px solid var(--color-border-subtle);
}
.search-input {
  width: 100%;
  background: var(--color-bg-base);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--pad-input-y) 9px;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-base);
}
.search-input:focus { border-color: var(--color-primary); }
.search-input::placeholder { color: var(--color-text-faint); }
.palette-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-2) 0;
}
.empty-search {
  font-size: var(--text-base);
  color: var(--color-text-faint);
  text-align: center;
  padding: var(--space-4) var(--space-2);
}
.palette-hint {
  margin-top: var(--space-3);
  padding: var(--space-2-5) var(--space-2) 14px;
  border-top: 1px solid var(--color-border-subtle);
}
.palette-hint p {
  font-size: var(--text-sm);
  color: var(--color-text-dimmed);
  line-height: var(--leading-normal);
}
</style>
