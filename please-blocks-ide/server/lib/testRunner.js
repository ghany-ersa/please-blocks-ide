/**
 * server/lib/testRunner.js
 * Spawn proses mocha dan stream stdout/stderr baris per baris ke SSE clients.
 */
import { spawn }           from 'child_process'
import { resolve, join }   from 'path'
import { existsSync }      from 'fs'

// Map: runId → { process, clients: Set<res> }
const activeRuns = new Map()

/**
 * Parse satu baris stdout playwright → { level, text }
 * level: 'pass' | 'fail' | 'warn' | 'cmd' | 'info'
 */
function parseLine(line) {
  const t = line.trimEnd()
  if (!t) return null

  // Realtime pass/fail tick
  if (/[✓✔]/.test(t)) return { level: 'pass', text: t }
  if (/[✘✗]/.test(t)) return { level: 'fail', text: t }

  // Summary stats footer
  if (/^\s+\d+\s+passed/.test(t)) return { level: 'pass', text: t }
  if (/^\s+\d+\s+failed/.test(t)) return { level: 'fail', text: t }
  if (/skipped/.test(t))          return { level: 'warn', text: t }

  // Summary header "  N) path › Feature › TC ────"
  if (/^\s+\d+\)\s+/.test(t)) return { level: 'fail', text: t }

  // Expected / Received — level khusus agar bisa diberi warna di UI
  if (/^\s+Expected\s*[:：]/.test(t)) return { level: 'expected', text: t }
  if (/^\s+Received\s*[:：]/.test(t)) return { level: 'received', text: t }

  // Pesan error (tanpa stack trace)
  if (/Error:/.test(t) && !/^\s+at /.test(t)) return { level: 'fail', text: t }

  // Path screenshot / video artifact
  if (/^\s+test-results\/.+\.(png|webm)/.test(t)) return { level: 'info', text: t }

  // npm command
  if (/^\s*\$/.test(t)) return { level: 'cmd', text: t }

  // Filter: stack trace, source context, separator, attachment header
  if (/^\s+at /.test(t))              return null
  if (/^\s*\d+\s*[|›]/.test(t))      return null
  if (/^\s*>?\s*\d+\s*\|/.test(t))   return null
  if (/^\s*\^+/.test(t))             return null
  if (/^\s*[─\-]{4,}/.test(t))       return null
  if (/attachment\s*#\d+:/i.test(t)) return null
  if (/Error Context:/i.test(t))     return null
  if (/^\s*\.\.\.$/.test(t))         return null

  return { level: 'info', text: t }
}

/**
 * Mulai run mocha di projectPath.
 * @param {string} runId       - ID unik run ini
 * @param {string} projectPath - absolute path ke folder project
 * @param {string} browser     - 'chrome' | 'firefox' | 'edge'
 * @returns {{ stop: Function }}
 */
/**
 * Jalankan npm install di projectPath, stream output ke send().
 * Resolve true jika sukses, false jika gagal.
 */
function runNpmInstall(projectPath, send) {
  return new Promise((resolve) => {
    send('log', { level: 'cmd', text: '$ npm install' })
    const proc = spawn('npm', ['install'], { cwd: projectPath, shell: true })
    proc.stdout.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        const t = line.trimEnd()
        if (t) send('log', { level: 'info', text: t })
      }
    })
    proc.stderr.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n')) {
        const t = line.trimEnd()
        if (!t) return
        // npm warn bukan error fatal
        const level = t.startsWith('npm warn') ? 'warn' : 'info'
        send('log', { level, text: t })
      }
    })
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', (err) => {
      send('log', { level: 'fail', text: `npm install gagal: ${err.message}` })
      resolve(false)
    })
  })
}

export async function startRun(runId, projectPath, browser = 'chrome') {
  const clients  = new Set()
  // Antrian log sebelum SSE client connect
  const logQueue = []

  function send(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    if (clients.size === 0) {
      // Belum ada client — buffer dulu
      logQueue.push(payload)
      return
    }
    // Flush queue jika ada
    while (logQueue.length) {
      const q = logQueue.shift()
      for (const res of clients) { try { res.write(q) } catch { clients.delete(res) } }
    }
    for (const res of clients) {
      try { res.write(payload) } catch { clients.delete(res) }
    }
  }

  // Set BROWSER env agar app.js bisa pakai process.env.BROWSER
  const env = {
    ...process.env,
    BROWSER:      browser,
    FORCE_COLOR:  '0',
    NODE_PATH:    resolve(projectPath, 'node_modules')
  }

  // Daftarkan ke map sekarang agar /stream bisa connect sebelum npm install selesai
  activeRuns.set(runId, {
    clients,
    addClient: (res) => {
      clients.add(res)
      // Kirim semua log yang sudah di-buffer
      while (logQueue.length) {
        try { res.write(logQueue.shift()) } catch { /* ignore */ }
      }
    },
    stop: () => {}   // akan di-overwrite setelah proc spawn
  })

  send('start', { runId, projectPath, browser, time: Date.now() })

  // Cek node_modules — kalau belum ada, jalankan npm install dulu
  const needsInstall = !existsSync(join(projectPath, 'node_modules'))

  if (needsInstall) {
    send('log', { level: 'warn', text: '⚠  node_modules tidak ditemukan — menjalankan npm install...' })
    const installed = await runNpmInstall(projectPath, send)
    if (!installed) {
      send('done', { exitCode: 1, time: Date.now() })
      for (const res of clients) { try { res.end() } catch { /* ignore */ } }
      activeRuns.delete(runId)
      return { addClient: () => {}, stop: () => {} }
    }
    send('log', { level: 'pass', text: '✓  npm install selesai' })
    send('log', { level: 'info', text: '' })
  }

  const proc = spawn('npx', ['playwright', 'test', '--reporter=list'], {
    cwd: projectPath,
    env,
    shell: true
  })

  proc.stdout.setEncoding('utf-8')
  proc.stderr.setEncoding('utf-8')

  let buffer = ''

  function processBuffer(chunk) {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() // simpan baris terakhir yang belum newline
    for (const line of lines) {
      const parsed = parseLine(line)
      if (parsed) send('log', parsed)
    }
  }

  proc.stdout.on('data', processBuffer)
  proc.stderr.on('data', (chunk) => {
    // stderr biasanya error Node.js / mocha setup
    for (const line of chunk.split('\n')) {
      if (line.trim()) send('log', { level: 'fail', text: line.trimEnd() })
    }
  })

  proc.on('close', (code) => {
    // Flush sisa buffer
    if (buffer.trim()) {
      const parsed = parseLine(buffer)
      if (parsed) send('log', parsed)
    }
    send('done', { exitCode: code, time: Date.now() })
    // Tutup semua SSE connections
    for (const res of clients) {
      try { res.end() } catch { /* ignore */ }
    }
    activeRuns.delete(runId)
  })

  proc.on('error', (err) => {
    send('log', { level: 'fail', text: `Gagal menjalankan playwright: ${err.message}` })
    send('log', { level: 'warn', text: 'Pastikan node_modules sudah terinstall di folder project (npm install)' })
    send('done', { exitCode: 1, time: Date.now() })
  })

  // Update stop function sekarang proc sudah ada
  activeRuns.get(runId).stop = () => {
    proc.kill('SIGTERM')
    send('log', { level: 'warn', text: '⏹  Runner dihentikan oleh pengguna' })
    send('done', { exitCode: -1, time: Date.now() })
  }
}

export function getActiveRun(runId) {
  return activeRuns.get(runId) || null
}
