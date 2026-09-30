/**
 * A section heading on a page (design §16.4, Rev .82): a sentence-case h2 at
 * 15/600, a quiet rule after it, and an optional count or scope at the end.
 *
 * It replaced the tracked-caps tier labels ("HEADROOM", "READING") page by
 * page through Rev .82–.92. The section's explanation goes in `note`, which
 * is the h2's `title` — kept, not deleted (§16.3); a sentence the reader
 * would misread the numbers without stays on screen, as the page's own text.
 *
 * Positions set the grammar first (Rev .21). Since Rev .117 it is the DS
 * `SectionBand`, as Positions' tiers are: the whole row folds its section.
 */
import { Children, type ReactNode } from 'react'
import { SectionBand } from '@bifrost/ui'

/** A band's key from its own words, when the caller names none: stable across renders and data. */
function slugOf(node: ReactNode): string {
  const text = Children.toArray(node)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
    .join(' ')
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section'
}

export function SectionHead({
  children,
  note,
  meta,
  id,
  band,
  summary,
  defaultOpen,
  className,
}: {
  children: ReactNode
  /** The section's explanation, on hover. */
  note?: string
  /** A count or scope at the rule's end (11px, muted). */
  meta?: ReactNode
  /** An anchor id on the heading. */
  id?: string
  /** The band's key on this page (Rev .117); the heading's words by default. */
  band?: string
  /** What the section holds, shown only while it is folded. */
  summary?: ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  // Rev .117 (§17.8): every page section is a band — it folds, open by default,
  // remembered per page. The body is what follows it up to the next band.
  return (
    <SectionBand
      id={band ?? id ?? slugOf(children)}
      headingId={id}
      title={children}
      note={note}
      meta={meta}
      summary={summary}
      summaryWhenFolded
      defaultOpen={defaultOpen}
      className={className}
    />
  )
}
