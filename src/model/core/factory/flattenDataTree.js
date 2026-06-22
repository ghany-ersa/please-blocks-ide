/**
 * flattenDataTree.js
 * Ubah nested data object menjadi array DataRef entries yang flat.
 *
 * Setiap entry menyertakan fileId dan filePath agar specGenerator
 * tahu dari file mana data tersebut harus di-require().
 *
 * Input (satu file):
 *   flattenDataTree({ login: { url: '...', title: '...' } }, 'URL', 'main', 'data/main.js')
 *
 * Output:
 *   [
 *     { path:'URL.login',       type:'object', group:'URL', fileId:'main', filePath:'data/main.js', ... },
 *     { path:'URL.login.url',   type:'string', group:'URL', fileId:'main', filePath:'data/main.js', ... },
 *     { path:'URL.login.title', type:'string', group:'URL', fileId:'main', filePath:'data/main.js', ... },
 *   ]
 */

/**
 * Flatten satu group object ke entries.
 *
 * @param {Object} obj       - isi group (key → value / nested object)
 * @param {string} groupName - nama group (e.g. 'URL', 'ACCOUNT')
 * @param {string} fileId    - ID file sumber (e.g. 'main', 'products')
 * @param {string} filePath  - path file relatif (e.g. 'data/main.js')
 * @param {string} prefix    - prefix path saat rekursi (internal)
 * @param {Array}  result    - akumulator (internal)
 */
export function flattenDataTree(obj, groupName, fileId, filePath, prefix = '', result = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path  = prefix ? `${prefix}.${key}` : `${groupName}.${key}`
    const isObj = value !== null && typeof value === 'object' && !Array.isArray(value)
    const type  = isObj ? 'object' : typeof value

    result.push({
      path,
      type,
      group:    groupName,
      fileId,
      filePath,
      value,
      label:    path,
      icon:     isObj ? '📦' : '📝',
      // fields: daftar key langsung (bukan rekursif) dari object entry.
      // Dipakai untuk validasi skema di block input — e.g. URL object harus punya ['url','title'].
      fields:   isObj ? Object.keys(value) : null,
      compatibleWith: resolveCompatibility(type)
    })

    if (isObj) {
      flattenDataTree(value, groupName, fileId, filePath, path, result)
    }
  }
  return result
}

/**
 * Flatten semua file sekaligus.
 *
 * @param {Object} files - { fileId: { filename, groups: { GROUP: {...} } }, ... }
 * @returns {Array} semua DataRef entries dari semua file
 */
export function flattenAllFiles(files) {
  const allEntries = []
  for (const [fileId, fileDef] of Object.entries(files)) {
    const filePath = `data/${fileDef.filename}.js`
    for (const [groupName, groupData] of Object.entries(fileDef.groups)) {
      flattenDataTree(groupData, groupName, fileId, filePath, '', allEntries)
    }
  }
  return allEntries
}

/**
 * Tentukan tipe input mana yang kompatibel dengan DataRef entry ini.
 */
function resolveCompatibility(type) {
  if (type === 'object') return ['dataref']
  return ['value', 'text', 'selector', 'dataref']
}
