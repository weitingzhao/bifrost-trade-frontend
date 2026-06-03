import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'
import { rightLabel } from '@/utils/positions'

export interface OptionPositionRowMetrics {
  qty: number
  avgCost: number | null
  currPrice: number | null
  premium: number | null
  side: string
  intrinsic: number | null
  dailyPct: number | null
  dailyUsd: number | null
  changePct: number | null
  changeUsd: number | null
  updTs: number | null
  lastDelta: number | null
}

export function optionIntrinsic(
  right: string | undefined,
  strike: number | undefined,
  spot: number | null,
): number | null {
  if (!right || strike == null || spot == null) return null
  if (right === 'C') return Math.max(0, spot - strike)
  if (right === 'P') return Math.max(0, strike - spot)
  return null
}

export function computeOptionPositionRowMetrics(
  pos: IbPositionRow,
  quote: QuoteItem | undefined,
): OptionPositionRowMetrics {
  const qty = pos.position ?? 0
  const avgCost = pos.avgCost ?? null
  const currPrice = quote?.last ?? pos.price ?? null
  const premium = avgCost != null ? -(qty * avgCost) : null
  const side = qty > 0 ? 'Long' : qty < 0 ? 'Short' : '—'
  const intrinsic = optionIntrinsic(pos.right, pos.strike, currPrice)

  const basePrice = pos.price ?? null
  const dailyPct =
    currPrice != null && basePrice != null && basePrice !== 0
      ? ((currPrice - basePrice) / basePrice) * 100
      : null
  const dailyUsd =
    currPrice != null && basePrice != null ? (currPrice - basePrice) * qty : null
  const changePct =
    currPrice != null && avgCost != null && avgCost !== 0
      ? ((currPrice - avgCost) / avgCost) * 100
      : null
  const changeUsd =
    pos.unrealized_pnl ??
    (currPrice != null && avgCost != null ? (currPrice - avgCost) * qty : null)
  const updTs = quote?.timestamp ?? pos.price_updated_at ?? null
  const lastDelta =
    currPrice != null && avgCost != null ? currPrice - avgCost : null

  return {
    qty,
    avgCost,
    currPrice,
    premium,
    side,
    intrinsic,
    dailyPct,
    dailyUsd,
    changePct,
    changeUsd,
    updTs,
    lastDelta,
  }
}

export function calcOptionPremiumTotal(positions: IbPositionRow[]): number {
  return positions.reduce((sum, pos) => {
    const qty = pos.position ?? 0
    const avgCost = pos.avgCost ?? null
    const premium = avgCost != null ? -(qty * avgCost) : null
    return sum + (premium ?? 0)
  }, 0)
}

/** Option contract label for entity column (matches Positions OptionsTab). */
export function accountOptionContractLabel(pos: IbPositionRow): string {
  const sym = (pos.symbol ?? '').trim().toUpperCase()
  const strikeStr =
    pos.strike != null && Number.isFinite(Number(pos.strike)) ? ` ${pos.strike}` : ''
  return `${sym} ${rightLabel(pos.right)}${strikeStr}`.trim()
}

export function collectUnderlyingSpots(
  positions: IbPositionRow[],
  quotesBySymbol: Record<string, QuoteItem> | undefined,
): Record<string, number> {
  const underlyingSymbols = [
    ...new Set(positions.map((p) => p.symbol?.toUpperCase()).filter(Boolean) as string[]),
  ]
  const spotBySymbol: Record<string, number> = {}
  for (const sym of underlyingSymbols) {
    const spot = quotesBySymbol?.[sym]?.last
    if (spot != null) spotBySymbol[sym] = spot
  }
  return spotBySymbol
}
