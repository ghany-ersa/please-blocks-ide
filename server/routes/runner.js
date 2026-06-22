/**
 * server/routes/runner.js
 *
 * POST /api/runner/start  — tulis files ke disk lalu spawn mocha
 * GET  /api/runner/stream/:runId — SSE stream log
 * POST /api/runner/stop/:runId  — kill proses
 */
import { Router }   from 'express'
import { randomUUID } from 'crypto'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { startRun, getActiveRun } from '../lib/testRunner.js'

export const runnerRouter = Router()

/**
 * POST /api/runner/start
 * Body: { projectPath, files, browser }
 */
runnerRouter.post('/start', (req, res) => {
  const { projectPath, files, browser = 'chromium' } = req.body

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath diperlukan' })
  }
  if (!existsSync(projectPath)) {
    return res.status(400).json({ error: `Folder tidak ditemukan: ${projectPath}` })
  }

  // Tulis semua file ke disk sebelum run
  if (Array.isArray(files) && files.length > 0) {
    for (const file of files) {
      try {
        const fullPath = join(projectPath, file.path)
        mkdirSync(dirname(fullPath), { recursive: true })
        writeFileSync(fullPath, file.content, 'utf-8')
      } catch (err) {
        return res.status(500).json({ error: `Gagal menulis ${file.path}: ${err.message}` })
      }
    }
  }

  const runId = randomUUID()
  // startRun async — daftarkan ke map dulu, lanjut di background
  startRun(runId, projectPath, browser)

  // Kembalikan runId segera — client bisa langsung connect ke /stream
  res.json({ ok: true, runId })
})

/**
 * GET /api/runner/stream/:runId
 * Server-Sent Events — client listen sampai event "done"
 */
runnerRouter.get('/stream/:runId', (req, res) => {
  const { runId } = req.params
  const run = getActiveRun(runId)

  // SSE headers
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  if (!run) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Run tidak ditemukan atau sudah selesai' })}\n\n`)
    res.end()
    return
  }

  run.addClient(res)

  // Cleanup saat client disconnect
  req.on('close', () => run.clients.delete(res))
})

/**
 * POST /api/runner/stop/:runId
 */
runnerRouter.post('/stop/:runId', (req, res) => {
  const { runId } = req.params
  const run = getActiveRun(runId)

  if (!run) {
    return res.status(404).json({ error: 'Run tidak ditemukan' })
  }

  run.stop()
  res.json({ ok: true })
})
