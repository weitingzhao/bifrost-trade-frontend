/**
 * The held book, live — what the status bar's book segment and its drawer
 * read (design `_Shell StatusBar.dc.html`).
 *
 * The design says the drawer's data *is* Market Live's on-demand STK/OPT, so
 * this reads the same sources rather than a new one — but it cannot share
 * Live's stream: `useQuoteStream` trims the shared quote cache to its own
 * symbol list, and a second stream holding only the book would trim away the
 * names the market strip and Live asked for. So on `/market/live` it reads
 * Live's cache, and elsewhere it keeps its own snapshot: every 30s while the
 * drawer is shut (the segment only needs the day total), every 3s while it is
 * open.
 *
 * The bar's Δ is the model service's — the number Risk › Portfolio and
 * Backing & Model hold (§14.2) — not a sum of the drawer's per-leg rows, which
 * are the Positions page's vendor legs. Where the model marks an underlying
 * degraded, the Δ says so.
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchQuotes } from '@/api/market'
import { fetchModelAnalysis } from '@/api/portfolio'
import { fetchShortLegs } from '@/api/shortLegs'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useCushionThreshold } from '@/hooks/useCushionThreshold'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useOptionGreeks, type GreekLeg } from '@/hooks/useOptionGreeks'
import { useOptionLiveBasis } from '@/hooks/useOptionLiveBasis'
import { useQuotesMap } from '@/hooks/useQuoteStream'
import { accountTag } from '@/utils/accountTag'
import { bookLiveTotals, buildBookLiveRows, etDate, type BookLiveRow, type BookLiveTotals } from '@/utils/bookLive'
import {
  extractOptPositionRows,
  mergeQuotesIntoSymbolMap,
  quotesByContractKeyFromMap,
} from '@/utils/marketStreamsRows'
import { buildSpotResolver, type LatestBar } from '@/utils/spotPrice'
import type { QuoteItem } from '@/types/market'
import type { LivePositionRow } from '@/types/positions'

const LIVE_PATH = '/market/live'

export interface BookLive {
  rows: BookLiveRow[]
  totals: BookLiveTotals
  /** Model service, summed over accounts; null until one answers. */
  modelDelta: number | null
  /** Underlyings the model could not fully price — its Δ is short of them. */
  modelDegraded: number
  /** Newest quote in the book, seconds ago. */
  quoteAgeSec: number | null
  tagOf: (accountId: string) => string
  isLoading: boolean
}

function quoteEpochSec(q: QuoteItem): number | null {
  const t = q.ts ?? q.updated_ts ?? q.timestamp ?? null
  if (t == null || !Number.isFinite(t)) return null
  return t > 1e12 ? t / 1000 : t
}

