import { expect, test } from 'claude-code/testing'
import { DEFAULT_RULES, check, parseRules, phraseRule, rewritePrompt, report, snippet } from '../hooks/rules'

const { rules, errors } = parseRules(DEFAULT_RULES)

const AI_DRAFT = [
  "In today's fast-paced world, every founder needs a content system.",
  '',
  "Here's the thing: it's not just about posting, but about showing up.",
  '',
  'We help agencies unlock growth — and it works.',
  '',
  'Clear. Simple. Effective.',
  '',
  "Let's delve into the numbers.",
].join('\n')

const HUMAN_DRAFT = [
  'I lost a $40k client in 11 minutes.',
  '',
  'Here is the one line in the call that did it, and what I say now instead.',
  '',
  'We still post 5 times a week. The posts are shorter. The replies went up.',
].join('\n')

test('the default rules load with no errors', () => {
  expect(errors).toHaveLength(0)
  expect(rules.length).toBeGreaterThan(30)
})

test('an AI-sounding draft is flagged where each tell fires', () => {
  const flags = check(AI_DRAFT, rules)
  const names = flags.map((f) => f.rule)
  expect(names).toContain("in today's fast-paced")
  expect(names).toContain("here's the thing")
  expect(names).toContain('not just X but Y')
  expect(names).toContain('unlock')
  expect(names).toContain('em dash')
  expect(names).toContain('three short fragments')
  expect(names).toContain('delve')
  const delve = flags.find((f) => f.rule === 'delve')!
  expect(delve.line).toBe(9)
  expect(delve.lineText.slice(delve.start, delve.end)).toBe('delve')
  // Flags come in reading order
  expect(flags.map((f) => f.line)).toEqual([...flags.map((f) => f.line)].sort((a, b) => a - b))
})

test('the tells Claude wrote in a real test run are caught (2026-10-04, Sonnet)', () => {
  const names = (t: string) => check(t, rules).map((f) => f.rule)
  expect(names("Price isn't the awkward part of the sale. Hiding it is.")).toContain("not X, it's Y")
  expect(names("Staying quiet about price isn't polite. It's a slower no.")).toContain("not X, it's Y")
  expect(names('Name your number early. Qualify faster. Close cleaner.')).toContain('three short fragments')
  expect(names("I stopped sending proposals.\n\nNot because they don't work. Because they slow the yes.")).toContain("not X, it's Y")
  expect(names('The proposal was never the sale. It was a way to avoid a talk.')).toContain("not X, it's Y")
  expect(names('Unpopular opinion: proposals are a time tax.')).toContain('unpopular opinion:')
})

test('contrast tells from the 2026-10-04 test runs are caught (captures 01 and 04)', () => {
  const names = (t: string) => check(t, rules).map((f) => f.rule)
  // capture 04, Draft 3, which the band had marked clean
  expect(names('2. You compete on a spreadsheet, not on trust')).toContain('X, not Y')
  expect(names('Fewer docs, more closed deals.')).toContain('less X, more Y')
  // capture 01 run, Draft 1
  expect(names('Wrong-fit clients leave in 5 minutes, not 5 weeks.')).toContain('X, not Y')
  // the siblings
  expect(names('Sell the outcome — not the hours.')).toContain('X, not Y')
  expect(names('Instead of writing proposals, book the call.')).toContain('X instead of Y')
  expect(names('Book the call, instead of writing a proposal.')).toContain('X instead of Y')
  expect(names('Less polish, more proof.')).toContain('less X, more Y')
  expect(names('More calls, less guessing.')).toContain('less X, more Y')
  expect(names('Stop writing proposals, start booking calls.')).toContain('stop X, start Y')
  // plain uses of the same words stay clean
  expect(names('I do not know yet, not sure either.')).toHaveLength(0)
  expect(names('Whether or not you post, the work counts.')).toHaveLength(0)
  expect(names('Stop saving the price for the proposal.')).toHaveLength(0)
  expect(names('We need more calls and fewer meetings.')).toHaveLength(0)
})

test('three short questions in a row are no fragment run, and the borderline words are gone', () => {
  const names = (t: string) => check(t, rules).map((f) => f.rule)
  // capture 07, Draft 2
  expect(names('It forces me to define the outcome before I dial. A demo? An intro to finance? A signed pilot?')).toHaveLength(0)
  expect(names('We foster trust with every client we take on.')).toHaveLength(0)
  expect(names('It was a pivotal week for the whole agency.')).toHaveLength(0)
  expect(names('The landscape of outbound changed this year.')).toHaveLength(0)
  // three short statements still count
  expect(names('Clear. Simple. Effective.')).toContain('three short fragments')
})

test('contrasts in the drafts Claude wrote in the real-corpus run are caught (2026-10-04, Sonnet)', () => {
  const names = (t: string) => check(t, rules).map((f) => f.rule)
  expect(names("The fix wasn't motivation. It was lowering the bar.")).toContain("not X, it's Y")
  expect(names("The founders who win aren't better writers. They just didn't stop before the lag ended.")).toContain("not X, it's Y")
  expect(names("It's not a lack of ideas. It's three things:")).toContain("not X, it's Y")
})

test("lines from Ivan's best real posts that are no AI tells stay clean (own_posts, 2026-10-04)", () => {
  const names = (t: string) => check(t, rules).map((f) => f.rule)
  expect(names('Netherlands: 16.7%. France: 14.7%. Germany: 10.7%.')).toHaveLength(0)
  expect(names('Poland grew 3.8%. Germany grew 1%. France grew 0.5%.')).toHaveLength(0)
  expect(names('Now there are two bottlenecks instead of one.')).toHaveLength(0)
  expect(names('A slow quarter turns this into a bad month instead of a countdown.')).toHaveLength(0)
})

test('a plain human draft comes back clean', () => {
  expect(check(HUMAN_DRAFT, rules)).toHaveLength(0)
  // Three short sentences inside a longer line are not fragments
  expect(check('The posts are shorter. The replies went up. We kept going.', rules)).toHaveLength(0)
})

test('phrases match their forms and spellings, and curly apostrophes', () => {
  expect('Unlocking value'.match(phraseRule('unlock'))).toHaveLength(1)
  expect('a real gamechanger and a game changer'.match(phraseRule('game-changer'))).toHaveLength(2)
  expect(check('Here’s the thing.', rules).map((f) => f.rule)).toContain("here's the thing")
  expect(check('We are delving deep.', rules).map((f) => f.rule)).toContain('delve')
  expect(parseRules('@nope\nre:(').errors).toHaveLength(2)
  expect(check('Our synergies grew.', parseRules('re:\\bsynerg\\w*').rules)).toHaveLength(1)
})

test('the rewrite prompt names each flagged line once and keeps the rest', () => {
  const found = report([AI_DRAFT, HUMAN_DRAFT], rules)
  expect(found[1]!.flags).toHaveLength(0)
  const prompt = rewritePrompt(found.filter((r) => r.flags.length), 1)
  expect(prompt).toContain('Keep every other line word for word')
  expect(prompt).toContain('line 9: "Let\'s delve into the numbers." (flagged: delve)')
  expect(prompt.match(/line 3:/g)).toHaveLength(1)
  const s = snippet(found[0]!.flags[0]!, 30)
  expect(s.hit.toLowerCase()).toBe("in today's fast-paced")
})
