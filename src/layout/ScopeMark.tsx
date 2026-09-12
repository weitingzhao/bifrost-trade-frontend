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
import { routeFor } from './routeRegistry'

const MARK = {
  underlying: { text: 'stk', className: 'text-entity-symbol', title: 'Underlying-level: one answer per symbol' },
  contract: { text: 'opt', className: 'text-entity-option', title: 'Contract-level: per strike x expiry' },
} as const

export function ScopeMark({ path }: { path: string }) {
  const scope = routeFor(path).scope
  if (!scope) return null
  const m = MARK[scope]
  return (
    <span
      title={m.title}
      className={cn('ml-auto font-mono text-dense-micro tracking-wide opacity-75', m.className)}
    >
      {m.text}
    </span>
  )
}
