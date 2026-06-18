<script setup>
/**
 * CodePreview — panel kanan bawah.
 * Menampilkan kode JS yang di-generate dari Feature yang sedang aktif.
 * Update reaktif setiap kali canvas berubah.
 */
import { computed, ref } from 'vue'
import { useCanvasStore }   from '@/model/stores/canvasStore.js'
import { useBlockRegistry } from '@/model/stores/blockRegistry.js'
import { useDataRegistry }  from '@/model/stores/dataRegistry.js'
import { generateSpec, generateIndex } from '@/model/core/codegen/specGenerator.js'
import { useCodeHighlight } from '@/composables/useCodeHighlight.js'

const canvas   = useCanvasStore()
const registry = useBlockRegistry()
const dataReg  = useDataRegistry()
const mode     = ref('spec')  // 'spec' | 'index'
const { highlight } = useCodeHighlight()

// Feature yang sedang aktif
const activeFeature = computed(() =>
  canvas.features.find(f => f.id === canvas.activeFeatureId) || canvas.features[0] || null
)

// Generate kode setiap kali state berubah (computed otomatis reaktif)
const generatedCode = computed(() => {
  if (mode.value === 'index') return generateIndex(canvas.features)
  return generateSpec(activeFeature.value, registry, dataReg.entries)
})

const highlightedCode = computed(() => highlight(generatedCode.value))

// Copy to clipboard
const copied = ref(false)
async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // fallback silently
  }
}

function slugLabel(label) {
  return label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 20) || 'feature'
}
</script>

<template>
  <div class="code-preview">
    <!-- Header -->
    <div class="cp-header">
      <div class="cp-tabs">
        <button
          class="cp-tab"
          :class="{ active: mode === 'spec' }"
          @click="mode = 'spec'"
        >
          {{ activeFeature ? slugLabel(activeFeature.label) + '.spec.js' : 'spec.js' }}
        </button>
        <button
          class="cp-tab"
          :class="{ active: mode === 'index' }"
          @click="mode = 'index'"
        >
          index.js
        </button>
      </div>
      <button class="cp-copy" @click="copyCode" :class="{ done: copied }">
        {{ copied ? '✓ Copied' : '⎘ Copy' }}
      </button>
    </div>

    <!-- Code area -->
    <div class="cp-body">
      <pre
        class="code"
        v-html="highlightedCode"
      ></pre>
    </div>
  </div>
</template>

<style scoped>
.code-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-deepest);
  min-height: 0;
}

.cp-header {
  display: flex;
  align-items: center;
  padding: 0 var(--space-2);
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
  gap: var(--space-1);
}
.cp-tabs { display: flex; flex: 1; }
.cp-tab {
  padding: var(--space-1-5) var(--space-2-5);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--transition-base), border-color var(--transition-base);
  white-space: nowrap;
}
.cp-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
.cp-tab:hover:not(.active) { color: var(--color-text-muted); }

.cp-copy {
  padding: var(--space-px) var(--space-2);
  font-size: var(--text-xs);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-base);
}
.cp-copy.done { background: var(--color-success-bg); border-color: rgba(16,185,129,0.3); color: var(--color-success); }
.cp-copy:hover:not(.done) { background: var(--color-primary-bg); }

.cp-body {
  flex: 1;
  overflow: auto;
  padding: var(--space-2-5) var(--pad-col-x);
}
.code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.75;
  color: var(--syntax-default);
  white-space: pre;
  margin: 0;
}

/* Syntax token colors */
.code :deep(.cm)       { color: var(--syntax-comment); font-style: italic; }
.code :deep(.kw)       { color: var(--syntax-keyword); }
.code :deep(.str)      { color: var(--syntax-string); }
.code :deep(.fn)       { color: var(--syntax-function); }
.code :deep(.obj)      { color: var(--syntax-object); }
.code :deep(.flow)     { color: var(--color-primary-light); }
.code :deep(.data)     { color: var(--syntax-data); }
.code :deep(.data-key) { color: var(--syntax-data-key); }
</style>
