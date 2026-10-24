// Turns the plain text an admin types into the HTML shown in the apps.
// Supported: # / ## / ### headings, "- " or "* " bullets, **bold**, blank line = paragraph break.
// Everything is HTML-escaped first, so the output is safe to render with innerHTML.
const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const bold = (escaped) => escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

const HEADING_CLASS = {
  h1: 'bg-amber-100/70 px-2 py-1 rounded-md inline-block',
  h2: 'bg-amber-100/50 px-2 py-0.5 rounded-md inline-block',
  h3: 'bg-amber-100/30 px-2 py-0.5 rounded-md inline-block',
}

export function plainTextToLegalHtml(plainText) {
  const out = []
  let inList = false
  const closeList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (const rawLine of String(plainText ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      closeList()
      out.push('<p><br></p>')
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      closeList()
      const tag = `h${heading[1].length}`
      out.push(`<${tag}><span class="${HEADING_CLASS[tag]}">${bold(escapeHtml(heading[2]))}</span></${tag}>`)
      continue
    }

    const bullet = line.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      if (!inList) {
        out.push('<ul>')
        inList = true
      }
      out.push(`<li>${bold(escapeHtml(bullet[1]))}</li>`)
      continue
    }

    closeList()
    out.push(`<p>${bold(escapeHtml(line))}</p>`)
  }
  closeList()
  return out.join('')
}
