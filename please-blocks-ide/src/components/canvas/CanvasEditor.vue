<script setup>
import { useCanvasStore } from '@/stores/canvasStore.js'
import FeatureContainer from './FeatureContainer.vue'

const canvas = useCanvasStore()

function addFeature() {
  canvas.addFeature()
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
        <button class="empty-btn-secondary" @click="canvas.seedDemoData()">
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
  gap: 12px;
  padding: 8px 14px;
  background: #111827;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.toolbar-btn {
  padding: 5px 12px;
  border-radius: 5px;
  border: none;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.toolbar-btn.primary {
  background: #a855f7;
  color: white;
}
.toolbar-btn.primary:hover { opacity: 0.85; }

.toolbar-stats {
  display: flex;
  gap: 6px;
  font-size: 10px;
  color: #475569;
}

.canvas-area {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: #0d1117;
  background-image:
    radial-gradient(circle, #1e293b 1px, transparent 1px);
  background-size: 24px 24px;
  position: relative;
}

.features-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-height: 100%;
}

.add-feature-col {
  flex-shrink: 0;
  padding-top: 10px;
}
.add-feature-btn {
  width: 120px;
  height: 80px;
  background: rgba(168,85,247,0.04);
  border: 2px dashed rgba(168,85,247,0.15);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: border-color 0.15s, background 0.15s;
}
.add-feature-btn:hover {
  border-color: rgba(168,85,247,0.4);
  background: rgba(168,85,247,0.08);
}
.af-icon  { font-size: 20px; color: #4c1d95; }
.af-label { font-size: 10px; color: #6b21a8; font-weight: 600; }

/* Empty state */
.canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
}
.canvas-empty > * { pointer-events: all; }
.empty-icon { font-size: 40px; margin-bottom: 4px; }
.canvas-empty h3 { font-size: 16px; color: #374151; font-weight: 700; }
.canvas-empty p  { font-size: 12px; color: #374151; text-align: center; line-height: 1.6; }
.canvas-empty strong { color: #6b21a8; }
.empty-btn {
  margin-top: 4px;
  padding: 8px 20px;
  background: #a855f7;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.empty-btn:hover { opacity: 0.85; }
.empty-btn-secondary {
  padding: 6px 16px;
  background: none;
  color: #475569;
  border: 1px solid #1e293b;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.empty-btn-secondary:hover { border-color: #334155; color: #94a3b8; }
</style>
