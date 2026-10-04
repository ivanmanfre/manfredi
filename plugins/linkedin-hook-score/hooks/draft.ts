// Finding LinkedIn drafts in Claude's answers, and the feed's "see more" fold.
// The same file ships in every mod of the pack, so each one installs alone and
// finds drafts exactly the way linkedin-preview does.

// LinkedIn does not publish its fold rules and changes them without notice.
// Measured on the live feed in October 2026: both views show 3 feed lines before
// "…more", and a blank line counts as a line. `width` is the approximate number
// of characters on one feed line: about 54 on a phone, about 78 on desktop.
export const VIEWS = {
  mobile: { label: 'Mobile', lines: 3, width: 54 },
  desktop: { label: 'Desktop', lines: 3, width: 78 },
} as const

export type View = (typeof VIEWS)[keyof typeof VIEWS]

export const MAX_CHARS = 3000

// ```linkedin, ```linkedin-post and ```li blocks hold one draft each
const FENCE = /```(?:linkedin(?:-post)?|li)[^\n]*\n([\s\S]*?)```/gi

// A prompt that asks for a LinkedIn post
export const MENTIONS_LINKEDIN = /linked\s?in|\bli post\b/i

// What every mod of the pack asks Claude for when the prompt is about LinkedIn.
// linkedin-preview adds the same request; a mod adds it only when no other mod
// already did, so Claude reads it once.
export function draftNote(plugin: string): string {
  return (
    `${plugin} mod: when your answer contains a LinkedIn post draft, put each draft (the post text only) ` +
    'in its own ```linkedin fenced code block, so the user can check it before posting.'
  )
}

export function hasDraftNote(context: readonly string[] | undefined): boolean {
  return (context ?? []).some((c) => c.includes('```linkedin fenced code block'))
}

// Find the post drafts in one of Claude's answers.
// `hinted` is true when the prompt asked for a LinkedIn post, which lets an
// unfenced, post-shaped answer count as one draft.
export function extractDrafts(answer: unknown, hinted = false): string[] {
  if (!answer || typeof answer !== 'string') return []
  const drafts: string[] = []
  for (const m of answer.matchAll(FENCE)) {
    const text = (m[1] ?? '').replace(/\s+$/, '')
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
export function wrapLine(line: string, width: number): string[] {
  if (line.length === 0) return ['']
  const out: string[] = []
  let current = ''
  for (const word of line.split(/(\s+)/)) {
    if (!word) continue
    if ((current + word).length <= width) {
      current += word
      continue
    }
    if (current.trim()) out.push(current.replace(/\s+$/, ''))
    current = word.trimStart()
    while (current.length > width) {
      out.push(current.slice(0, width))
      current = current.slice(width)
    }
  }
  if (current.length || out.length === 0) out.push(current.replace(/\s+$/, ''))
  return out
}

export type FeedLine = { text: string; start: number }

// Wrap the whole post; each feed line keeps its character offset in the post.
export function layout(text: string, width: number): FeedLine[] {
  const lines: FeedLine[] = []
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

export type Fold = {
  isFolded: boolean
  cut: number
  visible: string
  hidden: string
  endsMidSentence: boolean
}

// Where the feed cuts the post and adds "…see more".
export function fold(text: string, view: View = VIEWS.mobile): Fold {
  const lines = layout(text, view.width)
  let cut = text.length
  const after = lines[view.lines]
  if (after) cut = Math.min(cut, after.start)
  const visible = text.slice(0, cut).replace(/\s+$/, '')
  const hidden = text.slice(cut).replace(/^\s+/, '')
  const isFolded = hidden.length > 0
  return {
    isFolded,
    cut: visible.length,
    visible,
    hidden,
    endsMidSentence: isFolded && !/[.!?:…)"'”]$/.test(visible),
  }
}

// The hook: what a phone shows above "see more"
export function hookOf(text: string): string {
  return fold(text, VIEWS.mobile).visible
}

// One line for display: newlines become " / " and the text is cut to `max`
export function oneLine(text: string, max: number): string {
  const flat = text.replace(/\s*\n+\s*/g, ' / ').trim()
  if (max <= 1) return flat.slice(0, Math.max(0, max))
  return flat.length > max ? flat.slice(0, max - 1).replace(/\s+$/, '') + '…' : flat
}
