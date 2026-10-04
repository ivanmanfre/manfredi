// linkedin-voice-guard: what the band above the prompt shows.

// One place a rule fires: the rule, the draft line (1-based) and where in it
export type Flag = {
  rule: string
  line: number
  lineText: string
  start: number
  end: number
}

export type DraftReport = { draft: number; flags: Flag[] }

declare module 'claude-code' {
  interface PluginState {
    'linkedin-voice-guard': { reports: DraftReport[] | null; isOpen: boolean }
  }
}
