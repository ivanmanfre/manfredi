import { expect, test } from 'claude-code/testing'
import { VIEWS, extractDrafts, fold, lastLineWithMore, checks, toPlain } from '../hooks/lib.js'

const POST = [
  'I rewrote the same LinkedIn hook 11 times last week.',
  '',
  'The post was fine. The first two lines were not.',
  '',
  'Here is what changed when I started checking the fold before posting:',
  '',
  '→ The hook fits above "see more" on a phone',
  '→ No **bold** markdown that LinkedIn shows as asterisks',
  '→ One idea per line, so the reader keeps going',
].join('\n')

const ANSWER = [
  'Here are two drafts.',
  '',
  '```linkedin',
  POST,
  '```',
  '',
  '```linkedin',
  'Short post that fits.',
  '```',
].join('\n')

const PANE = {
  plugin: 'linkedin-preview',
  component: 'Pane',
  requestId: 'linkedin-preview',
  viewport: { columns: 160, rows: 40 },
  props: {
    title: 'LinkedIn preview',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('finds fenced drafts, and an unfenced post only when the prompt asked for one', () => {
  expect(extractDrafts(ANSWER)).toHaveLength(2)
  expect(extractDrafts(POST)).toHaveLength(0)
  expect(extractDrafts(POST, true)).toHaveLength(1)
  expect(extractDrafts('ok', true)).toHaveLength(0)
})

test('the fold cuts after 3 feed lines, and a blank line counts as one', () => {
  const f = fold(POST, VIEWS.mobile)
  expect(f.isFolded).toBe(true)
  expect(f.visible).toBe('I rewrote the same LinkedIn hook 11 times last week.\n\nThe post was fine. The first two lines were not.')
  expect(f.visibleLines.length).toBe(3)
  const d = fold(POST, VIEWS.desktop)
  expect(d.cut).toBeGreaterThanOrEqual(f.cut)
  expect(fold('Short post that fits.', VIEWS.mobile).isFolded).toBe(false)
})

test('a long single paragraph is cut at the last word of the third line', () => {
  const long = 'word '.repeat(60).trim()
  const f = fold(long, VIEWS.mobile)
  expect(f.visibleLines.length).toBe(3)
  expect(f.cut).toBeLessThanOrEqual(3 * VIEWS.mobile.width + 2)
  expect(f.visible.endsWith('word')).toBe(true)
  expect(fold(long, VIEWS.desktop).cut).toBeGreaterThan(f.cut)
})

test('a full last line is shortened at a word so "…see more" fits on it', () => {
  const line = 'You ask Claude for a post like you always do, and a pane opens next'
  const shown = lastLineWithMore(line, VIEWS.desktop.width)
  expect((shown + ' …see more').length).toBeLessThanOrEqual(VIEWS.desktop.width)
  expect(line.startsWith(shown)).toBe(true)
  expect(shown.endsWith(' ')).toBe(false)
  expect(lastLineWithMore('Short line.', VIEWS.mobile.width)).toBe('Short line.')
})

test('checks flag markdown LinkedIn shows raw, and copy text removes it', () => {
  const found = checks(POST, VIEWS.mobile).map((c) => c.text)
  expect(found.some((t) => t.includes('**bold**'))).toBe(true)
  expect(toPlain(POST)).not.toContain('**')
  expect(toPlain('[site](https://x.com) and `code`')).toBe('site https://x.com and code')
})

test('a prompt about LinkedIn gets the draft note for Claude, other prompts do not', async ($, on) => {
  on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
  const asked = await $.prompt.submit({ text: 'Write me 2 LinkedIn post hooks about pricing', wait: false })
  expect(String(asked.context)).toContain('```linkedin')
  const other = await $.prompt.submit({ text: 'Fix the failing test', wait: false })
  expect(other.context ?? []).toHaveLength(0)
})

test('after a turn with drafts, a summary line shows and the pane opens', async ($, on) => {
  let opened = 0
  on('turn.complete', () => ({ text: ANSWER }))
  on('ui.open', () => {
    opened += 1
    return { value: { isPlaced: true } }
  })
  const result = await $.turn.complete({ answer: ANSWER, durationMs: 1000, isAborted: false, turnId: 't1', reason: 'answer' })
  expect(result.text).toMatch(/^2 drafts · Draft 1: /)
  expect(result.text).toContain('/preview')
  expect(opened).toBe(1)
})

test('a subagent turn is ignored', async ($, on) => {
  on('turn.complete', () => ({ text: ANSWER }))
  const result = await $.turn.complete({ answer: ANSWER, durationMs: 1000, isAborted: false, turnId: 't2', agentId: 'a1', reason: 'answer' })
  expect(result.text).toBe(ANSWER)
})

test('the pane shows the fold, switches drafts and views, and copies clean text', async ($, on) => {
  let copied = ''
  const saved = new Map<string, unknown>()
  on('turn.complete', () => ({ text: ANSWER }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.copy', ($, e) => {
    copied = e.text
    return { value: { isCopied: true } }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('store.set', ($, e) => {
    saved.set(e.key, e.value)
    return { value: undefined }
  })
  await $.turn.complete({ answer: ANSWER, durationMs: 1000, isAborted: false, turnId: 't3', reason: 'answer' })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '…see more' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Mobile feed' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /\*\*bold\*\* shows as raw asterisks/ })).toBeDefined()

  await ui.press({ key: 'copy' })
  expect(copied).toContain('No bold markdown')
  expect(copied).not.toContain('**')

  await ui.press({ key: 'view' })
  expect(await ui.find({ type: 'Text', text: 'Desktop feed' })).toBeDefined()
  expect(saved.get('view')).toBe('desktop')

  await ui.press({ key: 'draft-1' })
  expect(await ui.find({ type: 'Text', text: /no fold/ })).toBeDefined()
  await ui.unmount()

  const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await desktop.find({ type: 'Svg' })).toBeDefined()
  await desktop.unmount()
})

test('/preview with text previews that text', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const answer = await $.command.run({ command: 'preview', args: POST })
  expect(answer.text ?? '').toBe('')
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '…see more' })).toBeDefined()
  await ui.unmount()
})
