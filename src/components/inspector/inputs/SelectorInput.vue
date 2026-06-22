<script setup>
/**
 * SelectorInput — input khusus untuk CSS/XPath/id selector.
 * Fitur: auto-detect tipe, validasi syntax, tombol copy, hint contoh interaktif.
 */
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '#id, .class, //xpath, link=teks' },
  label:       { type: String, default: 'Selector' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' }
})

const emit = defineEmits(['update:modelValue'])

// ── Deteksi tipe ────────────────────────────────────────────────────

const selectorType = computed(() => {
  const v = (props.modelValue || '').trim()
  if (!v) return null
  if (v.startsWith('//') || v.startsWith('(//'))
    return { id: 'xpath', label: 'XPath',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
  if (v.startsWith('#'))
    return { id: 'id',    label: 'ID',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)' }
  if (v.startsWith('link='))
    return { id: 'link',  label: 'Link',   color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' }
  if (v.startsWith('.') || /[\s>+~[\]:()]/.test(v))
    return { id: 'css',   label: 'CSS',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(v))
    return { id: 'name',  label: 'Name',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
  return { id: 'css', label: 'CSS', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
})

// ── Validasi syntax ─────────────────────────────────────────────────

const syntaxError = computed(() => {
  const v = (props.modelValue || '').trim()
  if (!v) return null
  const t = selectorType.value
  if (!t) return null

  if (t.id === 'xpath') {
    // XPath dasar: harus mulai //, (// atau punya operator valid
    if (!/^[\(\/]/.test(v)) return 'XPath harus dimulai dengan // atau (//'
    if (/[\s]{2,}/.test(v) && !v.includes('normalize-space'))
      return null // biarkan lolos, whitespace bisa intentional
  }
  if (t.id === 'id') {
    if (v === '#') return 'ID tidak boleh kosong (contoh: #username)'
    if (/\s/.test(v)) return 'ID tidak boleh mengandung spasi'
  }
  if (t.id === 'link') {
    if (v === 'link=') return 'Teks link tidak boleh kosong'
  }
  if (t.id === 'css') {
    // Cek tanda kurung tidak pasang
    const open  = (v.match(/\(/g) || []).length
    const close = (v.match(/\)/g) || []).length
    if (open !== close) return 'Tanda kurung ( ) tidak seimbang'
    const openBr  = (v.match(/\[/g) || []).length
    const closeBr = (v.match(/\]/g) || []).length
    if (openBr !== closeBr) return 'Tanda kurung [ ] tidak seimbang'
  }
  return null
})

const displayError = computed(() => props.error || syntaxError.value)

// ── Copy ────────────────────────────────────────────────────────────

const copied = ref(false)
async function copySelector() {
  if (!props.modelValue) return
  await navigator.clipboard.writeText(props.modelValue)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

// ── Hint chips interaktif ────────────────────────────────────────────

const HINTS = [
  { format: '#',      example: '#username',               title: 'ID element',       color: '#6366f1' },
  { format: '.',      example: '.btn-submit',             title: 'CSS class',        color: '#10b981' },
  { format: '//',     example: '//input[@id="user"]',     title: 'XPath',            color: '#f59e0b' },
  { format: 'link=',  example: 'link=Lupa Password',      title: 'Link text',        color: '#0ea5e9' },
  { format: '[',      example: '[data-testid="login"]',   title: 'Attribute (CSS)',  color: '#10b981' },
]

function applyHint(hint) {
  // Jika input kosong atau hanya berisi format sebelumnya, ganti dengan contoh
  const v = props.modelValue || ''
  if (!v || HINTS.some(h => v === h.format)) {
    emit('update:modelValue', hint.example)
  } else {
    emit('update:modelValue', hint.format)
  }
}
</script>

<template>
  <div class="field">
    <label class="field-label">
      <span class="label-text">{{ label }}<span v-if="required" class="required">*</span></span>
      <span
        v-if="selectorType"
        class="sel-badge"
        :style="{ color: selectorType.color, background: selectorType.bg, borderColor: selectorType.color + '55' }"
      >
        {{ selectorType.label }}
      </span>
    </label>

    <div class="input-wrap" :class="{ 'has-error': displayError, 'has-value': !!modelValue }">
      <input
        class="field-input mono"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        @input="emit('update:modelValue', $event.target.value)"
        spellcheck="false"
        autocomplete="off"
      />
      <button
        v-if="modelValue"
        class="btn-copy"
        :class="{ done: copied }"
        @click="copySelector"
        :title="copied ? 'Disalin!' : 'Salin selector'"
        tabindex="-1"
      >
        {{ copied ? '✓' : '⎘' }}
      </button>
    </div>

    <!-- Error -->
    <div v-if="displayError" class="sel-error">
      <span class="error-icon">⚠</span>
      {{ displayError }}
    </div>

    <!-- Hint chips -->
    <div class="sel-hints">
      <button
        v-for="hint in HINTS"
        :key="hint.format"
        class="hint-chip"
        :title="hint.title + ' — klik untuk contoh: ' + hint.example"
        @click="applyHint(hint)"
        :style="{ '--chip-color': hint.color }"
      >
        {{ hint.format }}
      </button>
    </div>

    <!-- Contoh saat tipe terdeteksi -->
    <div v-if="selectorType && !modelValue" class="sel-guide" :style="{ color: selectorType.color }">
      <template v-if="selectorType.id === 'xpath'">contoh: <code>//button[text()='Login']</code></template>
      <template v-else-if="selectorType.id === 'id'">contoh: <code>#username</code></template>
      <template v-else-if="selectorType.id === 'css'">contoh: <code>.btn-submit</code> atau <code>input[type="text"]</code></template>
      <template v-else-if="selectorType.id === 'link'">contoh: <code>link=Lupa Password</code></template>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/fieldInput.css';

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.label-text { display: flex; align-items: center; gap: 3px; }

.sel-badge {
  font-size: var(--text-2xs);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid;
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  transition: all var(--transition-base);
}

/* Input wrapper dengan tombol copy */
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-wrap .field-input {
  flex: 1;
  padding-right: 28px;
}
.input-wrap.has-error .field-input { border-color: var(--color-danger); }

.btn-copy {
  position: absolute;
  right: 5px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--text-md);
  color: var(--color-text-dimmed);
  padding: 2px 3px;
  border-radius: var(--radius-sm);
  transition: all 0.12s;
  line-height: var(--leading-none);
}
.btn-copy:hover { color: var(--color-text-secondary); background: var(--color-border-subtle); }
.btn-copy.done  { color: var(--color-success); }

/* Error */
.sel-error {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 11.5px;
  color: var(--color-danger);
  margin-top: 3px;
  line-height: var(--leading-tight);
}
.error-icon { font-size: var(--text-sm); flex-shrink: 0; }

/* Hint chips */
.sel-hints {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2-5);
}
.hint-chip {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  font-weight: var(--font-semibold);
  padding: 2px 7px;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  color: var(--color-text-faint);
  cursor: pointer;
  transition: all 0.12s;
}
.hint-chip:hover {
  color: var(--chip-color, var(--color-text-secondary));
  border-color: var(--chip-color, var(--color-text-dimmed));
  background: color-mix(in srgb, var(--chip-color, var(--color-text-dimmed)) 10%, var(--color-bg-surface));
}

/* Guide teks */
.sel-guide {
  font-size: var(--text-xs);
  margin-top: var(--space-1);
  opacity: 0.7;
}
.sel-guide code {
  font-family: var(--font-mono);
  background: var(--color-border-subtle);
  padding: 1px var(--space-1);
  border-radius: var(--radius-sm);
}
</style>
