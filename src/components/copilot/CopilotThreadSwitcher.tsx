import { Link } from 'react-router-dom'
import { List, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCopilotSessions } from '@/hooks/useCopilotSessions'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { openCopilotSession } from '@/lib/copilot/openCopilotSession'
import {
  threadSwitcherGroups,
  threadSwitcherTitle,
  threadSwitcherWhen,
} from '@/lib/copilot/threadSwitcher'
import type { CopilotSessionSummary } from '@/api/researchCopilotSessions'
import { cn } from '@/lib/utils'

/**
 * Title-bar thread switcher (§11.2.5). Lives in the dock header at both 440
 * and 760 — the sessions rail only fits at the wide tier, so switching must
 * not wait on that rail.
 */
export function CopilotThreadSwitcher() {
  const { data } = useCopilotSessions(50)
  const { sessionId, messages } = useCopilotSession()
  const rows = data ?? []
  const { pinned, recent } = threadSwitcherGroups(rows)
  const title = threadSwitcherTitle(sessionId, messages.length, rows)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Switch thread"
          aria-label="Switch thread"
          className={cn(
            'inline-flex min-w-0 max-w-[14rem] items-center gap-1 rounded-sm px-1.5 py-0.5',
            'text-left text-dense-body font-semibold text-foreground',
            'hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          )}
        >
          <span className="truncate">{title}</span>
          <span className="shrink-0 text-dense-caption font-normal text-muted-foreground">▾</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[18.75rem] z-[220]">
        {pinned.length > 0 ? (
          <>
            <DropdownMenuLabel className="text-dense-caption font-normal text-muted-foreground">
              Pinned
            </DropdownMenuLabel>
            {pinned.map((row) => (
              <ThreadSwitcherRow key={row.id} row={row} pinned />
            ))}
          </>
        ) : null}
        {recent.length > 0 ? (
          <>
            <DropdownMenuLabel className="text-dense-caption font-normal text-muted-foreground">
              Recent
            </DropdownMenuLabel>
            {recent.map((row) => (
              <ThreadSwitcherRow key={row.id} row={row} />
            ))}
          </>
        ) : null}
        {pinned.length === 0 && recent.length === 0 ? (
          <p className="px-2 py-1.5 text-dense-meta text-muted-foreground">No saved threads yet</p>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => copilotSessionStore.clearSession()}>
          <Plus className="mr-2 h-3.5 w-3.5 text-primary" />
          New thread
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/research/copilot">
            <List className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            All threads →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ThreadSwitcherRow({
  row,
  pinned = false,
}: {
  row: CopilotSessionSummary
  pinned?: boolean
}) {
  const when = threadSwitcherWhen(row.updated_at)
  const label = row.title?.trim() || 'Untitled thread'
  return (
    <DropdownMenuItem
      className="gap-2"
      onSelect={() => {
        void openCopilotSession(row.id).catch(() => {
          /* list is best-effort; rail loadSession swallows the same way */
        })
      }}
    >
      {pinned ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {row.origin_symbol ? (
        <span className="shrink-0 font-mono text-dense-meta text-muted-foreground">
          {row.origin_symbol}
        </span>
      ) : null}
      {when ? (
        <span className="shrink-0 font-mono text-dense-caption text-muted-foreground">{when}</span>
      ) : null}
    </DropdownMenuItem>
  )
}
