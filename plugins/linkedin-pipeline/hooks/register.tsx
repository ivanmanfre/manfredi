// linkedin-pipeline: a pane with your leads, replies and booked calls, read
// from files you export yourself: LinkedIn's "Get a copy of your data"
// (messages.csv, Connections.csv, or the whole .zip) or a CSV from your CRM.
// /pipeline opens it. w changes the window (7, 30, 90 days), l reads the files again.

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { WINDOWS, ago, load, pct, summarize } from './pipeline'
import type { Loaded } from './pipeline'
import { fromBase64, isZip, readZip } from './unzip'
import type { PipelineData } from '../types'

const PANE = 'linkedin-pipeline'
const data = atom({ plugin: 'linkedin-pipeline', key: 'data' } as const, null)
const days = atom({ plugin: 'linkedin-pipeline', key: 'days' } as const, 30)

// The file names LinkedIn and most CRMs give their exports; loose CSVs first,
// so a messages.csv you unzipped wins over the one inside the archive
const MESSAGES_FILE = /^messages\.csv$/i
const CONNECTIONS_FILE = /^Connections\.csv$/i
const ARCHIVE_FILE = /^(Basic|Complete)_LinkedInDataExport.*\.zip$/i
const CRM_FILES = /(pipeline|crm|leads|deals|contacts).*\.csv$/i

// Downloads gets LinkedIn's own files only: a prospect list saved there is
// not a pipeline. A CRM CSV is found in the project folder or named outright.
async function findFiles($: EngineInterface, dir: string, withCrm: boolean): Promise<string[]> {
  const entries = await $.fs.list(dir).catch(() => [])
  const found: string[] = []
  const patterns = withCrm
    ? [MESSAGES_FILE, CONNECTIONS_FILE, CRM_FILES, ARCHIVE_FILE]
    : [MESSAGES_FILE, CONNECTIONS_FILE, ARCHIVE_FILE]
  for (const pattern of patterns) {
    const newest = entries.filter((f) => f.kind === 'file' && pattern.test(f.name)).sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
    if (newest) found.push(`${dir}/${newest.name}`)
  }
  return found
}

