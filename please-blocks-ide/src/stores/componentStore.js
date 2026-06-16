/**
 * componentStore.js — Pinia store
 *
 * Menyimpan definisi component yang dibuat QA via Component Builder.
 * Setiap kali berubah → ComponentFactory di-run → blockRegistry di-update
 * → blok baru muncul di palette.
 *
 * Persistence: localStorage (Sprint 3), file system via Electron (Sprint 5+)
 */

import { defineStore } from 'pinia'
import { buildComponentBlocks } from '@/core/factory/ComponentFactory.js'
import { useBlockRegistry } from '@/stores/blockRegistry.js'

const STORAGE_KEY = 'please-blocks:componentStore'

// Component default (Auth sesuai template please-test)
const DEFAULT_COMPONENTS = [
  {
    id:         'comp-auth',
    name:       'Auth',
    exportName: 'AUTH',
    methods: [
      {
        name:   'login',
        params: ['user'],
        steps: [
          { blockId: 'action.fill',  inputs: { label: 'input username', selector: '#username', value: '' } },
          { blockId: 'action.fill',  inputs: { label: 'input password', selector: '#password', value: '' } },
          { blockId: 'action.click', inputs: { label: 'button submit',  selector: '#submit' } }
        ]
      },
      {
        name:   'logout',
        params: [],
        steps: [
          { blockId: 'action.click', inputs: { label: 'button logout', selector: 'link=Log out' } }
        ]
      }
    ]
  }
]

const uid = () => `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const uidM = () => `meth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

