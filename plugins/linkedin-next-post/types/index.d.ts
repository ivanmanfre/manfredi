// linkedin-next-post: the next steps the band above the prompt offers.

// One next step: a short button label and the prompt it sends
export type NextStep = { id: string; label: string; prompt: string }

declare module 'claude-code' {
  interface PluginState {
    'linkedin-next-post': { steps: NextStep[] | null }
  }
}
