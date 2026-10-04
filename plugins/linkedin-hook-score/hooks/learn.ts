// Reading your own posts and their numbers from LinkedIn's exports.
//
// Two LinkedIn exports, and one file you write yourself:
// 1. Creator analytics export (Analytics > Content > Export), an .xlsx whose
//    TOP POSTS sheet lists your top 50 posts by engagements and by impressions:
//    each with its URL, publish date and that number. It has no post text.
// 2. "Get a copy of your data" (Settings > Data privacy), a .zip whose
//    Shares.csv holds every post you wrote: Date, ShareLink, ShareCommentary
//    (the text), SharedUrl, MediaUrl, Visibility. It has no numbers.
// 3. A top-posts.md or .csv you paste your best posts into.
// The mod joins 1 and 2 by post id and time, so each post gets text and numbers.

import { isZip, readZip } from './unzip'
import { hookOf } from './draft'
import type { Post, Metric } from '../types'

// ---------- CSV ----------

// RFC 4180 CSV: quoted fields, doubled quotes, line breaks inside quotes
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

// ---------- numbers, ids, dates ----------

export function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v !== 'string') return undefined
  const s = v.replace(/[,\s]/g, '')
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined
  return Number(s)
}

// The long numeric id in a LinkedIn post URL (activity, share or ugcPost)
export function postId(url: string | undefined): string | undefined {
  if (!url) return undefined
  let u = url
  try {
    u = decodeURIComponent(url)
  } catch {
    // keep the raw text
  }
  const m = u.match(/(\d{15,22})/)
  return m ? m[1] : undefined
}

// LinkedIn post ids carry their creation time: the id's top 41 bits are
// milliseconds since 1970. A share id and its activity id are minted moments apart.
export function idTime(id: string | undefined): number | undefined {
  if (!id) return undefined
  try {
    const ms = Number(BigInt(id) >> 22n)
    return ms > 1.2e12 && ms < 4.1e12 ? ms : undefined
  } catch {
    return undefined
  }
}

// A day as YYYY-MM-DD from LinkedIn's date forms: "2026-10-03 12:00:21",
// "10/3/2026", or an Excel day number
export function dayOf(v: unknown): string | undefined {
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10)
  }
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2]!.padStart(2, '0')}-${m[3]!.padStart(2, '0')}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`
  const n = toNumber(s)
  return n !== undefined ? dayOf(n) : undefined
}

// ---------- xlsx ----------

function unescapeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function textOf(xml: string): string {
  let out = ''
  for (const m of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) out += m[1]
  return unescapeXml(out)
}

function columnIndex(ref: string): number {
  const letters = (ref.match(/^[A-Z]+/) || [''])[0]
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export type Cell = string | number | undefined

// Every sheet of a workbook, by name, as rows of cells
export function readXlsx(bytes: Uint8Array): Record<string, Cell[][]> {
  const entries = readZip(bytes)
  const decoder = new TextDecoder()
  const file = (name: string) => {
    const e = entries.find((x) => x.name === name)
    return e ? decoder.decode(e.read()) : undefined
  }
  const workbook = file('xl/workbook.xml')
  if (!workbook) throw new Error('This .xlsx has no workbook in it.')
  const rels = file('xl/_rels/workbook.xml.rels') ?? ''
  const shared: string[] = []
  const sst = file('xl/sharedStrings.xml')
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1] ?? ''))

  const sheets: Record<string, Cell[][]> = {}
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = m[1] ?? ''
    const name = unescapeXml((attrs.match(/\bname="([^"]*)"/) || [])[1] ?? '')
    const rid = (attrs.match(/\br:id="([^"]*)"/) || [])[1]
    const rel = rid ? rels.match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*>`)) : null
    let target = rel ? (rel[0].match(/Target="([^"]*)"/) || [])[1] : undefined
    if (!target) continue
    target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '')
    const xml = file(target)
    if (!xml) continue
    const rows: Cell[][] = []
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row: Cell[] = []
      for (const c of (r[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const cAttrs = c[1] ?? ''
        const body = c[2] ?? ''
        const ref = (cAttrs.match(/\br="([A-Z]+)\d+"/) || [])[1]
        const type = (cAttrs.match(/\bt="([^"]*)"/) || [])[1]
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1]
        let value: Cell
        if (type === 's') value = shared[Number(v)]
        else if (type === 'inlineStr') value = textOf(body)
        else if (type === 'str' || type === 'e') value = v !== undefined ? unescapeXml(v) : undefined
        else if (type === 'b') value = v
        else value = v !== undefined ? Number(v) : undefined
        const at = ref ? columnIndex(ref) : row.length
        row[at] = value
      }
      rows.push(row)
    }
    sheets[name] = rows
  }
  return sheets
}

