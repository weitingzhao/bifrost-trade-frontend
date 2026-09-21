/**
 * The Copilot's three faces — Today · Threads · Personas (design Rev 2026-09-20.20).
 *
 * The prototype puts a sticky tab strip under one header and switches the
 * body: Today is what is waiting and what ran, Threads is the conversations,
 * Personas is who answers. Two of the three are views of `/research/copilot`
 * and the third is its own route, which is why Personas is a link and the
 * other two are `?tab=` — the design's own `route` does the same
 * (`tab === 'personas' ? '/research/agent-personas' : '/research/copilot'`),
 * and §5a.5 then reads the h1 off whichever route you are standing on.
 *
 * The counts are read from the queries that already own them, so the strip
 * costs no request the pages did not already make: pending drafts (the same
 * queue Waiting on you renders and the Decision Inbox counts), today's
 * sessions off the Copilot standing, and the persona list.
 */
import { Link, useSearchParams } from 'react-router-dom'
import { useAgentPersonas } from '@/hooks/useAgentPersonas'
import { useCopilotStanding } from '@/hooks/useCopilotStanding'
import { usePendingDraftCount } from '@/hooks/useResearchDrafts'
import { cn } from '@/lib/utils'

export type CopilotTab = 'today' | 'threads' | 'personas'

/** `?tab=` on the desk, with today as the face you land on. */
export function useCopilotTab(): CopilotTab {
  const [params] = useSearchParams()
  return params.get('tab') === 'threads' ? 'threads' : 'today'
}

const HINT: Record<CopilotTab, string> = {
  today: 'one queue · the same items the Decision Inbox shows',
  threads: 'click a row to open it in the panel',
  personas: 'who answers is told by triage',
}

function Tab({
  to,
  label,
  n,
  warn,
  active,
  title,
}: {
  to: string
  label: string
  n: number | null
  warn?: boolean
  active: boolean
  title: string
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      title={title}
      className={cn(
        'inline-flex items-baseline gap-1.5 border-b-2 px-3 py-2 text-dense-label no-underline',
        active
          ? 'border-primary font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {n == null ? null : (
        <span
          className={cn(
            'font-mono text-dense-micro tabular-nums',
            warn && n > 0 ? 'text-warning' : 'text-muted-foreground/70',
          )}
        >
          {n}
        </span>
      )}
    </Link>
  )
}

export function CopilotTabs({ active }: { active: CopilotTab }) {
  const waiting = usePendingDraftCount()
  const standing = useCopilotStanding()
  const personas = useAgentPersonas()
  return (
    <div className="sticky top-0 z-5 -mx-4 flex items-end border-b border-border bg-card px-4">
      <Tab
        to="/research/copilot?tab=today"
        label="Today"
        n={waiting.isLoading ? null : waiting.count}
        warn
        active={active === 'today'}
        title="What the Copilot or a scheduled agent asked for and has not been answered."
      />
      <Tab
        to="/research/copilot?tab=threads"
        label="Threads"
        n={standing.data?.sessions.today ?? null}
        active={active === 'threads'}
        title="Conversations that moved today — the table lists every thread, not only today's."
      />
      <Tab
        to="/research/agent-personas"
        label="Personas"
        n={personas.data?.length ?? null}
        active={active === 'personas'}
        title="Who answers when you press ⌘J — model, tools and limits per operator."
      />
      <span className="ml-auto pb-2 text-dense-meta text-muted-foreground">{HINT[active]}</span>
    </div>
  )
}
