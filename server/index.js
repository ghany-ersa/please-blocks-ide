/**
 * server/index.js
 * Express local server untuk Please Blocks.
 * Di mode Electron, juga serve static dist/ agar UI load dari http://localhost:3737
 * sehingga semua fetch tetap same-origin (tidak ada mixed-content / CORS issue).
 */
import express           from 'express'
import cors              from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync }    from 'fs'
import { filesRouter  }  from './routes/files.js'
import { runnerRouter }  from './routes/runner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app       = express()
const PORT      = process.env.PORT || 3737
const ELECTRON  = process.env.ELECTRON === '1'
const distPath  = join(__dirname, '..', 'dist')

const allowedOrigins = ['http://localhost:5173', `http://localhost:${PORT}`]
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin))
}))
app.use(express.json({ limit: '10mb' }))

app.use('/api/files',  filesRouter)
app.use('/api/runner', runnerRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true, version: '1.0.0' }))

// Di mode Electron: serve Vue build dari Express agar UI dan API same-origin
if (ELECTRON && existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/{*path}', (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`[please-blocks server] http://localhost:${PORT}${ELECTRON ? ' (Electron mode)' : ''}`)
})
