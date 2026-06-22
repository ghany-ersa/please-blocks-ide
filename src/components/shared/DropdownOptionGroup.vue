<script setup>
defineProps({
  label: { type: String, required: true },
  items: { type: Array,  required: true }
})
defineEmits(['select'])
</script>

<template>
  <template v-if="items.length">
    <div class="opt-group-label">{{ label }}</div>
    <slot />
  </template>
</template>

<style scoped>
.opt-group-label {
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--color-text-dimmed);
  padding: var(--space-1-5) var(--pad-item-x) var(--space-0-5);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
}
</style>
