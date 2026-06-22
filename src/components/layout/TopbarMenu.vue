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
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-base);
}
.menu-trigger:hover      { color: var(--color-text-secondary); }
.menu-trigger.active     { color: var(--color-primary-light); }
.menu-trigger .mi        { font-size: var(--text-base); }
.caret { font-size: var(--text-2xs); opacity: 0.55; transition: transform var(--transition-base); }
.caret.flip { transform: rotate(180deg); }

.menu-pop {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 204px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xl);
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
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-base);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.menu-pop :deep(.menu-item:hover)    { background: var(--color-white-5); color: var(--color-text-primary); }
.menu-pop :deep(.menu-item.active)   { background: var(--color-primary-bg); color: var(--color-primary-light); }
.menu-pop :deep(.menu-item .mi)      { font-size: var(--text-lg); width: 16px; text-align: center; }
.menu-pop :deep(.menu-item .sub)     { margin-left: auto; font-size: var(--text-xs); color: var(--color-text-faint); font-family: monospace; }
.menu-pop :deep(.menu-sep)           { height: 1px; background: var(--color-border-subtle); margin: 3px 4px; }
.menu-pop :deep(.menu-head)          { font-size: 10.5px; font-weight: var(--font-bold); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-faint); padding: 4px 10px 2px; }
</style>
