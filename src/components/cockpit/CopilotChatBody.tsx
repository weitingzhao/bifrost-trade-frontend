import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { AgentChip } from '@/components/cockpit/AgentChip'
import { CopilotComposer } from '@/components/cockpit/CopilotComposer'
import { CopilotMessageList } from '@/components/cockpit/CopilotMessageList'
import { CopilotTracePanel } from '@/components/cockpit/CopilotTracePanel'
import { PersonaMiniCard } from '@/components/cockpit/PersonaMiniCard'
import { QuickPromptChips } from '@/components/cockpit/QuickPromptChips'
import { fetchCopilotUsage } from '@/api/aiCopilot'
import { copilotSessionStore, useCopilotSession } from '@/hooks/useCopilotSession'
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

      <div className="flex items-center justify-end gap-1">
        <CopilotTracePanel
          events={traceEvents}
          collapsed={traceCollapsed}
          onCollapsedChange={setTraceCollapsed}
        />
        {traceEvents.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-dense-caption shrink-0"
            onClick={() => setTraceCollapsed(!traceCollapsed)}
          >
            {traceCollapsed ? 'Show trace' : 'Hide trace'}
          </Button>
        ) : null}
      </div>
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
  // Best-effort read of the same preference used inside QuickPromptChips.
  const lang =
    typeof window !== 'undefined' && window.localStorage.getItem('bifrost.copilot.prompt_lang') === 'en'
      ? 'en'
      : 'zh'
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
