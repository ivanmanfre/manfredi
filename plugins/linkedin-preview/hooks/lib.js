// Pure helpers for linkedin-preview: finding drafts, the "see more" fold,
// stats and checks. Nothing here touches the mods API, so tests can call it directly.

// LinkedIn does not publish its fold rules and changes them without notice.
// Measured on the live feed in October 2026: both views show 3 feed lines before
// "…more", and a blank line counts as a line. There is no separate character
// limit. `width` is the approximate number of characters on one feed line:
// about 54 on a phone (393 px), about 78 in the desktop feed.
export const VIEWS = {
  mobile: { label: 'Mobile', lines: 3, width: 54 },
  desktop: { label: 'Desktop', lines: 3, width: 78 },
}

export const MAX_CHARS = 3000

// ```linkedin, ```linkedin-post and ```li blocks hold one draft each
const FENCE = /```(?:linkedin(?:-post)?|li)[^\n]*\n([\s\S]*?)```/gi

// Find the post drafts in one of Claude's answers.
// `hinted` is true when the prompt asked for a LinkedIn post, which lets an
// unfenced, post-shaped answer count as one draft.
export function extractDrafts(answer, hinted = false) {
  if (!answer || typeof answer !== 'string') return []
  const drafts = []
  for (const m of answer.matchAll(FENCE)) {
    const text = m[1].replace(/\s+$/, '')
    if (text.trim()) drafts.push(text)
  }
  if (drafts.length || !hinted) return drafts
  const text = answer.trim()
  const postShaped =
    text.length >= 120 && text.length <= 3500 && !text.includes('```') && (text.match(/^#{1,6}\s/gm) || []).length <= 1
  return postShaped ? [text] : []
}

// Greedy word wrap of one source line into feed lines of `width` characters.
// An empty source line is one blank feed line, as LinkedIn shows it.
export function wrapLine(line, width) {
  if (line.length === 0) return ['']
  const out = []
  let current = ''
  for (const word of line.split(/(\s+)/)) {
    if (!word) continue
    if ((current + word).length <= width) {
      current += word
      continue
    }
    if (current.trim()) out.push(current.replace(/\s+$/, ''))
    current = word.trimStart()
    // A single word longer than the line is hard-broken
    while (current.length > width) {
      out.push(current.slice(0, width))
      current = current.slice(width)
    }
  }
  if (current.length || out.length === 0) out.push(current.replace(/\s+$/, ''))
  return out
}

// Wrap the whole post. Each feed line keeps the character offset where it
// starts in the post, so the fold can be mapped back to the text.
export function layout(text, width) {
  const lines = []
  let offset = 0
  for (const src of text.split('\n')) {
    let pos = offset
    for (const piece of wrapLine(src, width)) {
      const at = piece ? text.indexOf(piece, pos) : pos
      lines.push({ text: piece, start: at < 0 ? pos : at })
      pos = (at < 0 ? pos : at) + piece.length
    }
    offset += src.length + 1
  }
  return lines
}

// Where the feed cuts the post and adds "…see more".
// Returns the visible and hidden parts, the cut offset, and the feed lines.
export function fold(text, view = VIEWS.mobile) {
  const lines = layout(text, view.width)
  let cut = text.length
  // Everything after the last visible feed line is hidden
  if (lines.length > view.lines) cut = Math.min(cut, lines[view.lines].start)
  const visible = text.slice(0, cut).replace(/\s+$/, '')
  const hidden = text.slice(cut).replace(/^\s+/, '')
  const isFolded = hidden.length > 0
  return {
    isFolded,
    cut: visible.length,
    visible,
    hidden,
    visibleLines: layout(visible, view.width),
    allLines: lines,
    // The hook ends mid-sentence when the cut text does not end on . ! ? or :
    endsMidSentence: isFolded && !/[.!?:…)"'”]$/.test(visible),
  }
}

// LinkedIn puts "…see more" on the last visible line. When that line is too
// long to hold it, the line is shortened at a word so the link still fits.
export function lastLineWithMore(line, width) {
  const room = width - ' …see more'.length
  if (line.length <= room) return line
  const space = line.lastIndexOf(' ', room)
  return line.slice(0, space > room / 2 ? space : room).replace(/\s+$/, '')
}

export function stats(text) {
  const words = (text.match(/\S+/g) || []).length
  return {
    chars: text.length,
    words,
    readMinutes: Math.max(1, Math.round(words / 238)),
    lines: text.split('\n').length,
    isOverLimit: text.length > MAX_CHARS,
  }
}

// Plain facts about the draft. Each check is { level: 'warn' | 'info', text }.
export function checks(text, view = VIEWS.mobile) {
  const out = []
  const count = (re) => (text.match(re) || []).length
  const bold = count(/\*\*[^*\n]+\*\*|__[^_\n]+__/g)
  if (bold) out.push({ level: 'warn', text: `${bold}× **bold** shows as raw asterisks on LinkedIn` })
  const headings = count(/^#{1,6}\s/gm)
  if (headings) out.push({ level: 'warn', text: `${headings}× # heading shows as a raw # on LinkedIn` })
  const links = count(/\[[^\]\n]+\]\([^)\n]+\)/g)
  if (links) out.push({ level: 'warn', text: `${links}× [text](url) link shows as raw markdown on LinkedIn` })
  const code = count(/`[^`\n]+`/g)
  if (code) out.push({ level: 'warn', text: `${code}× \`code\` shows raw backticks on LinkedIn` })
  if (text.length > MAX_CHARS) {
    out.push({ level: 'warn', text: `${text.length - MAX_CHARS} characters over LinkedIn's ${MAX_CHARS.toLocaleString('en-US')} limit` })
  }
  const f = fold(text, view)
  if (f.isFolded && f.endsMidSentence) {
    out.push({ level: 'info', text: `The fold cuts the hook mid-sentence on ${view.label.toLowerCase()}` })
  }
  // A paragraph that fills more than 6 feed lines reads as a wall of text on a phone
  const dense = text
    .split(/\n\s*\n/)
    .map((p) => layout(p, VIEWS.mobile.width).length)
    .filter((n) => n > 6)
  if (dense.length) out.push({ level: 'info', text: `${dense.length} paragraph(s) longer than 6 lines on a phone` })
  const urls = count(/https?:\/\/\S+/g)
  if (urls) out.push({ level: 'info', text: `${urls} link(s) in the post body` })
  return out
}

