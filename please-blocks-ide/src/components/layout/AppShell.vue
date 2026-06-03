<script setup>
import BlockPalette from '@/components/palette/BlockPalette.vue'
import CanvasEditor from '@/components/canvas/CanvasEditor.vue'
</script>

<template>
  <div class="shell">
    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">🧩</span>
        <span class="app-name">Please Blocks</span>
        <span class="app-version">v0.1 — Sprint 1</span>
      </div>
      <div class="topbar-center">
        <span class="project-name">my-automation-tests</span>
      </div>
      <div class="topbar-right">
        <button class="topbar-btn" title="Data Manager (Sprint 3)">📊 Data</button>
        <button class="topbar-btn" title="Component Builder (Sprint 3)">📦 Components</button>
        <button class="topbar-btn run" title="Run Test (Sprint 5)">▶ Run</button>
      </div>
    </header>

    <!-- Main area: palette + canvas -->
    <div class="main">
      <BlockPalette />
      <CanvasEditor />
    </div>

    <!-- Status bar -->
    <footer class="statusbar">
      <span>please-test v1.0.0</span>
      <span>·</span>
      <span>mocha + selenium-webdriver</span>
      <span class="spacer"></span>
      <span class="status-dot"></span>
      <span>Sprint 1 — Block Palette + Canvas Editor</span>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* TOP BAR */
.topbar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 40px;
  background: #0f1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  gap: 12px;
}
.topbar-left  { display: flex; align-items: center; gap: 8px; flex: 1; }
.topbar-center{ flex: 1; text-align: center; }
.topbar-right { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; }

.logo     { font-size: 16px; }
.app-name { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.app-version {
  font-size: 10px; color: #334155;
  background: #1e293b;
  padding: 2px 7px; border-radius: 10px;
}
.project-name {
  font-size: 11px; color: #64748b;
  font-family: monospace;
}
.topbar-btn {
  padding: 4px 10px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 5px;
  font-size: 10px;
  color: #64748b;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.topbar-btn:hover { color: #94a3b8; border-color: #475569; }
.topbar-btn.run {
  background: rgba(16,185,129,0.1);
  border-color: rgba(16,185,129,0.3);
  color: #10b981;
}
.topbar-btn.run:hover {
  background: rgba(16,185,129,0.2);
  border-color: #10b981;
}

/* MAIN */
.main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* STATUS BAR */
.statusbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 24px;
  background: #0a0d14;
  border-top: 1px solid #1e293b;
  font-size: 10px;
  color: #334155;
  flex-shrink: 0;
}
.spacer { flex: 1; }
.status-dot {
  width: 6px; height: 6px;
  background: #10b981;
  border-radius: 50%;
}
</style>
