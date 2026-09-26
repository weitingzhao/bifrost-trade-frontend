/**
 * A page's hero row (design §16.2 · §16.5, Rev .82): one line of the
 * readings the page leads with, 30px on the card material, at most four or
 * five. Built from `@bifrost/ui`'s `KpiCard variant="hero"`; this is only the
 * row they sit in.
 *
 * - Cards share the row's height and grow from a basis (`flex: 1 1 <basis>`),
 *   never an auto-fit grid, which strands an orphan (§16.5).
 * - Exactly four go 2 × 2 under 860px of row (`styles/patterns`), and under
 *   600px of page two to a line at 22px (the Phone grammar, index.css).
 * - The basis is a class, not an inline style, so both of those rules can
 *   still move it.
 * - A state (warn / danger) is the card's edge only — never its fill (§16.2).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const BASIS = {
  200: '[&>[data-sr-kpi=hero]]:flex-[1_1_200px]',
  340: '[&>[data-sr-kpi=hero]]:flex-[1_1_340px]',
} as const

export function HeroRow({
  children,
  basis = 200,
  label,
  className,
}: {
  children: ReactNode
  /** The width a card grows from: 200 for readings, 340 for panels promoted to heroes. */
  basis?: keyof typeof BASIS
  /** Names the row for assistive tech ("The book's health"). */
  label?: string
  className?: string
}) {
  return (
    <div
      role={label ? 'group' : undefined}
      aria-label={label}
      className={cn('flex flex-wrap items-stretch gap-2.5', BASIS[basis], className)}
    >
      {children}
    </div>
  )
}
