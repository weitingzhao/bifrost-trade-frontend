/**
 * A titled panel: a caption, what it says, and what it is reading over.
 *
 * The shape the layer pages settled on — `/risk`, `/portfolio`,
 * `/research/book` and `/review/objectives` each grew an identical local copy
 * within a day of each other, which is how a pattern announces itself. Four
 * copies of a header row is also four chances for them to drift apart, and
 * these four sit one click from each other.
 *
 * The three slots each carry a different kind of thing, and keeping them
 * apart is the whole point: the **cap** names the reading in the page's own
 * vocabulary ("Over the line", "Census"), the **title** says what it shows in
 * a reader's words, and the **note** is the scope or the count the numbers
 * are true within. A panel whose note is really a second title has lost that.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionPanel({
  cap,
  title,
  note,
  className,
  children,
}: {
  cap: string
  title: string
  note?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {cap}
        </span>
        <h2 className="text-dense-body font-semibold">{title}</h2>
        {note != null ? (
          <span className="ml-auto text-dense-meta text-muted-foreground">{note}</span>
        ) : null}
      </header>
      {children}
    </section>
  )
}
