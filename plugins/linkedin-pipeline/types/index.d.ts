// linkedin-pipeline: the people read from your files, and what the pane shows.

// One lead: someone you have a conversation (or a CRM row) with
export type Person = {
  name: string
  url?: string
  company?: string
  firstAt: number
  repliedAt?: number
  bookedAt?: number
  lastAt: number
  lastLine: string
}

// The pane's numbers for one window of days
export type Pipeline = {
  days: number
  leads: number
  replies: number
  booked: number
  connections: number
  hasConnections: boolean
  recentReplies: Person[]
  recentBooked: Person[]
}

// What was read, and from which files
export type PipelineData = {
  people: Person[]
  connections: number[]
  files: string[]
  notes: string[]
  loadedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'linkedin-pipeline': { data: PipelineData | null; days: number }
  }
}
