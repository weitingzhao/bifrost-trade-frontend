/**
 * "You are looking through one machine" — the shell's objective scope, said
 * on the page it is filtering.
 *
 * The scope lives in the shell and is set in the Lens. Every page the design
 * lists in `DESIGN_OBJ_WIRED` has to do one of two things with it: apply it,
 * or say why it cannot. What none of them may do is the third thing, which is
 * what three of the four were doing — show every row while the Lens tells the
 * reader a filter is on.
 *
 * So the banner is the page's answer, and it always carries three parts: the
 * scope's name, **what the page did about it**, and the way out. The middle
 * part is the one that matters and it is never boilerplate — on the Candidate
 * Pool it is a count of what was hidden and why, and on the Hypothesis Board
 * it is the reason the filter is off entirely.
 *
 * The violet is the Lens's own objective ink, so the control that sets the
 * scope and the banner that reports it cannot disagree about what violet
 * means.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SECTION_CAP_CLASS } from './SectionPanel'

export function ObjectiveScopeBanner({
  name,
  children,
  onClear,
  clearLabel = 'Clear',
}: {
  /** The objective's title, or its id when nothing has a title for it. */
  name: string
  /** What this page did about the scope. Required, because that is the point. */
  children: ReactNode
  onClear: () => void
  clearLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-[var(--color-entity-strategy)]/40 bg-[var(--color-entity-strategy)]/[0.07] px-3 py-1.5">
      <span className={cn(SECTION_CAP_CLASS, 'text-[var(--color-entity-strategy)]')}>
        Objective scope
      </span>
      <span className="text-dense-label">{name}</span>
      <span className="min-w-0 flex-1 text-dense-meta text-muted-foreground">{children}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto cursor-pointer whitespace-nowrap text-dense-meta text-[var(--color-entity-strategy)] hover:underline"
      >
        {clearLabel}
      </button>
    </div>
  )
}
