import { CopilotComposer } from '@/components/cockpit/CopilotComposer'
import { CopilotMessageList } from '@/components/cockpit/CopilotMessageList'
import { CopilotTracePanel } from '@/components/cockpit/CopilotTracePanel'
import { SessionListSidebar } from '@/components/cockpit/SessionListSidebar'
import { AgentChip } from '@/components/cockpit/AgentChip'
import { useCopilotSession } from '@/hooks/useCopilotSession'
import { useQuery } from '@tanstack/react-query'
import { fetchCopilotUsage } from '@/api/aiCopilot'
import { useEffect } from 'react'
import { copilotSessionStore } from '@/hooks/useCopilotSession'
import { Button } from '@/components/ui/button'

export function CopilotTab() {
  const {
    messages,
    model,
    streaming,
    lastError,
    capBreached,
    activeAgent,
    traceEvents,
    traceCollapsed,
    send,
    setModel,
    approveWrite,
    rejectWrite,
    setTraceCollapsed,
  } = useCopilotSession()

  const usageQ = useQuery({
    queryKey: ['research', 'copilot', 'usage'],
    queryFn: ({ signal }) => fetchCopilotUsage(signal),
    refetchInterval: 30_000,
    retry: 1,
  })

  useEffect(() => {
    const rem = usageQ.data?.remaining_usd
    if (typeof rem === 'number' && rem <= 0) {
      copilotSessionStore.setCapBreached(true)
    } else if (typeof rem === 'number' && rem > 0) {
      copilotSessionStore.setCapBreached(false)
    }
  }, [usageQ.data?.remaining_usd])

  const blocked = capBreached || streaming

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {capBreached ? (
        <div
          role="alert"
          className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-dense-meta text-destructive"
        >
          Daily AI cap reached — resets at 00:00 UTC
        </div>
      ) : null}
      {lastError && !capBreached ? (
        <p className="text-dense-meta text-destructive leading-snug">{lastError}</p>
      ) : null}
      {activeAgent ? (
        <div className="flex items-center gap-1 text-dense-caption text-muted-foreground">
          Active agent: <AgentChip agent={activeAgent} />
        </div>
      ) : null}
      <SessionListSidebar />
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <CopilotMessageList
          messages={messages}
          onApproveWrite={approveWrite}
          onRejectWrite={rejectWrite}
        />
      </div>
      <div className="flex items-center justify-end gap-1">
        <CopilotTracePanel
          events={traceEvents}
          collapsed={traceCollapsed}
          onCollapsedChange={setTraceCollapsed}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-dense-caption shrink-0"
          onClick={() => setTraceCollapsed(!traceCollapsed)}
        >
          {traceCollapsed ? 'Show trace' : 'Hide trace'}
        </Button>
      </div>
      <CopilotComposer
        model={model}
        onModelChange={setModel}
        onSend={send}
        disabled={blocked}
      />
    </div>
  )
}
