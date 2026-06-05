import { defineStore } from 'pinia'
import { validateTestCase } from '@/core/blocks/stepValidator.js'

/**
 * runnerStore.js
 * State untuk test runner — status, log, dan hasil per test case.
 *
 * Di lingkungan browser (tanpa Electron), runner berjalan dalam mode simulasi
 * sehingga QA tetap bisa melihat alur UI. Saat diintegrasikan ke Electron,
 * ganti simulasi dengan IPC ke main process (child_process mocha).
 */
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
    showReport: false
  }),

  getters: {
    isRunning:  (s) => s.status === 'running',
    isIdle:     (s) => s.status === 'idle',
    hasFailed:  (s) => s.status === 'failed',
    hasPassed:  (s) => s.status === 'passed',
    logCount:   (s) => s.logs.length,
    failCount:  (s) => s.stats.failed,
    passCount:  (s) => s.stats.passed
  },

  actions: {
    open()  { this.visible = true  },
    close() { this.visible = false },
    toggle(){ this.visible = !this.visible },

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

      this._addLog('cmd', `$ npx mocha index.js --reporter spec`)
      await this._delay(250)
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
      this._addLog('warn', '⏹  Runner dihentikan oleh pengguna')
    },

    _delay(ms) {
      return new Promise(r => setTimeout(r, ms))
    }
  }
})
