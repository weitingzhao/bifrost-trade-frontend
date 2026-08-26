import { useEffect, useRef } from 'react'
import { CopilotToolCallCard } from '@/components/cockpit/CopilotToolCallCard'
import { AgentHandoffChip } from '@/components/cockpit/AgentChip'
import { DiffApprovalCard } from '@/components/cockpit/DiffApprovalCard'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { MessageActions } from '@/components/cockpit/MessageActions'
import { EmptyState } from '@/components/data-display'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'
import { extractDiffPreview } from '@/lib/cockpit/extractDiffPreview'
import { cn } from '@/lib/utils'
import { Bot, MessageSquare } from 'lucide-react'

export function CopilotMessageList({
  messages,
  sessionId,
  onApproveWrite,
  onRejectWrite,
  className,
}: {
  messages: CopilotUiMessage[]
  sessionId?: string
  onApproveWrite?: (toolCallId: string) => Promise<void> | void
  onRejectWrite?: (toolCallId: string) => Promise<void> | void
  className?: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare />}
        title="Ask Research Copilot"
        description="Try: What are my active hypotheses about NVDA?"
        className="py-6"
      />
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            'group/message rounded px-2 py-1.5 text-dense-body leading-snug',
            m.role === 'user' && 'bg-secondary ml-4',
            m.role === 'assistant' && 'bg-background/60 border border-border/40 mr-2',
            m.error && 'border-destructive/50',
          )}
        >
          <div className="mb-0.5 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 text-dense-caption text-muted-foreground uppercase tracking-wide">
              {m.role === 'assistant' ? <Bot className="size-3" /> : null}
              {m.role}
              {m.streaming ? <span className="text-warning normal-case">streaming…</span> : null}
            </div>
            {sessionId && m.role === 'assistant' ? (
              <MessageActions message={m} sessionId={sessionId} />
            ) : null}
          </div>
          {m.handoff ? (
            <AgentHandoffChip from={m.handoff.from} to={m.handoff.to} className="mb-1" />
          ) : null}
          {m.toolCalls && m.toolCalls.length > 0 && (
            <div className="mb-1.5 flex flex-col gap-1">
              {m.toolCalls.map((tc) => {
                const resolved =
                  tc.writeDecision === 'rejected' || tc.writeDecision === 'executed'
                const diff = resolved ? null : extractDiffPreview(tc.result)
                if (diff && onApproveWrite && onRejectWrite) {
                  return (
                    <DiffApprovalCard
                      key={tc.id}
                      toolName={tc.name}
                      arguments={tc.arguments}
                      diff={diff}
                      onApprove={() => onApproveWrite(tc.id)}
                      onReject={() => onRejectWrite(tc.id)}
                    />
                  )
                }
                return <CopilotToolCallCard key={tc.id} call={tc} />
              })}
            </div>
          )}
          {m.content ? (
            m.role === 'assistant' ? (
              <MarkdownContent>{m.content}</MarkdownContent>
            ) : (
              <p className="whitespace-pre-wrap text-dense-label">{m.content}</p>
            )
          ) : null}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
