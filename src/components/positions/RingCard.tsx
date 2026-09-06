/**
 * The chrome around one ring: a title, the same border and surface as the
 * cockpit and the margin strip, no height games — a card is as tall as its
 * ring and legend, so two cards on one grid row start their rings on one line.
 */
import type { ReactNode } from 'react'

export function RingCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-secondary/40 px-3 py-1.5" aria-label={title}>
      <span className="mb-1 block text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {children}
    </section>
  )
}
