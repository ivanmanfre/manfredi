import { expect, test } from 'claude-code/testing'
import { learnFromBytes, library, mergeMetrics, mergePosts, postsFromMarkdown, parseCsv, idTime } from '../hooks/learn'
import { fromBase64, inflateRaw } from '../hooks/unzip'
import { parseScores, scorePrompt } from '../hooks/score'
import { ANALYTICS_XLSX, ARCHIVE_ZIP, POI_XLSX } from './fixtures'

test('the analytics export gives numbers per post, the data archive gives the text', () => {
  const numbers = learnFromBytes('Content_2025-10-05_2026-10-03_TestCreator.xlsx', fromBase64(ANALYTICS_XLSX))
  expect(numbers.kind).toBe('analytics export')
  expect(numbers.posts).toHaveLength(0)
  expect(numbers.metrics).toHaveLength(7)
  const best = numbers.metrics.find((m) => m.engagements === 412)
  expect(best?.impressions).toBe(38100)
  expect(best?.date).toBe('2026-03-02')

  const text = learnFromBytes('Basic_LinkedInDataExport_10-04-2026.zip', fromBase64(ARCHIVE_ZIP))
  expect(text.kind).toBe('LinkedIn data archive')
  expect(text.posts).toHaveLength(11)
  expect(text.posts.every((p) => p.engagements === undefined)).toBe(true)
})

test('posts are joined to their numbers by id time, and the weak ones are the posts outside the top list', () => {
  const metrics = mergeMetrics([], learnFromBytes('a.xlsx', fromBase64(ANALYTICS_XLSX)).metrics)
  const posts = mergePosts([], learnFromBytes('b.zip', fromBase64(ARCHIVE_ZIP)).posts)
  const lib = library(posts, metrics)
  expect(lib.learned).toBe(11)
  expect(lib.withNumbers).toBe(7)
  expect(lib.hasNumbers).toBe(true)
  expect(lib.top).toHaveLength(7)
  expect(lib.top[0]?.hook).toContain('I lost a $40k client in 11 minutes.')
  expect(lib.top[0]?.engagements).toBe(412)
  expect(lib.weak.some((p) => p.hook.includes("In today's fast-paced world"))).toBe(true)
  // A share id and its activity id are minted moments apart
  const share = posts.find((p) => p.engagements === undefined && p.hook.startsWith('I lost'))
  const metric = metrics.find((m) => m.engagements === 412)
  expect(Math.abs((idTime(share?.id) ?? 0) - (idTime(metric?.id) ?? 1e15))).toBeLessThan(5000)
})

test('a workbook with shared strings and ids that do not match joins by day', () => {
  const metrics = learnFromBytes('Content.xlsx', fromBase64(POI_XLSX)).metrics
  expect(metrics.map((m) => m.engagements)).toEqual([412, 380])
  const csv = [
    'Date,ShareLink,ShareCommentary,SharedUrl,MediaUrl,Visibility',
    '2026-03-02 09:00:00,https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A9,"I lost a $40k client in 11 minutes.',
    '',
    'Here is the ""one line"" that did it.",,,MEMBER_NETWORK',
  ].join('\n')
  const posts = learnFromBytes('Shares.csv', new TextEncoder().encode(csv)).posts
  expect(posts[0]?.text).toContain('"one line"')
  expect(library(posts, metrics).top[0]?.engagements).toBe(412)
  expect(parseCsv('a,"b,c"\n1,2\n')).toEqual([['a', 'b,c'], ['1', '2']])
})

test('a top-posts.md file: posts between --- lines, numbers on their own lines, the template ignored', () => {
  const md = [
    '<!-- Paste 5 to 20 of your best LinkedIn posts below -->',
    '',
    'I lost a $40k client in 11 minutes.',
    '',
    'Here is the one line in the call that did it.',
    'impressions: 38,100',
    'engagements: 412',
    '',
    '---',
    '',
    'My agency fired 9 clients last year. Revenue went up 31%.',
    '',
    '---',
    '',
    '(your second post)',
  ].join('\n')
  const posts = postsFromMarkdown(md)
  expect(posts).toHaveLength(2)
  expect(posts[0]?.impressions).toBe(38100)
  expect(posts[0]?.text).not.toContain('impressions')
  expect(library(posts, []).learned).toBe(2)
})

test('the score prompt carries your hooks and numbers, and the answer is read line by line', () => {
  const lib = library(learnFromBytes('b.zip', fromBase64(ARCHIVE_ZIP)).posts, learnFromBytes('a.xlsx', fromBase64(ANALYTICS_XLSX)).metrics)
  const prompt = scorePrompt(lib, ['Here is the thing about hooks.', 'I fired my best client.'])
  expect(prompt).toContain('412 engagements')
  expect(prompt).toContain('did worse')
  expect(prompt).toContain('2. "I fired my best client."')
  const got = parseScores('1|3|Opens on a vague phrase\n2 | 8/10 | Names a loss, like your top posts\nnoise', 2)
  expect(got[0]).toEqual({ score: 3, reason: 'Opens on a vague phrase' })
  expect(got[1]?.score).toBe(8)
  expect(parseScores('2|14|x', 2)[1]?.score).toBe(10)
  expect(parseScores('1|5|' + 'word '.repeat(20), 1)[0]?.reason).toBe('word '.repeat(14).trim() + '…')
})

test('inflate handles a stored block', () => {
  // A raw DEFLATE stored block holding "hi"
  const raw = new Uint8Array([0x01, 0x02, 0x00, 0xfd, 0xff, 0x68, 0x69])
  expect(new TextDecoder().decode(inflateRaw(raw))).toBe('hi')
})
