// Which next steps a draft gets. Picked from what the draft is, with no model
// call: instant, free, and the same draft always gets the same buttons.

import { VIEWS, fold } from './draft'
import type { NextStep } from '../types'

const LIST_LINE = /^\s*(?:[-•→✅▪︎*]|\d+[.)])\s+\S/

export type DraftFacts = {
  drafts: number
  isFoldCut: boolean
  hasList: boolean
  isLong: boolean
  hasLink: boolean
}

export function factsOf(drafts: string[]): DraftFacts {
  const first = drafts[0] ?? ''
  return {
    drafts: drafts.length,
    isFoldCut: drafts.some((d) => fold(d, VIEWS.mobile).endsMidSentence),
    hasList: drafts.some((d) => d.split('\n').filter((l) => LIST_LINE.test(l)).length >= 3),
    isLong: drafts.some((d) => d.length > 1300),
    hasLink: /https?:\/\/\S+/.test(first),
  }
}

// Every step the mod knows, in the order they are offered when they apply
export function allSteps(f: DraftFacts): Array<NextStep & { when: boolean }> {
  const post = f.drafts > 1 ? 'the strongest of the drafts above' : 'the post above'
  return [
    {
      id: 'pick',
      when: f.drafts > 1,
      label: 'Pick the strongest draft',
      prompt:
        'Of the drafts above, which one would you post, and why, in 3 short lines? Then give that draft again with its weakest line made better, in a ```linkedin block.',
    },
    {
      id: 'fold',
      when: f.isFoldCut,
      label: 'Hook that fits above the fold',
      prompt: `Rewrite the hook of ${post} so its first idea ends inside the first 3 lines on a phone (about 54 characters a line, and a blank line counts as a line). Keep the rest of the post as it is. Give the full post in a \`\`\`linkedin block.`,
    },
    {
      id: 'carousel',
      when: f.hasList,
      label: 'Turn it into a carousel',
      prompt: `Turn ${post} into a LinkedIn carousel outline: a cover slide with the hook, 6 to 8 slides with one idea each (a headline of at most 8 words and one supporting line), and a last slide with one call to action. Plain text, numbered slides.`,
    },
    {
      id: 'objections',
      when: true,
      label: 'Replies to 3 objections',
      prompt: `List the 3 objections a skeptical reader is most likely to leave as a comment on ${post}, and write my reply to each: 2 or 3 sentences, friendly and specific, with no sales pitch.`,
    },
    {
      id: 'shorter',
      when: f.isLong,
      label: 'Shorter version',
      prompt: `Write a version of ${post} under 900 characters that keeps the hook and the main point. Put it in a \`\`\`linkedin block.`,
    },
    {
      id: 'hooks',
      when: f.drafts === 1,
      label: '5 more hooks',
      prompt:
        'Write 5 different hooks for the post above, each at most 2 short lines, each with a different opening: a number, a confession, a strong claim, a question, a specific moment. Put each in its own ```linkedin block with the rest of the post unchanged.',
    },
    {
      id: 'comment',
      when: f.hasLink,
      label: 'First comment with the link',
      prompt: `Move the link out of ${post} and write the first comment I should post under it: one line that adds a useful detail and carries the link. Give the post without the link in a \`\`\`linkedin block, then the comment.`,
    },
    {
      id: 'carousel',
      when: !f.hasList,
      label: 'Turn it into a carousel',
      prompt: `Turn ${post} into a LinkedIn carousel outline: a cover slide with the hook, 6 to 8 slides with one idea each (a headline of at most 8 words and one supporting line), and a last slide with one call to action. Plain text, numbered slides.`,
    },
  ]
}

// The 3 steps the band offers for these drafts
export function pickSteps(drafts: string[], max = 3, skip: ReadonlySet<string> = new Set()): NextStep[] {
  if (!drafts.length) return []
  const facts = factsOf(drafts)
  return allSteps(facts)
    .filter((s) => s.when && !skip.has(s.id))
    .slice(0, max)
    .map(({ id, label, prompt }) => ({ id, label, prompt }))
}
