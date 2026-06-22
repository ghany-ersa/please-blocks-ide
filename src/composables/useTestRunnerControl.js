/**
 * useTestRunnerControl — ViewModel untuk memicu eksekusi test.
 * Real run (mocha via server) jika tersedia, selain itu mode simulasi.
 */
import { exportProject } from '@/model/core/codegen/projectExporter.js'
import { useRunnerStore }    from '@/model/stores/runnerStore.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useBlockRegistry }  from '@/model/stores/blockRegistry.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'

export function useTestRunnerControl() {
  const runner    = useRunnerStore()
  const canvas    = useCanvasStore()
  const registry  = useBlockRegistry()
  const dataReg   = useDataRegistry()
  const compStore = useComponentStore()

  // Validate: cek alur test via simulasi (cepat, tanpa server). Dipakai topbar.
  function validate() {
    runner.open()
    runner.runSimulation(canvas.features, registry, dataReg.entries)
  }

  // Run Real: jalankan mocha sungguhan via server bila tersedia, selain itu
  // fallback ke simulasi. Dipakai panel Test Runner.
  function runReal() {
    runner.open()
    if (runner.canRunReal) {
      const files = exportProject(canvas, registry, dataReg, compStore, runner.projectName)
      runner.runReal(files, runner.projectPath, canvas.features)
    } else {
      runner.runSimulation(canvas.features, registry, dataReg.entries)
    }
  }

  return { validate, runReal }
}
