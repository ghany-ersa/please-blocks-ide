import { useCanvasStore } from '@/model/stores/canvasStore.js'

export function useStepActions(stepId, testCaseId) {
  const canvas = useCanvasStore()

  return {
    onRemove:      ()                    => canvas.removeStep(stepId.value ?? stepId),
    onUpdateInput: (fieldName, value)    => canvas.updateStepInputs(stepId.value ?? stepId, { [fieldName]: value }),
    onUpdateNote:  (note)                => canvas.updateStepNote(stepId.value ?? stepId, note),
    onReorder:     (fromIndex, toIndex)  => canvas.moveStep(testCaseId.value ?? testCaseId, fromIndex, toIndex),
  }
}
