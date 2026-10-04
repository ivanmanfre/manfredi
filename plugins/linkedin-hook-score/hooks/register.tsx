// linkedin-hook-score: scores the hook of every LinkedIn draft Claude writes
// against your own best posts, using your own Claude (no API key).
//
// /hook-score-learn reads your LinkedIn exports (or a top-posts.md you paste
// into) once and saves your posts on this machine. After that, each turn that
// produces a ```linkedin draft gets a band above the prompt: a 1-10 score per
// hook and one plain reason, "learned from N of your posts".

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { MENTIONS_LINKEDIN, draftNote, extractDrafts, hasDraftNote, hookOf } from './draft'
import { learnFromBytes, library, mergeMetrics, mergePosts } from './learn'
import { fromBase64 } from './unzip'
import { parseScores, scorePrompt } from './score'
import type { HookBand, HookRow, Metric, Post } from '../types'

const band = atom({ plugin: 'linkedin-hook-score', key: 'band' } as const, null)

const MODELS = ['haiku', 'sonnet', 'opus']
const TEMPLATE = [
  '<!--',
  'Paste 5 to 20 of your best LinkedIn posts below, the whole text of each.',
  'Put a line with three dashes (---) between two posts.',
  'If you know the numbers of a post, add lines like these inside it:',
  'impressions: 12400',
  'engagements: 310',
  'Save the file, then run /hook-score-learn again.',
  '-->',
  '',
  '(your first post)',
  '',
  '---',
  '',
  '(your second post)',
  '',
].join('\n')

// LinkedIn's own file names, so /hook-score-learn with no path finds them
const EXPORT_FILES = [
  /^Content_.*\.xlsx$/i,
  /^(Basic|Complete)_LinkedInDataExport.*\.zip$/i,
  /^Shares(_\d+)?\.csv$/i,
  /^top-posts\.(md|txt|csv)$/i,
]

// Split "/hook-score-learn a.xlsx 'My File.csv' My\ File.csv" into paths
export function splitArgs(args: string): string[] {
  const out: string[] = []
  for (const m of args.matchAll(/"([^"]+)"|'([^']+)'|((?:\\ |\S)+)/g)) {
    out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\\ /g, ' '))
  }
  return out.filter(Boolean)
}

