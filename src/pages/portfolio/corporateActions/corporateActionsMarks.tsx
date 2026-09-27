/**
 * The two marks Corporate Actions draws on every panel: the event's type and
 * the bare ticker.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import type { BookEvent } from './corporateActionsModel'

/**
 * The event's type as a tag (Rev .91 #3): a dividend is the state blue, not
 * the contract sky; a split keeps the prototype's violet, in the series
 * pastel rather than an entity's identity ink.
 */
export function KindTag({ e, text }: { e: BookEvent; text?: string }) {
  const label = text ?? (e.kind === 'split' ? 'SPLIT' : e.kind === 'dividend' ? 'DIV' : 'OTHER')
  return (
    <DenseTag
      variant={e.kind === 'dividend' ? 'state-blue' : 'neutral'}
      size="cell"
      className={cn('font-mono', e.kind === 'split' && 'text-[var(--sk-series-violet)]')}
    >
      {label}
    </DenseTag>
  )
}

/** A bare ticker (§14.4): mono 700 in the ticker ink, a door to its Symbol page. */
export function Ticker({ symbol, className }: { symbol: string; className?: string }) {
  return (
    <Link
      to={withSymbolParam(SYMBOL_PATH, symbol)}
      className={cn('font-mono font-bold text-entity-symbol hover:underline', className)}
    >
      {symbol}
    </Link>
  )
}
