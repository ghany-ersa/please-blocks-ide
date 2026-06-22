<script setup>
import AppShell    from '@/components/layout/AppShell.vue'
import ProjectGate from '@/components/layout/ProjectGate.vue'
import { useRunnerStore } from '@/model/stores/runnerStore.js'

const runner = useRunnerStore()
</script>

<template>
  <ProjectGate v-if="!runner.projectPath" />
  <AppShell    v-else />
</template>
