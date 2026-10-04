// linkedin-voice-guard: flags the phrases that make a LinkedIn draft sound
// AI-written, before it goes out.
//
// After a turn that produced a ```linkedin draft, a band above the prompt
// counts the flags per draft and shows each one in its line, highlighted.
// Press r to ask Claude to rewrite only the flagged lines. The rules are a
// plain text file you can edit, or extend with /voice-guard-add <phrase>.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { MENTIONS_LINKEDIN, draftNote, extractDrafts, hasDraftNote } from './draft'
import { DEFAULT_RULES, parseRules, report, rewritePrompt, snippet } from './rules'
import type { ParsedRules } from './rules'
import type { DraftReport, Flag } from '../types'

const reports = atom({ plugin: 'linkedin-voice-guard', key: 'reports' } as const, null)
const isOpen = atom({ plugin: 'linkedin-voice-guard', key: 'isOpen' } as const, false)

const SHOWN = 3

async function rulesPath($: EngineInterface): Promise<string | undefined> {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
  return home ? `${home}/.claude/linkedin-mods/voice-guard-rules.txt` : undefined
}

// The rules file, written with the defaults the first time
async function loadRules($: EngineInterface): Promise<ParsedRules & { path?: string; text: string }> {
  const path = await rulesPath($)
  if (!path) return { ...parseRules(DEFAULT_RULES), text: DEFAULT_RULES }
  let text = DEFAULT_RULES
  try {
    if (await $.fs.exists(path)) text = await $.fs.read(path)
    else await $.fs.write(path, DEFAULT_RULES)
  } catch {
    // Unreadable file: the defaults still guard the draft
  }
  return { ...parseRules(text), path, text }
}

async function lastDrafts($: EngineInterface): Promise<string[]> {
  const messages = await $.session.messages()
  const last = [...messages].reverse().find((m) => m.role === 'assistant' && extractDrafts(m.text, true).length)
  return last ? extractDrafts(last.text, true) : []
}

function summary(found: DraftReport[]): string {
  if (found.length === 1) {
    const n = found[0]!.flags.length
    return n ? `${n} ${n === 1 ? 'flag' : 'flags'}` : 'no AI tells found'
  }
  return found.map((r) => `Draft ${r.draft}: ${r.flags.length ? r.flags.length + (r.flags.length === 1 ? ' flag' : ' flags') : 'clean'}`).join(' · ')
}

function asText(found: DraftReport[]): string {
  const lines = [`Voice guard · ${summary(found)}`]
  for (const r of found) {
    for (const f of r.flags) {
      lines.push(`${found.length > 1 ? `Draft ${r.draft}, ` : ''}line ${f.line}: ${f.rule}: "${f.lineText.slice(f.start, f.end).trim()}"`)
    }
  }
  return lines.join('\n')
}

