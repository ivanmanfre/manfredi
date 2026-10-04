// Reading leads, replies and booked calls from files you export yourself:
// LinkedIn's "Get a copy of your data" (messages.csv, Connections.csv) or a
// CSV from your CRM. Nothing is fetched; the files never leave your machine.

import type { Person, Pipeline } from '../types'

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

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

// Milliseconds from LinkedIn's and most CRMs' date forms: "2026-09-30 14:22:05 UTC",
// "30 Sep 2026", "9/30/2026", ISO
export function timeOf(v: string | undefined): number | undefined {
  if (!v) return undefined
  const s = v.trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/)
  if (m && MONTHS[m[2]!.toLowerCase()] !== undefined) return Date.UTC(+m[3]!, MONTHS[m[2]!.toLowerCase()]!, +m[1]!)
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return Date.UTC(+m[3]!, +m[1]! - 1, +m[2]!)
  return undefined
}

// A message that sets up a call: a booking link, or plain words for one
const BOOKED = /calendly\.com|cal\.com\/|zoom\.us\/|meet\.google\.com|teams\.microsoft\.com|savvycal\.com|\b(?:booked|invite sent|sent (?:you )?(?:an|the) invite|see you (?:on|then|tomorrow|monday|tuesday|wednesday|thursday|friday)|talk (?:on|then|tomorrow))\b/i

export type Loaded = { kind: 'messages' | 'connections' | 'crm'; people: Person[]; connections: number[]; note?: string }

function header(rows: string[][], test: (cells: string[]) => boolean): number {
  return rows.findIndex((r) => test(r.map((c) => c.trim().toUpperCase())))
}

// messages.csv: one row per message. You are the sender who appears in the
// most conversations. Each conversation with someone else is one lead; it is
// a reply once they wrote back, and a booked call once a message sets one up.
export function fromMessages(rows: string[][]): Loaded {
  const at = header(rows, (h) => h.includes('FROM') && h.includes('CONVERSATION ID'))
  const h = (rows[at] ?? []).map((c) => c.trim().toUpperCase())
  const col = (name: string) => h.indexOf(name)
  const [cid, from, to, date, content, folder, senderUrl] = [
    col('CONVERSATION ID'), col('FROM'), col('TO'), col('DATE'), col('CONTENT'), col('FOLDER'), col('SENDER PROFILE URL'),
  ]
  const body = rows.slice(at + 1).filter((r) => (folder < 0 || !/draft|spam|archive/i.test(r[folder] ?? '')) && r[cid])

  const perSender = new Map<string, Set<string>>()
  for (const r of body) {
    const s = (r[from] ?? '').trim()
    if (!s) continue
    perSender.set(s, (perSender.get(s) ?? new Set()).add(r[cid]!))
  }
  const me = [...perSender.entries()].sort((a, b) => b[1].size - a[1].size)[0]?.[0] ?? ''

  const convos = new Map<string, string[][]>()
  for (const r of body) convos.set(r[cid]!, [...(convos.get(r[cid]!) ?? []), r])
  const people: Person[] = []
  for (const msgs of convos.values()) {
    const sorted = msgs.slice().sort((a, b) => (timeOf(a[date]) ?? 0) - (timeOf(b[date]) ?? 0))
    const theirs = sorted.filter((r) => (r[from] ?? '').trim() !== me)
    const mine = sorted.filter((r) => (r[from] ?? '').trim() === me)
    const first = sorted[0]
    if (!first) continue
    const name = (theirs[0]?.[from] ?? first[to] ?? '').trim()
    if (!name || name === me || name.includes(',')) continue // group chats are left out
    const bookedAt = sorted.find((r) => BOOKED.test(r[content] ?? ''))
    people.push({
      name,
      ...(senderUrl >= 0 && theirs[0]?.[senderUrl] ? { url: theirs[0][senderUrl] } : {}),
      firstAt: timeOf(first[date]) ?? 0,
      ...(theirs.length && mine.length ? { repliedAt: timeOf((mine[0]! === first ? theirs[0] : mine[0])?.[date]) ?? 0 } : {}),
      ...(bookedAt ? { bookedAt: timeOf(bookedAt[date]) ?? 0 } : {}),
      lastAt: timeOf(sorted[sorted.length - 1]![date]) ?? 0,
      lastLine: (sorted[sorted.length - 1]![content] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120),
    })
  }
  return { kind: 'messages', people, connections: [], note: me ? `you are ${me}` : undefined }
}

