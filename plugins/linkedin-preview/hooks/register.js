// linkedin-preview: see a LinkedIn post the way the feed shows it, before you post it.
//
// When Claude writes a LinkedIn post, this mod finds the draft(s) in the answer,
// prints a one-line summary under it, and opens a pane that shows each draft
// cut at the "…see more" fold, with character counts and markdown checks.

import { VIEWS, MAX_CHARS, extractDrafts, fold, lastLineWithMore, stats, checks, toPlain, fmt, cardSvg } from './lib.js'

const PANE = 'linkedin-preview'
const MENTIONS_LINKEDIN = /linked\s?in|\bli post\b/i

// The pane's state. Module variables reset when the mod reloads, which is fine:
// the drafts come back the next time Claude writes one.
let drafts = []
let active = 0
let viewName = 'mobile'
let isExpanded = false
let profile = { name: 'Your Name', headline: 'Your headline' }
// Set when the last prompt asked for a LinkedIn post
let isHinted = false

// Read the saved profile and view from $.store
async function loadSaved($) {
  const saved = await $.store.get('profile')
  if (saved && typeof saved.name === 'string') profile = { name: saved.name, headline: String(saved.headline || '') }
  const savedView = await $.store.get('view')
  if (savedView === 'mobile' || savedView === 'desktop') viewName = savedView
}

// Show the drafts and open the pane. `byUser` is true when the user asked for it.
async function show($, found, byUser) {
  drafts = found
  active = 0
  isExpanded = false
  $.ui.invalidate('ui.render')
  const opened = await $.ui.open(byUser ? { id: PANE, title: 'LinkedIn preview', focus: true } : { id: PANE, title: 'LinkedIn preview' })
  return opened
}

