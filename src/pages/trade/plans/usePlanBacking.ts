/**
 * What the sheet's right-hand check reads besides the form itself: the
 * account's margin facts and shares, a spot for the typed symbol, the
 * trader's pressure ceiling, and the cash other intended plans already hold.
 *
 * Every source is one the app reads elsewhere — monitor `/status` (the same
 * facts Positions' Pressure gauge reads), the quote feed and the latest bar
 * (the Positions spot resolver's two market sources), and the plans list the
 * page already has cached.
 */
import { useMemo } from 'react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useLatestBars } from '@/hooks/useLatestBars'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { useQuotes } from '@/hooks/useQuotes'
import { useStrategyPlans } from '@/hooks/useStrategyPlans'
import { readMarginFacts, type MarginFacts } from '@/utils/marginPressure'
import { buildQuoteMap } from '@/utils/positions'
import { buildSpotResolver, type Spot } from '@/utils/spotPrice'
import { planCashSecured } from './planCardModel'

export interface PlanBacking {
  account: MarginFacts | null
  sharesHeld: number | null
  spot: Spot | null
  ceiling: number
  intendedCash: number
}

export function usePlanBacking({
  symbol,
  accountId,
  editingId,
}: {
  symbol: string
  accountId: string
  /** The plan being edited — its own cash is not "another" intended plan. */
  editingId: number | null
}): PlanBacking {
  const sym = symbol.trim().toUpperCase()
  const status = useMonitorStatus()
  const quotes = useQuotes(sym ? [sym] : [])
  const bars = useLatestBars(sym ? [sym] : [])
  const plans = useStrategyPlans()
  const { ceiling } = usePressureCeiling()

  const snapshot = useMemo(
    () => (status.data?.portfolio.accounts ?? []).find((a) => a.account_id === accountId),
    [status.data, accountId],
  )

  return useMemo(() => {
    const positions = snapshot?.positions ?? []
    const stocks = positions.filter((p) => (p.secType ?? '').toUpperCase() === 'STK')
    const sharesHeld = snapshot
      ? stocks
          .filter((p) => (p.symbol ?? '').toUpperCase() === sym)
          .reduce((n, p) => n + Math.max(0, Number(p.position) || 0), 0)
      : null
    const resolve = buildSpotResolver(
      buildQuoteMap(quotes.data),
      stocks.map((p) => ({ ...p, account_id: accountId })),
      bars,
    )
    const intendedCash = (plans.data?.items ?? [])
      .filter(
        (p) =>
          p.effective_status === 'intended' &&
          p.account_id === accountId &&
          p.strategy_plan_id !== editingId,
      )
      .reduce((n, p) => n + (planCashSecured(p) ?? 0), 0)
    return {
      account: snapshot ? readMarginFacts(snapshot) : null,
      sharesHeld,
      spot: sym ? resolve(sym) : null,
      ceiling,
      intendedCash,
    }
  }, [snapshot, sym, quotes.data, bars, plans.data, accountId, editingId, ceiling])
}
