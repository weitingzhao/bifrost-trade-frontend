/**
 * One hero reading (design §16.2, Rev .82): the card a page leads with — the
 * `data-sr-kpi="hero"` pattern from `@bifrost/ui/styles/patterns`, 30px mono
 * on the card material, its label 11/600 in the soft ink.
 *
 * `@bifrost/ui`'s `KpiCard` is the plain case; this one is for the heroes the
 * design fills with more than a number — the breach list under "Over the
 * line", the two ways out under "Binds next", a card that is itself a door.
 *
 * - `state` is the card's edge only, at 55% of the lamp (§16.2: a severity
 *   never fills). The reading keeps its own ink through `valueClassName`.
 * - `to` makes the whole card a link, the way the design's clickable heroes
 *   are (The Book's census, the Ledger's five readings).
 * - Sits in a `HeroRow`, which gives it its basis.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type HeroState = 'warn' | 'danger'

const EDGE: Record<HeroState, string> = {
  warn: 'color-mix(in srgb, var(--color-lamp-yellow) 55%, transparent)',
  danger: 'color-mix(in srgb, var(--color-lamp-red) 55%, transparent)',
}

export function HeroCard({
  label,
  value,
  valueClassName,
  aside,
  sub,
  state,
  title,
  to,
  ariaLabel,
  className,
  children,
}: {
  label: ReactNode
  value: ReactNode
  /** The reading's own ink (a P&L colour, amber) — never the state. */
  valueClassName?: string
  /** Beside the reading, on its baseline: a name, a tag, a short note. */
  aside?: ReactNode
  /** The line under the reading. */
  sub?: ReactNode
  state?: HeroState | null
  title?: string
  /** The card is a door to this route. */
  to?: string
  ariaLabel?: string
  className?: string
  /** Whatever the design puts under the reading (a list, the ways out). */
  children?: ReactNode
}) {
  const body = (
    <>
      <span data-sr-kpi-l="" className="text-[var(--sk-soft)]">
        {label}
      </span>
      {aside != null ? (
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span data-sr-kpi-v="" className={valueClassName}>
            {value}
          </span>
          {aside}
        </span>
      ) : (
        <span data-sr-kpi-v="" className={valueClassName}>
          {value}
        </span>
      )}
      {sub != null ? <span data-sr-kpi-s="">{sub}</span> : null}
      {children}
    </>
  )
  const style = state ? { borderColor: EDGE[state] } : undefined
  if (to != null) {
    return (
      <Link
        to={to}
        data-sr-kpi="hero"
        title={title}
        aria-label={ariaLabel}
        style={style}
        className={cn(
          'text-inherit no-underline transition-[background-color,translate] duration-150 hover:-translate-y-px hover:bg-[var(--card-fill-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          className,
        )}
      >
        {body}
      </Link>
    )
  }
  return (
    <section data-sr-kpi="hero" title={title} aria-label={ariaLabel} style={style} className={className}>
      {body}
    </section>
  )
}