// The text to copy: markdown symbols LinkedIn would show raw are removed.
export function toPlain(text) {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, '$1 $2')
    .replace(/`([^`\n]+)`/g, '$1')
}

export function fmt(n) {
  return n.toLocaleString('en-US')
}

// Escape text for the Desktop app's SVG card
export function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// The Desktop app draws this SVG: a LinkedIn-style post card with the fold.
export function cardSvg({ name, headline, text, view, isExpanded }) {
  const f = fold(text, view)
  const lines = isExpanded ? layout(text, view.width) : f.visibleLines
  const width = view === VIEWS.mobile ? 400 : 560
  const lineH = 20
  const top = 76
  const bodyH = Math.max(1, lines.length) * lineH
  const height = top + bodyH + 12
  const rows = lines
    .map((l, i) => {
      const y = top + i * lineH
      const isLast = i === lines.length - 1
      const hasMore = !isExpanded && f.isFolded && isLast
      const more = hasMore ? `<tspan fill="#666666"> …see more</tspan>` : ''
      const shown = hasMore ? lastLineWithMore(l.text, view.width) : l.text
      return `<text x="16" y="${y}" font-size="14" fill="#191919">${esc(shown)}${more}</text>`
    })
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="-apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif">` +
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="#ffffff" stroke="#e0dfdc"/>` +
    `<circle cx="36" cy="32" r="20" fill="#0a66c2"/>` +
    `<text x="36" y="38" font-size="16" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="-apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif">${esc((name || 'Y').trim().charAt(0).toUpperCase())}</text>` +
    `<text x="66" y="27" font-size="14" font-weight="600" fill="#191919">${esc(name)}</text>` +
    `<text x="66" y="45" font-size="12" fill="#666666">${esc(headline.slice(0, view === VIEWS.mobile ? 38 : 64))}</text>` +
    rows +
    `</svg>`
  )
}
