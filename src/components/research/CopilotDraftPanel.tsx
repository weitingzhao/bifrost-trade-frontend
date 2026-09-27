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
    // A grouped card (mat-card) with the Copilot's own violet as its left
    // edge — an inset shadow, because mat-card clears border colours. The
    // title is a mono label in the same hue (Rev .89: what the Copilot wrote
    // wears the Copilot module colour, not the accent).
    <div
      className={cn('px-3 py-2 mat-card shadow-[inset_3px_0_0_var(--sk-copilot-ink)]', className)}
    >
      <div className="font-mono text-dense-micro font-semibold text-[var(--sk-copilot-ink)]">{title}</div>
      <p className="m-0 mt-1 max-w-[72ch] text-dense-label leading-relaxed text-muted-foreground text-pretty">
        {children}
      </p>
    </div>
  )
}
