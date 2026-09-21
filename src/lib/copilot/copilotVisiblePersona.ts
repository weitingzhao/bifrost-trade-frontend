import { AGENT_LABELS_EN } from '@/lib/copilot/agentPersonaCatalog'

/**
 * Visible persona chip. Stream has no preferred_agent, so this is a readout:
 * triage's active agent once someone has answered, otherwise this page's
 * default. Clicking it opens Personas; it does not change the stream.
 */
export function copilotPersonaForOrigin(pathname: string): string | null {
  if (pathname.startsWith('/portfolio')) return 'portfolio'
  if (pathname.startsWith('/research/loop')) return 'loop_curator'
  if (pathname.startsWith('/research/symbol') || pathname.startsWith('/research/analyze')) {
    return 'analyze'
  }
  return null
}

export type CopilotPersonaChipSource = 'triage' | 'answered' | 'default'

export function copilotPersonaChipSource(
  activeAgent: string | null | undefined,
  answered?: string | null,
): CopilotPersonaChipSource | null {
  if (activeAgent?.trim()) return 'triage'
  if (answered?.trim()) return 'answered'
  return 'default'
}

/**
 * Three readings, in order of what the chip can honestly claim.
 *
 * 1. the agent triage handed the live stream to;
 * 2. **who answered the thread you are reading** — an opened thread has no
 *    live agent, and until 2026-09-21 the header said nothing at all on one,
 *    while the Threads table's PERSONA column had known all along;
 * 3. this page's default, labelled as a default so it cannot be read as an
 *    answer.
 */
export function copilotVisiblePersona(
  activeAgent: string | null | undefined,
  pathname: string,
  answered?: string | null,
): string | null {
  const live = activeAgent?.trim()
  if (live) return live
  const spoke = answered?.trim()
  if (spoke) return spoke
  return copilotPersonaForOrigin(pathname)
}

export function copilotPersonaChipLabel(agentId: string): string {
  return AGENT_LABELS_EN[agentId] ?? agentId
}

/** Default is labelled as such so it cannot be read as who already answered. */
export function copilotPersonaChipText(
  agentId: string,
  source: CopilotPersonaChipSource,
): string {
  const label = copilotPersonaChipLabel(agentId)
  if (source === 'default') return `default · ${label}`
  return `as ${label}`
}
