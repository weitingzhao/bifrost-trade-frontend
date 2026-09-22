/**
 * The book as one exposure — computed once, read by every page that cites it.
 *
 * Portfolio Exposure owns this reading and draws it in full; Limits & Breaches
 * holds three of its numbers against a line. Two pages deriving β-weighted Δ$
 * from the same sources would eventually disagree about the book, so the
 * derivation lives here and both pages read the same object (§14.2).
 *
 * Sources, none of them re-derived: Δ$ and spot are the model service's, β and
 * the correlation matrix are Research's (RS2, computed on read), and Γ / Θ /
 * vega are the vendor legs the Positions page already prices.
 */
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchModelAnalysis } from '@/api/portfolio'
import { fetchRiskBeta, fetchRiskCorrelation } from '@/api/research/riskStats'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { backingPoolUsage, deriveBackingJudgment } from '@/utils/backingJudgment'
import { buildOptionTicker, extractUnderlyingRootSymbol, positionGreek } from '@/utils/optionTicker'
import {
  buildRiskExposureRows,
  correlationClusters,
  effectiveIndependentPositions,
  greeksByUnderlying,
  riskByExpiry,
  type LegGreeks,
  type UnderlyingModelRow,
} from '@/utils/riskExposure'

/** The window the tables show: the book's β now. The longer one is context. */
export const BETA_WINDOWS = [60, 252] as const
export const CORR_WINDOW = 60

/**
 * @param accountFilter `'all'`, or the account id the reader narrowed to.
 */
