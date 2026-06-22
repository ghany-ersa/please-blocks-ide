<script setup>
const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  placeholder: { type: String, default: '0' },
  label:       { type: String, default: '' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' },
  unit:        { type: String,  default: '' }  // contoh: 'ms'
})

const emit = defineEmits(['update:modelValue'])

function onInput(e) {
  const v = e.target.value
  emit('update:modelValue', v === '' ? '' : Number(v))
}
</script>

<template>
  <div class="field">
    <label class="field-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <div class="input-wrap">
      <input
        class="field-input"
        :class="{ 'has-error': error }"
        type="number"
        :value="modelValue"
        :placeholder="placeholder"
        min="0"
        @input="onInput"
      />
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
@import '@/styles/fieldInput.css';

.input-wrap  { display: flex; align-items: center; gap: var(--space-1-5); }
.field-input { flex: 1; width: auto; font-family: monospace; }
.unit { font-size: var(--text-sm); color: var(--color-text-faint); flex-shrink: 0; }
</style>
