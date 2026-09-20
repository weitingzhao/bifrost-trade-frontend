import type { ByDayRangeData } from '@/types/trading'

export interface ByDayRangeTotals {
  optRealized: number
  optUnrealized: number
  stocksNotional: number
  stocksRealized: number
  fiNotional: number
  fiRealized: number
  cashNotional: number
  cashRealized: number
}

const ZERO: ByDayRangeTotals = {
  optRealized: 0,
  optUnrealized: 0,
  stocksNotional: 0,
  stocksRealized: 0,
  fiNotional: 0,
  fiRealized: 0,
  cashNotional: 0,
  cashRealized: 0,
}

/** Sum all days in byDayRangeData — matches Legacy by-day-total-summary-inline. */
export function computeByDayRangeTotals(data: ByDayRangeData | null | undefined): ByDayRangeTotals | null {
  if (!data) return null

  const dateStrs = Object.keys(data.opt).sort()
  if (dateStrs.length === 0) return ZERO

  return dateStrs.reduce<ByDayRangeTotals>((acc, dateStr) => {
    const opt = data.opt[dateStr] ?? { realized: 0, unrealized: 0 }
    const s = data.stocks[dateStr] ?? { realized: 0, unrealized: 0 }
    const fi = data.fixed_income[dateStr] ?? { realized: 0, unrealized: 0 }
    const cash = data.cash_like[dateStr] ?? { realized: 0, unrealized: 0 }
    const nMap = data.stkBucketNotional
    return {
      optRealized: acc.optRealized + opt.realized,
      optUnrealized: acc.optUnrealized + opt.unrealized,
      stocksNotional: acc.stocksNotional + (nMap.stocks[dateStr] ?? 0),
      stocksRealized: acc.stocksRealized + s.realized,
      fiNotional: acc.fiNotional + (nMap.fixed_income[dateStr] ?? 0),
      fiRealized: acc.fiRealized + fi.realized,
      cashNotional: acc.cashNotional + (nMap.cash_like[dateStr] ?? 0),
      cashRealized: acc.cashRealized + cash.realized,
    }
  }, { ...ZERO })
}
