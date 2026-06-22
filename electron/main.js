import { app, BrowserWindow, shell } from 'electron'
import { fileURLToPath }             from 'url'
import { dirname, join }  from 'path'
import { existsSync }     from 'fs'
import { spawn }                     from 'child_process'
import { createRequire }             from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require   = createRequire(import.meta.url)

const SERVER_PORT = 3737
let serverProcess = null
let mainWindow    = null

function findNode () {
  // Cari Node.js sistem (bukan Node bawaan Electron) untuk menjalankan server ES module
  const candidates = [
    process.env.NODE_PATH,             // jika di-set eksplisit
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/bin/node',
  ]
  for (const p of candidates) {
    if (p && existsSync(p)) return p
  }
  return 'node'
}

function startServer () {
  const serverEntry = join(__dirname, '..', 'server', 'index.js')
  const node        = findNode()

  const extraPaths = ['/usr/local/bin', '/opt/homebrew/bin', '/usr/bin'].join(':')
  const PATH       = [extraPaths, process.env.PATH].filter(Boolean).join(':')

  console.log(`[electron] starting server with: ${node} ${serverEntry}`)

  serverProcess = spawn(node, [serverEntry], {
    env:   { ...process.env, PATH, PORT: String(SERVER_PORT), ELECTRON: '1' },
    stdio: 'inherit',
  })

  serverProcess.on('error', (err) => console.error('[electron] server error:', err))
  serverProcess.on('exit',  (code) => console.log(`[electron] server exited (${code})`))
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'Please Blocks',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration:  false,
    },
  })

  // Buka link eksternal di browser default, bukan di dalam Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const isDev = process.env.ELECTRON_DEV === '1'

  if (isDev) {
    // Mode dev: load dari Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Production: load dari Express server (same-origin, tidak ada CORS/mixed-content issue)
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`)
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// Tunggu server siap lalu buat window
// Server Express butuh ~300ms untuk listen; retry sederhana lebih robust dari sleep tetap
async function waitForServer (retries = 20, delayMs = 300) {
  const http = require('http')
  for (let i = 0; i < retries; i++) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.setTimeout(500, () => { req.destroy(); resolve(false) })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

app.whenReady().then(async () => {
  startServer()

  const ready = await waitForServer()
  if (!ready) {
    console.error('[electron] server tidak merespons setelah beberapa percobaan')
  }

  createWindow()

  app.on('activate', () => {
    // macOS: buat ulang window jika di-click di dock saat tidak ada window
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
  // Di macOS aplikasi biasanya tetap aktif sampai Cmd+Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})
