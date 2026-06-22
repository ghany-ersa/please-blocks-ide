/**
 * useProjectWorkspace — ViewModel untuk lifecycle project (workspace).
 * - close project (kembali ke gate)
 * - boot-sync: saat reload dgn projectPath tersimpan, disk = sumber kebenaran.
 *   Bandingkan canvas vs isi folder; jika beda minta konfirmasi.
 *
 * @param {Object} [opts]
 * @param {Function} [opts.onKeepLocal] - dipanggil saat user memilih "Pertahankan
 *   perubahan" (mis. triggerSave dari useSaveProject) agar disk ikut sinkron.
 */
import { ref } from 'vue'
import { readProject }   from '@/model/services/runnerService.js'
import { exportProject } from '@/model/core/codegen/projectExporter.js'
import { importProject } from '@/model/core/codegen/projectImporter.js'
import { useRunnerStore }    from '@/model/stores/runnerStore.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useBlockRegistry }  from '@/model/stores/blockRegistry.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'

export function useProjectWorkspace({ onKeepLocal } = {}) {
  const runner    = useRunnerStore()
  const canvas    = useCanvasStore()
  const registry  = useBlockRegistry()
  const dataReg   = useDataRegistry()
  const compStore = useComponentStore()

  const showReloadConfirm = ref(false)   // dialog "buang perubahan & muat dari disk?"
  let pendingDiskFiles = null            // hasil readProject yang menunggu konfirmasi

  // Tutup project → kembali ke gate (canvas & data tetap di localStorage,
  // tapi user wajib pilih project lagi untuk melanjutkan).
  function closeProject() {
    runner.setProjectPath('')
  }

  // Buka folder sebagai workspace: baca isi → muat penuh (replace) → jadikan
  // folder kerja (projectPath). Sama dgn alur Open di ProjectGate.
  // @returns {Promise<{ ok: boolean, error?: string }>}
  async function openProject(path) {
    const res = await readProject(path)
    if (!res.ok) return { ok: false, error: res.error }
    try {
      registry.clearDynamicBlocks()
      importProject(res.data.files, {
        dataRegistry: dataReg, componentStore: compStore, blockRegistry: registry, canvas
      }, { replace: true })
    } catch (err) {
      return { ok: false, error: `Gagal membuka project: ${err.message}` }
    }
    runner.setProjectPath(path)
    return { ok: true }
  }

  // Buat project baru kosong di folder: reset semua state (tanpa seed default),
  // lalu jadikan folder kerja. Demo data tersedia via tombol di canvas.
  function newProject(path) {
    canvas.clearCanvas()
    registry.clearDynamicBlocks()
    dataReg.setData({}, {})
    compStore.setComponents([])
    runner.setProjectPath(path)
  }

  // Saat reload dengan projectPath tersimpan, sinkronkan canvas dari folder.
  async function syncOnBoot() {
    await runner.checkServer()
    if (!runner.projectPath) return
    if (!runner.serverAvailable) return    // server mati → tetap di canvas, skip sync

    const res = await readProject(runner.projectPath)
    if (!res.ok) {
      // Folder tidak terbaca (dipindah/dihapus) → kembali ke gate
      runner.setProjectPath('')
      return
    }

    if (diskMatchesCanvas(res.data.files)) return  // localStorage == disk → diam

    // Ada perbedaan (perubahan belum di-Save) → minta konfirmasi sebelum menimpa.
    pendingDiskFiles = res.data.files
    showReloadConfirm.value = true
  }

  // Bandingkan file terkelola hasil generate canvas saat ini vs isi disk.
  function diskMatchesCanvas(diskFiles) {
    const current = exportProject(canvas, registry, dataReg, compStore, runner.projectName)
    const managed = (p) => /^(feature|data|components)\//.test(p)

    const mine = new Map(current.filter(f => managed(f.path)).map(f => [f.path, f.content]))
    const disk = new Map()
    for (const f of diskFiles.specs || [])      disk.set(`feature/${f.name}`, f.content)
    for (const f of diskFiles.data || [])       disk.set(`data/${f.name}`, f.content)
    for (const f of diskFiles.components || []) disk.set(`components/${f.name}`, f.content)

    if (mine.size !== disk.size) return false
    for (const [path, content] of mine) {
      if (disk.get(path) !== content) return false
    }
    return true
  }

  function loadFromDisk() {
    if (!pendingDiskFiles) return
    registry.clearDynamicBlocks()
    importProject(pendingDiskFiles, {
      dataRegistry: dataReg, componentStore: compStore, blockRegistry: registry, canvas
    }, { replace: true })
    pendingDiskFiles = null
    showReloadConfirm.value = false
  }

  // Pertahankan perubahan = tulis state canvas saat ini ke disk (via onKeepLocal),
  // agar disk langsung sinkron dengan canvas.
  function keepLocal() {
    pendingDiskFiles = null
    showReloadConfirm.value = false
    onKeepLocal?.()
  }

  return { showReloadConfirm, closeProject, openProject, newProject, syncOnBoot, loadFromDisk, keepLocal }
}
