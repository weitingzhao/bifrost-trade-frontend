/**
 * The Copilot's three faces — Today · Threads · Personas (design Rev 2026-09-20.20).
 *
 * The prototype puts the tabs in the one header and switches the body:
 * Today is what is waiting and what ran, Threads is the conversations,
 * Personas is who answers. Two of the three are views of `/research/copilot`
 * and the third is its own route, which is why Personas is a link and the
 * other two are `?tab=` — the design's own `route` does the same
 * (`tab === 'personas' ? '/research/agent-personas' : '/research/copilot'`),
 * and §5a.5 then reads the h1 off whichever route you are standing on.
 *
 * The counts are read from the queries that already own them, so the tabs
 * cost no request the pages did not already make: pending drafts (the same
 * queue Waiting on you renders and the Decision Inbox counts), today's
 * sessions off the Copilot standing, and the persona list.
 */
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { PageHeadTab } from '@/components/layout'
import { useAgentPersonas } from '@/hooks/useAgentPersonas'
import { useCopilotStanding } from '@/hooks/useCopilotStanding'
import { usePendingDraftCount } from '@/hooks/useResearchDrafts'

export type CopilotTab = 'today' | 'threads' | 'personas'

/** `?tab=` on the desk, with today as the face you land on. */
export function useCopilotTab(): CopilotTab {
  const [params] = useSearchParams()
  return params.get('tab') === 'threads' ? 'threads' : 'today'
}

/**
 * The face's one-line hint. Rev .89 moved it off the strip — on Today it
 * folded the toolbar onto two lines and the provider chip sat on the panel
 * below — into the toolbar's `title`.
 */
export const COPILOT_TAB_HINT: Record<CopilotTab, string> = {
  today: 'one queue · the same items the Decision Inbox shows',
  threads: 'click a row to open it in the panel',
  personas: 'who answers is told by triage',
}

/**
 * The three faces as the page head's own tabs (§16.10 · Rev .89), for the
 * Desk and for Personas alike, so the strip does not move between them.
 */
export function useCopilotHeadTabs(active: CopilotTab): {
  tabs: PageHeadTab[]
  tab: CopilotTab
  onTab: (value: string) => void
} {
  const navigate = useNavigate()
  const waiting = usePendingDraftCount()
  const standing = useCopilotStanding()
  const personas = useAgentPersonas()
  const tabs: PageHeadTab[] = [
    {
      value: 'today',
      label: 'Today',
      title: 'What the Copilot or a scheduled agent asked for and has not been answered.',
      count: waiting.isLoading ? undefined : waiting.count,
      // Waiting is the one count that asks for something.
      countClassName: !waiting.isLoading && waiting.count > 0 ? 'text-warning' : undefined,
    },
    {
      value: 'threads',
      label: 'Threads',
      title: "Conversations that moved today — the table lists every thread, not only today's.",
      count: standing.data?.sessions.today ?? undefined,
    },
    {
      value: 'personas',
      label: 'Personas',
      title: 'Who answers when you press ⌘J — model, tools and limits per operator.',
      count: personas.data?.length ?? undefined,
    },
  ]
  const onTab = (value: string) => {
    if (value === 'personas') navigate('/research/agent-personas')
    else navigate(`/research/copilot?tab=${value}`)
  }
  return { tabs, tab: active, onTab }
}
