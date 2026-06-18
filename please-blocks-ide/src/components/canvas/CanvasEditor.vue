<script setup>
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'
import FeatureContainer from './FeatureContainer.vue'

const canvas    = useCanvasStore()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()

function addFeature() {
  canvas.addFeature()
}

// Demo lengkap: seed data (URL/ACCOUNT) + component Auth dulu, baru canvas —
// agar dataref & component call di feature contoh ter-resolve dengan benar.
function loadDemo() {
  dataReg.reset()
  compStore.reset()
  canvas.seedDemoData()
}

// Drop pada area canvas kosong (bukan di dalam feature/testcase)
function onCanvasDrop(e) {
  e.preventDefault()
  const blockId = e.dataTransfer.getData('text/plain')
  if (!blockId) return

  // Buat feature + test case + step secara otomatis
  const f  = canvas.addFeature('Feature Baru')
  const tc = canvas.addTestCase(f.id, 'Test Case Baru')
  canvas.addStep(tc.id, blockId)
  canvas.clearDrag()
}

function onCanvasDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}
</script>

<template>
  <div class="canvas-wrap">
    <!-- Toolbar atas canvas -->
    <div class="canvas-toolbar">
      <button class="toolbar-btn primary" @click="addFeature">
        + Feature
      </button>
      <div class="toolbar-stats">
        <span>{{ canvas.features.length }} feature</span>
        <span>·</span>
        <span>{{ canvas.totalTestCases }} test case</span>
        <span>·</span>
        <span>{{ canvas.totalSteps }} step</span>
      </div>
    </div>

    <!-- Area canvas utama -->
    <div
      class="canvas-area"
      @dragover="onCanvasDragOver"
      @drop="onCanvasDrop"
    >
      <!-- Features side by side -->
      <div class="features-row" v-if="canvas.features.length > 0">
        <FeatureContainer
          v-for="feature in canvas.features"
          :key="feature.id"
          :feature="feature"
        />

        <!-- Tombol add feature di akhir row -->
        <div class="add-feature-col">
          <button class="add-feature-btn" @click="addFeature">
            <span class="af-icon">＋</span>
            <span class="af-label">Tambah Feature</span>
          </button>
        </div>
      </div>

      <!-- Empty state canvas -->
      <div v-else class="canvas-empty">
        <div class="empty-icon">🧩</div>
        <h3>Canvas Kosong</h3>
        <p>Klik <strong>+ Feature</strong> untuk mulai, atau<br>drag blok dari palette ke sini</p>
        <button class="empty-btn" @click="addFeature">+ Tambah Feature Pertama</button>
        <button class="empty-btn-secondary" @click="loadDemo">
          ✨ Muat Demo Data
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 14px;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}
.toolbar-btn {
  padding: var(--pad-btn-y) var(--pad-btn-x);
  border-radius: var(--radius-md);
  border: none;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: opacity var(--transition-base);
}
.toolbar-btn.primary {
  background: var(--color-purple);
  color: white;
}
.toolbar-btn.primary:hover { opacity: 0.85; }

.toolbar-stats {
  display: flex;
  gap: var(--space-1-5);
  font-size: var(--text-sm);
  color: var(--color-text-faint);
}

.canvas-area {
  flex: 1;
  overflow: auto;
  padding: var(--space-5);
  background: #0d1117;
  background-image: radial-gradient(circle, var(--color-border-subtle) 1px, transparent 1px);
  background-size: 24px 24px;
  position: relative;
}

.features-row {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  min-height: 100%;
}

.add-feature-col {
  flex-shrink: 0;
  padding-top: var(--space-2-5);
}
.add-feature-btn {
  width: 120px;
  height: 80px;
  background: var(--color-purple-bg);
  border: 2px dashed rgba(168,85,247,0.15);
  border-radius: var(--radius-xl);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  transition: border-color var(--transition-base), background var(--transition-base);
}
.add-feature-btn:hover {
  border-color: rgba(168,85,247,0.4);
  background: var(--color-purple-bg-mid);
}
.af-icon  { font-size: var(--text-icon); color: #4c1d95; }
.af-label { font-size: var(--text-sm); color: var(--color-purple-comp); font-weight: var(--font-semibold); }

/* Empty state */
.canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2-5);
  pointer-events: none;
}
.canvas-empty > * { pointer-events: all; }
.empty-icon { font-size: var(--text-hero); margin-bottom: var(--space-1); }
.canvas-empty h3 { font-size: var(--text-2xl); color: var(--color-text-ghost); font-weight: var(--font-bold); }
.canvas-empty p  { font-size: var(--text-md); color: var(--color-text-ghost); text-align: center; line-height: 1.6; }
.canvas-empty strong { color: var(--color-purple-comp); }
.empty-btn {
  margin-top: var(--space-1);
  padding: var(--space-2) var(--space-5);
  background: var(--color-purple);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: opacity var(--transition-base);
}
.empty-btn:hover { opacity: 0.85; }
.empty-btn-secondary {
  padding: var(--pad-btn-y) var(--space-4);
  background: none;
  color: var(--color-text-faint);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  font-size: var(--text-base);
  cursor: pointer;
  transition: border-color var(--transition-base), color var(--transition-base);
}
.empty-btn-secondary:hover { border-color: var(--color-border-default); color: var(--color-text-secondary); }
</style>
