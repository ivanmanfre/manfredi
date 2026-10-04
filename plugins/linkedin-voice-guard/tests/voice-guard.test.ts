import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'linkedin-voice-guard',
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

const AS_TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

const ANSWER = [
  'Here you go.',
  '',
  '```linkedin',
  "In today's fast-paced world, founders need a system.",
  '',
  'We help agencies unlock growth — fast.',
  '',
  "Let's delve into it.",
  '```',
  '',
  '```linkedin',
  'I lost a $40k client in 11 minutes. Here is the line that did it.',
  '```',
].join('\n')

test('a draft turn shows the flags per draft, highlighted, and Rewrite asks Claude for the flagged lines only', async ($, on) => {
  const files: Record<string, string> = {}
  const submitted: string[] = []
  on('env.get', () => ({ value: '/home/me' }))
  on('fs.exists', ($, e) => ({ value: e.path in files }))
  on('fs.read', ($, e) => (e.path in files ? { value: files[e.path]! } : { deny: 'ENOENT' }))
  on('fs.write', ($, e) => {
    files[e.path] = e.text
    return { value: undefined }
  })
  on('prompt.submit', ($, e) => {
    submitted.push(e.text)
    return { text: e.text }
  })
  on('turn.complete', () => ({ text: ANSWER }))
  on('ui.render', ($, e) => $.ui.resolve(e).Box({ key: 'engine' }))

  await $.turn.complete({ answer: ANSWER, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' })
  // The rules file is written with the defaults the first time
  expect(files['/home/me/.claude/linkedin-mods/voice-guard-rules.txt']).toContain('@em-dash')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'Voice guard · Draft 1: 4 flags · Draft 2: clean' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: "In today's fast-paced" })).toBeDefined()
    expect(await ui.find({ type: 'Button', text: 'Show all 4' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'all' })
  expect(await ui.find({ type: 'Text', text: 'delve' })).toBeDefined()
  await ui.press({ key: 'rewrite' })
  await ui.unmount()
  expect(submitted).toHaveLength(1)
  expect(submitted[0]).toContain('Rewrite only the flagged lines')
  expect(submitted[0]).toContain('Draft 1, line 3: "We help agencies unlock growth — fast." (flagged: unlock, em dash)')
  expect(submitted[0]).not.toContain('$40k')

  // The band is gone once the rewrite was asked for
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: /Voice guard/ })).toBeUndefined()
  await after.unmount()
})

test('/voice-guard-add extends the rules file, and /voice-guard checks pasted text with it', async ($, on) => {
  const files: Record<string, string> = {}
  on('env.get', () => ({ value: '/home/me' }))
  on('fs.exists', ($, e) => ({ value: e.path in files }))
  on('fs.read', ($, e) => (e.path in files ? { value: files[e.path]! } : { deny: 'ENOENT' }))
  on('fs.write', ($, e) => {
    files[e.path] = e.text
    return { value: undefined }
  })
  const added = await $.command.run({ command: 'voice-guard-add', args: 'circle back', ...AS_TYPED })
  expect(added.text).toContain('Added "circle back"')
  const again = await $.command.run({ command: 'voice-guard-add', args: 'circle back', ...AS_TYPED })
  expect(again.text).toContain('already a rule')
  const checked = await $.command.run({ command: 'voice-guard', args: 'Happy to circle back on this next week.', ...AS_TYPED })
  expect(checked.text).toContain('1 flag')
  expect(checked.text).toContain('line 1: circle back')
  const removed = await $.command.run({ command: 'voice-guard-remove', args: '@em-dash', ...AS_TYPED })
  expect(removed.text).toContain('Removed "@em-dash"')
  const dash = await $.command.run({ command: 'voice-guard', args: 'One idea — one line.', ...AS_TYPED })
  expect(dash.text).toContain('no AI tells found')
})
