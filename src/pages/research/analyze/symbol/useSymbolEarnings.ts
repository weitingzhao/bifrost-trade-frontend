/**
 * A Symbol face's earnings inputs: the results filings, Research's estimate
 * of the next print, and the move the ATM term prices for it — the queries
 * the page's faces already hold (`useSymbolFaces`), so a face asking again
 * reads the cache. Read by the Dealer and Scenario faces.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { useEarningsDates } from '@/hooks/useNarrative'
import { useAtmIvTerm } from '@/hooks/useVolSurfaceData'
import { todayIso } from '@/lib/researchFreshness'
import { eventMove, type EventMove } from '@/utils/earningsEstimate'
import { daysTo } from '@/utils/optionTicker'

export function useSymbolEarnings(symbol: string): {
  filings: string[]
  next: ExpectedEarnings | null
  gap: EventMove | null
} {
  const earnQ = useEarningsDates(symbol)
  const termQ = useAtmIvTerm(symbol)
  const next = earnQ.data?.expected_next ?? null
  const today = todayIso()
  const gap =
    next && next.days_away >= 0
      ? eventMove(
          (termQ.data?.term ?? []).map((p) => ({ expiry: p.expiry, dte: daysTo(p.expiry, today) ?? 0, iv: p.atm_iv })),
          next.days_away
        )
      : null
  return { filings: earnQ.data?.dates ?? [], next, gap }
}
