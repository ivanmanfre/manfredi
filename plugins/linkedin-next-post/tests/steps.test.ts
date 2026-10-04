import { expect, test } from 'claude-code/testing'
import { factsOf, pickSteps } from '../hooks/steps'

const LIST_POST = [
  'I lost a $40k client in 11 minutes.',
  '',
  'Here is what I changed:',
  '→ I name the price in the first call',
  '→ I send the scope the same day',
  '→ I ask what would make them say no',
].join('\n')

const CUT_HOOK = [
  'Most agencies price their work by the hour and wonder why the clients who pay the least always ask for the most',
  '',
  'Here is the fix.',
].join('\n')

test('a single draft with a list gets a carousel, objection replies and more hooks', () => {
  const steps = pickSteps([LIST_POST])
  expect(steps.map((s) => s.id)).toEqual(['carousel', 'objections', 'hooks'])
  expect(steps[0]!.prompt).toContain('carousel outline')
  expect(steps[0]!.prompt).toContain('the post above')
})

test('a hook cut mid-sentence by the fold comes first', () => {
  expect(factsOf([CUT_HOOK]).isFoldCut).toBe(true)
  const steps = pickSteps([CUT_HOOK])
  expect(steps[0]!.id).toBe('fold')
  expect(steps[0]!.label).toBe('Hook that fits above the fold')
  expect(steps).toHaveLength(3)
})

test('several drafts start with picking the strongest, and steps name it', () => {
  const steps = pickSteps([LIST_POST, CUT_HOOK])
  expect(steps[0]!.id).toBe('pick')
  expect(steps[1]!.prompt).toContain('the strongest of the drafts above')
  expect(steps.some((s) => s.id === 'hooks')).toBe(false)
})

test('no draft, no steps; a link in the post offers the first comment', () => {
  expect(pickSteps([])).toHaveLength(0)
  const long = 'Read the full guide here: https://example.com/guide\n\n' + 'One more line of the post. '.repeat(60)
  const ids = pickSteps([long], 8).map((s) => s.id)
  expect(ids).toContain('shorter')
  expect(ids).toContain('comment')
})
