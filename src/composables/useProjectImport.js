/**
 * useProjectImport — ViewModel untuk Import by Project.
 * Menyisipkan isi project LAIN ke workspace aktif (TIDAK mengubah projectPath).
 * Baca folder via server → analisis (preview) → import (merge/replace).
 */
import { ref, computed } from 'vue'
import { readProject } from '@/model/services/runnerService.js'
import { analyzeProject, importProject } from '@/model/core/codegen/projectImporter.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useBlockRegistry }  from '@/model/stores/blockRegistry.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'
import { useRunnerStore }    from '@/model/stores/runnerStore.js'

export function useProjectImport() {
  const canvas    = useCanvasStore()
  const registry  = useBlockRegistry()
  const dataReg   = useDataRegistry()
  const compStore = useComponentStore()
  const runner    = useRunnerStore()

  const projectPath  = ref(runner.projectPath || '')
  const loading      = ref(false)
  const error        = ref('')
  const replace      = ref(false)  // default: sisipkan (merge) ke workspace aktif
  const projectFiles = ref(null)   // raw dari server
  const analysis     = ref(null)   // hasil analyzeProject

  const serverOk  = computed(() => runner.serverAvailable)
  const summary   = computed(() => analysis.value?.summary || null)
  const canImport = computed(() =>
    !!summary.value && summary.value.features + summary.value.dataFiles + summary.value.components > 0
  )

  // Baca folder + analisis (preview). Tidak mengubah workspace.
  async function load(path) {
    projectPath.value = path
    if (!projectPath.value) return
    loading.value = true
    error.value = ''
    analysis.value = null
    projectFiles.value = null

    const res = await readProject(projectPath.value)
    loading.value = false
    if (!res.ok) { error.value = res.error; return }

    projectFiles.value = res.data.files
    try {
      analysis.value = analyzeProject(res.data.files)
      if (res.data.warnings?.length) analysis.value.warnings.unshift(...res.data.warnings)
      if (res.data.skipped?.length) {
        for (const s of res.data.skipped) analysis.value.warnings.push(`File dilewati (${s.reason}): ${s.name}`)
      }
    } catch (err) {
      error.value = `Gagal menganalisis project: ${err.message}`
    }
  }

  // Sisipkan ke workspace aktif. TIDAK menyentuh projectPath.
  function doImport() {
    if (!projectFiles.value || !canImport.value) return false
    importProject(projectFiles.value, {
      dataRegistry: dataReg, componentStore: compStore, blockRegistry: registry, canvas
    }, { replace: replace.value })
    return true
  }

  function blockLabel(blockId) {
    const b = registry.getById(blockId)
    return b ? `${b.icon || ''} ${b.label}`.trim() : blockId
  }

  return {
    projectPath, loading, error, replace, analysis,
    serverOk, summary, canImport,
    load, doImport, blockLabel
  }
}
