#!/usr/bin/env node
/**
 * bin/please-blocks.js
 * CLI entry point untuk Jalur 2 (npm global install).
 * Jalankan: please-blocks
 * → start Express server + buka browser otomatis ke http://localhost:3737
 */
import http              from 'node:http'
import { spawn }         from 'node:child_process'
import { existsSync }    from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const PORT        = Number(process.env.PORT || 3737)
const serverEntry = join(__dirname, '..', 'server', 'index.js')
const distPath    = join(__dirname, '..', 'dist')

if (!existsSync(distPath)) {
  console.error('[please-blocks] Error: folder dist/ tidak ditemukan.')
  console.error('Pastikan package di-install dari versi yang sudah di-build.')
  process.exit(1)
}

console.log('[please-blocks] Menjalankan server...')

const server = spawn(process.execPath, [serverEntry], {
  env:   { ...process.env, PORT: String(PORT), ELECTRON: '1' },
  stdio: 'inherit',
})

server.on('error', (err) => {
  console.error('[please-blocks] Gagal menjalankan server:', err.message)
  process.exit(1)
})

// Buka browser di platform yang sesuai
function openBrowser(url) {
  const [cmd, ...args] = process.platform === 'darwin' ? ['open', url]
    : process.platform === 'win32'                     ? ['cmd', '/c', 'start', url]
    : ['xdg-open', url]
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
}

// Poll health endpoint sampai server siap lalu buka browser (hanya sekali)
let opened = false
function waitAndOpen(attempt = 0) {
  if (opened) return
  if (attempt >= 20) {
    console.log(`[please-blocks] Buka manual: http://localhost:${PORT}`)
    return
  }
  const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
    if (res.statusCode === 200 && !opened) {
      opened = true
      console.log(`\n✓ Please Blocks berjalan di http://localhost:${PORT}\n`)
      openBrowser(`http://localhost:${PORT}`)
    } else {
      setTimeout(() => waitAndOpen(attempt + 1), 300)
    }
  })
  req.on('error', () => setTimeout(() => waitAndOpen(attempt + 1), 300))
  req.setTimeout(500, () => { req.destroy(); setTimeout(() => waitAndOpen(attempt + 1), 300) })
}

setTimeout(() => waitAndOpen(), 300)

function shutdown() {
  console.log('\n[please-blocks] Menghentikan server...')
  server.kill()
  process.exit(0)
}

process.on('SIGINT',  shutdown)   // Ctrl+C
process.on('SIGTERM', shutdown)   // kill <pid>
process.on('exit',    () => server.kill())  // terminal ditutup paksa
