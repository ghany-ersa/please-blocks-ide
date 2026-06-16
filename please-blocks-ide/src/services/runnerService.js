/**
 * runnerService.js
 * Komunikasi Vue → Express server:
 *   - startRun()  → POST /api/runner/start → terima runId → buka SSE stream
 *   - stopRun()   → POST /api/runner/stop/:runId
 *   - checkHealth() → GET /api/health
 */

const BASE = '/api'

/**
 * Cek apakah server Express sedang berjalan.
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Baca seluruh file relevan dari folder project (Import by Project).
 *
 * @param {string} projectPath - absolute path folder project
 * @returns {Promise<{ ok: boolean, data?: Object, error?: string }>}
 */
export async function readProject(projectPath) {
  let res
  try {
    res = await fetch(`${BASE}/files/read-project?path=${encodeURIComponent(projectPath)}`)
  } catch (err) {
    return { ok: false, error: `Tidak dapat terhubung ke server: ${err.message}` }
  }

  // Respons mungkin bukan JSON (mis. server lama tanpa route ini → HTML 404).
  let data
  try {
    data = await res.json()
  } catch {
    if (res.status === 404) {
      return { ok: false, error: 'Endpoint read-project tidak ditemukan — restart server (npm run dev) agar route terbaru termuat.' }
    }
    return { ok: false, error: `Server membalas respons non-JSON (status ${res.status}).` }
  }

  if (!res.ok) return { ok: false, error: data.error || `Gagal membaca project (status ${res.status})` }
  return { ok: true, data }
}

/**
 * Mulai run sungguhan via server.
 *
 * @param {Object}   opts
 * @param {string}   opts.projectPath  - absolute path folder project
 * @param {Array}    opts.files        - [{ path, content }] dari exportProject()
 * @param {string}   opts.browser      - 'chrome' | 'firefox' | 'edge'
 * @param {Function} opts.onLog        - callback({ level, text })
 * @param {Function} opts.onDone       - callback({ exitCode })
 * @param {Function} opts.onError      - callback(errorMessage)
 * @returns {Promise<{ stop: Function }>}
 */
export async function startRun({ projectPath, files, browser, onLog, onDone, onError }) {
  // 1. Kirim files + mulai proses mocha
  let runId
  try {
    const res = await fetch(`${BASE}/runner/start`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ projectPath, files, browser })
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      onError?.(data.error || 'Server gagal memulai run')
      return { stop: () => {} }
    }
    runId = data.runId
  } catch (err) {
    onError?.(`Tidak dapat terhubung ke server: ${err.message}`)
    return { stop: () => {} }
  }

  // 2. Buka SSE stream
  const es = new EventSource(`${BASE}/runner/stream/${runId}`)

  es.addEventListener('log', (e) => {
    try { onLog?.(JSON.parse(e.data)) } catch { /* ignore */ }
  })

  es.addEventListener('start', (e) => {
    try {
      const d = JSON.parse(e.data)
      onLog?.({ level: 'cmd', text: `$ npx mocha index.js  [${d.browser}]` })
    } catch { /* ignore */ }
  })

  es.addEventListener('done', (e) => {
    try {
      const d = JSON.parse(e.data)
      onDone?.(d)
    } catch { /* ignore */ }
    es.close()
  })

  es.addEventListener('error', (e) => {
    try {
      const d = JSON.parse(e.data)
      onError?.(d.message)
    } catch { /* ignore */ }
    es.close()
  })

  es.onerror = () => {
    // SSE ditutup dari server saat done — ini normal, abaikan
  }

  return {
    stop: async () => {
      es.close()
      try {
        await fetch(`${BASE}/runner/stop/${runId}`, { method: 'POST' })
      } catch { /* ignore */ }
    }
  }
}
