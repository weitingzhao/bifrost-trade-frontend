import { StocksTab } from './StocksTab'
import type { LivePositionRow } from '@/types/positions'

interface Props {
  positions: LivePositionRow[]
  filterSymbol?: string
  onInspect?: (symbol: string, accountId: string, pos: LivePositionRow) => void
}

export function CashLikeTab({ positions, filterSymbol, onInspect }: Props) {
  return (
    <StocksTab
      positions={positions}
      title="Cash-like positions"
      emptyHint="No open cash-like positions under the current filters."
      filterSymbol={filterSymbol}
      rowKeyPrefix="cash"
      onInspect={onInspect}
    />
  )
}
