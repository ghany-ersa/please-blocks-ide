<script setup>
/**
 * TopbarMenu.vue — dropdown menu untuk topbar.
 * Slot default berisi item menu (gunakan <button class="menu-item">).
 * Tutup otomatis saat klik di luar atau saat item dipilih (klik bubbling).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  label:  { type: String, required: true },
  icon:   { type: String, default: '' },
  active: { type: Boolean, default: false }   // ada sub-panel yang sedang terbuka
})

const open = ref(false)
const root = ref(null)

function toggle() { open.value = !open.value }
function close()  { open.value = false }

function onDocClick(e) {
  if (open.value && root.value && !root.value.contains(e.target)) close()
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="root" class="menu-wrap">
    <button class="menu-trigger" :class="{ active: open || active }" @click="toggle">
      <span v-if="icon" class="mi">{{ icon }}</span>{{ label }}
      <span class="caret" :class="{ flip: open }">▾</span>
    </button>
    <transition name="menu">
      <div v-if="open" class="menu-pop" @click="close">
        <slot />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.menu-wrap { position: relative; }

/* Trigger — tombol teks murni: tanpa kotak/border/background */
.menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 0px;
  background: none;
  border: none;
  font-size: 10px;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s;
}
.menu-trigger:hover      { color: #94a3b8; }
.menu-trigger.active     { color: #818cf8; }
.menu-trigger .mi        { font-size: 11px; }
.caret { font-size: 8px; opacity: 0.55; transition: transform 0.15s; }
.caret.flip { transform: rotate(180deg); }

.menu-pop {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 204px;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 5px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.45);
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Animasi buka/tutup */
.menu-enter-active, .menu-leave-active { transition: opacity 0.13s ease, transform 0.13s ease; }
.menu-enter-from, .menu-leave-to       { opacity: 0; transform: translateY(-4px); }

/* item menu — styling global agar slot content kena (deep) */
.menu-pop :deep(.menu-item) {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: none;
  border-radius: 5px;
  color: #94a3b8;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.menu-pop :deep(.menu-item:hover)    { background: rgba(255,255,255,0.05); color: #e2e8f0; }
.menu-pop :deep(.menu-item.active)   { background: rgba(99,102,241,0.15); color: #818cf8; }
.menu-pop :deep(.menu-item .mi)      { font-size: 13px; width: 16px; text-align: center; }
.menu-pop :deep(.menu-item .sub)     { margin-left: auto; font-size: 9px; color: #475569; font-family: monospace; }
.menu-pop :deep(.menu-sep)           { height: 1px; background: #1e293b; margin: 3px 4px; }
.menu-pop :deep(.menu-head)          { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; padding: 4px 10px 2px; }
</style>
