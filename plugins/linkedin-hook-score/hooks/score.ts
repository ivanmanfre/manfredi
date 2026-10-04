// The question the mod asks your own Claude, and reading its answer.

import type { Library } from './learn'
import type { Post, HookRow } from '../types'

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

function numbers(p: Post): string {
  const parts: string[] = []
  if (p.engagements !== undefined) parts.push(`${fmt(p.engagements)} engagements`)
  if (p.impressions !== undefined) parts.push(`${fmt(p.impressions)} impressions`)
  return parts.length ? `[${parts.join(', ')}] ` : ''
}

const quote = (s: string) => JSON.stringify(s.replace(/\s*\n+\s*/g, ' / ').slice(0, 320))

// One prompt for all drafts of a turn: a single call per turn
export function scorePrompt(lib: Library, hooks: string[]): string {
  const top = lib.top.map((p, i) => `${i + 1}. ${numbers(p)}${quote(p.hook)}`).join('\n')
  const weak = lib.weak.map((p, i) => `${i + 1}. ${numbers(p)}${quote(p.hook)}`).join('\n')
  const fresh = hooks.map((h, i) => `${i + 1}. ${quote(h)}`).join('\n')
  return [
    'You rate LinkedIn post hooks for one writer. A hook is what a phone shows above "...see more": the first 3 feed lines (" / " marks a line break).',
    '',
    lib.hasNumbers
      ? "The hooks of this writer's best posts, most engagement first:"
      : 'Hooks of posts this writer picked as their best:',
    top,
    ...(weak ? ['', 'Hooks of their posts that did worse:', weak] : []),
    '',
    'Rate each NEW hook from 1 to 10: how well it would stop this same audience, judged against what the best hooks above do and the weaker ones do not (the opening move, specifics such as numbers and names, tension, a clear promise, plain words, length).',
    'Give one reason of at most 12 plain words that names the pattern from their own posts it matches or misses. No dashes, no buzzwords.',
    '',
    'NEW HOOKS:',
    fresh,
    '',
    'Answer with exactly one line per new hook and nothing else, in this form:',
    '<number>|<score>|<reason>',
  ].join('\n')
}

// "1|8|Opens on a number, like your top posts" → rows
export function parseScores(text: string, count: number): Array<Pick<HookRow, 'score' | 'reason'> | undefined> {
  const out: Array<Pick<HookRow, 'score' | 'reason'> | undefined> = new Array(count).fill(undefined)
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*\**\s*(\d+)\s*[.)]?\s*\|\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10)?\s*\|\s*(.+?)\s*$/)
    if (!m) continue
    const at = Number(m[1]) - 1
    if (at < 0 || at >= count) continue
    const score = Math.max(1, Math.min(10, Math.round(Number(m[2]))))
    const words = m[3]!.replace(/\s*[—–]\s*/g, ', ').replace(/^["']|["']$/g, '').split(/\s+/)
    // Claude is asked for 12 words; a longer reason is cut at 14
    const reason = words.length > 14 ? words.slice(0, 14).join(' ').replace(/[,;:]$/, '') + '…' : words.join(' ')
    out[at] = { score, reason }
  }
  return out
}
