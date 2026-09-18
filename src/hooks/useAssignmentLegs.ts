/**
 * The short legs, priced for assignment — computed once, read by both pages.
 *
 * Assignment owns this reading and draws it in full. Corporate Actions cites
 * one column of it: the time value a holder gives up by exercising early, which
 * is the number a dividend is held against. The design says so in as many
 * words — "this panel reads it; it does not recompute it — if the two ever
 * disagree, this page is wrong first" — and the only way to keep that promise
 * is for both pages to read the same object (§14.2).
 *
 * Sources, none re-derived: the attribution rows are the broker's, spot is the
 * model service's, and close and delta are the vendor legs the Positions page
 * already prices.
 */
import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchModelAnalysis } from '@/api/portfolio'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { useOptionGreeks, type GreekLeg } from '@/hooks/useOptionGreeks'
import { buildOptionTicker, daysTo, extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { assignmentTotals, buildAssignmentLegs, thinExtrinsic } from '@/utils/assignmentRisk'

export function useAssignmentLegs() {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const attrQuery = usePositionAttribution()
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  const attributions = useMemo(() => attrQuery.data?.items ?? [], [attrQuery.data?.items])
  const accountIds = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [status],
  )
  const modelQueries = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['portfolio', 'model-analysis', id],
      queryFn: () => fetchModelAnalysis(id),
      enabled: Boolean(id),
    })),
  })
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')

  const spotBySymbol = useMemo(() => {
    const by = new Map<string, number | null>()
    for (const q of modelQueries) {
      for (const u of q.data?.per_underlying ?? []) {
        const symbol = (u.symbol ?? '').trim().toUpperCase()
        if (symbol && u.spot != null) by.set(symbol, u.spot)
      }
    }
    return by
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp])

  const greekLegs = useMemo<GreekLeg[]>(
    () =>
      attributions
        .filter((a) => (a.sec_type ?? '').toUpperCase() === 'OPT')
        .map((a) => ({
          underlying: extractUnderlyingRootSymbol(a.symbol),
          expiry: a.expiry ?? '',
          strike: Number(a.strike ?? 0),
          right: a.option_right ?? '',
          qty: Number(a.position_qty ?? 0),
        })),
    [attributions],
  )
  const greeks = useOptionGreeks(greekLegs)

  /** The vendor's close and delta, keyed the way the attribution rows are. */
  const { markByKey, deltaByKey } = useMemo(() => {
    const marks = new Map<string, { close: number | null; asOf: string | null }>()
    const deltas = new Map<string, number | null>()
    for (const a of attributions) {
      if ((a.sec_type ?? '').toUpperCase() !== 'OPT') continue
      const ticker = buildOptionTicker({
        underlying: extractUnderlyingRootSymbol(a.symbol),
        expiry: a.expiry ?? '',
        strike: Number(a.strike ?? 0),
        right: a.option_right ?? '',
      })
      const key = a.contract_key ?? ''
      const close = ticker ? greeks.closeByTicker.get(ticker) : undefined
      if (close) marks.set(key, close)
      const g = ticker ? greeks.byTicker.get(ticker) : undefined
      // The rollup scales delta by the position; per contract is what reads as odds.
      const contracts = Math.abs(Number(a.position_qty ?? 0)) || 0
      if (g?.delta != null && contracts > 0) deltas.set(key, g.delta / (contracts * 100))
    }
    return { markByKey: marks, deltaByKey: deltas }
  }, [attributions, greeks.closeByTicker, greeks.byTicker])

  const legs = useMemo(
    () =>
      buildAssignmentLegs({
        attributions,
        markByKey,
        deltaByKey,
        spotBySymbol,
        dteByExpiry: (expiry) => daysTo(expiry, today),
      }),
    [attributions, markByKey, deltaByKey, spotBySymbol, today],
  )

  return {
    today,
    attrQuery,
    legs,
    totals: assignmentTotals(legs),
    thin: thinExtrinsic(legs),
    loading: statusLoading || attrQuery.isLoading,
    error: attrQuery.error ?? null,
  }
}