export function useBookLive(open: boolean): BookLive {
  const { pathname } = useLocation()
  const onLive = pathname === LIVE_PATH
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const accounts = useMemo(() => status?.portfolio?.accounts ?? [], [status?.portfolio?.accounts])
  const hostId = status?.config?.ib_client?.account?.event_host ?? ''
  const secondaryId = status?.config?.ib_client?.account?.event_secondary ?? ''

  const { stkSymbols, contractKeys, legs, accountIds } = useMemo(() => {
    const stk = new Set<string>()
    const cks = new Set<string>()
    const greekLegs: GreekLeg[] = []
    const ids: string[] = []
    for (const a of accounts) {
      const id = (a.account_id ?? '').trim()
      if (id) ids.push(id)
      for (const p of a.positions ?? []) {
        if (!p.position) continue
        const sec = (p.secType ?? '').toUpperCase()
        const sym = (p.symbol ?? '').trim().toUpperCase()
        if (sec === 'STK' && sym) stk.add(sym)
        if (sec === 'OPT' && p.contract_key) {
          cks.add(p.contract_key)
          const seg = p.contract_key.split('|')
          greekLegs.push({
            underlying: sym,
            expiry: String(p.expiry ?? seg[2] ?? ''),
            strike: Number(p.strike ?? seg[3]),
            right: String(p.right ?? seg[4] ?? ''),
            qty: Number(p.position),
          })
        }
      }
    }
    return { stkSymbols: [...stk].sort(), contractKeys: [...cks].sort(), legs: greekLegs, accountIds: ids }
  }, [accounts])

  const cached = useQuotesMap()
  const snapshot = useQuery({
    queryKey: ['shell', 'book-live', 'quotes', stkSymbols.join(','), contractKeys.join(',')],
    queryFn: () => fetchQuotes(stkSymbols, contractKeys),
    enabled: !onLive && stkSymbols.length + contractKeys.length > 0,
    refetchInterval: open ? 3_000 : 30_000,
    staleTime: open ? 2_000 : 20_000,
    refetchOnWindowFocus: false,
  })
  const quotesMap = useMemo(
    () => (onLive ? cached : mergeQuotesIntoSymbolMap({}, snapshot.data?.quotes ?? [])),
    [onLive, cached, snapshot.data],
  )
  const optQuotes = useMemo(() => quotesByContractKeyFromMap(quotesMap), [quotesMap])

  const { data: bench } = useBenchmarks(stkSymbols)
  const greeks = useOptionGreeks(legs)
  const { pct: tightPct } = useCushionThreshold()
  // Same key and cadence as useBookCushion, which the bar already mounts.
  const shortLegs = useQuery({
    queryKey: ['portfolio', 'short-legs'],
    queryFn: ({ signal }) => fetchShortLegs(signal),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    retry: 1,
  })

  // The ledger basis costs one executions read per account; the P&L column is
  // the only reader, so it waits for the drawer.
  const optRows = useMemo(() => (open ? extractOptPositionRows(accounts) : []), [open, accounts])
  const { optionLiveBasisByRow } = useOptionLiveBasis(optRows)

  const models = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: [...QUERY_KEYS.portfolio.modelAnalysis, id],
      queryFn: () => fetchModelAnalysis(id),
      staleTime: 60_000,
      enabled: Boolean(id),
    })),
  })
  const modelStamp = models.map((m) => m.dataUpdatedAt).join(',')
  const { modelDelta, modelDegraded } = useMemo(() => {
    let sum: number | null = null
    let degraded = 0
    for (const m of models) {
      for (const u of m.data?.per_underlying ?? []) {
        if (u.greeks?.degraded) degraded += 1
        const d = u.greeks?.delta
        if (d != null && Number.isFinite(d)) sum = (sum ?? 0) + d
      }
    }
    return { modelDelta: sum, modelDegraded: degraded }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp])

  // The Positions page's price rule, over this snapshot and the daily bars the
  // day change already reads — so a stock never prices off a stale broker mark.
  const spotOf = useMemo(() => {
    const stocks: LivePositionRow[] = []
    for (const a of accounts)
      for (const pos of a.positions ?? [])
        if ((pos.secType ?? '').toUpperCase() === 'STK') stocks.push({ ...pos, account_id: a.account_id ?? '' })
    const bars: Record<string, LatestBar> = {}
    for (const [sym, b] of Object.entries(bench?.benchmarks ?? {})) {
      if (b.close != null && b.bar_time != null) bars[sym.toUpperCase()] = { close: b.close, prevClose: b.prev_close, date: b.bar_time }
    }
    return buildSpotResolver(quotesMap, stocks, bars)
  }, [accounts, bench, quotesMap])

  const tagOf = useMemo(
    () => (id: string) => accountTag(id, hostId, secondaryId),
    [hostId, secondaryId],
  )
  // A clock in state, not read during render: every second while the strip is
  // open (the quote age), every minute while it is shut (the session day).
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000)
  useEffect(() => {
    const id = window.setInterval(() => setNowSec(Date.now() / 1000), open ? 1_000 : 60_000)
    return () => window.clearInterval(id)
  }, [open])
  const todayEt = etDate(new Date(nowSec * 1000).toISOString()) ?? ''

  const rows = useMemo(
    () =>
      buildBookLiveRows({
        accounts,
        spotOf,
        optQuotes,
        benchmarks: bench?.benchmarks ?? {},
        vendorByTicker: greeks.perShareByTicker,
        shortLegs: shortLegs.data?.legs ?? [],
        tightPct,
        basisByKey: optionLiveBasisByRow,
        todayEt,
        tagOf,
      }),
    [accounts, spotOf, optQuotes, bench, greeks.perShareByTicker, shortLegs.data, tightPct, optionLiveBasisByRow, todayEt, tagOf],
  )
  const totals = useMemo(() => bookLiveTotals(rows), [rows])

  const quoteAgeSec = useMemo(() => {
    let newest: number | null = null
    for (const q of Object.values(quotesMap)) {
      const t = quoteEpochSec(q)
      if (t != null && (newest == null || t > newest)) newest = t
    }
    return newest == null ? null : Math.max(0, Math.round(nowSec - newest))
  }, [quotesMap, nowSec])

  return {
    rows,
    totals,
    modelDelta,
    modelDegraded,
    quoteAgeSec,
    tagOf,
    isLoading: statusLoading || (!onLive && snapshot.isLoading),
  }
}
