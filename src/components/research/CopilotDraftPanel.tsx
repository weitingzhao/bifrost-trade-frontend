/**
 * The design's COPILOT DRAFT panel — a violet-edged seat for a grounded
 * draft. No per-candidate/per-run draft store exists yet, so every current
 * reader fills the seat with the reason rather than borrowing a hypothesis
 * review; when the store lands, the copy swaps for the draft and the frame
 * stays. Shared once lab/symbol became the second reader (§14.2).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function CopilotDraftPanel({
  title = 'COPILOT DRAFT',
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-l-[3px] border-[var(--sk-line0)] border-l-primary bg-background px-3 py-2',
        className
      )}
    >
      <div className="font-mono text-dense-micro tracking-[0.1em] text-primary">{title}</div>
      <p className="m-0 mt-1 max-w-[72ch] text-dense-label leading-relaxed text-muted-foreground text-pretty">
        {children}
      </p>
    </div>
  )
}
