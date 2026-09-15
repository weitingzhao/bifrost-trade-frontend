import { AGENT_LABELS_EN } from '@/lib/copilot/agentPersonaCatalog'

/**
 * Visible `as {persona}` chip. Stream has no preferred_agent override, so
 * this is a readout: triage's active agent if the thread has one, otherwise
 * the origin default. Clicking it opens Personas; it does not change the stream.
 */
export function copilotPersonaForOrigin(pathname: string): string | null {
  if (pathname.startsWith('/portfolio')) return 'portfolio'
  if (pathname.startsWith('/research/loop')) return 'loop_curator'
  if (pathname.startsWith('/research/symbol') || pathname.startsWith('/research/analyze')) {
    return 'analyze'
  }
  return null
}

export function copilotVisiblePersona(
  activeAgent: string | null | undefined,
  pathname: string,
): string | null {
  const live = activeAgent?.trim()
  if (live) return live
  return copilotPersonaForOrigin(pathname)
}

export function copilotPersonaChipLabel(agentId: string): string {
  return AGENT_LABELS_EN[agentId] ?? agentId
}