export const register: Register = (on) => {
  let isHinted = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'voice-guard',
      description: 'Check the last LinkedIn drafts, or the text you paste, for AI-sounding phrases',
      argumentHint: '[post text]',
    })
    await $.command.register({
      name: 'voice-guard-add',
      description: 'Add a word or phrase to flag in your LinkedIn drafts',
      argumentHint: '<phrase>',
    })
    await $.command.register({
      name: 'voice-guard-remove',
      description: 'Stop flagging a word, phrase or built-in check',
      argumentHint: '<phrase>',
    })
    await $.command.register({
      name: 'voice-guard-rules',
      description: 'Show the voice guard rules and where the rules file is',
    })
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    isHinted = MENTIONS_LINKEDIN.test(e.text)
    await update($, reports, () => null)
    await update($, isOpen, () => false)
    if (!isHinted || hasDraftNote(e.context)) return next(e)
    return next({ ...e, context: [...(e.context ?? []), draftNote('linkedin-voice-guard')] })
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId || e.isAborted) return result
    const drafts = extractDrafts(e.answer, isHinted)
    // A hint is good for the turn it was given in
    isHinted = false
    if (!drafts.length) return result
    const { rules } = await loadRules($)
    await update($, reports, () => report(drafts, rules))
    return result
  })

  on('command.run', { command: 'voice-guard' }, async ($, e) => {
    const typed = e.args.trim()
    const drafts = typed ? [typed] : await lastDrafts($)
    if (!drafts.length) return { text: 'No LinkedIn draft yet. Ask Claude for a post, or run /voice-guard <post text>.' }
    const { rules } = await loadRules($)
    const found = report(drafts, rules)
    await update($, reports, () => found)
    return { text: asText(found) }
  })

  on('command.run', { command: 'voice-guard-add' }, async ($, e) => {
    const phrase = e.args.trim()
    if (!phrase) return { text: 'Usage: /voice-guard-add <word or phrase>' }
    const loaded = await loadRules($)
    const test = parseRules(phrase)
    if (test.errors.length) return { text: test.errors.join('\n') }
    if (loaded.rules.some((r) => r.source.toLowerCase() === phrase.toLowerCase())) {
      return { text: `"${phrase}" is already a rule.` }
    }
    if (!loaded.path) return { text: 'Could not find your home folder, so the rules file cannot be saved.' }
    await $.fs.write(loaded.path, loaded.text.replace(/\s*$/, '\n') + phrase + '\n')
    return { text: `Added "${phrase}". ${loaded.rules.length + 1} rules in ${loaded.path}` }
  })

  on('command.run', { command: 'voice-guard-remove' }, async ($, e) => {
    const phrase = e.args.trim().toLowerCase()
    if (!phrase) return { text: 'Usage: /voice-guard-remove <word, phrase or @check>' }
    const loaded = await loadRules($)
    if (!loaded.path) return { text: 'Could not find your home folder, so the rules file cannot be saved.' }
    const lines = loaded.text.split(/\r?\n/)
    const kept = lines.filter((l) => l.trim().toLowerCase() !== phrase)
    if (kept.length === lines.length) return { text: `"${e.args.trim()}" is not in the rules. Run /voice-guard-rules to see them.` }
    await $.fs.write(loaded.path, kept.join('\n'))
    return { text: `Removed "${e.args.trim()}". ${loaded.rules.length - 1} rules left.` }
  })

  on('command.run', { command: 'voice-guard-rules' }, async ($) => {
    const loaded = await loadRules($)
    const list = loaded.rules.map((r) => r.source).join(', ')
    return {
      text: [
        `${loaded.rules.length} rules${loaded.path ? ` in ${loaded.path}` : ' (defaults)'}:`,
        list,
        ...loaded.errors.map((x) => `Skipped: ${x}`),
        'Edit the file to change them, or use /voice-guard-add and /voice-guard-remove.',
      ].join('\n'),
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const found = await read($, reports)
    if (e.props.hasSurvey || !found) return next(e)
    const showAll = await read($, isOpen)
    const { Box, Text, Button } = $.ui.resolve(e)
    const width = Math.max(30, e.props.bodyColumns)
    const flags: Array<Flag & { draft: number }> = found.flatMap((r) => r.flags.map((f) => ({ ...f, draft: r.draft })))
    const many = found.length > 1

    const rows = (showAll ? flags : flags.slice(0, SHOWN)).map((f, i) => {
      const where = many ? `D${f.draft} L${f.line}` : `Line ${f.line}`
      const room = Math.max(16, width - where.length - f.rule.length - 6)
      const s = snippet(f, room)
      return (
        <Box key={`flag-${i}`} flexDirection="row" columnGap={1}>
          <Text dimColor>{where}</Text>
          <Text wrap="truncate">
            <Text dimColor>{s.before}</Text>
            <Text inverse>{s.hit}</Text>
            <Text dimColor>{s.after}</Text>
          </Text>
          <Text color="yellow">{f.rule}</Text>
        </Box>
      )
    })

    const actions = flags.length
      ? [
          <Box key="actions" flexDirection="row" flexWrap="wrap" columnGap={3}>
            <Button
              key="rewrite"
              label="Rewrite flagged lines"
              hotkey="r"
              plain
              onPress={async () => {
                await update($, reports, () => null)
                await $.prompt.submit({ text: rewritePrompt(found.filter((r) => r.flags.length), found.length), asUser: true })
              }}
            />
            {flags.length > SHOWN ? (
              <Button
                key="all"
                label={showAll ? 'Show fewer' : `Show all ${flags.length}`}
                hotkey="v"
                plain
                onPress={() => update($, isOpen, (v) => !v)}
              />
            ) : null}
          </Box>,
        ]
      : []

    const mine = (
      <Box key="linkedin-voice-guard" flexDirection="column" width={width}>
        <Text bold={flags.length > 0} dimColor={flags.length === 0} wrap="truncate">
          {`Voice guard · ${summary(found)}`}
        </Text>
        {rows}
        {actions}
      </Box>
    )
    const below = await next(e)
    return (
      <Box flexDirection="column">
        {mine}
        {below}
      </Box>
    )
  })
}
