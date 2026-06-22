/**
 * useCodeHighlight — highlighter sintaks JS sederhana untuk preview kode.
 * Sebelumnya diduplikasi di CodePreview, ExportModal, ComponentBuilder.
 * Tanpa dependency eksternal — cukup untuk preview read-only.
 */
export function useCodeHighlight() {
  function highlight(code) {
    if (!code) return ''
    let h = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    // urutan penting: komentar → string → keyword → objek → flow → dataref
    h = h.replace(/(\/\/[^\n]*)/g, '<span class="cm">$1</span>')
    h = h.replace(/(`[^`\n]*`)/g, '<span class="str">$1</span>')
    h = h.replace(/'([^'<]*)'/g, "'<span class=\"str\">$1</span>'")
    h = h.replace(
      /\b(const|let|var|await|async|function|return|if|else|for|of|new|this|require|module)\b/g,
      '<span class="kw">$1</span>'
    )
    h = h.replace(/\b(please|[A-Z]{2,})\.([\w]+)/g, '<span class="obj">$1</span>.<span class="fn">$2</span>')
    h = h.replace(/\b(describe|it)\b(?=\()/g, '<span class="flow">$1</span>')
    h = h.replace(/\b([A-Z][A-Z_]*)\.([a-zA-Z.]+)/g, '<span class="data">$1</span>.<span class="data-key">$2</span>')
    return h
  }
  return { highlight }
}
