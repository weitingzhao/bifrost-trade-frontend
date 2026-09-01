import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AgentChip } from '@/components/cockpit/AgentChip'
import { CopilotComposer } from '@/components/cockpit/CopilotComposer'
import { CopilotMessageList } from '@/components/cockpit/CopilotMessageList'
import { CopilotTracePanel } from '@/components/cockpit/CopilotTracePanel'
import { InboxBanner } from '@/components/cockpit/InboxBanner'
import { LoopBanner } from '@/components/cockpit/LoopBanner'
import { PersonaMiniCard } from '@/components/cockpit/PersonaMiniCard'
import { QuickPromptChips } from '@/components/cockpit/QuickPromptChips'
import { fetchCopilotUsage } from '@/api/aiCopilot'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/**
 * Copilot chat body — messages, composer, trace.
 * Session history is hosted in the parent panel's left rail (RS-UX3),
 * so this component no longer renders its own inline session list.
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

      {/* Pending agent drafts (RS-UX6) — expands in place so the chat stays
          visible while approving; renders nothing when the queue is empty. */}
      <InboxBanner />

      <LoopBanner />

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
        onModelChange={setModel}
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
  // Best-effort read of Copilot prompt language (shared with QuickPromptChips / Discuss prefill).
  const [lang] = useCopilotPromptLang()
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-1 py-4">
      <div className="text-center">
        <h3 className="text-dense-body font-semibold text-foreground">
          {lang === 'zh' ? 'Research Copilot 今天能为你做什么？' : 'How can Research Copilot help today?'}
        </h3>
        <p className="mt-1 text-dense-caption text-muted-foreground">
          {lang === 'zh'
            ? '可以问假设、组合风险、波动率或 SEPA 候选，选一个快捷提示或直接输入你的问题。'
            : 'Ask about hypotheses, portfolio risk, volatility, or SEPA candidates. Pick a shortcut or type your own question.'}
        </p>
      </div>
      <PersonaMiniCard />
      <QuickPromptChips onPick={onPickPrompt} disabled={disabled} />
      <p className="text-center text-dense-micro text-muted-foreground/70">
        {lang === 'zh'
          ? 'Research engines — 仅供观察 (D10)，非投资建议。'
          : 'Research engines — observe only (D10). Not investment advice.'}
      </p>
    </div>
  )
}
