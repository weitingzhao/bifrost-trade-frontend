import { Loader2, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCopilotSessions } from '@/hooks/useCopilotSessions'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'
import { archiveCopilotSession, fetchCopilotSession } from '@/api/researchCopilotSessions'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'

/**
 * Session history rail (Wave RS-UX3 → RS-UX4).
 *
 * Lives in the left column of `CopilotFloatingBubble` when the user has the
 * rail visible (persisted via `useCopilotBubble.sessionsOpen`). Includes:
 *   - full-width "New chat" primary button
 *   - highlighted current session row
 *   - archive-on-hover
 *   - empty state
 */
export function SessionListSidebar({
  onLoaded,
  className,
}: {
  onLoaded?: (sessionId: string) => void
  className?: string
}) {
  const { data, isLoading, refetch } = useCopilotSessions(20)
  const { sessionId: currentSessionId } = useCopilotSession()

  async function loadSession(id: string) {
    if (id === currentSessionId) return
    try {
      const detail = await fetchCopilotSession(id)
      const msgs: CopilotUiMessage[] = (detail.messages ?? []).map((m, i) => ({
        id: `hist-${id}-${i}`,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      copilotSessionStore.setState({
        messages: msgs,
        sessionId: id,
        streaming: false,
        lastError: null,
      })
      onLoaded?.(id)
    } catch {
      // ignore — session list is best-effort
    }
  }

  const rows = data ?? []

  return (
    <div className={cn('flex h-full flex-col gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start gap-1.5 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
        onClick={() => copilotSessionStore.clearSession()}
      >
        <Plus className="size-3.5" />
        <span className="text-dense-label font-medium">New chat</span>
      </Button>

      {isLoading ? (
        <div className="flex items-center gap-1 text-dense-caption text-muted-foreground py-1">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </div>
      ) : null}

      {!isLoading && rows.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded border border-dashed border-border/50 px-2 py-3 text-center">
          <MessageSquare className="size-4 text-muted-foreground/60" />
          <span className="text-dense-caption text-muted-foreground">No sessions yet</span>
          <span className="text-dense-caption text-muted-foreground/70">Start chatting to save.</span>
        </div>
      ) : null}

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
        {rows.map((row) => {
          const active = row.id === currentSessionId
          return (
            <li key={row.id} className="group flex items-center gap-0.5">
              <button
                type="button"
                className={cn(
                  'min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-dense-meta',
                  active
                    ? 'bg-primary/15 text-foreground font-medium ring-1 ring-primary/30'
                    : 'text-foreground/85 hover:bg-secondary/80',
                )}
                onClick={() => loadSession(row.id)}
                aria-current={active ? 'true' : undefined}
              >
                {row.title || 'Untitled'}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                aria-label="Archive session"
                onClick={async (e) => {
                  e.stopPropagation()
                  await archiveCopilotSession(row.id).catch(() => undefined)
                  refetch()
                }}
              >
                <Trash2 className="size-3" />
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
