import { Button } from '@/components/ui/button'
import { useCopilotSessions } from '@/hooks/useCopilotSessions'
import { copilotSessionStore } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { archiveCopilotSession, fetchCopilotSession } from '@/api/researchCopilotSessions'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'

export function SessionListSidebar({
  onLoaded,
  className,
}: {
  onLoaded?: (sessionId: string) => void
  className?: string
}) {
  const { data, isLoading, refetch } = useCopilotSessions(10)

  async function loadSession(id: string) {
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

  return (
    <div className={cn('space-y-1 border-b border-border/40 pb-2', className)}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-dense-caption font-medium text-muted-foreground uppercase tracking-wide">
          Sessions
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6"
          aria-label="New session"
          onClick={() => copilotSessionStore.clearSession()}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-1 text-dense-caption text-muted-foreground py-1">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </div>
      ) : null}
      <ul className="space-y-0.5">
        {(data ?? []).map((row) => (
          <li key={row.id} className="group flex items-center gap-0.5">
            <button
              type="button"
              className="min-w-0 flex-1 truncate rounded px-1.5 py-1 text-left text-dense-meta hover:bg-secondary/80"
              onClick={() => loadSession(row.id)}
            >
              {row.title || 'Untitled'}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              aria-label="Archive session"
              onClick={async () => {
                await archiveCopilotSession(row.id).catch(() => undefined)
                refetch()
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
