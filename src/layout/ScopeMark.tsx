/**
 * `stk` or `opt` at the end of a sidebar row: the unit of analysis the page
 * answers in.
 *
 * Not where the data comes from — what one row of the answer *is*. Vol Regime
 * reads option prices and still answers once per symbol (`stk`); Option
 * Discovery answers per strike x expiry (`opt`). Knowing which before you click
 * is the difference between "what is NVDA's regime" and "which NVDA contract".
 *
 * Colours are the existing entity pair, the same lime and sky that mark a
 * symbol and a contract everywhere else in the app.
 */
import { cn } from '@/lib/utils'
import { DESIGN_SCOPE } from '@/lib/design/designRoutes.generated'
import { hasMethodFace } from '@/lib/design/faces'
import { routeFor } from './routeRegistry'

const MARK = {
  underlying: { text: 'stk', className: 'text-entity-symbol', title: 'Underlying-level: one answer per symbol' },
  contract: { text: 'opt', className: 'text-entity-option', title: 'Contract-level: per strike x expiry' },
} as const

/**
 * The design's map first, this side's own field only where the design has no
 * row for the page.
 *
 * It used to read only the route table, where the field is typed by hand —
 * and by 2026-09-23 that copy held four of the design's nineteen, so Stock
 * screen and Option screen sat unmarked beside two rows that were not. A
 * hand-kept copy of someone else's table is the thing that drifts; the copy
 * is now the fallback, not the source.
 */
function scopeOf(path: string): 'underlying' | 'contract' | null {
  return DESIGN_SCOPE[path] ?? routeFor(path).scope ?? null
}

export function ScopeMark({ path }: { path: string }) {
  const scope = scopeOf(path)
  // `⧉` says this page has a method face and the switch is on the page — the
  // design's reason for not giving the method a row of its own.
  const face = hasMethodFace(path)
  if (!scope && !face) return null
  const m = scope ? MARK[scope] : null
  return (
    <span className="ml-auto inline-flex items-baseline gap-1">
      {face ? (
        <span
          title="This page has a method face — the switch is on the page, not in the menu"
          className="font-mono text-dense-micro text-muted-foreground opacity-75"
        >
          ⧉
        </span>
      ) : null}
      {m ? (
        <span
          title={m.title}
          className={cn('font-mono text-dense-micro tracking-wide opacity-75', m.className)}
        >
          {m.text}
        </span>
      ) : null}
    </span>
  )
}
