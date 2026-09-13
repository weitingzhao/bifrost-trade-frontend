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

  return (
    <p
      className={cn(
        'mt-1.5 border-t border-border/40 pt-1 font-mono text-dense-micro uppercase tracking-[0.08em] text-muted-foreground/70',
        className,
      )}
    >
      copilot draft
      <span aria-hidden> · </span>
      {parts.provider}
      <span aria-hidden> · </span>
      <span className="normal-case tracking-normal">{parts.grounding}</span>
    </p>
  )
}
