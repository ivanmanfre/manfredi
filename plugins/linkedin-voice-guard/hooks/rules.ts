// The rules file and the matching. Plain, deterministic matching: the same
// draft always gets the same flags, and nothing leaves your machine.

import type { Flag, DraftReport } from '../types'

// A rule finds spans in the text: a pattern, or a function for checks a
// pattern cannot express
export type Rule = { source: string; label: string; find: (text: string) => Array<[number, number]> }

function byPattern(re: RegExp): Rule['find'] {
  return (text) => {
    const out: Array<[number, number]> = []
    for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) {
      if (m[0] && m.index !== undefined) out.push([m.index, m.index + m[0].length])
    }
    return out
  }
}

// Three short sentences in a row ("Clear. Simple. Effective." or "Name your
// number early. Qualify faster. Close cleaner."): each at most 4 words, 9 in
// all, no commas
function threeFragments(text: string): Array<[number, number]> {
  const sentences: Array<{ start: number; end: number; words: number; hasComma: boolean }> = []
  // A sentence ends at . ! or ? followed by a space, a line break or the end,
  // so 2.1.287, $1.2M and ./file are no sentence breaks
  for (const m of text.matchAll(/[^\s][^\n]*?[.!?]+(?=[ \t]|\n|$)/g)) {
    if (m.index === undefined || !/[A-Za-z]/.test(m[0])) continue
    const body = m[0]
    const lead = body.length - body.trimStart().length
    const words = body.trim().split(/\s+/).filter(Boolean).length
    sentences.push({ start: m.index + lead, end: m.index + body.length, words, hasComma: body.includes(',') })
  }
  const out: Array<[number, number]> = []
  for (let i = 0; i + 2 < sentences.length; i++) {
    const run = sentences.slice(i, i + 3)
    const isShort = run.every((x) => x.words <= 4 && !x.hasComma)
    // three short questions in a row ("A demo? An intro? A pilot?") are a person thinking out loud
    const isQuestions = run.every((x) => /\?$/.test(text.slice(x.start, x.end).trim()))
    // a list of numbers ("Poland grew 3.8%. Germany grew 1%. France grew 0.5%.") is data
    const isData = run.some((x) => /\d/.test(text.slice(x.start, x.end)))
    const isTight = run.reduce((n, x) => n + x.words, 0) <= 9
    // the three follow each other in one paragraph: only spaces or one line break between
    const isRun = run.every((x, j) => j === 0 || /^[ \t]*\n?[ \t]*$/.test(text.slice(run[j - 1]!.end, x.start)))
    if (isShort && isTight && isRun && !isQuestions && !isData) {
      // a longer list of fragments is one flag: grow the run while it lasts
      let last = i + 2
      while (
        last + 1 < sentences.length &&
        sentences[last + 1]!.words <= 4 &&
        !sentences[last + 1]!.hasComma &&
        !/\d/.test(text.slice(sentences[last + 1]!.start, sentences[last + 1]!.end)) &&
        /^[ \t]*\n?[ \t]*$/.test(text.slice(sentences[last]!.end, sentences[last + 1]!.start))
      )
        last++
      out.push([run[0]!.start, sentences[last]!.end])
      i = last
    }
  }
  return out
}

