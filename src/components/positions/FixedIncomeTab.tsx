import { StocksTab } from './StocksTab'
import type { LivePositionRow } from '@/types/positions'

interface Props {
  positions: LivePositionRow[]
  emptyHint?: string
  filterSymbol?: string
  onInspect?: (symbol: string, accountId: string, pos: LivePositionRow) => void
}

export function FixedIncomeTab({
  positions,
  emptyHint = 'No open fixed income positions under the current filters.',
  filterSymbol,
  onInspect,
}: Props) {
  return (
    <StocksTab
      positions={positions}
      title="Fixed income positions"
      emptyHint={emptyHint}
      filterSymbol={filterSymbol}
      rowKeyPrefix="fi"
      onInspect={onInspect}
    />
  )
}
