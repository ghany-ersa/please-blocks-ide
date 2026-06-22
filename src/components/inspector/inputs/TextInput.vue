<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  label:       { type: String, default: '' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="field">
    <label class="field-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input
      class="field-input"
      :class="{ 'has-error': error }"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
@import '@/styles/fieldInput.css';
</style>
