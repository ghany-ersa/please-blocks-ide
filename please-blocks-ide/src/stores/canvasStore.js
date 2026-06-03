import { defineStore } from 'pinia'

// Helper — generate ID unik sederhana
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const useCanvasStore = defineStore('canvas', {
  state: () => ({
    // Daftar features di canvas
    features: [],

    // ID yang sedang aktif / dipilih
    activeFeatureId:  null,
    activeTestCaseId: null,
    activeStepId:     null,

    // Block ID yang sedang di-drag dari palette (null jika tidak ada)
    draggingBlockId: null,

    // ID target drop yang di-hover saat drag berlangsung
    dropTargetId: null
  }),

  getters: {
    // Cari feature by ID
    featureById: (state) => (id) =>
      state.features.find(f => f.id === id) || null,

    // Cari test case by ID (scan semua features)
    testCaseById: (state) => (id) => {
      for (const f of state.features) {
        const tc = f.testCases.find(t => t.id === id)
        if (tc) return { testCase: tc, featureId: f.id }
      }
      return null
    },

    // Feature yang sedang aktif
    activeFeature: (state) =>
      state.features.find(f => f.id === state.activeFeatureId) || null,

    // Test case yang sedang aktif
    activeTestCase: (state) => {
      if (!state.activeTestCaseId) return null
      for (const f of state.features) {
        const tc = f.testCases.find(t => t.id === state.activeTestCaseId)
        if (tc) return tc
      }
      return null
    },

    // Jumlah total test case di semua features
    totalTestCases: (state) =>
      state.features.reduce((sum, f) => sum + f.testCases.length, 0),

    // Jumlah total steps di semua test cases
    totalSteps: (state) =>
      state.features.reduce(
        (sum, f) => sum + f.testCases.reduce((s, tc) => s + tc.steps.length, 0), 0
      )
  },

  actions: {
    // ── Features ──────────────────────────────────────────────────

    addFeature(label = 'Feature Baru') {
      const feature = {
        id:        uid('feat'),
        label,
        testCases: [],
        collapsed: false
      }
      this.features.push(feature)
      this.activeFeatureId = feature.id
      return feature
    },

    updateFeatureLabel(featureId, label) {
      const f = this.features.find(f => f.id === featureId)
      if (f) f.label = label
    },

    removeFeature(featureId) {
      const idx = this.features.findIndex(f => f.id === featureId)
      if (idx !== -1) {
        this.features.splice(idx, 1)
        if (this.activeFeatureId === featureId) {
          this.activeFeatureId  = this.features[0]?.id || null
          this.activeTestCaseId = null
          this.activeStepId     = null
        }
      }
    },

    toggleFeatureCollapse(featureId) {
      const f = this.features.find(f => f.id === featureId)
      if (f) f.collapsed = !f.collapsed
    },

    // ── Test Cases ─────────────────────────────────────────────────

    addTestCase(featureId, label = 'Test Case Baru') {
      const f = this.features.find(f => f.id === featureId)
      if (!f) return null
      const tc = {
        id:       uid('tc'),
        label,
        steps:    [],
        collapsed: false
      }
      f.testCases.push(tc)
      this.activeFeatureId  = featureId
      this.activeTestCaseId = tc.id
      return tc
    },

    updateTestCaseLabel(testCaseId, label) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) { tc.label = label; return }
      }
    },

    removeTestCase(testCaseId) {
      for (const f of this.features) {
        const idx = f.testCases.findIndex(t => t.id === testCaseId)
        if (idx !== -1) {
          f.testCases.splice(idx, 1)
          if (this.activeTestCaseId === testCaseId) {
            this.activeTestCaseId = f.testCases[0]?.id || null
            this.activeStepId     = null
          }
          return
        }
      }
    },

    toggleTestCaseCollapse(testCaseId) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) { tc.collapsed = !tc.collapsed; return }
      }
    },

    // ── Steps ──────────────────────────────────────────────────────

    addStep(testCaseId, blockId, inputs = {}) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) {
          const step = {
            id:      uid('step'),
            blockId,
            inputs,
            hasError: false
          }
          tc.steps.push(step)
          this.activeTestCaseId = testCaseId
          this.activeStepId     = step.id
          return step
        }
      }
      return null
    },

    updateStepInputs(stepId, inputs) {
      for (const f of this.features) {
        for (const tc of f.testCases) {
          const step = tc.steps.find(s => s.id === stepId)
          if (step) { step.inputs = { ...step.inputs, ...inputs }; return }
        }
      }
    },

    removeStep(stepId) {
      for (const f of this.features) {
        for (const tc of f.testCases) {
          const idx = tc.steps.findIndex(s => s.id === stepId)
          if (idx !== -1) {
            tc.steps.splice(idx, 1)
            if (this.activeStepId === stepId) this.activeStepId = null
            return
          }
        }
      }
    },

    // Pindahkan step ke posisi lain dalam satu test case
    moveStep(testCaseId, fromIndex, toIndex) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) {
          const [step] = tc.steps.splice(fromIndex, 1)
          tc.steps.splice(toIndex, 0, step)
          return
        }
      }
    },

    // ── Drag & Drop State ──────────────────────────────────────────

    setDraggingBlock(blockId) {
      this.draggingBlockId = blockId
    },

    setDropTarget(targetId) {
      this.dropTargetId = targetId
    },

    clearDrag() {
      this.draggingBlockId = null
      this.dropTargetId    = null
    },

    // ── Selection ─────────────────────────────────────────────────

    selectFeature(featureId) {
      this.activeFeatureId  = featureId
      this.activeTestCaseId = null
      this.activeStepId     = null
    },

    selectTestCase(testCaseId, featureId) {
      this.activeFeatureId  = featureId
      this.activeTestCaseId = testCaseId
      this.activeStepId     = null
    },

    selectStep(stepId) {
      this.activeStepId = stepId
    },

    // ── Seed Data (untuk dev preview) ─────────────────────────────

    seedDemoData() {
      this.features = []
      const f = this.addFeature('Login — practicetestautomation.com')
      const tc1 = this.addTestCase(f.id, 'login berhasil')
      this.addStep(tc1.id, 'nav.goTo',           { urlTarget: { type: 'dataref', path: 'URL.login' } })
      this.addStep(tc1.id, 'action.click',        { label: 'button submit', selector: '#submit' })
      this.addStep(tc1.id, 'nav.checkWhere',      { urlExpected: { type: 'dataref', path: 'URL.dashboard' } })
      this.addStep(tc1.id, 'assert.seeText',      { label: 'teks sukses', selector: '//h1', expected: 'Logged In Successfully' })

      const tc2 = this.addTestCase(f.id, 'login gagal - username salah')
      this.addStep(tc2.id, 'nav.goTo',      { urlTarget: { type: 'dataref', path: 'URL.login' } })
      this.addStep(tc2.id, 'action.fill',   { label: 'input username', selector: '#username', value: 'invaliduser' })
      this.addStep(tc2.id, 'assert.seeText',{ label: 'pesan error', selector: '//div[@id="error"]', expected: 'Your username is invalid!' })
    }
  }
})
