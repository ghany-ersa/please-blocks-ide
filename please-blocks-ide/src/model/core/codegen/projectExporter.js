/**
 * projectExporter.js
 * Generate semua file project sekaligus dari state IDE.
 *
 * Output: { 'feature/login.spec.js': '...', 'data/main.js': '...', ... }
 */

import { generateSpec, generateIndex } from './specGenerator.js'
import { generateAllDataFiles }        from '../factory/DataFactory.js'
import { generateComponentFile }       from '../factory/ComponentFactory.js'

/**
 * Generate semua file project.
 * @param {Object} canvas       - canvasStore
 * @param {Object} blockRegistry- blockRegistry store
 * @param {Object} dataRegistry - dataRegistry store
 * @param {Object} componentStore - componentStore
 * @returns {Array<{ path, content, category }>}
 */
export function exportProject(canvas, blockRegistry, dataRegistry, componentStore, projectName = 'my-automation-tests') {
  const files = []

  // ── Feature specs ──────────────────────────────────────────────
  for (const feature of canvas.features) {
    const slug    = slugify(feature.label)
    const content = generateSpec(feature, blockRegistry, dataRegistry.entries)
    files.push({
      path:     `feature/${slug}.spec.js`,
      content,
      category: 'spec',
      enabled:  feature.enabled !== false
    })
  }

  // ── index.js ──────────────────────────────────────────────────
  files.push({
    path:     'index.js',
    content:  generateIndex(canvas.features),
    category: 'index'
  })

  // ── Data files ────────────────────────────────────────────────
  const dataFiles = generateAllDataFiles(dataRegistry.files, dataRegistry.env)
  for (const [fileId, content] of Object.entries(dataFiles)) {
    const filename = dataRegistry.files[fileId]?.filename || fileId
    files.push({
      path:     `data/${filename}.js`,
      content,
      category: 'data'
    })
  }

  // ── .env ──────────────────────────────────────────────────────
  const envLines = ['# Di-generate oleh Please Blocks IDE', '']
  for (const [key, val] of Object.entries(dataRegistry.env)) {
    envLines.push(`${key}=${val}`)
  }
  files.push({ path: '.env', content: envLines.join('\n'), category: 'config' })

  // ── Component files ───────────────────────────────────────────
  for (const comp of componentStore.components) {
    const content = generateComponentFile(comp, blockRegistry, dataRegistry.entries)
    files.push({
      path:     `components/${comp.name.toLowerCase()}.js`,
      content,
      category: 'component'
    })
  }

  // ── app.js (template) ─────────────────────────────────────────
  const compNames   = componentStore.components.map(c => c.name)
  const compExports = componentStore.components.map(c => c.exportName)
  files.push({
    path:     'app.js',
    content:  generateAppFile(compNames, compExports),
    category: 'config'
  })

  // ── package.json ──────────────────────────────────────────────
  files.push({
    path:     'package.json',
    content:  generatePackageJson(projectName),
    category: 'config'
  })

  // ── playwright.config.js ─────────────────────────────────────
  files.push({
    path:     'playwright.config.js',
    content:  generatePlaywrightConfig(),
    category: 'config'
  })

  // ── .gitignore ────────────────────────────────────────────────
  files.push({
    path:     '.gitignore',
    content:  generateGitignore(),
    category: 'config'
  })

  // ── README.md ─────────────────────────────────────────────────
  files.push({
    path:     'README.md',
    content:  generateReadme(projectName, canvas.features),
    category: 'readme'
  })

  return files
}

// ── Helpers ──────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'feature'
}

function generateAppFile(compNames, compExports) {
  const lines = [
    `const Please = require('please-test')`,
  ]

  for (const name of compNames) {
    lines.push(`const ${name}Component = require('./components/${name.toLowerCase()}')`)
  }

  lines.push(``)
  lines.push(`/**`)
  lines.push(` * @param {import('@playwright/test').Page} page`)
  lines.push(` */`)
  lines.push(`function createApp(page) {`)
  lines.push(`    const please = new Please(page)`)

  if (compNames.length === 0) {
    lines.push(`    return { please }`)
  } else {
    lines.push(`    return {`)
    lines.push(`        please,`)
    for (let i = 0; i < compNames.length; i++) {
      const comma = i < compNames.length - 1 ? ',' : ''
      lines.push(`        ${compExports[i]}: new ${compNames[i]}Component(please)${comma}`)
    }
    lines.push(`    }`)
  }

  lines.push(`}`)
  lines.push(``)
  lines.push(`module.exports = { createApp }`)

  return lines.join('\n')
}

function generatePackageJson(name = 'my-automation-tests') {
  return JSON.stringify({
    name,
    version: '1.0.0',
    description: 'Automation test project using please-test',
    scripts: {
      test:   'playwright test',
      report: 'playwright test --reporter=html && playwright show-report'
    },
    dependencies: {
      'please-test': '^2.0.0'
    },
    devDependencies: {
      'dotenv':           '^16.0.0',
      '@playwright/test': '^1.40.0'
    }
  }, null, 4)
}

function generatePlaywrightConfig() {
  return [
    `require('dotenv').config()`,
    ``,
    `const { defineConfig, devices } = require('@playwright/test')`,
    ``,
    `module.exports = defineConfig({`,
    `    testDir: './feature',`,
    `    timeout: 60000,`,
    `    reporter: 'html',`,
    `    use: {`,
    `        headless: true,`,
    `        screenshot: 'only-on-failure',`,
    `        video: 'retain-on-failure',`,
    `        baseURL: process.env.BASE_URL,`,
    `    },`,
    `    projects: [`,
    `        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },`,
    `    ],`,
    `})`,
  ].join('\n')
}

function generateGitignore() {
  return [
    'node_modules/',
    '.env',
    'test-results/',
    'playwright-report/',
    '*.log',
  ].join('\n')
}

function generateReadme(projectName, features) {
  const featureList = features
    .map(f => `- ${f.enabled !== false ? '✅' : '⏸'} ${f.label} (${f.testCases.length} test case)`)
    .join('\n')

  return `# ${projectName}

Project automation test yang di-generate oleh **Please Blocks IDE**.

## Prasyarat

- Node.js >= 14.0.0

## Cara Menjalankan

### 1. Install dependencies

\`\`\`bash
npm install
npx playwright install chromium
\`\`\`

### 2. Buat file .env

\`\`\`bash
cp .env.example .env
\`\`\`

Buka \`.env\` dan isi nilai yang sesuai (BASE_URL, credentials, dll).

### 3. Jalankan test

\`\`\`bash
npm test
\`\`\`

### 4. Lihat laporan HTML (opsional)

\`\`\`bash
npm run report
\`\`\`

## Struktur Project

\`\`\`
${projectName}/
├── app.js                # Factory createApp(page)
├── playwright.config.js  # Konfigurasi Playwright
├── .env                  # Variabel environment (tidak di-commit)
├── components/           # Reusable action classes
├── data/                 # Test data dan URL
└── feature/              # Test spec files
\`\`\`

## Features

${featureList || '(belum ada feature)'}

---
*Di-generate oleh Please Blocks IDE — ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*
`
}
