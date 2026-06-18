<script setup>
/**
 * ProjectGate.vue — layar awal "New / Open Project".
 * Tampil saat belum ada projectPath. Canvas terkunci sampai project dipilih.
 *
 * - New Project : pilih folder (idealnya kosong) → reset stores → set path.
 * - Open Project: pilih folder existing → baca + import isi → set path.
 * Keduanya butuh server lokal (DirectoryPicker & read-project pakai endpoint).
 */
import { ref } from 'vue'
import DirectoryPicker from '@/components/shared/DirectoryPicker.vue'
import { useRunnerStore }       from '@/model/stores/runnerStore.js'
import { useProjectWorkspace }  from '@/composables/useProjectWorkspace.js'

const runner = useRunnerStore()   // hanya untuk serverAvailable di template
const { openProject, newProject } = useProjectWorkspace()

const mode    = ref(null)   // null | 'new' | 'open' → picker yang aktif
const loading = ref(false)
const error   = ref('')

function startNew()  { error.value = ''; mode.value = 'new' }
function startOpen() { error.value = ''; mode.value = 'open' }
function cancelPick(){ mode.value = null }

async function onFolderSelected(path) {
  const chosen = mode.value
  mode.value = null
  error.value = ''

  if (chosen === 'new') {
    newProject(path)
    return
  }

  // Open: baca folder & muat sebagai workspace (orkestrasi di ViewModel).
  loading.value = true
  const res = await openProject(path)
  loading.value = false
  if (!res.ok) error.value = res.error
}
</script>

<template>
  <div class="gate">
    <div class="gate-card">
      <div class="gate-brand">
        <span class="logo">🧩</span>
        <span class="name">Please Blocks</span>
      </div>
      <p class="gate-sub">Pilih project untuk mulai bekerja</p>

      <template v-if="runner.serverAvailable">
        <div class="gate-actions">
          <button class="gate-btn new" :disabled="loading" @click="startNew">
            <span class="ic">✨</span>
            <span class="t">New Project</span>
            <span class="d">Mulai dari folder kosong</span>
          </button>
          <button class="gate-btn open" :disabled="loading" @click="startOpen">
            <span class="ic">📂</span>
            <span class="t">Open Project</span>
            <span class="d">Buka folder project sebagai workspace</span>
          </button>
        </div>

        <p v-if="loading" class="gate-state">⏳ Membuka project…</p>
        <p v-else-if="error" class="gate-state err">⚠ {{ error }}</p>
      </template>

      <div v-else class="gate-noserver">
        <p class="big">⚠ Server lokal tidak aktif</p>
        <p>Jalankan <code>npm run dev</code> di terminal, lalu muat ulang halaman ini untuk memilih project.</p>
        <button class="retry" @click="runner.checkServer()">↻ Cek lagi</button>
      </div>
    </div>

    <!-- Picker untuk New / Open Project -->
    <DirectoryPicker
      v-if="mode"
      @select="onFolderSelected"
      @close="cancelPick"
    />
  </div>
</template>

<style scoped>
.gate {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg-deepest);
}
.gate-card {
  width: 460px; max-width: 92vw;
  background: var(--color-bg-surface); border: 1px solid var(--color-border-subtle); border-radius: 14px;
  padding: 34px 32px;
  box-shadow: var(--shadow-xl);
  text-align: center;
}
.gate-brand { display: flex; align-items: center; justify-content: center; gap: 10px; }
.gate-brand .logo { font-size: 30px; }
.gate-brand .name { font-size: var(--text-2xl); font-weight: var(--font-extrabold); color: var(--color-text-primary); letter-spacing: -0.01em; }
.gate-sub { margin: 8px 0 26px; font-size: var(--text-md); color: var(--color-text-muted); }

.gate-actions { display: flex; gap: var(--space-3); }
.gate-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--space-1);
  padding: 20px 14px; border-radius: 10px; cursor: pointer;
  background: var(--color-bg-base); border: 1px solid var(--color-border-subtle);
  transition: all var(--transition-base);
}
.gate-btn:hover:not(:disabled) { border-color: var(--color-primary); background: rgba(99,102,241,0.06); }
.gate-btn:disabled { opacity: 0.5; cursor: default; }
.gate-btn .ic { font-size: 28px; }
.gate-btn .t  { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-text-primary); margin-top: var(--space-1); }
.gate-btn .d  { font-size: var(--text-sm); color: var(--color-text-muted); line-height: 1.4; }
.gate-btn.new:hover:not(:disabled)  { border-color: var(--color-success); background: rgba(16,185,129,0.06); }

.gate-state { margin-top: 18px; font-size: var(--text-md); color: var(--color-text-muted); }
.gate-state.err { color: var(--color-danger-light); }

.gate-noserver { color: var(--color-text-secondary); }
.gate-noserver .big { font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--color-warning); margin-bottom: var(--space-2); }
.gate-noserver p { font-size: var(--text-md); line-height: 1.6; }
.gate-noserver code { background: var(--color-border-subtle); padding: 1px 7px; border-radius: var(--radius-sm); color: var(--color-info-lighter); font-family: monospace; }
.retry {
  margin-top: 16px; padding: 6px 16px; border-radius: var(--radius-lg); cursor: pointer;
  background: rgba(99,102,241,0.12); border: 1px solid var(--color-primary-border); color: var(--color-primary-light); font-size: var(--text-base);
}
.retry:hover { background: rgba(99,102,241,0.22); }
</style>