export function useRiskExposure(accountFilter: string) {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()

  const accountIds = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [status],
  )
  const scoped = useMemo(
    () => (accountFilter === 'all' ? accountIds : accountIds.filter((a) => a === accountFilter)),
    [accountIds, accountFilter],
  )

  const modelQueries = useQueries({
    queries: scoped.map((id) => ({
      queryKey: [...QUERY_KEYS.portfolio.modelAnalysis, id],
      queryFn: () => fetchModelAnalysis(id),
      enabled: Boolean(id),
    })),
  })
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')
  const scopeKey = scoped.join(',')

  const model = useMemo<UnderlyingModelRow[]>(() => {
    const by = new Map<string, UnderlyingModelRow>()
    for (const q of modelQueries) {
      for (const u of q.data?.per_underlying ?? []) {
        const symbol = (u.symbol ?? '').trim().toUpperCase()
        if (!symbol) continue
        const g = u.greeks ?? {}
        const prev = by.get(symbol)
        const dd = g.delta_dollars ?? null
        const ds = g.delta ?? null
        by.set(symbol, {
          symbol,
          spot: u.spot ?? prev?.spot ?? null,
          deltaShares: ds == null && prev?.deltaShares == null ? null : (prev?.deltaShares ?? 0) + (ds ?? 0),
          deltaDollars: dd == null && prev?.deltaDollars == null ? null : (prev?.deltaDollars ?? 0) + (dd ?? 0),
          degraded: Boolean(g.degraded) || Boolean(prev?.degraded),
          reason: g.reason ?? prev?.reason ?? null,
        })
      }
    }
    return [...by.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp, scopeKey])

  const symbols = useMemo(() => model.map((m) => m.symbol).sort(), [model])

  const [betaQuery, corrQuery] = useQueries({
    queries: [
      {
        queryKey: ['research', 'risk', 'beta', symbols.join(','), BETA_WINDOWS.join(',')],
        queryFn: () => fetchRiskBeta(symbols, 'SPY', [...BETA_WINDOWS]),
        enabled: symbols.length > 0,
        staleTime: 60 * 60_000,
      },
      {
        queryKey: ['research', 'risk', 'correlation', symbols.join(','), CORR_WINDOW],
        queryFn: () => fetchRiskCorrelation(symbols, CORR_WINDOW),
        enabled: symbols.length > 1,
        staleTime: 60 * 60_000,
      },
    ],
  })

  const book = usePositionsBook(
    {
      accountFilter:
        accountFilter === 'all'
          ? { host: true, secondary: true }
          : { host: accountFilter === accountIds[0], secondary: accountFilter !== accountIds[0] },
      filterSymbol: '',
      filterExpiry: '',
    },
    0,
  )

  /**
   * The vendor legs, as the Positions page priced them — one rollup, cited twice.
   *
   * One entry per *holding*, each scaled by its own signed quantity, because
   * `greeksByUnderlying` and `riskByExpiry` both sum what is in here and the
   * book flattens a leg per account × strategy instance. Read from the
   * rollup's `byTicker` this loop pushed one holding's scaled numbers once per
   * holding: on DEV 2026-09-22 that made RKLB's Γ/Θ/vega the -10 leg's three
   * times over (a -30 book against a -26 position) and HIMS's the +5 leg's
   * twice (a +10 book against a -4 position — the wrong sign for a row that is
   * net short). `perShareByTicker` is the vendor's own row, a property of the
   * contract, so scaling it here makes the sums equal the rollup's totals,
   * which is what §14.2 means by one book read one way.
   */
  const legs = useMemo<LegGreeks[]>(() => {
    const out: LegGreeks[] = []
    for (const g of book.scopedInstanceGroups ?? []) {
      for (const p of g.options ?? []) {
        const underlying = extractUnderlyingRootSymbol(p.symbol)
        const ticker = buildOptionTicker({
          underlying,
          expiry: p.expiry,
          strike: p.strike,
          right: p.right,
        })
        const perShare = ticker ? book.greeks.perShareByTicker.get(ticker) : undefined
        if (!perShare) continue
        out.push({
          underlying,
          expiry: p.expiry,
          gamma: positionGreek(perShare.gamma, p.qty),
          theta: positionGreek(perShare.theta, p.qty),
          vega: positionGreek(perShare.vega, p.qty),
        })
      }
    }
    return out
  }, [book.scopedInstanceGroups, book.greeks.perShareByTicker])

  const betaBySymbol = useMemo(() => {
    const by = new Map<string, { beta: number | null; n: number }>()
    for (const it of betaQuery.data?.items ?? []) {
      if (it.window !== BETA_WINDOWS[0]) continue
      by.set(it.symbol.trim().toUpperCase(), { beta: it.beta, n: it.n })
    }
    return by
  }, [betaQuery.data?.items])

  const betaLong = useMemo(() => {
    const by = new Map<string, number | null>()
    for (const it of betaQuery.data?.items ?? []) {
      if (it.window !== BETA_WINDOWS[1]) continue
      by.set(it.symbol.trim().toUpperCase(), it.beta)
    }
    return by
  }, [betaQuery.data?.items])

  const { rows, totals } = useMemo(
    () => buildRiskExposureRows({ model, betaBySymbol, greeks: greeksByUnderlying(legs) }),
    [model, betaBySymbol, legs],
  )
  const expiries = useMemo(() => riskByExpiry(legs), [legs])
  const matrix = corrQuery.data?.matrix ?? null
  const enp = useMemo(() => effectiveIndependentPositions(rows, matrix), [rows, matrix])
  const clusters = useMemo(() => correlationClusters(rows, matrix), [rows, matrix])
  const corrSymbols = useMemo(
    () => (corrQuery.data?.symbols ?? []).filter((s) => rows.some((r) => r.symbol === s)),
    [corrQuery.data?.symbols, rows],
  )

  const judgment = useMemo(
    () => (book.alarm ? deriveBackingJudgment(backingPoolUsage(book.alarm.book)) : null),
    [book.alarm],
  )

  return {
    status,
    statusLoading,
    accountIds,
    modelQueries,
    modelStamp,
    scopeKey,
    model,
    symbols,
    betaQuery,
    corrQuery,
    betaBySymbol,
    betaLong,
    matrix,
    corrSymbols,
    book,
    legs,
    rows,
    totals,
    expiries,
    enp,
    clusters,
    judgment,
    error: modelQueries.find((q) => q.error)?.error ?? null,
  }
}
