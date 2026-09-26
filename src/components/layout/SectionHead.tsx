/**
 * A section heading on a page (design §16.4, Rev .82): a sentence-case h2 at
 * 15/600, a quiet rule after it, and an optional count or scope at the end.
 *
 * It replaced the tracked-caps tier labels ("HEADROOM", "READING") page by
 * page through Rev .82–.92. The section's explanation goes in `note`, which
 * is the h2's `title` — kept, not deleted (§16.3); a sentence the reader
 * would misread the numbers without stays on screen, as the page's own text.
 *
 * Positions set the grammar first (Rev .21); its tier headings read the same
 * classes (sectionHeadClasses.ts).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SECTION_HEAD_CLASSES } from './sectionHeadClasses'

export function SectionHead({
  children,
  note,
  meta,
  id,
  className,
}: {
  children: ReactNode
  /** The section's explanation, on hover. */
  note?: string
  /** A count or scope at the rule's end (11px, muted). */
  meta?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <div className={cn(SECTION_HEAD_CLASSES.row, className)}>
      <h2 id={id} title={note} className={SECTION_HEAD_CLASSES.heading}>
        {children}
      </h2>
      <span aria-hidden className={SECTION_HEAD_CLASSES.rule} />
      {meta != null ? <span className="shrink-0 text-dense-meta text-muted-foreground">{meta}</span> : null}
    </div>
  )
}
