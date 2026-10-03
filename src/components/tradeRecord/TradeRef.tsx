/**
 * An instance number as a token (design Rev .101, .103): `#159` anywhere on a
 * page opens the Instance surface — the 440 panel, or wherever the last one
 * was put; ⇧ beside it, ⌘ / Ctrl as the page — carrying the rows it sits in
 * so ‹ › and [ ] can step them. A number the book does not hold stays plain text
 * and says so — a token that opens nothing is a dead end wearing a link.
 */
import type { MouseEvent } from 'react'
import { useTradeIndex } from '@/hooks/useTradeIndex'
import { tradeHowFrom, useOpenTrade } from '@/layout/tradeGo'
import { useSurfaces } from '@/layout/equipSurface'
import { cn } from '@/lib/utils'

export function TradeRef({
  id,
  list,
  from,
  className,
  children,
}: {
  id: number
  /** The rows this token sits among, in page order — what ‹ › and [ ] step. */
  list?: readonly number[]
  /** Where the sheet says it was opened from. */
  from?: string
  className?: string
  /** Defaults to `#id`. */
  children?: React.ReactNode
}) {
  const known = useTradeIndex()
  const open = useOpenTrade()
  const surfaces = useSurfaces()
  const text = children ?? `#${id}`
  const base = cn('font-mono font-bold text-[var(--color-trade-multi)]', className)
  if (known && !known.has(id)) {
    return (
      <span className={cn(base, 'opacity-70')} title={`#${id} is not in the trade book — nothing to open`}>
        {text}
      </span>
    )
  }
  const shown = [surfaces.float, surfaces.panel?.tabs.find((t) => t.key === surfaces.panel?.active)]
  const on = shown.some((sf) => sf?.trade === id)
  return (
    <button
      type="button"
      className={cn(base, 'cursor-pointer border-0 bg-transparent p-0 hover:underline', on && 'underline')}
      aria-pressed={on}
      title={on ? `#${id} is showing` : `Open #${id} beside this page · ⇧ in a tab of its own · ⌘ as a page`}
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
        // Only the rows the book holds are worth stepping onto.
        const steps = (list ?? [id]).filter((x) => x === id || known == null || known.has(x))
        open(id, { list: steps, from, ...tradeHowFrom(e) })
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {text}
    </button>
  )
}
