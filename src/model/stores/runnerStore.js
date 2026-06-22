import { defineStore } from 'pinia'
import { validateTestCase } from '@/model/core/blocks/stepValidator.js'
import { checkServerHealth, startRun as startRealRun } from '@/model/services/runnerService.js'

/**
 * runnerStore.js
 * State untuk test runner — status, log, dan hasil per test case.
 *
 * Di lingkungan browser (tanpa Electron), runner berjalan dalam mode simulasi
 * sehingga QA tetap bisa melihat alur UI. Saat diintegrasikan ke Electron,
 * ganti simulasi dengan IPC ke main process (child_process mocha).
 */
const SETTINGS_KEY = 'please-blocks:runner-settings'

// Restore pengaturan persist (folder project + browser) dari localStorage
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return {
      projectPath:   typeof saved.projectPath === 'string' ? saved.projectPath : '',
      browserTarget: saved.browserTarget || 'chromium'
    }
  } catch {
    return { projectPath: '', browserTarget: 'chromium' }
  }
}

export const useRunnerStore = defineStore('runner', {
  state: () => ({
    // 'idle' | 'running' | 'passed' | 'failed' | 'stopped'
    status: 'idle',

    // Apakah panel runner sedang tampil
    visible: false,

    // Array log entry: { id, time, level, text }
    // level: 'info' | 'pass' | 'fail' | 'warn' | 'cmd'
    logs: [],

    // Hasil per test case: { [tcId]: 'pass' | 'fail' | 'pending' | 'running' }
    tcResults: {},

    // Statistik terakhir
    stats: {
      total:   0,
      passed:  0,
      failed:  0,
      skipped: 0,
      duration: 0   // ms
    },

    // ID interval simulasi (untuk di-clear saat stop)
    _simTimer: null,

    // Apakah modal Report Viewer sedang tampil
    showReport: false,

    // Browser target: 'chromium' | 'firefox' | 'webkit' (persist)
    browserTarget: loadSettings().browserTarget,

    // true = server Express tersedia, false = fallback ke simulasi
    serverAvailable: false,

    // Absolute path folder project test untuk real run (persist)
    projectPath: loadSettings().projectPath,

    // Handle untuk stop real run
    _realRunHandle: null
  }),

  getters: {
    isRunning:   (s) => s.status === 'running',
    isIdle:      (s) => s.status === 'idle',
    hasFailed:   (s) => s.status === 'failed',
    hasPassed:   (s) => s.status === 'passed',
    logCount:    (s) => s.logs.length,
    failCount:   (s) => s.stats.failed,
    passCount:   (s) => s.stats.passed,
    canRunReal:  (s) => s.serverAvailable && !!s.projectPath,

    // Nama project = basename folder yang dipilih
    projectName: (s) => {
      if (!s.projectPath) return ''
      return s.projectPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || ''
    }
  },

  actions: {
    open()  { this.visible = true  },
    close() { this.visible = false },
    toggle(){ this.visible = !this.visible },

    // ── Pengaturan persist (folder + browser) ─────────────────────
    persistSettings() {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({
          projectPath:   this.projectPath,
          browserTarget: this.browserTarget
        }))
      } catch { /* ignore */ }
    },

    // Set folder project + simpan agar bertahan saat refresh
    setProjectPath(path) {
      this.projectPath = path || ''
      this.persistSettings()
    },

    setBrowserTarget(browser) {
      this.browserTarget = browser
      this.persistSettings()
    },

    _uid() { return Date.now() + '-' + Math.random().toString(36).slice(2, 6) },

    _addLog(level, text) {
      const now  = new Date()
      const time = now.toTimeString().slice(0, 8)
      this.logs.push({ id: this._uid(), time, level, text })
    },

    clearLogs() {
      this.logs      = []
      this.tcResults = {}
      this.stats     = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
    },

    /**
     * Jalankan simulasi test runner.
     * Hasil pass/fail ditentukan oleh validateTestCase() — deterministik, bukan random.
     *
     * @param {Array}  features      - canvas.features
     * @param {Object} blockRegistry - Pinia blockRegistry store
     * @param {Array}  dataEntries   - dataRegistry.entries
     */
    async runSimulation(features, blockRegistry, dataEntries = []) {
      if (this.status === 'running') return
      this.clearLogs()
      this.status  = 'running'
      this.visible = true

      const allTcs = features.flatMap(f =>
        f.testCases.map(tc => ({ ...tc, featureLabel: f.label, enabled: f.enabled !== false }))
      )

      this.stats.total = allTcs.filter(tc => tc.enabled).length

      const browserLabel = { chromium: 'Chromium', firefox: 'Mozilla Firefox', webkit: 'WebKit' }[this.browserTarget] || this.browserTarget
      this._addLog('cmd', `$ npx playwright test --reporter=list`)
      await this._delay(150)
      this._addLog('info', `Browser: ${browserLabel}`)
      await this._delay(100)
      this._addLog('info', `Menjalankan ${this.stats.total} test case...`)
      await this._delay(200)

      const startTime = Date.now()

      for (const tc of allTcs) {
        if (this.status === 'stopped') break

        if (!tc.enabled) {
          this._addLog('warn', `  ⏸  [skip] ${tc.featureLabel} > ${tc.label}`)
          this.stats.skipped++
          continue
        }

        this.tcResults[tc.id] = 'running'
        this._addLog('info', `  ◌  ${tc.featureLabel} › ${tc.label}`)
        await this._delay(300 + Math.random() * 500)

        if (this.status === 'stopped') {
          this.tcResults[tc.id] = 'pending'
          break
        }

        // Validasi deterministik — pakai stepValidator yang sama dengan canvas
        const { totalErrors, stepResults } = validateTestCase(tc, blockRegistry, dataEntries)

        if (totalErrors > 0) {
          this.tcResults[tc.id] = 'fail'
          this.stats.failed++

          // Tampilkan error per step yang bermasalah
          for (const sr of stepResults) {
            if (!sr.valid) {
              const errMsgs = Object.values(sr.errors).join(', ')
              this._addLog('fail', `  ✗  ${tc.label}`)
              this._addLog('fail', `       ValidationError: ${errMsgs}`)
            }
          }
        } else {
          this.tcResults[tc.id] = 'pass'
          this.stats.passed++
          const ms = Math.floor(80 + Math.random() * 700)
          this._addLog('pass', `  ✓  ${tc.label}  (${ms}ms)`)
        }

        await this._delay(60)
      }

      if (this.status !== 'stopped') {
        this.stats.duration = Date.now() - startTime
        await this._delay(150)
        this._addLog('info', '')
        this._addLog(
          this.stats.failed > 0 ? 'fail' : 'pass',
          `${this.stats.passed} lulus, ${this.stats.failed} gagal, ${this.stats.skipped} dilewati (${this.stats.duration}ms)`
        )

        this.status = this.stats.failed > 0 ? 'failed' : 'passed'
        this.showReport = true
      }
    },

    stopRun() {
      if (this.status !== 'running') return
      this.status = 'stopped'
      if (this._realRunHandle) {
        this._realRunHandle.stop()
        this._realRunHandle = null
      } else {
        this._addLog('warn', '⏹  Runner dihentikan oleh pengguna')
      }
    },

    // Cek ketersediaan server (dipanggil saat app boot)
    async checkServer() {
      this.serverAvailable = await checkServerHealth()
    },

    /**
     * Jalankan test sungguhan via Express server.
     * @param {Array}  files       - hasil exportProject()
     * @param {string} projectPath - absolute path folder project
     */
    async runReal(files, projectPath, features = []) {
      if (this.status === 'running') return
      this.clearLogs()
      this.status      = 'running'
      this.visible     = true
      this.setProjectPath(projectPath)

      const startTime = Date.now()

      this._addLog('info', `📁 Project: ${projectPath}`)

      // Bangun index label → tcId agar bisa mengisi tcResults dari log Playwright
      // Format Playwright list: "✓  [chromium] › Feature › TC label (123ms)"
      //                         "✗  [chromium] › Feature › TC label (123ms)"
      const labelToId = {}
      for (const f of features) {
        for (const tc of f.testCases) {
          if (tc.label) labelToId[tc.label.trim()] = tc.id
        }
      }

      const handle = await startRealRun({
        projectPath,
        files,
        browser: this.browserTarget,

        onLog: ({ level, text }) => {
          this._addLog(level, text)

          // Parse "N passed" / "N failed" dari Playwright summary line
          // Format: "  3 passed (5s)" atau "  1 failed"
          const passMatch = text.match(/(\d+)\s+passed/)
          if (passMatch) this.stats.passed = parseInt(passMatch[1])

          const failMatch = text.match(/(\d+)\s+failed/)
          if (failMatch) this.stats.failed = parseInt(failMatch[1])

          const skipMatch = text.match(/(\d+)\s+skipped/)
          if (skipMatch) this.stats.skipped = parseInt(skipMatch[1])

          // Playwright list reporter — baris pass: "  ✓  [browser] › Feature › TC label (Xms)"
          const passLine = text.match(/[✓✔]\s+(?:\[\w+\]\s+›\s+.+?\s+›\s+)?(.+?)(?:\s+\(\d+(?:\.\d+)?(?:ms|s)\))?$/)
          if (passLine) {
            // Ambil bagian paling akhir setelah " › " (nama TC)
            const parts = passLine[1].split('›')
            const tcLabel = (parts[parts.length - 1] || passLine[1]).trim()
            const tcId = labelToId[tcLabel]
            if (tcId) this.tcResults[tcId] = 'pass'
          }

          // Playwright list reporter — baris fail: "  ✘  [browser] › Feature › TC label (Xms)"
          const failLine = text.match(/[✘✗×]\s+(?:\[\w+\]\s+›\s+.+?\s+›\s+)?(.+?)(?:\s+\(\d+(?:\.\d+)?(?:ms|s)\))?$/)
          if (failLine) {
            const parts = failLine[1].split('›')
            const tcLabel = (parts[parts.length - 1] || failLine[1]).trim()
            const tcId = labelToId[tcLabel]
            if (tcId) this.tcResults[tcId] = 'fail'
          }
        },

        onDone: ({ exitCode }) => {
          this.stats.duration = Date.now() - startTime
          this.stats.total    = this.stats.passed + this.stats.failed + this.stats.skipped

          // TC yang tidak ter-detect dari log → tetap pending, tidak dihitung ulang
          this._addLog('info', '')
          this._addLog(
            this.stats.failed > 0 ? 'fail' : 'pass',
            `${this.stats.passed} lulus, ${this.stats.failed} gagal, ${this.stats.skipped} dilewati (${this.stats.duration}ms)`
          )

          this.status         = exitCode === 0 ? 'passed' : 'failed'
          this.showReport     = true
          this._realRunHandle = null
        },

        onError: (msg) => {
          this._addLog('fail', `⚠ ${msg}`)
          this.status         = 'failed'
          this._realRunHandle = null
        }
      })

      this._realRunHandle = handle
    },

    _delay(ms) {
      return new Promise(r => setTimeout(r, ms))
    }
  }
})