// Checks that a single phrase cannot express
const CHECKS: Record<string, { label: string; find: Rule['find'] }> = {
  '@em-dash': { label: 'em dash', find: byPattern(/—|\s–\s|\s--\s/g) },
  '@not-just-but': {
    label: 'not just X but Y',
    find: byPattern(/\bnot (?:just|only|merely|simply)\b[^.!?\n]{1,80}?\bbut\b/gi),
  },
  '@not-x-its-y': {
    label: "not X, it's Y",
    find: byPattern(
      /\b(?:(?:it|this|that)(?:'s| is) not|(?:it|this|that) isn't|isn't|wasn't|aren't)\s+(?:about\s+|just\s+)?[^.!?\n,;]{1,50}[,;.]\s+(?:it's|it is|it was|it just|this is|this was|that's|that was|they're|they are|they were|they just)\b|\b(?:isn't|is not|aren't|are not|wasn't)\b[^.!?\n]{1,60}[.;]\s+[^.!?\n]{1,40}\b(?:is|are|was)[.!](?=\s|$)|\bnot because\b[^.!?\n]{1,60}[.,;]\s+because\b|\b(?:was|is|are|were)\s+never\b[^.!?\n]{1,50}[.;]\s+(?:it|this|that|they)\s+(?:was|is|are|were)\b/gi,
    ),
  },
  '@x-not-y': {
    label: 'X, not Y',
    find: byPattern(
      /(?:,|\s[—–]|\s-)\s*not\s+(?!only\b|just\b|merely\b|simply\b|because\b|sure\b|yet\b|that\b|to\b|even\b|really\b|always\b|necessarily\b|exactly\b|much\b)[^.!?\n,;:]{1,40}/gi,
    ),
  },
  // the contrast form only: "Instead of chasing X, do Y." or "Do Y, instead of X."
  // ("two bottlenecks instead of one" is plain English)
  '@instead-of': {
    label: 'X instead of Y',
    find: byPattern(/(?:^|(?<=[.!?:]\s+)|(?<=\n))instead of\b[^.!?\n]{1,60},|,\s*instead of\b[^.!?\n,;:]{1,40}/gim),
  },
  '@less-more': {
    label: 'less X, more Y',
    find: byPattern(
      /\b(?:less|fewer)\s+[\w'$%-]+(?:\s+[\w'$%-]+){0,2}[,.;]\s+more\s+[\w'$%-]+|\bmore\s+[\w'$%-]+(?:\s+[\w'$%-]+){0,2}[,.;]\s+(?:less|fewer)\s+[\w'$%-]+/gi,
    ),
  },
  '@stop-start': { label: 'stop X, start Y', find: byPattern(/\bstop\s+[^.!?\n]{1,50}?[,.;]\s*start\s+[\w'-]+/gi) },
  '@three-fragments': { label: 'three short fragments', find: threeFragments },
}

export const DEFAULT_RULES = [
  '# LinkedIn voice guard rules',
  '# One rule per line. Lines that start with # are notes.',
  '# A plain line is a word or phrase to flag, in any case. "unlock" also flags unlocks and unlocking.',
  '# A line that starts with re: is a pattern (a JavaScript regular expression), for example re:\\bsynerg\\w*',
  '# Delete a line to stop flagging it. Add a line here, or run /voice-guard-add <phrase>.',
  '',
  '# Built-in checks',
  '@em-dash',
  '@not-just-but',
  '@not-x-its-y',
  '@x-not-y',
  '@instead-of',
  '@less-more',
  '@stop-start',
  '@three-fragments',
  '',
  '# Words and phrases',
  'delve',
  "in today's fast-paced",
  'fast-paced world',
  'ever-evolving',
  'game-changer',
  'unlock',
  'unleash',
  'leverage',
  'seamless',
  'elevate',
  'supercharge',
  'revolutionize',
  'harness the power',
  "here's the thing",
  "here's the kicker",
  'unpopular opinion:',
  'let that sink in',
  'the best part?',
  'buckle up',
  'deep dive',
  'dive into',
  'navigate the complexities',
  'tapestry',
  'a testament to',
  'in the realm of',
  'at the end of the day',
  "it's worth noting",
  "i'm thrilled to",
  "i'm excited to share",
  'embark on',
  '',
].join('\n')

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// "game-changer" also matches "game changer" and "gamechanger"; one word also
// matches its forms ("unlock" → unlocks, unlocking; "delve" → delving)
export function phraseRule(phrase: string): RegExp {
  const p = phrase.trim().toLowerCase().replace(/[’‘]/g, "'")
  const words = p.split(/[\s-]+/).filter(Boolean)
  let body = words.map(escapeRe).join('[\\s-]?')
  if (words.length === 1 && /^[a-z]+$/.test(p)) body = escapeRe(p.length > 4 ? p.replace(/e$/, '') : p) + '[a-z]*'
  const start = /^\w/.test(p) ? '\\b' : ''
  const end = /\w$/.test(p) && !body.endsWith('[a-z]*') ? '\\b' : ''
  return new RegExp(start + body + end, 'gi')
}

export type ParsedRules = { rules: Rule[]; errors: string[] }

export function parseRules(text: string): ParsedRules {
  const rules: Rule[] = []
  const errors: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const check = CHECKS[line.toLowerCase()]
    if (check) {
      rules.push({ source: line, label: check.label, find: check.find })
    } else if (line.startsWith('@')) {
      errors.push(`${line} is not a built-in check (${Object.keys(CHECKS).join(', ')})`)
    } else if (/^re:/i.test(line)) {
      try {
        rules.push({ source: line, label: line.slice(3).trim(), find: byPattern(new RegExp(line.slice(3).trim(), 'gi')) })
      } catch {
        errors.push(`${line} is not a valid pattern`)
      }
    } else {
      rules.push({ source: line, label: line, find: byPattern(phraseRule(line)) })
    }
  }
  return { rules, errors }
}

// Every place a rule fires in one draft, in reading order
export function check(text: string, rules: Rule[]): Flag[] {
  const flat = text.replace(/[’‘]/g, "'")
  const lineStarts = [0]
  for (let i = 0; i < flat.length; i++) if (flat[i] === '\n') lineStarts.push(i + 1)
  const lineAt = (at: number) => {
    let n = 0
    while (n + 1 < lineStarts.length && lineStarts[n + 1]! <= at) n++
    return n
  }
  const flags: Flag[] = []
  for (const rule of rules) {
    for (const [from, to] of rule.find(flat)) {
      const n = lineAt(from)
      const lineStart = lineStarts[n]!
      const lineEnd = flat.indexOf('\n', lineStart) < 0 ? flat.length : flat.indexOf('\n', lineStart)
      flags.push({
        rule: rule.label,
        line: n + 1,
        lineText: text.slice(lineStart, lineEnd),
        start: from - lineStart,
        end: Math.min(to, lineEnd) - lineStart,
      })
    }
  }
  // Text two rules both caught ("in today's fast-paced" and "fast-paced world")
  // is flagged once, by the rule that starts first
  const kept: Flag[] = []
  for (const f of flags.sort((a, b) => a.line - b.line || a.start - b.start || b.end - a.end)) {
    const prev = kept[kept.length - 1]
    if (prev && prev.line === f.line && f.start < prev.end) continue
    kept.push(f)
  }
  return kept
}

export function report(drafts: string[], rules: Rule[]): DraftReport[] {
  return drafts.slice(0, 9).map((text, i) => ({ draft: i + 1, flags: check(text, rules) }))
}

// A short window of the line around the flag, so the band shows where it fires
export function snippet(f: Flag, room: number): { before: string; hit: string; after: string } {
  const hit = f.lineText.slice(f.start, f.end)
  const side = Math.max(4, Math.floor((room - hit.length) / 2))
  let before = f.lineText.slice(Math.max(0, f.start - side), f.start)
  let after = f.lineText.slice(f.end, f.end + side)
  if (f.start - side > 0) before = '…' + before.slice(1)
  if (f.end + side < f.lineText.length) after = after.slice(0, -1) + '…'
  return { before, hit, after }
}

// What Claude is asked when the person presses Rewrite
// `drafts` is how many drafts the answer had, so the lines name the right one
export function rewritePrompt(reports: DraftReport[], drafts = reports.length): string {
  const many = drafts > 1
  const lines: string[] = []
  for (const r of reports) {
    const byLine = new Map<number, { text: string; rules: string[] }>()
    for (const f of r.flags) {
      const at = byLine.get(f.line) ?? { text: f.lineText, rules: [] }
      if (!at.rules.includes(f.rule)) at.rules.push(f.rule)
      byLine.set(f.line, at)
    }
    for (const [line, at] of byLine) {
      lines.push(`- ${many ? `Draft ${r.draft}, ` : ''}line ${line}: "${at.text.trim()}" (flagged: ${at.rules.join(', ')})`)
    }
  }
  return [
    `Rewrite only the flagged lines of the LinkedIn ${many ? 'drafts' : 'draft'} above so they read like a person wrote them. Keep every other line word for word, keep the meaning, and do not use em dashes. Give the full ${many ? 'drafts' : 'draft'} again, each in its own \`\`\`linkedin block.`,
    '',
    'Flagged lines:',
    ...lines,
  ].join('\n')
}
