import { expect, mock, test } from 'claude-code/testing'
import { load, summarize, timeOf } from '../hooks/pipeline'
import { CONNECTIONS, CRM, MESSAGES, NOW } from './fixtures'

const PANE = {
  plugin: 'linkedin-pipeline',
  component: 'Pane',
  requestId: 'linkedin-pipeline',
  viewport: { columns: 160, rows: 40 },
  props: {
    title: 'Pipeline',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const AS_TYPED = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 160 } } as const

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

test('messages.csv: one lead per conversation, a reply when they wrote back, booked when a message sets up a call', () => {
  const got = load(MESSAGES)
  expect(got.kind).toBe('messages')
  expect(got.note).toBe('you are Pat Creator')
  const names = got.people.map((p) => p.name).sort()
  expect(names).toEqual(['Ana Silva', 'Ben Ode', 'Cy Park', 'Dee Old', 'Eve Ng'])
  const p = summarize(got.people, [], 30, NOW)
  expect([p.leads, p.replies, p.booked]).toEqual([4, 2, 1])
  expect(p.recentBooked[0]?.name).toBe('Ben Ode')
  expect(p.recentReplies.map((x) => x.name)).toEqual(['Cy Park'])
  // Dee replied and booked in June: only the 180-day view would hold her
  expect(summarize(got.people, [], 90, NOW).booked).toBe(1)
})

test('Connections.csv and a CRM CSV', () => {
  const c = load(CONNECTIONS)
  expect(c.kind).toBe('connections')
  expect(summarize([], c.connections, 30, NOW).connections).toBe(2)
  expect(timeOf('27 Sep 2026')).toBe(Date.UTC(2026, 8, 27))
  const crm = load(CRM)
  expect(crm.kind).toBe('crm')
  const p = summarize(crm.people, [], 30, NOW)
  expect([p.leads, p.replies, p.booked]).toEqual([3, 2, 1])
  expect(() => load('a,b\n1,2')).toThrow()
})

test('/pipeline reads the files, opens the pane, and w changes the window', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on, { now: NOW })
  void clock
  const files: Record<string, string> = {
    '/x/messages.csv': b64(MESSAGES),
    '/x/Connections.csv': b64(CONNECTIONS),
    '/x/messages-copy.csv': b64(MESSAGES),
  }
  on('env.get', () => ({ value: '/home/me' }))
  on('fs.read', ($, e) => (files[e.path] ? { value: { base64: files[e.path]! } } : { deny: 'ENOENT: no such file' }))
  let opened = 0
  on('ui.open', () => {
    opened += 1
    return { value: { isPlaced: true } }
  })

  const answer = await $.command.run({ command: 'pipeline', args: '/x/messages.csv /x/Connections.csv /x/missing.csv /x/messages-copy.csv', ...AS_TYPED })
  expect(answer.text).toContain('messages.csv: 5 leads')
  expect(answer.text).toContain('Connections.csv: 3 connections')
  expect(answer.text).toContain('missing.csv: could not read it, file not found.')
  // The same messages in a second file are not counted twice
  expect(answer.text).toContain('messages-copy.csv: messages already read from another file, skipped')
  expect(opened).toBe(1)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: 'Last 30 days' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: ' booked call (25%)' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Ben Ode' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Cy Park' })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'window' })
  expect(await ui.find({ type: 'Text', text: 'Last 90 days' })).toBeDefined()
  await ui.unmount()
})

test('a contact list whose only stage-like column is the address State is not a pipeline', () => {
  const apollo = 'First Name,Last Name,Title,Company,City,State,Country\nAna,Silva,CEO,Acme,Austin,Texas,United States\n'
  expect(() => load(apollo)).toThrow('No messages, connections or stage column found')
})

test('/pipeline finds a CRM CSV in the project folder but only LinkedIn exports in Downloads', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: NOW })
  const entry = (name: string, mtimeMs: number) => ({ name, kind: 'file' as const, mtimeMs, size: 1, isLink: false })
  const listing: Record<string, ReturnType<typeof entry>[]> = {
    '/proj': [],
    '/home/me/Downloads': [
      entry('apollo-contacts-export.csv', 2),
      entry('messages.csv', 1),
    ],
  }
  const files: Record<string, string> = {
    '/home/me/Downloads/messages.csv': b64(MESSAGES),
    '/home/me/Downloads/apollo-contacts-export.csv': b64(CRM),
  }
  on('env.get', () => ({ value: '/home/me' }))
  on('session.cwd', () => ({ value: '/proj' }))
  on('fs.list', ($, e) => ({ value: listing[e.path] ?? [] }))
  on('fs.read', ($, e) => (files[e.path] ? { value: { base64: files[e.path]! } } : { deny: 'ENOENT: no such file' }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  const answer = await $.command.run({ command: 'pipeline', args: '', ...AS_TYPED })
  expect(answer.text).toContain('messages.csv: 5 leads')
  expect(answer.text).not.toContain('apollo')
})