async function home($: EngineInterface): Promise<string | undefined> {
  return (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
}

async function loadSaved($: EngineInterface): Promise<{ posts: Post[]; metrics: Metric[] }> {
  const posts = (await $.store.get('posts')) as Post[] | undefined
  const metrics = (await $.store.get('metrics')) as Metric[] | undefined
  return { posts: Array.isArray(posts) ? posts : [], metrics: Array.isArray(metrics) ? metrics : [] }
}

// Newest file of each LinkedIn export kind in the folder
async function findExports($: EngineInterface, dir: string): Promise<string[]> {
  const entries = await $.fs.list(dir).catch(() => [])
  const found: string[] = []
  for (const pattern of EXPORT_FILES) {
    const newest = entries
      .filter((f) => f.kind === 'file' && pattern.test(f.name))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
    if (newest) found.push(`${dir}/${newest.name}`)
  }
  return found
}

// Scores already asked for, by hook text, so a re-shown draft costs nothing
const cache = new Map<string, Pick<HookRow, 'score' | 'reason'>>()

async function score($: EngineInterface, drafts: string[], model: string): Promise<HookBand> {
  const saved = await loadSaved($)
  const lib = library(saved.posts, saved.metrics)
  const rows: HookRow[] = drafts.slice(0, 9).map((d, i) => ({ draft: i + 1, hook: hookOf(d), ...cache.get(hookOf(d)) }))
  if (lib.learned === 0) return { status: 'no-data', learned: 0, rows }
  const todo = rows.filter((r) => r.score === undefined)
  if (todo.length) {
    const asked = await $.model.complete({
      model,
      prompt: scorePrompt(lib, todo.map((r) => r.hook)),
      maxTokens: 400,
      timeoutMs: 60000,
    })
    if (!asked.isAnswered) {
      const why = asked.reason === 'api-error' ? `Claude answered with an error (${asked.error})` : 'Claude gave no answer'
      return { status: 'failed', learned: lib.learned, rows, note: `${why}. Run /hook-score to try again.` }
    }
    const got = parseScores(asked.text, todo.length)
    todo.forEach((r, i) => {
      const s = got[i]
      if (!s) return
      r.score = s.score
      r.reason = s.reason
      cache.set(r.hook, s)
    })
    if (todo.every((r) => r.score === undefined)) {
      return { status: 'failed', learned: lib.learned, rows, note: 'Could not read the scores. Run /hook-score to try again.' }
    }
  }
  return { status: 'done', learned: lib.learned, rows }
}

async function scoreIntoBand($: EngineInterface, drafts: string[], model: string) {
  await update($, band, () => ({ status: 'scoring', learned: 0, rows: [] }) as HookBand)
  const result = await score($, drafts, model).catch(
    (err: unknown): HookBand => ({ status: 'failed', learned: 0, rows: [], note: `Scoring failed: ${String(err)}` }),
  )
  await update($, band, () => result)
  return result
}

async function modelOf($: EngineInterface): Promise<string> {
  const saved = await $.store.get('model')
  return typeof saved === 'string' && MODELS.includes(saved) ? saved : 'haiku'
}

export const register: Register = (on) => {
  let isHinted = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'hook-score-learn',
      description: 'Learn your best LinkedIn posts from your exports or a top-posts.md file',
      argumentHint: '[file ...]',
    })
    await $.command.register({
      name: 'hook-score',
      description: 'Score the hooks of the last LinkedIn drafts, or of the text you paste',
      argumentHint: '[post text]',
    })
    await $.command.register({
      name: 'hook-score-model',
      description: 'Pick the Claude model that scores your hooks: haiku, sonnet or opus',
      argumentHint: 'haiku | sonnet | opus',
    })
    await $.command.register({
      name: 'hook-score-forget',
      description: 'Delete the posts linkedin-hook-score learned',
    })
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    isHinted = MENTIONS_LINKEDIN.test(e.text)
    await update($, band, () => null)
    if (!isHinted || hasDraftNote(e.context)) return next(e)
    return next({ ...e, context: [...(e.context ?? []), draftNote('linkedin-hook-score')] })
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId || e.isAborted) return result
    const drafts = extractDrafts(e.answer, isHinted)
    // A hint is good for the turn it was given in
    isHinted = false
    if (drafts.length) void scoreIntoBand($, drafts, await modelOf($))
    return result
  })

  on('command.run', { command: 'hook-score' }, async ($, e) => {
    const typed = e.args.trim()
    let drafts = typed ? [typed] : []
    if (!drafts.length) {
      const messages = await $.session.messages()
      const last = [...messages].reverse().find((m) => m.role === 'assistant' && extractDrafts(m.text, true).length)
      drafts = last ? extractDrafts(last.text, true) : []
    }
    if (!drafts.length) return { text: 'No LinkedIn draft yet. Ask Claude for a post, or run /hook-score <post text>.' }
    const result = await scoreIntoBand($, drafts, await modelOf($))
    if (result.status === 'no-data') return { text: 'No posts learned yet. Run /hook-score-learn first.' }
    if (result.status === 'failed') return { text: result.note ?? 'Scoring failed.' }
    const lines = result.rows.map(
      (r) => `${result.rows.length > 1 ? `Draft ${r.draft}: ` : ''}${r.score ?? '?'}/10. ${r.reason ?? ''}`,
    )
    return { text: [`Hook score, learned from ${result.learned} of your posts`, ...lines].join('\n') }
  })

  on('command.run', { command: 'hook-score-learn' }, async ($, e) => {
    let paths = splitArgs(e.args)
    const h = await home($)
    paths = paths.map((p) => (h && (p === '~' || p.startsWith('~/')) ? h + p.slice(1) : p))
    let searched = ''
    if (!paths.length) {
      const cwd = await $.session.cwd()
      paths = await findExports($, cwd)
      if (!paths.length && h) paths = await findExports($, `${h}/Downloads`)
      searched = paths.length ? `Found ${paths.map((p) => p.split('/').pop()).join(', ')}.\n` : ''
      if (!paths.length) {
        const target = `${cwd}/top-posts.md`
        if (!(await $.fs.exists(target))) await $.fs.write(target, TEMPLATE)
        return {
          text: [
            'No LinkedIn export found here or in Downloads.',
            `I made ${target}. Paste 5 to 20 of your best posts into it, then run /hook-score-learn again.`,
            'Or point me at your exports: /hook-score-learn <file>. See the README for where LinkedIn keeps them.',
          ].join('\n'),
        }
      }
    }

    const saved = await loadSaved($)
    let posts = saved.posts
    let metrics = saved.metrics
    const report: string[] = []
    for (const path of paths) {
      const name = path.split(/[\\/]/).pop() ?? path
      try {
        const { base64 } = await $.fs.read(path, { as: 'bytes' })
        const got = learnFromBytes(name, fromBase64(base64))
        posts = mergePosts(posts, got.posts)
        metrics = mergeMetrics(metrics, got.metrics)
        const what = got.metrics.length && !got.posts.length ? `${got.metrics.length} posts with numbers, no text` : `${got.posts.length} posts`
        report.push(`${name} (${got.kind}): ${what}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        report.push(`${name}: could not read it. ${/ENOENT|no such file/i.test(msg) ? 'File not found.' : msg}`)
      }
    }
    await $.store.set('posts', posts)
    await $.store.set('metrics', metrics)
    const lib = library(posts, metrics)
    const tail: string[] = []
    if (!posts.length && metrics.length) {
      tail.push('The analytics export has your numbers but no post text. Add Shares.csv from "Get a copy of your data", or a top-posts.md.')
    } else if (lib.learned) {
      tail.push(`Learned from ${lib.learned} of your posts${lib.withNumbers ? `, ${lib.withNumbers} with numbers` : ''}. New drafts get a hook score.`)
    }
    return { text: searched + [...report, ...tail].join('\n') }
  })

  on('command.run', { command: 'hook-score-model' }, async ($, e) => {
    const pick = e.args.trim().toLowerCase()
    if (!MODELS.includes(pick)) return { text: `Scoring uses ${await modelOf($)}. Pick one: /hook-score-model haiku, sonnet or opus.` }
    await $.store.set('model', pick)
    cache.clear()
    return { text: `Hooks are now scored with ${pick}.` }
  })

  on('command.run', { command: 'hook-score-forget' }, async ($) => {
    await $.store.delete('posts')
    await $.store.delete('metrics')
    cache.clear()
    await update($, band, () => null)
    return { text: 'Deleted the posts linkedin-hook-score learned.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, band)
    if (e.props.hasSurvey || !shown) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const width = Math.max(20, e.props.bodyColumns)
    const title = shown.learned ? `Hook score · learned from ${shown.learned} of your posts` : 'Hook score'

    let body
    if (shown.status === 'scoring') body = [<Text dimColor>Scoring against your best posts…</Text>]
    else if (shown.status === 'no-data') {
      body = [<Text dimColor wrap="truncate">No posts learned yet. Run /hook-score-learn to import your best posts.</Text>]
    } else if (shown.status === 'failed') body = [<Text color="yellow" wrap="truncate">{shown.note ?? 'Scoring failed.'}</Text>]
    else {
      body = shown.rows.map((r) => {
        const color = r.score === undefined ? undefined : r.score >= 8 ? 'green' : r.score >= 5 ? 'yellow' : 'red'
        const label = shown.rows.length > 1 ? `Draft ${r.draft}` : 'Hook'
        return (
          <Box key={`row-${r.draft}`} flexDirection="row" columnGap={2}>
            <Text dimColor>{label}</Text>
            <Text bold {...(color ? { color } : {})}>{r.score === undefined ? '?/10' : `${r.score}/10`}</Text>
            <Text wrap="truncate">{r.reason ?? 'No score'}</Text>
          </Box>
        )
      })
    }
    const mine = (
      <Box key="linkedin-hook-score" flexDirection="column" width={width}>
        <Text bold wrap="truncate">{title}</Text>
        {body}
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
