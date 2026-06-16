/**
 * server/routes/files.js
 * POST /api/files/write  — terima array files dari IDE, tulis ke disk.
 * GET  /api/files/browse — list isi direktori untuk directory picker.
 */
import { Router }                                from 'express'
import { writeFileSync, mkdirSync, readdirSync,
         statSync, existsSync, readFileSync }     from 'fs'
import { join, dirname, resolve, sep }           from 'path'
import { homedir }                               from 'os'

export const filesRouter = Router()

const MAX_FILE_BYTES  = 512 * 1024      // skip file > 512 KB
const MAX_TOTAL_BYTES = 5 * 1024 * 1024 // batas agregat
const MAX_FILES       = 200

/**
 * POST /api/files/write
 * Body: { projectPath: string, files: [{ path, content }] }
 */
filesRouter.post('/write', (req, res) => {
  const { projectPath, files } = req.body

  if (!projectPath || !Array.isArray(files)) {
    return res.status(400).json({ error: 'projectPath dan files diperlukan' })
  }

  const written = []
  const errors  = []

  for (const file of files) {
    try {
      const fullPath = join(projectPath, file.path)
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, file.content, 'utf-8')
      written.push(file.path)
    } catch (err) {
      errors.push({ path: file.path, error: err.message })
    }
  }

  res.json({ ok: errors.length === 0, written, errors })
})

/**
 * GET /api/files/browse?path=/some/dir
 * Kembalikan daftar entry di direktori — hanya folder dan file relevan.
 */
filesRouter.get('/browse', (req, res) => {
  // Default ke home directory jika path tidak disediakan
  const reqPath = req.query.path ? String(req.query.path) : homedir()
  const absPath = resolve(reqPath)

  if (!existsSync(absPath)) {
    return res.status(404).json({ error: `Path tidak ditemukan: ${absPath}` })
  }

  let stat
  try { stat = statSync(absPath) } catch {
    return res.status(403).json({ error: 'Tidak bisa membaca path ini' })
  }

  if (!stat.isDirectory()) {
    return res.status(400).json({ error: 'Path bukan direktori' })
  }

  let entries = []
  try {
    entries = readdirSync(absPath, { withFileTypes: true })
  } catch {
    return res.status(403).json({ error: 'Tidak punya izin membaca direktori ini' })
  }

  const items = entries
    .filter(e => !e.name.startsWith('.'))   // sembunyikan hidden files
    .map(e => {
      const isDir = e.isDirectory()
      return {
        name:  e.name,
        isDir,
        path:  join(absPath, e.name),
        // tandai folder yang sepertinya project test
        isProject: isDir && hasPackageJson(join(absPath, e.name))
      }
    })
    .sort((a, b) => {
      // Folder dulu, lalu file; alfabet dalam tiap grup
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  // Breadcrumb dari root ke absPath
  const parts  = absPath.split(sep).filter(Boolean)
  const crumbs = parts.map((part, i) => ({
    name: part || sep,
    path: sep + parts.slice(0, i + 1).join(sep)
  }))
  // Tambahkan root di depan untuk Unix
  if (absPath.startsWith(sep)) {
    crumbs.unshift({ name: '/', path: '/' })
  }

  res.json({ path: absPath, crumbs, items })
})

function hasPackageJson(dirPath) {
  try { return existsSync(join(dirPath, 'package.json')) } catch { return false }
}

/**
 * GET /api/files/read-project?path=/abs/project
 * Baca semua file relevan dari sebuah project please-test untuk Import by Project.
 * Aman: hanya path di dalam home directory.
 */
filesRouter.get('/read-project', (req, res) => {
  const reqPath = req.query.path ? String(req.query.path) : ''
  if (!reqPath) return res.status(400).json({ error: 'Parameter path diperlukan' })

  const absPath = resolve(reqPath)
  if (!existsSync(absPath)) {
    return res.status(404).json({ error: `Path tidak ditemukan: ${absPath}` })
  }
  let stat
  try { stat = statSync(absPath) } catch {
    return res.status(403).json({ error: 'Tidak bisa membaca path ini' })
  }
  if (!stat.isDirectory()) {
    return res.status(400).json({ error: 'Path bukan direktori' })
  }

  // Safety: hanya di dalam home directory
  const home = homedir()
  if (absPath !== home && !absPath.startsWith(home + sep)) {
    return res.status(403).json({ error: 'Hanya folder di dalam home directory yang boleh dibaca' })
  }

  const warnings = []
  const skipped  = []
  const budget   = { total: 0, count: 0 }

  const specs      = readDir(absPath, 'feature',    '.spec.js', skipped, warnings, budget)
  const data       = readDir(absPath, 'data',       '.js',      skipped, warnings, budget)
  const components = readDir(absPath, 'components',  '.js',      skipped, warnings, budget)
  const env        = readSingle(absPath, '.env',   skipped, warnings, budget)
  const index      = readSingle(absPath, 'index.js', skipped, warnings, budget)

  if (!specs.length) warnings.push('Tidak ada file di feature/ — canvas akan kosong.')

  res.json({ path: absPath, files: { specs, data, components, env, index }, skipped, warnings })
})

/** Baca file di subfolder dengan suffix tertentu → [{ name, content }]. */
function readDir(root, sub, suffix, skipped, warnings, budget) {
  const dir = join(root, sub)
  if (!existsSync(dir)) { warnings.push(`Folder ${sub}/ tidak ditemukan.`); return [] }

  let entries = []
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch {
    warnings.push(`Tidak bisa membaca folder ${sub}/.`); return []
  }

  const out = []
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(suffix)) continue
    const content = readCapped(join(dir, e.name), e.name, skipped, budget)
    if (content !== null) out.push({ name: e.name, content })
  }
  return out
}

/** Baca satu file top-level → string atau null. */
function readSingle(root, name, skipped, _warnings, budget) {
  const p = join(root, name)
  if (!existsSync(p)) return null
  return readCapped(p, name, skipped, budget)
}

/** Baca file dengan batas ukuran & budget agregat. */
function readCapped(fullPath, name, skipped, budget) {
  try {
    const size = statSync(fullPath).size
    if (size > MAX_FILE_BYTES) { skipped.push({ name, reason: 'terlalu besar' }); return null }
    if (budget.count >= MAX_FILES || budget.total + size > MAX_TOTAL_BYTES) {
      skipped.push({ name, reason: 'melebihi batas total' }); return null
    }
    budget.total += size
    budget.count += 1
    return readFileSync(fullPath, 'utf-8')
  } catch {
    skipped.push({ name, reason: 'gagal dibaca' })
    return null
  }
}
