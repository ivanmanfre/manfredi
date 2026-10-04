// linkedin-next-post: after Claude writes a LinkedIn draft, offers the next 3
// content steps as buttons above the prompt. Press a, s or d (or click) and
// that step goes to Claude as your next prompt. x hides the buttons.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { MENTIONS_LINKEDIN, draftNote, extractDrafts, hasDraftNote } from './draft'
import { pickSteps } from './steps'
import type { NextStep } from '../types'

const steps = atom({ plugin: 'linkedin-next-post', key: 'steps' } as const, null)

// a, s, d: one hand on the home row, and none of linkedin-preview's keys
const KEYS = ['a', 's', 'd']

async function lastDrafts($: EngineInterface): Promise<string[]> {
  const messages = await $.session.messages()
  const last = [...messages].reverse().find((m) => m.role === 'assistant' && extractDrafts(m.text, true).length)
  return last ? extractDrafts(last.text, true) : []
}

// Steps already taken since the person last typed a prompt, so the band does
// not offer the same step again on the answer it produced
const taken = new Set<string>()

async function send($: EngineInterface, step: NextStep) {
  taken.add(step.id)
  await update($, steps, () => null)
  await $.prompt.submit({ text: step.prompt, asUser: true })
}

export const register: Register = (on) => {
  let isHinted = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'next-post',
      description: 'Show the next content steps for the last LinkedIn draft',
    })
    return next(e)
  })

  // A prompt this mod sends never reaches its own prompt.submit hook; every
  // other prompt does, and starts a fresh set of steps
  on('prompt.submit', async ($, e, next) => {
    taken.clear()
    isHinted = MENTIONS_LINKEDIN.test(e.text)
    await update($, steps, () => null)
    if (!isHinted || hasDraftNote(e.context)) return next(e)
    return next({ ...e, context: [...(e.context ?? []), draftNote('linkedin-next-post')] })
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId || e.isAborted) return result
    const found = pickSteps(extractDrafts(e.answer, isHinted), 3, taken)
    isHinted = false
    if (found.length) await update($, steps, () => found)
    return result
  })

  on('command.run', { command: 'next-post' }, async ($) => {
    const found = pickSteps(await lastDrafts($))
    if (!found.length) return { text: 'No LinkedIn draft yet. Ask Claude for a post first.' }
    await update($, steps, () => found)
    return { text: found.map((s, i) => `${KEYS[i]}: ${s.label}`).join(' · ') }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, steps)
    if (e.props.hasSurvey || !shown || !shown.length) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const mine = (
      <Box key="linkedin-next-post" flexDirection="row" flexWrap="wrap" columnGap={3} width={Math.max(30, e.props.bodyColumns)}>
        <Text bold>Next</Text>
        {shown.map((s, i) => (
          <Button
            key={`step-${i}`}
            label={s.label}
            hotkey={KEYS[i] ?? String(i + 1)}
            plain
            onPress={() => send($, s)}
          />
        ))}
        <Button key="hide" label="Hide" hotkey="x" plain dimColor role="dismiss" onPress={() => update($, steps, () => null)} />
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