// Connections.csv: three note rows, then First Name, Last Name, URL, Email
// Address, Company, Position, Connected On
export function fromConnections(rows: string[][]): Loaded {
  const at = header(rows, (h) => h.includes('FIRST NAME') && h.includes('CONNECTED ON'))
  const h = (rows[at] ?? []).map((c) => c.trim().toUpperCase())
  const on = h.indexOf('CONNECTED ON')
  const times = rows
    .slice(at + 1)
    .map((r) => timeOf(r[on]))
    .filter((t): t is number => t !== undefined)
  return { kind: 'connections', people: [], connections: times }
}

// No bare "state": in contact exports that is the address column
const STAGE_COLS = /^(stage|status|deal stage|lead status|pipeline stage)$/i
const NAME_COLS = /^(name|full name|contact|contact name|lead|lead name|person)$/i
const DATE_COLS = /^(date|created|created at|created on|date added|added|first contact|updated|last activity|last contacted)$/i

// A CSV from any CRM: a stage or status column; the stage words decide where
// each row sits
export function fromCrm(rows: string[][]): Loaded {
  const at = header(rows, (h) => h.some((c) => STAGE_COLS.test(c)))
  const h = (rows[at] ?? []).map((c) => c.trim())
  const stage = h.findIndex((c) => STAGE_COLS.test(c))
  const name = h.findIndex((c) => NAME_COLS.test(c))
  const first = h.findIndex((c) => /^first ?name$/i.test(c))
  const last = h.findIndex((c) => /^last ?name$/i.test(c))
  const company = h.findIndex((c) => /^(company|organization|account|company name)$/i.test(c))
  const date = h.findIndex((c) => DATE_COLS.test(c))
  const people: Person[] = []
  for (const r of rows.slice(at + 1)) {
    const st = (r[stage] ?? '').toLowerCase()
    if (!st || /lost|dead|disqualif|unqualif|not interested|bad fit/.test(st)) continue
    const who = name >= 0 ? r[name] : [first >= 0 ? r[first] : '', last >= 0 ? r[last] : ''].join(' ')
    const t = timeOf(date >= 0 ? r[date] : undefined) ?? 0
    const isBooked = /book|meeting|call|demo|scheduled|proposal|won|closed|client|customer|signed/.test(st)
    const isReplied = isBooked || /repl|respon|engag|interested|conversation|talking|qualif|warm|hot/.test(st)
    people.push({
      name: (who ?? '').trim() || '(no name)',
      ...(company >= 0 && r[company] ? { company: r[company]!.trim() } : {}),
      firstAt: t,
      ...(isReplied ? { repliedAt: t } : {}),
      ...(isBooked ? { bookedAt: t } : {}),
      lastAt: t,
      lastLine: r[stage] ?? '',
    })
  }
  return { kind: 'crm', people, connections: [] }
}

// Which reader a file needs, from its header row
export function load(text: string): Loaded {
  const rows = parseCsv(text)
  const upper = rows.slice(0, 8).map((r) => r.map((c) => c.trim().toUpperCase()))
  if (upper.some((h) => h.includes('CONVERSATION ID') && h.includes('FROM'))) return fromMessages(rows)
  if (upper.some((h) => h.includes('FIRST NAME') && h.includes('CONNECTED ON'))) return fromConnections(rows)
  if (rows.slice(0, 8).some((r) => r.some((c) => STAGE_COLS.test(c.trim())))) return fromCrm(rows)
  throw new Error('No messages, connections or stage column found. See the README for the files this reads.')
}

export const WINDOWS = [7, 30, 90] as const

// The counts and lists for the last `days` days, as of `now`
export function summarize(people: Person[], connections: number[], days: number, now: number): Pipeline {
  const since = now - days * 86400000
  const inWindow = (t: number | undefined) => t !== undefined && t >= since && t <= now + 86400000
  const leads = people.filter((p) => inWindow(p.firstAt))
  const replies = people.filter((p) => inWindow(p.repliedAt))
  const booked = people.filter((p) => inWindow(p.bookedAt))
  const recent = (list: Person[], key: 'repliedAt' | 'bookedAt') =>
    list.slice().sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, 8)
  return {
    days,
    leads: leads.length,
    replies: replies.length,
    booked: booked.length,
    connections: connections.filter(inWindow).length,
    hasConnections: connections.length > 0,
    recentReplies: recent(replies.filter((p) => !inWindow(p.bookedAt)), 'repliedAt'),
    recentBooked: recent(booked, 'bookedAt'),
  }
}

export function ago(t: number, now: number): string {
  const d = Math.floor((now - t) / 86400000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`
}

export function pct(part: number, whole: number): string {
  return whole ? `${Math.round((part / whole) * 100)}%` : '0%'
}
