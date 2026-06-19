/**
 * dataRegistry.js — Pinia store (Sprint 3+)
 *
 * Mendukung MULTI-FILE data:
 *   files: {
 *     main:     { filename: 'main',     label: 'Main Data',    groups: { URL, ACCOUNT } },
 *     products: { filename: 'products', label: 'Product Data', groups: { PRODUCT } },
 *   }
 *
 * Setiap DataRef entry menyertakan fileId dan filePath agar
 * specGenerator bisa generate require() ke file yang tepat.
 */

import { defineStore } from 'pinia'
import { processDataFiles } from '@/model/core/factory/DataFactory.js'

const STORAGE_KEY = 'please-blocks:dataRegistry-v2'

// ── Default data (sesuai create-please-test template) ─────────────

const DEFAULT_FILES = {
  main: {
    id:       'main',
    filename: 'main',
    label:    'Main Data',
    description: 'URL halaman dan data akun utama',
    groups: {
      PAGE: {
        login: {
          url:   'https://practicetestautomation.com/practice-test-login/',
          title: 'Test Login | Practice Test Automation'
        },
        dashboard: {
          url:   'https://practicetestautomation.com/logged-in-successfully/',
          title: 'Logged In Successfully | Practice Test Automation'
        }
      },
      ACCOUNT: {
        valid: {
          username: 'process.env.ACCOUNT_USERNAME',
          password: 'process.env.ACCOUNT_PASSWORD'
        },
        wrongPassword: {
          username: 'process.env.ACCOUNT_USERNAME',
          password: 'wrongpassword'
        },
        wrongUsername: {
          username: 'invaliduser',
          password: 'process.env.ACCOUNT_PASSWORD'
        },
        empty: {
          username: '',
          password: ''
        }
      }
    }
  }
}

const DEFAULT_ENV = {
  BASE_URL:         'https://practicetestautomation.com',
  ACCOUNT_USERNAME: 'student',
  ACCOUNT_PASSWORD: 'Password123'
}

const uid = () => `file-${Date.now()}-${Math.random().toString(36).slice(2,5)}`

