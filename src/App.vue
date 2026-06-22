<script setup>
import { onMounted }  from 'vue'
import AppShell    from '@/components/layout/AppShell.vue'
import ProjectGate from '@/components/layout/ProjectGate.vue'
import { useRunnerStore } from '@/model/stores/runnerStore.js'

const runner = useRunnerStore()

onMounted(() => runner.checkServer())
</script>

<template>
  <ProjectGate v-if="!runner.projectPath" />
  <AppShell    v-else />
</template>
