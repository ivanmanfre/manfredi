// linkedin-hook-score: the values the band reads, and the shape of what the mod saves.

// One of your posts with its text (from Shares.csv, a CSV or top-posts.md)
export type Post = {
  hook: string
  text: string
  url?: string
  id?: string
  date?: string
  impressions?: number
  engagements?: number
}

// One row of the creator analytics TOP POSTS sheet: numbers with no text
export type Metric = {
  url: string
  id?: string
  date?: string
  impressions?: number
  engagements?: number
}

// One drafted hook and its score
export type HookRow = {
  draft: number
  hook: string
  score?: number
  reason?: string
}

// What the band above the prompt shows
export type HookBand = {
  status: 'scoring' | 'done' | 'no-data' | 'failed'
  learned: number
  rows: HookRow[]
  note?: string
}

declare module 'claude-code' {
  interface PluginState {
    'linkedin-hook-score': { band: HookBand | null }
  }
}