export const useDataRegistry = defineStore('dataRegistry', {
  state: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const p = JSON.parse(saved)
        return { files: p.files || structuredClone(DEFAULT_FILES), env: p.env || structuredClone(DEFAULT_ENV), entries: [] }
      }
    } catch { /* ignore */ }
    return {
      files:   structuredClone(DEFAULT_FILES),
      env:     structuredClone(DEFAULT_ENV),
      entries: []
    }
  },

  getters: {
    // Semua file ID yang ada
    fileIds: (state) => Object.keys(state.files),

    // File def by ID
    fileById: (state) => (id) => state.files[id] || null,

    // Entries filtered by input type compatibility
    getByCompatibility: (state) => (inputType) =>
      state.entries.filter(e => e.compatibleWith.includes(inputType)),

    // Entries dari satu file
    entriesForFile: (state) => (fileId) =>
      state.entries.filter(e => e.fileId === fileId),

    // Entries dari satu group dalam file
    entriesForGroup: (state) => (fileId, groupName) =>
      state.entries.filter(e => e.fileId === fileId && e.group === groupName),

    // Semua group names dari semua file (untuk import detection)
    allGroupNames: (state) => {
      const groups = new Set()
      for (const f of Object.values(state.files)) {
        for (const g of Object.keys(f.groups)) groups.add(g)
      }
      return [...groups]
    }
  },

  actions: {
    // ── Core: process semua files → flat entries ──────────────────

    processAndRegister() {
      this.entries = processDataFiles(this.files, this.env)
      this.persist()
    },

    // ── File management ───────────────────────────────────────────

    addFile(filename, label = '') {
      const id = filename.replace(/[^a-z0-9_]/gi, '').toLowerCase() || uid()
      if (this.files[id]) return null
      this.files[id] = {
        id,
        filename: id,
        label:    label || id,
        description: '',
        groups:   {}
      }
      this.processAndRegister()
      return id
    },

    updateFile(fileId, patch) {
      if (!this.files[fileId]) return
      Object.assign(this.files[fileId], patch)
      this.processAndRegister()
    },

    removeFile(fileId) {
      if (fileId === 'main') return  // main tidak bisa dihapus
      delete this.files[fileId]
      this.processAndRegister()
    },

    // ── Group management ──────────────────────────────────────────

    addGroup(fileId, groupName) {
      const f = this.files[fileId]
      if (!f || !groupName || f.groups[groupName]) return
      f.groups[groupName.toUpperCase()] = {}
      this.processAndRegister()
    },

    renameGroup(fileId, oldName, newName) {
      const f = this.files[fileId]
      if (!f || oldName === newName || f.groups[newName]) return
      f.groups[newName] = f.groups[oldName]
      delete f.groups[oldName]
      this.processAndRegister()
    },

    removeGroup(fileId, groupName) {
      const f = this.files[fileId]
      if (!f) return
      delete f.groups[groupName]
      this.processAndRegister()
    },

    // ── Entry management ──────────────────────────────────────────

    addEntry(fileId, groupName, entryName, fields = {}) {
      const g = this.files[fileId]?.groups[groupName]
      if (g === undefined) return
      this.files[fileId].groups[groupName][entryName] = fields
      this.processAndRegister()
    },

    updateEntry(fileId, groupName, entryName, fields) {
      const g = this.files[fileId]?.groups[groupName]
      if (!g) return
      g[entryName] = { ...fields }
      this.processAndRegister()
    },

    renameEntry(fileId, groupName, oldName, newName) {
      const g = this.files[fileId]?.groups[groupName]
      if (!g || oldName === newName) return
      g[newName] = g[oldName]
      delete g[oldName]
      this.processAndRegister()
    },

    removeEntry(fileId, groupName, entryName) {
      const g = this.files[fileId]?.groups[groupName]
      if (!g) return
      delete g[entryName]
      this.processAndRegister()
    },

    // ── Field management ──────────────────────────────────────────
    // Selalu rebuild entry object (spread) agar Vue Proxy mendeteksi perubahan.

    addField(fileId, groupName, entryName, fieldName, value = '') {
      const group = this.files[fileId]?.groups[groupName]
      if (!group || !(entryName in group)) return
      // Spread entry → object baru → Vue pasti reaktif
      group[entryName] = { ...group[entryName], [fieldName]: value }
      this.processAndRegister()
    },

    updateField(fileId, groupName, entryName, fieldName, value) {
      const group = this.files[fileId]?.groups[groupName]
      if (!group || !(entryName in group)) return
      group[entryName] = { ...group[entryName], [fieldName]: value }
      this.processAndRegister()
    },

    removeField(fileId, groupName, entryName, fieldName) {
      const group = this.files[fileId]?.groups[groupName]
      if (!group || !(entryName in group)) return
      const { [fieldName]: _removed, ...rest } = group[entryName]
      group[entryName] = rest
      this.processAndRegister()
    },

    // ── Env variables ─────────────────────────────────────────────

    setEnvVar(key, value) {
      this.env[key] = value
      this.processAndRegister()
    },

    addEnvVar(key) {
      if (!key || this.env[key] !== undefined) return
      this.env[key] = ''
      this.processAndRegister()
    },

    removeEnvVar(key) {
      delete this.env[key]
      this.processAndRegister()
    },

    // ── Bulk load (Import by Project) ─────────────────────────────

    /**
     * Ganti / merge files + env dari hasil parse project.
     *
     * @param {Object} files - { fileId: { id, filename, label, description, groups } }
     * @param {Object} [env] - { KEY: value }
     * @param {Object} [opts]
     * @param {boolean} [opts.merge] - true: gabung; false (default): replace penuh
     */
    setData(files, env = {}, { merge = false } = {}) {
      if (merge) {
        this.files = { ...this.files, ...(files || {}) }
        this.env   = { ...this.env, ...(env || {}) }
      } else {
        this.files = { ...(files || {}) }
        this.env   = { ...(env || {}) }
      }
      this.processAndRegister()
    },

    // ── Persistence ───────────────────────────────────────────────

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ files: this.files, env: this.env }))
      } catch { /* ignore */ }
    },

    reset() {
      this.files = structuredClone(DEFAULT_FILES)
      this.env   = structuredClone(DEFAULT_ENV)
      this.processAndRegister()
    }
  }
})
