import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgentChip } from '@/components/cockpit/AgentChip'
import { CopilotComposer } from '@/components/cockpit/CopilotComposer'
import { CopilotMessageList } from '@/components/cockpit/CopilotMessageList'
import { CopilotTracePanel } from '@/components/cockpit/CopilotTracePanel'
import { PersonaMiniCard } from '@/components/cockpit/PersonaMiniCard'
import { QuickPromptChips } from '@/components/cockpit/QuickPromptChips'
import { CopilotAlreadyKnows } from '@/components/copilot/CopilotAlreadyKnows'
import { CopilotWaitingQueue } from '@/components/copilot/CopilotWaitingQueue'
import { fetchCopilotUsage } from '@/api/aiCopilot'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/**
 * Copilot chat body — messages, composer, trace.
 * Thread switching is the dock title (`CopilotThreadSwitcher`).
 */
export function CopilotChatBody({ className }: Props) {
  const {
    messages,
    model,
    streaming,
    lastError,
    capBreached,
    activeAgent,
    traceEvents,
    traceCollapsed,
    sessionId,
    send,
    stop,
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
  const isEmpty = messages.length === 0

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-2', className)}>
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

      <div className="min-w-0 flex items-center gap-1 text-dense-caption text-muted-foreground">
        {activeAgent ? (
          <>
            Active agent: <AgentChip agent={activeAgent} />
          </>
        ) : (
          <span>Research Copilot</span>
        )}
      </div>

      <CopilotWaitingQueue />

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isEmpty ? (
          <CopilotEmptyIntro onPickPrompt={send} disabled={blocked} />
        ) : (
          <CopilotMessageList
            messages={messages}
            sessionId={sessionId}
            onApproveWrite={approveWrite}
            onRejectWrite={rejectWrite}
          />
        )}
      </div>

      {/* The trace header is itself the toggle (RS-UX6 / research-copilot-reach P3),
          so the separate Show/Hide button that used to sit beside it is gone. */}
      <CopilotTracePanel
        events={traceEvents}
        collapsed={traceCollapsed}
        onCollapsedChange={setTraceCollapsed}
      />
      <CopilotComposer
        model={model}
        onSend={send}
        onStop={stop}
        streaming={streaming}
        disabled={blocked}
      />
    </div>
  )
}

function CopilotEmptyIntro({
  onPickPrompt,
  disabled,
}: {
  onPickPrompt: (prompt: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex h-full flex-col justify-start gap-3 px-1 py-3">
      <CopilotAlreadyKnows />
      <QuickPromptChips onPick={onPickPrompt} disabled={disabled} />
      <PersonaMiniCard className="text-left" />
      <p className="text-dense-micro text-muted-foreground/70">
        Research engines — observe only (D10). Not investment advice.
      </p>
    </div>
  )
}
