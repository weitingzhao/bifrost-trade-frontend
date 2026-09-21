/**
 * The personas, for whoever needs to know who answers.
 *
 * The Personas page owned this query inline until the Copilot tab strip
 * needed the same list for its count (design Rev 2026-09-20.20). One key, so
 * the tab and the page can never disagree about how many operators there are.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchAgentPersonas } from '@/api/agentPersona'

export const AGENT_PERSONAS_KEY = ['agent-personas'] as const

export function useAgentPersonas() {
  return useQuery({
    queryKey: AGENT_PERSONAS_KEY,
    queryFn: fetchAgentPersonas,
    staleTime: 60_000,
  })
}
