import { StocksTab } from './StocksTab'
import type { LivePositionRow } from '@/types/positions'
import type { QuoteItem, DailyBenchmark } from '@/types/market'

interface Props {
  positions: LivePositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  filterSymbol?: string
}

export function CashLikeTab({ positions, quotesBySymbol, benchBySymbol, filterSymbol }: Props) {
  return (
    <StocksTab
      positions={positions}
      quotesBySymbol={quotesBySymbol}
      benchBySymbol={benchBySymbol}
      title="Cash-like Positions"
      filterSymbol={filterSymbol}
    />
  )
}
