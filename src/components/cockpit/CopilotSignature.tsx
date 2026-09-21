import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'
import { signatureParts } from '@/components/cockpit/signatureRule'
import { cn } from '@/lib/utils'

/** Renders the §2.2 line. The rule it follows lives in `copilotSignature.ts`. */
export function CopilotSignature({ message, className }: {
  message: CopilotUiMessage
  className?: string
}) {
  const { data, isPending, isError } = useSignalHealthSummary()
  const parts = signatureParts(message, { asOf: data?.as_of, isPending, isError })
  if (!parts) return null

  // The design puts what the turn took and cost at the right end of this same
  // line. Both are only known while a turn streams, so a hydrated message
  // prints nothing there rather than a borrowed figure.
  const meter = [
    message.elapsedMs == null ? null : `${(message.elapsedMs / 1000).toFixed(1)}s`,
    message.costUsd == null ? null : `$${message.costUsd.toFixed(2)}`,
  ].filter(Boolean)

  return (
    <p
      className={cn(
        'mt-1.5 flex flex-wrap items-baseline gap-x-1.5 border-t border-border/40 pt-1 font-mono text-dense-micro uppercase tracking-[0.08em] text-muted-foreground/70',
        className,
      )}
    >
      <span>
        copilot draft
        <span aria-hidden> · </span>
        {parts.provider}
        <span aria-hidden> · </span>
        <span className="normal-case tracking-normal">{parts.grounding}</span>
      </span>
      {meter.length > 0 ? (
        <span
          className="ml-auto whitespace-nowrap normal-case tracking-normal tabular-nums"
          title="How long this turn took, and what it cost — measured on the turn itself."
        >
          {meter.join(' · ')}
        </span>
      ) : null}
    </p>
  )
}
