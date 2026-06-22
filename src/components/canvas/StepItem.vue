<script setup>
import { computed } from 'vue'
import { useStepActions } from '@/composables/useStepActions.js'
import StepCard from '@/components/shared/StepCard.vue'

const props = defineProps({
  step:         { type: Object,  required: true },
  testCaseId:   { type: String,  required: true },
  index:        { type: Number,  required: true },
  selected:     { type: Boolean, default: false },
  hasSelection: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'step-click'])

const stepId     = computed(() => props.step.id)
const testCaseId = computed(() => props.testCaseId)
const { onRemove, onUpdateInput, onUpdateNote, onReorder } = useStepActions(stepId, testCaseId)
</script>

<template>
  <StepCard
    :step="step"
    :index="index"
    :selected="selected"
    :has-selection="hasSelection"
    :selectable="true"
    :draggable="true"
    :editable="true"
    :test-case-id="testCaseId"
    @select="emit('select', $event)"
    @step-click="emit('step-click', $event)"
    @remove="onRemove"
    @update-input="onUpdateInput"
    @update-note="onUpdateNote"
    @reorder="onReorder"
  />
</template>
