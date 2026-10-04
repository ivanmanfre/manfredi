import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'linkedin-next-post',
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
  'Here is a draft.',
  '',
  '```linkedin',
  'I lost a $40k client in 11 minutes.',
  '',
  'Here is what I changed:',
  '→ I name the price in the first call',
  '→ I send the scope the same day',
  '→ I ask what would make them say no',
  '```',
].join('\n')

test('after a draft turn, 3 steps show as buttons on both surfaces, and a press sends that step as the next prompt', async ($, on) => {
  const submitted: Array<{ text: string; asUser?: boolean }> = []
  on('prompt.submit', ($, e) => {
    submitted.push({ text: e.text, asUser: e.origin.kind === 'plugin' ? e.origin.asUser : undefined })
    return { text: e.text }
  })
  on('turn.complete', () => ({ text: ANSWER }))
  on('ui.render', ($, e) => $.ui.resolve(e).Box({ key: 'engine' }))

  await $.turn.complete({ answer: ANSWER, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'Next' })).toBeDefined()
    expect(await ui.find({ type: 'Button', text: 'Turn it into a carousel' })).toBeDefined()
    expect(await ui.find({ type: 'Button', text: 'Replies to 3 objections' })).toBeDefined()
    expect(await ui.find({ type: 'Button', text: '5 more hooks' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'step-1' })
  await ui.unmount()
  expect(submitted).toHaveLength(1)
  expect(submitted[0]!.text).toContain('3 objections a skeptical reader')
  expect(submitted[0]!.asUser).toBe(true)

  // The buttons are gone once a step was sent
  const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await after.find({ type: 'Text', text: 'Next' })).toBeUndefined()
  await after.unmount()
})

test('a turn with no draft shows nothing, and Hide takes the buttons away', async ($, on) => {
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => $.ui.resolve(e).Box({ key: 'engine' }))

  await $.turn.complete({ answer: 'The tests pass now.', durationMs: 10, isAborted: false, turnId: 't2', reason: 'answer' })
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'Next' })).toBeUndefined()
  await ui.unmount()

  await $.turn.complete({ answer: ANSWER, durationMs: 10, isAborted: false, turnId: 't3', reason: 'answer' })
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'hide' })
  expect(await ui.find({ type: 'Text', text: 'Next' })).toBeUndefined()
  await ui.unmount()
})

test('the answer to a step does not offer that step again, and a prose answer after a LinkedIn prompt is no draft', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => $.ui.resolve(e).Box({ key: 'engine' }))

  await $.turn.complete({ answer: ANSWER, durationMs: 10, isAborted: false, turnId: 't4', reason: 'answer' })
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'step-1' })
  await ui.unmount()

  await $.turn.complete({ answer: ANSWER, durationMs: 10, isAborted: false, turnId: 't5', reason: 'answer' })
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Button', text: 'Turn it into a carousel' })).toBeDefined()
  expect(await ui.find({ type: 'Button', text: 'Replies to 3 objections' })).toBeUndefined()
  await ui.unmount()

  // A typed prompt about LinkedIn, then an answer that is plain prose: one draft by shape...
  await $.prompt.submit({ text: 'Write me a LinkedIn post about pricing', wait: false, origin: { kind: 'composer' } })
  const prose = 'Pricing on the first call is a filter. '.repeat(6)
  await $.turn.complete({ answer: prose, durationMs: 10, isAborted: false, turnId: 't6', reason: 'answer' })
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'Next' })).toBeDefined()
  await ui.press({ key: 'step-0' })
  await ui.unmount()
  // ...but the hint lasts one turn: prose after the step's own prompt is no draft
  await $.turn.complete({ answer: prose, durationMs: 10, isAborted: false, turnId: 't7', reason: 'answer' })
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'Next' })).toBeUndefined()
  await ui.unmount()
})