export const useComponentStore = defineStore('componentStore', {
  state: () => {
    let components = structuredClone(DEFAULT_COMPONENTS)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) components = JSON.parse(saved)
    } catch { /* ignore */ }
    return {
      components,
      // ID component yang harus dibuka di ComponentBuilder (null = tutup)
      builderTargetCompId: null
    }
  },

  getters: {
    getById: (state) => (id) => state.components.find(c => c.id === id) || null
  },

  actions: {
    // ── Process: component defs → block registry ──────────────────

    processAndRegister() {
      // Register secara synchronous agar block langsung tersedia
      const registry = useBlockRegistry()
      const allBlocks = this.components.flatMap(buildComponentBlocks)
      registry.registerComponentBlocks(allBlocks)
      this.persist()
    },

    /**
     * Buat component module baru dari sekumpulan step (hasil seleksi di canvas).
     * Mengembalikan { component, method, blockId } — blockId siap dipakai sbagai step.
     *
     * @param {string} name   Nama class component (mis. "LoginFlow")
     * @param {Array}  steps  Array step { blockId, inputs }
     * @param {string} methodName  Nama method (default "run")
     */
    createComponentFromSteps(name, steps, methodName = 'run') {
      const comp   = this.addComponent(name)
      const method = this.addMethod(comp.id, methodName)
      // Salin step apa adanya (blockId + inputs) ke dalam method
      method.steps = steps.map(s => ({
        blockId: s.blockId,
        inputs:  { ...(s.inputs || {}) }
      }))
      this.processAndRegister()

      // blockId di-generate oleh ComponentFactory: comp.<name lowercase>.<method>
      const blockId = `comp.${comp.name.toLowerCase()}.${method.name}`
      return { component: comp, method, blockId }
    },

    // ── Component CRUD ─────────────────────────────────────────────

    addComponent(name = 'NewComponent') {
      const exportName = name.toUpperCase()
      const comp = {
        id: uid(),
        name,
        exportName,
        methods: []
      }
      this.components.push(comp)
      this.processAndRegister()
      return comp
    },

    updateComponent(id, patch) {
      const c = this.components.find(c => c.id === id)
      if (c) Object.assign(c, patch)
      this.processAndRegister()
    },

    removeComponent(id) {
      const idx = this.components.findIndex(c => c.id === id)
      if (idx !== -1) this.components.splice(idx, 1)
      this.processAndRegister()
    },

    // ── Method CRUD ────────────────────────────────────────────────

    addMethod(componentId, name = 'newMethod') {
      const c = this.components.find(c => c.id === componentId)
      if (!c) return null
      const method = { id: uidM(), name, params: [], steps: [] }
      c.methods.push(method)
      this.processAndRegister()
      return method
    },

    updateMethod(componentId, methodId, patch) {
      const c = this.components.find(c => c.id === componentId)
      if (!c) return
      const m = c.methods.find(m => m.id === methodId)
      if (m) Object.assign(m, patch)
      this.processAndRegister()
    },

    removeMethod(componentId, methodId) {
      const c = this.components.find(c => c.id === componentId)
      if (!c) return
      const idx = c.methods.findIndex(m => m.id === methodId)
      if (idx !== -1) c.methods.splice(idx, 1)
      this.processAndRegister()
    },

    // ── Step CRUD dalam method ─────────────────────────────────────

    addMethodStep(componentId, methodId, blockId) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (!m) return
      m.steps.push({ blockId, inputs: {} })
      this.processAndRegister()
    },

    removeMethodStep(componentId, methodId, stepIdx) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (!m) return
      m.steps.splice(stepIdx, 1)
      this.processAndRegister()
    },

    updateMethodStepInputs(componentId, methodId, stepIdx, inputs) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (m?.steps[stepIdx]) {
        m.steps[stepIdx].inputs = { ...m.steps[stepIdx].inputs, ...inputs }
        this.processAndRegister()
      }
    },

    updateMethodStepNote(componentId, methodId, stepIdx, note) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (m?.steps[stepIdx]) {
        m.steps[stepIdx].note = note
        this.persist()
      }
    },

    // Tambah / hapus parameter method
    addParam(componentId, methodId, paramName) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (m && !m.params.includes(paramName)) {
        m.params.push(paramName)
        this.processAndRegister()
      }
    },

    removeParam(componentId, methodId, paramName) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (m) {
        m.params = m.params.filter(p => p !== paramName)
        if (m.paramSchemas) delete m.paramSchemas[paramName]
        this.processAndRegister()
      }
    },

    // Set tipe/schema untuk satu param (disimpan di method.paramSchemas)
    setParamSchema(componentId, methodId, paramName, inputType, schema = null) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (!m) return
      if (!m.paramSchemas) m.paramSchemas = {}
      m.paramSchemas[paramName] = { inputType, schema }
      this.processAndRegister()
    },

    // ── ComponentBuilder navigation ───────────────────────────────

    // Panggil ini untuk membuka ComponentBuilder langsung ke component tertentu.
    // AppShell watch state ini dan merespons.
    openBuilderFor(compId) {
      this.builderTargetCompId = compId
    },

    clearBuilderTarget() {
      this.builderTargetCompId = null
    },

    // ── Bulk load (Import by Project) ─────────────────────────────

    /**
     * Ganti / merge component dari hasil parse project.
     * Parser tidak menghasilkan ID — di sini diberi uid()/uidM().
     *
     * @param {Array}  defs - [{ name, exportName, methods:[{ name, params, steps }] }]
     * @param {Object} [opts]
     * @param {boolean} [opts.merge] - true: gabung by name; false (default): replace
     */
    setComponents(defs, { merge = false } = {}) {
      const withIds = (defs || []).map(d => ({
        id:         uid(),
        name:       d.name,
        exportName: d.exportName || String(d.name).toUpperCase(),
        methods:    (d.methods || []).map(m => ({
          id:     uidM(),
          name:   m.name,
          params: [...(m.params || [])],
          steps:  (m.steps || []).map(s => ({ blockId: s.blockId, inputs: { ...(s.inputs || {}) }, ...(s.note ? { note: s.note } : {}) }))
        }))
      }))

      if (merge) {
        // Ganti yang namanya sama, tambahkan yang baru
        const byName = new Map(this.components.map(c => [c.name, c]))
        for (const c of withIds) byName.set(c.name, c)
        this.components = [...byName.values()]
      } else {
        this.components = withIds
      }
      this.processAndRegister()
    },

    // ── Persistence ───────────────────────────────────────────────

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.components))
      } catch { /* ignore */ }
    },

    reset() {
      this.components = structuredClone(DEFAULT_COMPONENTS)
      this.processAndRegister()
    }
  }
})