// One-line summary of the drafts, for the transcript
function summary(found) {
  const view = VIEWS[viewName]
  const parts = found.map((d, i) => {
    const f = fold(d, view)
    const where = f.isFolded ? `fold ≈ ${f.cut}` : 'no fold'
    return `${found.length > 1 ? 'Draft ' + (i + 1) + ': ' : ''}${fmt(d.length)}/${fmt(MAX_CHARS)} chars, ${where}`
  })
  const label = found.length === 1 ? '1 draft' : found.length + ' drafts'
  return `${label} · ${parts.join(' · ')} · /preview to open`
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'preview',
      description: 'Preview a LinkedIn post the way the feed shows it',
      argumentHint: '[post text]',
      immediate: true,
    })
    await $.command.register({
      name: 'preview-profile',
      description: 'Set the name and headline on the preview card',
      argumentHint: 'Name | Headline',
    })
    await loadSaved($)
    return next(e)
  })

  // When a prompt asks for a LinkedIn post, ask Claude to put each draft in a
  // ```linkedin block, so the mod finds the drafts exactly.
  on('prompt.submit', async ($, e, next) => {
    isHinted = MENTIONS_LINKEDIN.test(e.text)
    if (!isHinted) return next(e)
    // Another mod of the pack (hook score, voice guard, next post) may have asked
    // already: Claude reads the request once
    if ((e.context ?? []).some((c) => c.includes('```linkedin fenced code block'))) return next(e)
    const note =
      'linkedin-preview mod: when your answer contains a LinkedIn post draft, put each draft (the post text only) ' +
      'in its own ```linkedin fenced code block, so the user can preview it as the feed shows it.'
    return next({ ...e, context: [...(e.context ?? []), note] })
  })

  // When Claude finishes, look for drafts in the answer
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId || e.isAborted) return result
    const found = extractDrafts(e.answer, isHinted)
    if (!found.length) return result
    const opened = await show($, found, false)
    if (opened && opened.isPlaced === false) $.ui.toast('LinkedIn draft found. Run /preview to see the fold.')
    return { ...result, text: summary(found) }
  })

  on('command.run', { command: 'preview' }, async ($, e) => {
    const typed = (e.args || '').trim()
    if (typed) {
      await show($, [typed], true)
      return {}
    }
    if (drafts.length) {
      await show($, drafts, true)
      return {}
    }
    // No draft yet: preview the last answer Claude gave
    const messages = await $.session.messages()
    const last = [...messages].reverse().find((m) => m.role === 'assistant' && m.text && m.text.trim())
    if (!last) return { text: 'No post to preview yet. Ask Claude for a LinkedIn post, or run /preview <post text>.' }
    const found = extractDrafts(last.text, true)
    await show($, found.length ? found : [last.text.trim()], true)
    return {}
  })

  on('command.run', { command: 'preview-profile' }, async ($, e) => {
    const [name, ...rest] = (e.args || '').split('|')
    if (!name || !name.trim()) return { text: 'Usage: /preview-profile Your Name | Your headline' }
    profile = { name: name.trim(), headline: rest.join('|').trim() }
    await $.store.set('profile', profile)
    $.ui.invalidate('ui.render')
    return { text: `Preview card now shows ${profile.name}${profile.headline ? ' · ' + profile.headline : ''}` }
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button, Svg } = $.ui.resolve(e)
    const redraw = () => $.ui.invalidate('ui.render')
    const view = VIEWS[viewName]
    const text = drafts[active] ?? ''
    if (!text) return Text({ dimColor: true, children: ['No draft yet. Ask Claude for a LinkedIn post, or run /preview <post text>.'] })

    const f = fold(text, view)
    const s = stats(text)
    const found = checks(text, view)

    // Draft tabs, view switch, see more, copy
    const tabs = drafts.slice(0, 9).map((_, i) =>
      Button({
        key: 'draft-' + i,
        label: 'Draft ' + (i + 1),
        hotkey: String(i + 1),
        plain: true,
        ...(i !== active ? { dimColor: true } : {}),
        onPress: () => {
          active = i
          isExpanded = false
          redraw()
        },
      }),
    )
    const controls = Box({
      flexDirection: 'row',
      columnGap: 3,
      children: [
        Button({
          key: 'copy',
          label: 'Copy post',
          hotkey: 'c',
          plain: true,
          onPress: async (press) => {
            const copied = await $.ui.copy({ text: toPlain(text), surface: press.surface })
            $.ui.toast(copied.isCopied ? 'Copied. Markdown symbols removed.' : 'Copy failed: ' + copied.reason)
          },
        }),
        Button({
          key: 'view',
          label: viewName === 'mobile' ? 'Desktop view' : 'Mobile view',
          hotkey: 'm',
          plain: true,
          onPress: async () => {
            viewName = viewName === 'mobile' ? 'desktop' : 'mobile'
            redraw()
            await $.store.set('view', viewName)
          },
        }),
        ...(f.isFolded ? [Button({
          key: 'more',
          label: isExpanded ? 'See less' : 'See more',
          hotkey: 'f',
          plain: true,
          onPress: () => {
            isExpanded = !isExpanded
            redraw()
          },
        })] : []),
      ],
    })

    // The post card: the Desktop app draws an SVG card, the terminal a framed box
    let card
    if (e.surface === 'desktop') {
      card = Svg({
        source: cardSvg({ name: profile.name, headline: profile.headline, text, view, isExpanded }),
        alt: 'LinkedIn post preview: ' + f.visible,
      })
    } else {
      const lines = (isExpanded ? f.allLines : f.visibleLines).map((l, i, all) => {
        const hasMore = !isExpanded && f.isFolded && i === all.length - 1
        const more = hasMore ? [Text({ key: 'more-' + i, dimColor: true, children: ['…see more'] })] : []
        const shown = hasMore ? lastLineWithMore(l.text, view.width) : l.text
        return Box({
          key: 'line-' + i,
          flexDirection: 'row',
          columnGap: 1,
          children: [Text({ key: 'text-' + i, wrap: 'truncate', children: [shown || ' '] }), ...more],
        })
      })
      card = Box({
        borderStyle: 'round',
        paddingX: 1,
        width: view.width + 4,
        flexDirection: 'column',
        children: [
          // Name, then headline under it, as the feed card shows them
          Box({
            flexDirection: 'row',
            columnGap: 1,
            children: [Text({ color: 'blue', children: ['●'] }), Text({ bold: true, wrap: 'truncate', children: [profile.name] })],
          }),
          Text({ dimColor: true, wrap: 'truncate', children: ['  ' + profile.headline] }),
          Text({ children: [' '] }),
          ...lines,
        ],
      })
    }

    const statLine = [
      `${fmt(s.chars)} / ${fmt(MAX_CHARS)} chars`,
      `${fmt(s.words)} words`,
      `${s.readMinutes} min read`,
      f.isFolded ? `fold ≈ ${f.cut} chars` : 'no fold',
    ].join(' · ')

    return Box({
      flexDirection: 'column',
      children: [
        Box({
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 3,
          children: [Text({ bold: true, children: [view.label + ' feed'] }), ...(drafts.length > 1 ? tabs : [])],
        }),
        Text({ children: [' '] }),
        card,
        Text(s.isOverLimit ? { color: 'red', children: [statLine] } : { dimColor: true, children: [statLine] }),
        ...found.map((c, i) =>
          c.level === 'warn'
            ? Text({ key: 'check-' + i, color: 'yellow', children: ['⚠ ' + c.text] })
            : Text({ key: 'check-' + i, dimColor: true, children: ['· ' + c.text] }),
        ),
        Text({ children: [' '] }),
        controls,
      ],
    })
  })
}
