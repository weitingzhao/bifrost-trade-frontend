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

export type CopilotPersonaChipSource = 'triage' | 'default'

export function copilotPersonaChipSource(
  activeAgent: string | null | undefined,
): CopilotPersonaChipSource | null {
  return activeAgent?.trim() ? 'triage' : 'default'
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

/** Default is labelled as such so it cannot be read as who already answered. */
export function copilotPersonaChipText(
  agentId: string,
  source: CopilotPersonaChipSource,
): string {
  const label = copilotPersonaChipLabel(agentId)
  return source === 'triage' ? `as ${label}` : `default · ${label}`
}
