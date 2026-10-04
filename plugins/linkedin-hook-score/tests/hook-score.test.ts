import { expect, mock, test } from 'claude-code/testing'
import { ANALYTICS_XLSX, ARCHIVE_ZIP } from './fixtures'

const BAND = {
  plugin: 'linkedin-hook-score',
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  viewport: { columns: 120, rows: 40 },
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 12,
    bodyColumns: 110,
    scroll: { offset: 0, bodyRows: 11 },
    view: {},
  },
} as const

const ANSWER = [
  'Two hooks for you.',
  '',
  '```linkedin',
  'Here is the thing about LinkedIn hooks.',
  '',
  'Most of them are boring.',
  '```',
  '',
  '```linkedin',
  'I lost a $12k client because of one sentence.',
  '',
  'This is the sentence.',
  '```',
].join('\n')

const AS_TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

const usage = { input_tokens: 10, output_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

test('learning reads both LinkedIn exports, then a draft gets a score per hook in the band', async ($, on) => {
  mock.store(on)
  on('env.get', () => ({ value: '/home/me' }))
  // The engine's own band beneath: empty
  on('ui.render', ($, e) => $.ui.resolve(e).Box({ key: 'engine' }))
  const files: Record<string, string> = {
    '/x/Content_2025-10-05_2026-10-03_TestCreator.xlsx': ANALYTICS_XLSX,
    '/x/Basic_LinkedInDataExport_10-04-2026.zip': ARCHIVE_ZIP,
  }
  on('fs.read', ($, e) => {
    const base64 = files[e.path]
    return base64 ? { value: { base64 } } : { deny: `ENOENT: no such file, ${e.path}` }
  })
  let asked = ''
  on('model.complete', ($, e) => {
    asked = e.prompt
    return { value: { isAnswered: true, text: '1|3|Opens on a stock phrase your weak posts use\n2|8|Names a money loss, like your top posts', usage } }
  })
  on('session.messages', () => ({ value: [{ role: 'assistant', text: ANSWER, toolUses: [] }] }))
  on('prompt.submit', ($, e) => ({ text: e.text }))

  const learned = await $.command.run({ command: 'hook-score-learn', args: '/x/Content_2025-10-05_2026-10-03_TestCreator.xlsx /x/Basic_LinkedInDataExport_10-04-2026.zip', ...AS_TYPED })
  expect(learned.text).toContain('7 posts with numbers, no text')
  expect(learned.text).toContain('Learned from 11 of your posts, 7 with numbers')

  const scored = await $.command.run({ command: 'hook-score', args: '', ...AS_TYPED })
  expect(scored.text).toContain('learned from 11 of your posts')
  expect(scored.text).toContain('Draft 2: 8/10. Names a money loss')
  expect(asked).toContain('412 engagements')
  expect(asked).toContain('I lost a $12k client because of one sentence.')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'Hook score · learned from 11 of your posts' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '8/10' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /stock phrase/ })).toBeDefined()
    await ui.unmount()
  }

  // The next prompt clears the band
  await $.prompt.submit({ text: 'thanks', wait: false, origin: { kind: 'composer' } })
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /Hook score/ })).toBeUndefined()
  await after.unmount()
})

test('with no posts learned, it says how to import them instead of scoring', async ($, on) => {
  mock.store(on)
  let calls = 0
  on('model.complete', () => {
    calls += 1
    return { value: { isAnswered: true, text: '1|5|x', usage } }
  })
  const answer = await $.command.run({ command: 'hook-score', args: 'A hook I pasted in to try the mod out.', ...AS_TYPED })
  expect(answer.text).toContain('/hook-score-learn')
  expect(calls).toBe(0)
})

test('/hook-score-learn with nothing to find writes a top-posts.md to paste into', async ($, on) => {
  mock.store(on)
  const written: Record<string, string> = {}
  on('session.cwd', () => ({ value: '/proj' }))
  on('env.get', () => ({ value: '/home/me' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.exists', () => ({ value: false }))
  on('fs.write', ($, e) => {
    written[e.path] = e.text
    return { value: undefined }
  })
  const answer = await $.command.run({ command: 'hook-score-learn', args: '', ...AS_TYPED })
  expect(answer.text).toContain('/proj/top-posts.md')
  expect(written['/proj/top-posts.md']).toContain('three dashes (---)')
})

test('a prompt about LinkedIn asks Claude for fenced drafts once, even with linkedin-preview installed', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  const asked = await $.prompt.submit({ text: 'Write me a LinkedIn post about pricing', wait: false, origin: { kind: 'composer' } })
  expect(String(asked.context)).toContain('```linkedin')
  const other = await $.prompt.submit({ text: 'Fix the failing test', wait: false, origin: { kind: 'composer' } })
  expect(other.context ?? []).toHaveLength(0)
})

test('/hook-score-model picks the scoring model and the next score uses it', async ($, on) => {
  mock.store(on, { posts: [{ hook: 'I lost a $40k client in 11 minutes.', text: 'I lost a $40k client in 11 minutes.' }] })
  let model = ''
  on('model.complete', ($, e) => {
    model = e.model
    return { value: { isAnswered: true, text: '1|6|Fine', usage } }
  })
  await $.command.run({ command: 'hook-score', args: 'A first hook to score.', ...AS_TYPED })
  expect(model).toBe('haiku')
  const picked = await $.command.run({ command: 'hook-score-model', args: 'sonnet', ...AS_TYPED })
  expect(picked.text).toBe('Hooks are now scored with sonnet.')
  await $.command.run({ command: 'hook-score', args: 'Another hook to score.', ...AS_TYPED })
  expect(model).toBe('sonnet')
  const wrong = await $.command.run({ command: 'hook-score-model', args: 'gpt', ...AS_TYPED })
  expect(wrong.text).toContain('Scoring uses sonnet')
})