// The TOP POSTS sheet: two side-by-side tables, top 50 by engagements and top
// 50 by impressions, under a header row of "Post URL, Post publish date, <metric>"
export function topPostsFromSheets(sheets: Record<string, Cell[][]>): Metric[] {
  const name = Object.keys(sheets).find((n) => /top\s*posts/i.test(n))
  if (!name) return []
  const rows = sheets[name] ?? []
  const headerAt = rows.findIndex((r) => r.some((c) => typeof c === 'string' && /post\s*url/i.test(c)))
  if (headerAt < 0) return []
  const header = rows[headerAt] ?? []
  const tables: { url: number; date: number; value: number; metric: 'engagements' | 'impressions' }[] = []
  header.forEach((c, i) => {
    if (typeof c !== 'string' || !/post\s*url/i.test(c)) return
    for (let j = i + 1; j < Math.min(header.length, i + 4); j++) {
      const h = String(header[j] ?? '')
      if (/engagement/i.test(h)) tables.push({ url: i, date: i + 1, value: j, metric: 'engagements' })
      if (/impression/i.test(h)) tables.push({ url: i, date: i + 1, value: j, metric: 'impressions' })
    }
  })
  const byUrl = new Map<string, Metric>()
  for (const row of rows.slice(headerAt + 1)) {
    for (const t of tables) {
      const url = row[t.url]
      const value = toNumber(row[t.value])
      if (typeof url !== 'string' || !/linkedin\.com/i.test(url) || value === undefined) continue
      const key = postId(url) ?? url
      const m: Metric = byUrl.get(key) ?? { url, id: postId(url), date: dayOf(row[t.date]) }
      m[t.metric] = value
      byUrl.set(key, m)
    }
  }
  return [...byUrl.values()]
}

// ---------- your posts with text ----------

const TEXT_COLS = /^(sharecommentary|post\s*text|post|text|content|commentary|body|copy|hook)$/i
const URL_COLS = /^(sharelink|post\s*url|url|link|permalink)$/i
const DATE_COLS = /^(date|post\s*publish\s*date|published|publish\s*date|created(\s*at)?)$/i
const IMP_COLS = /impressions|views/i
const ENG_COLS = /engagements|engagement|reactions|likes/i

// Shares.csv from LinkedIn, or any CSV with a column of post text
export function postsFromCsv(text: string): { posts: Post[]; metrics: Metric[] } {
  const rows = parseCsv(text)
  const headerAt = rows.findIndex((r) => r.some((c) => TEXT_COLS.test(c.trim()) || /post\s*url/i.test(c)))
  if (headerAt < 0) return { posts: [], metrics: [] }
  const header = (rows[headerAt] ?? []).map((c) => c.trim())
  const col = (re: RegExp) => header.findIndex((h) => re.test(h))
  const t = col(TEXT_COLS)
  const u = col(URL_COLS)
  const d = col(DATE_COLS)
  const imp = col(IMP_COLS)
  const eng = col(ENG_COLS)
  const posts: Post[] = []
  const metrics: Metric[] = []
  for (const r of rows.slice(headerAt + 1)) {
    const url = u >= 0 ? r[u]?.trim() || undefined : undefined
    const impressions = imp >= 0 ? toNumber(r[imp]) : undefined
    const engagements = eng >= 0 ? toNumber(r[eng]) : undefined
    const date = d >= 0 ? dayOf(r[d]) : undefined
    if (t < 0) {
      // A CSV of numbers only (a copy of the TOP POSTS sheet)
      if (url && (impressions !== undefined || engagements !== undefined)) {
        metrics.push({ url, id: postId(url), date, impressions, engagements })
      }
      continue
    }
    const body = (r[t] ?? '').replace(/\r\n?/g, '\n').trim()
    if (body.length < 20) continue
    posts.push(makePost(body, { url, date, impressions, engagements }))
  }
  return { posts, metrics }
}

// A top-posts.md or .txt: posts separated by a line of ---. A line such as
// "impressions: 12,400" or "engagements: 310" inside a post gives its numbers.
export function postsFromMarkdown(text: string): Post[] {
  const clean = text.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '')
  const posts: Post[] = []
  for (const block of clean.split(/\n\s*(?:-{3,}|\*{3,}|_{3,}|={3,})\s*\n/)) {
    let impressions: number | undefined
    let engagements: number | undefined
    const lines = block.split('\n').filter((line) => {
      const m = line.match(/^\s*(impressions|views|engagements|reactions|likes)\s*[:=]\s*([\d,. ]+)\s*$/i)
      if (!m) return true
      const n = toNumber(m[2])
      if (/impressions|views/i.test(m[1]!)) impressions = n
      else engagements = n
      return false
    })
    const body = lines.join('\n').replace(/^\s*#[^\n]*\n/, '').trim()
    if (body.length < 20) continue
    posts.push(makePost(body, { impressions, engagements }))
  }
  return posts
}

export function makePost(text: string, extra: Partial<Post> = {}): Post {
  const id = postId(extra.url)
  return {
    hook: hookOf(text),
    text: text.slice(0, 500),
    ...(extra.url ? { url: extra.url } : {}),
    ...(id ? { id } : {}),
    ...(extra.date ? { date: extra.date } : {}),
    ...(extra.impressions !== undefined ? { impressions: extra.impressions } : {}),
    ...(extra.engagements !== undefined ? { engagements: extra.engagements } : {}),
  }
}