async function readAll($: EngineInterface, paths: string[]): Promise<PipelineData> {
  const out: PipelineData = { people: [], connections: [], files: [], notes: [], loadedAt: await $.clock.now() }
  const decoder = new TextDecoder()
  // messages and connections are read once, from the first file that has them
  const seen = new Set<string>()
  for (const path of paths) {
    const name = path.split(/[\\/]/).pop() ?? path
    try {
      const { base64 } = await $.fs.read(path, { as: 'bytes' })
      const bytes = fromBase64(base64)
      const parts: Array<[string, Loaded]> = []
      if (isZip(bytes)) {
        for (const entry of readZip(bytes)) {
          if (/(^|\/)(messages|Connections)\.csv$/i.test(entry.name)) parts.push([entry.name, load(decoder.decode(entry.read()))])
        }
        if (!parts.length) {
          out.notes.push(`${name}: no messages.csv or Connections.csv inside, skipped`)
          continue
        }
      } else parts.push([name, load(decoder.decode(bytes))])
      for (const [part, got] of parts) {
        if (got.kind !== 'crm' && seen.has(got.kind)) {
          out.notes.push(`${part}: ${got.kind} already read from another file, skipped`)
          continue
        }
        seen.add(got.kind)
        out.people.push(...got.people)
        out.connections.push(...got.connections)
        const what = got.kind === 'connections' ? `${got.connections.length} connections` : `${got.people.length} leads`
        out.notes.push(`${part}: ${what}`)
      }
      out.files.push(path)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const why = /4 ?MiB|too large|over/i.test(msg)
        ? 'it is over 4 MB, the most a mod can read. Export a shorter date range, or unzip the archive and use messages.csv.'
        : /ENOENT|no such file/i.test(msg)
          ? 'file not found.'
          : msg
      out.notes.push(`${name}: could not read it, ${why}`)
    }
  }
  return out
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pipeline',
      description: 'Show leads, replies and booked calls from your LinkedIn export or CRM CSV',
      argumentHint: '[file ...]',
    })
    return next(e)
  })

  on('command.run', { command: 'pipeline' }, async ($, e) => {
    const typed = [...e.args.matchAll(/"([^"]+)"|'([^']+)'|((?:\\ |\S)+)/g)].map((m) => (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\ /g, ' '))
    const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
    let paths = typed.map((p) => (home && (p === '~' || p.startsWith('~/')) ? home + p.slice(1) : p))
    if (!paths.length) {
      const saved = (await $.store.get('files')) as string[] | undefined
      paths = Array.isArray(saved) && saved.length ? saved : await findFiles($, await $.session.cwd(), true)
      if (!paths.length && home) paths = await findFiles($, `${home}/Downloads`, false)
    }
    if (!paths.length) {
      return {
        text: [
          'No pipeline file found here, and no LinkedIn export in Downloads.',
          'Run /pipeline <file> with your LinkedIn data export (.zip, messages.csv, Connections.csv) or a CRM CSV with a stage or status column.',
        ].join('\n'),
      }
    }
    const loaded = await readAll($, paths)
    await update($, data, () => loaded)
    if (loaded.files.length) await $.store.set('files', loaded.files)
    await $.ui.open({ id: PANE, title: 'Pipeline', focus: true })
    return { text: loaded.notes.join('\n') }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const shown = await read($, data)
    const window = await read($, days)
    if (!shown || !shown.files.length) {
      return <Text dimColor>No files read yet. Run /pipeline with your LinkedIn data export or a CRM CSV.</Text>
    }
    const now = await $.clock.now()
    const p = summarize(shown.people, shown.connections, window, now)
    const width = Math.max(30, e.props.bodyColumns)
    const row = (key: string, name: string, detail: string, when: string) => (
      <Box key={key} flexDirection="row" columnGap={2} width={width}>
        <Text wrap="truncate">{name}</Text>
        <Text dimColor wrap="truncate">{detail}</Text>
        <Text dimColor>{when}</Text>
      </Box>
    )
    const files = shown.files.map((f) => f.split(/[\\/]/).pop()).join(', ')

    return (
      <Box flexDirection="column">
        <Text bold>{`Last ${p.days} days`}</Text>
        <Text dimColor wrap="truncate">{`From ${files}, read ${ago(shown.loadedAt, now)}`}</Text>
        <Text> </Text>
        <Box flexDirection="row" flexWrap="wrap" columnGap={4}>
          <Text>
            <Text bold>{String(p.leads)}</Text>
            {p.leads === 1 ? ' lead' : ' leads'}
          </Text>
          <Text>
            <Text bold color="yellow">{String(p.replies)}</Text>
            {`${p.replies === 1 ? ' reply' : ' replies'} (${pct(p.replies, p.leads)})`}
          </Text>
          <Text>
            <Text bold color="green">{String(p.booked)}</Text>
            {`${p.booked === 1 ? ' booked call' : ' booked calls'} (${pct(p.booked, p.leads)})`}
          </Text>
          {p.hasConnections ? (
            <Text>
              <Text bold>{String(p.connections)}</Text>
              {p.connections === 1 ? ' new connection' : ' new connections'}
            </Text>
          ) : null}
        </Box>
        <Text> </Text>
        <Text bold>Booked</Text>
        {p.recentBooked.length ? (
          p.recentBooked.map((x, i) => row(`b-${i}`, x.name, x.company ?? x.lastLine, ago(x.bookedAt ?? x.lastAt, now)))
        ) : (
          <Text dimColor>None in this window.</Text>
        )}
        <Text> </Text>
        <Text bold>Replied, no call yet</Text>
        {p.recentReplies.length ? (
          p.recentReplies.map((x, i) => row(`r-${i}`, x.name, x.company ?? x.lastLine, ago(x.repliedAt ?? x.lastAt, now)))
        ) : (
          <Text dimColor>None in this window.</Text>
        )}
        <Text> </Text>
        <Box flexDirection="row" columnGap={3}>
          <Button
            key="window"
            label={`${WINDOWS[(WINDOWS.indexOf(window as (typeof WINDOWS)[number]) + 1) % WINDOWS.length]} days`}
            hotkey="w"
            plain
            onPress={() => update($, days, (d) => WINDOWS[(WINDOWS.indexOf(d as (typeof WINDOWS)[number]) + 1) % WINDOWS.length] ?? 30)}
          />
          <Button
            key="reload"
            label="Read the files again"
            hotkey="l"
            plain
            onPress={async () => {
              const again = await readAll($, shown.files)
              await update($, data, () => again)
            }}
          />
        </Box>
      </Box>
    )
  })
}