// ---------- reading any file the person points at ----------

export type Learned = { posts: Post[]; metrics: Metric[]; kind: string }

export function learnFromBytes(name: string, bytes: Uint8Array): Learned {
  const lower = name.toLowerCase()
  if (isZip(bytes)) {
    const entries = readZip(bytes)
    if (entries.some((e) => e.name === 'xl/workbook.xml')) {
      return { posts: [], metrics: topPostsFromSheets(readXlsx(bytes)), kind: 'analytics export' }
    }
    // A "Get a copy of your data" archive: read its Shares csv
    const shares = entries.find((e) => /(^|\/)shares(_\d+)?\.csv$/i.test(e.name))
    if (!shares) throw new Error('This zip has no Shares.csv. Ask LinkedIn for a copy of your data with "Posts" ticked, or point me at Shares.csv.')
    const found = postsFromCsv(new TextDecoder().decode(shares.read()))
    return { ...found, kind: 'LinkedIn data archive' }
  }
  const text = new TextDecoder().decode(bytes)
  if (lower.endsWith('.csv')) return { ...postsFromCsv(text), kind: 'CSV' }
  return { posts: postsFromMarkdown(text), metrics: [], kind: 'posts file' }
}

// ---------- joining text and numbers ----------

const FIVE_MINUTES = 5 * 60 * 1000

// Give each post with text the numbers of the same post in the analytics export:
// the same id, else ids minted within five minutes, else the only post that day.
export function join(posts: Post[], metrics: Metric[]): Post[] {
  const used = new Set<Metric>()
  const out = posts.map((p) => ({ ...p }))
  const withTime = metrics.map((m) => ({ m, t: idTime(m.id) }))
  for (const p of out) {
    if (p.impressions !== undefined || p.engagements !== undefined) continue
    let hit = metrics.find((m) => !used.has(m) && m.id !== undefined && m.id === p.id)
    const pt = idTime(p.id)
    if (!hit && pt !== undefined) {
      let best: { m: Metric; gap: number } | undefined
      for (const { m, t } of withTime) {
        if (used.has(m) || t === undefined) continue
        const gap = Math.abs(t - pt)
        if (gap <= FIVE_MINUTES && (!best || gap < best.gap)) best = { m, gap }
      }
      hit = best?.m
    }
    if (!hit && p.date) {
      const sameDayPosts = out.filter((q) => q.date === p.date)
      const sameDay = metrics.filter((m) => !used.has(m) && m.date === p.date)
      if (sameDayPosts.length === 1 && sameDay.length === 1) hit = sameDay[0]
    }
    if (!hit) continue
    used.add(hit)
    if (hit.impressions !== undefined) p.impressions = hit.impressions
    if (hit.engagements !== undefined) p.engagements = hit.engagements
  }
  return out
}

// Merge new posts into the saved ones; the same post (same id, or the same
// hook) is kept once, with the newer numbers.
export function mergePosts(saved: Post[], incoming: Post[]): Post[] {
  const out = [...saved]
  for (const p of incoming) {
    const at = out.findIndex((q) => (p.id && q.id === p.id) || q.hook === p.hook)
    if (at < 0) out.push(p)
    else out[at] = { ...out[at]!, ...p }
  }
  return out.slice(-600)
}

export function mergeMetrics(saved: Metric[], incoming: Metric[]): Metric[] {
  const out = [...saved]
  for (const m of incoming) {
    const at = out.findIndex((q) => (m.id ? q.id === m.id : q.url === m.url))
    if (at < 0) out.push(m)
    else out[at] = { ...out[at]!, ...m }
  }
  return out.slice(-300)
}

// ---------- what the score compares against ----------

const perf = (p: Post) => p.engagements ?? (p.impressions !== undefined ? p.impressions / 50 : undefined)

// `withNumbers`: how many of the learned posts were matched to their numbers
export type Library = { top: Post[]; weak: Post[]; learned: number; withNumbers: number; hasNumbers: boolean }

// The hooks the model compares a new hook against: your best posts, and, when
// the numbers say so, posts that did worse.
export function library(posts: Post[], metrics: Metric[]): Library {
  const joined = join(posts, metrics)
  const scored = joined.filter((p) => perf(p) !== undefined).sort((a, b) => perf(b)! - perf(a)!)
  if (scored.length >= 5) {
    const top = scored.slice(0, 12)
    const unscored = joined.filter((p) => perf(p) === undefined)
    // Posts outside your top lists did worse; with no such posts, your lowest scored ones
    const weak = (unscored.length >= 3 && metrics.length ? unscored.slice(0, 8) : scored.slice(-6)).filter((p) => !top.includes(p))
    return { top, weak, learned: joined.length, withNumbers: scored.length, hasNumbers: true }
  }
  // No numbers: the posts you chose are your best
  const top = [...scored, ...joined.filter((p) => perf(p) === undefined)].slice(0, 15)
  return { top, weak: [], learned: joined.length, withNumbers: scored.length, hasNumbers: scored.length > 0 }
}
