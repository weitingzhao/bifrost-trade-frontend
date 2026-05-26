import { useMemo, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'

import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useBenchmarks } from '@/hooks/useBenchmarks'
import { useOpenOrders } from '@/hooks/useOpenOrders'
import { useQuoteStream } from '@/hooks/useQuoteStream'

import type { QuoteItem, WatchlistItem, DailyBenchmark } from '@/types/market'
import type { IbPositionRow } from '@/types/monitor'
import {
  computeMarketStreamsLamp,
  computeOpenOrdersLamp,
} from '@/utils/livePageLamps'
import {
  resolveDailyBasePrice,
  computeDailyChange,
  computeSinceChange,
  pnlColorClass,
  fmtPct,
  fmtDollar,
  fmtPrice,
} from '@/utils/dailyChange'

// ─── Types ──────────────────────────────────────────────────────────────────

type AccountFilter = 'all' | 'host' | 'secondary'

interface MarketStreamRow {
  symbol: string
  contractKey: string
  accountId: string | undefined
  qty: number
  avgCost: number | null
  last: number | null
  bid: number | null
  ask: number | null
  ts: number | undefined
  dailyDollar: number | null
  dailyPct: number | null
  sinceDollar: number | null
  sincePct: number | null
  totalCost: number | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function freshnessCls(ts: number | undefined): string {
  if (ts == null) return 'text-muted-foreground'
  const ageS = (Date.now() / 1000) - ts
  if (ageS < 3) return 'text-emerald-600 dark:text-emerald-400'
  if (ageS < 10) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-muted-foreground'
}

function formatExpiry(expiry: string | null | undefined): string {
  if (!expiry) return '—'
  if (expiry.length === 8) {
    return `${expiry.slice(4, 6)}/${expiry.slice(6, 8)}`
  }
  return expiry
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LivePage() {
  const { data: status } = useMonitorStatus()
  const { data: watchlistData } = useWatchlist()
  const { data: openOrders } = useOpenOrders()
  const queryClient = useQueryClient()
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all')

  const accounts = status?.portfolio?.accounts
  const configAccounts = status?.config?.ib_client?.account
  const strategyActive = status?.strategy?.active

  // Gather STK positions from accounts
  const stkPositions = useMemo<IbPositionRow[]>(() => {
    if (!accounts) return []
    return accounts.flatMap(
      (acct) =>
        (acct.positions ?? []).filter((p) => p.secType === 'STK'),
    )
  }, [accounts])

  // Gather all symbols we need quotes for
  const { allSymbols, allContractKeys } = useMemo(() => {
    const symbolSet = new Set<string>()
    const ckSet = new Set<string>()

    for (const pos of stkPositions) {
      if (pos.symbol) symbolSet.add(pos.symbol)
      if (pos.contract_key) ckSet.add(pos.contract_key)
    }

    const watchItems = watchlistData?.items ?? []
    for (const w of watchItems) {
      symbolSet.add(w.symbol)
      if (w.contract_key) ckSet.add(w.contract_key)
    }

    const subscribed = status?.live_ui?.subscribed_tickers ?? []
    for (const t of subscribed) symbolSet.add(t)

    return {
      allSymbols: Array.from(symbolSet),
      allContractKeys: Array.from(ckSet),
    }
  }, [stkPositions, watchlistData, status?.live_ui?.subscribed_tickers])

  const { quotesMap, isLoading: quotesLoading, isError: quotesError } = useQuoteStream(
    allSymbols,
    allContractKeys,
  )

  const benchmarkSymbols = useMemo(
    () => allSymbols.filter((s) => s.length <= 5),
    [allSymbols],
  )
  const { data: benchmarkData } = useBenchmarks(benchmarkSymbols)
  const benchmarks = useMemo(() => benchmarkData?.benchmarks ?? {}, [benchmarkData])

  // ─── Market Streams Rows ────────────────────────────────────────────────

  const marketStreamRows = useMemo<MarketStreamRow[]>(() => {
    const rowMap = new Map<string, MarketStreamRow>()

    for (const pos of stkPositions) {
      const sym = pos.symbol ?? ''
      const ck = pos.contract_key ?? sym
      if (!sym) continue
      const quote: QuoteItem | undefined = quotesMap[ck] ?? quotesMap[sym]
      const bm: DailyBenchmark | undefined = benchmarks[sym]
      const basePrice = resolveDailyBasePrice(pos, bm)
      const last = quote?.last ?? pos.price ?? null
      const { dailyDollar, dailyPct } = computeDailyChange(last, basePrice)
      const { sinceDollar, sincePct } = computeSinceChange(
        last,
        pos.avgCost,
        pos.position,
      )

      const existing = rowMap.get(ck)
      if (existing) {
        existing.qty += pos.position ?? 0
      } else {
        rowMap.set(ck, {
          symbol: sym,
          contractKey: ck,
          accountId: pos.account,
          qty: pos.position ?? 0,
          avgCost: pos.avgCost ?? null,
          last,
          bid: quote?.bid ?? null,
          ask: quote?.ask ?? null,
          ts: quote?.ts,
          dailyDollar,
          dailyPct,
          sinceDollar,
          sincePct,
          totalCost:
            pos.avgCost != null && pos.position != null
              ? pos.avgCost * pos.position
              : null,
        })
      }
    }

    // Add subscribed tickers not already in positions
    const subscribedTickers = status?.live_ui?.subscribed_tickers ?? []
    for (const sym of subscribedTickers) {
      const ck = sym
      if (rowMap.has(ck)) continue
      const quote = quotesMap[ck] ?? quotesMap[sym]
      const bm = benchmarks[sym]
      const last = quote?.last ?? null
      const basePrice = resolveDailyBasePrice(undefined, bm)
      const { dailyDollar, dailyPct } = computeDailyChange(last, basePrice)

      rowMap.set(ck, {
        symbol: sym,
        contractKey: ck,
        accountId: undefined,
        qty: 0,
        avgCost: null,
        last,
        bid: quote?.bid ?? null,
        ask: quote?.ask ?? null,
        ts: quote?.ts,
        dailyDollar,
        dailyPct,
        sinceDollar: null,
        sincePct: null,
        totalCost: null,
      })
    }

    // Add watchlist STK items not already present
    const watchItems = watchlistData?.items ?? []
    for (const w of watchItems) {
      if (w.sec_type !== 'STK') continue
      const ck = w.contract_key ?? w.symbol
      if (rowMap.has(ck)) continue
      const quote = quotesMap[ck] ?? quotesMap[w.symbol]
      const bm = benchmarks[w.symbol]
      const last = quote?.last ?? null
      const basePrice = resolveDailyBasePrice(undefined, bm)
      const { dailyDollar, dailyPct } = computeDailyChange(last, basePrice)

      rowMap.set(ck, {
        symbol: w.symbol,
        contractKey: ck,
        accountId: undefined,
        qty: 0,
        avgCost: null,
        last,
        bid: quote?.bid ?? null,
        ask: quote?.ask ?? null,
        ts: quote?.ts,
        dailyDollar,
        dailyPct,
        sinceDollar: null,
        sincePct: null,
        totalCost: null,
      })
    }

    return Array.from(rowMap.values())
  }, [stkPositions, quotesMap, benchmarks, watchlistData, status?.live_ui?.subscribed_tickers])

  // ─── Account Filter ─────────────────────────────────────────────────────

  const hasMultipleAccounts = !!(configAccounts?.event_host && configAccounts?.event_secondary)

  const filteredRows = useMemo(() => {
    if (!hasMultipleAccounts || accountFilter === 'all') return marketStreamRows
    const targetAcct =
      accountFilter === 'host'
        ? configAccounts?.event_host
        : configAccounts?.event_secondary
    return marketStreamRows.filter(
      (r) => !r.accountId || r.accountId === targetAcct,
    )
  }, [marketStreamRows, accountFilter, hasMultipleAccounts, configAccounts])

  // ─── Summary Aggregates ─────────────────────────────────────────────────

  const summary = useMemo(() => {
    let totalSinceDollar = 0
    let totalSinceCost = 0
    let totalDailyDollar = 0
    let totalDailyBase = 0
    let hasSince = false
    let hasDaily = false

    for (const r of filteredRows) {
      if (r.sinceDollar != null) {
        totalSinceDollar += r.sinceDollar
        hasSince = true
      }
      if (r.totalCost != null) {
        totalSinceCost += r.totalCost
      }
      if (r.dailyDollar != null && r.qty !== 0) {
        totalDailyDollar += r.dailyDollar * Math.abs(r.qty)
        hasDaily = true
      }
      if (r.last != null && r.qty !== 0) {
        totalDailyBase += Math.abs(r.qty) * (r.last - (r.dailyDollar ?? 0))
      }
    }

    return {
      sinceDollar: hasSince ? totalSinceDollar : null,
      sincePct: hasSince && totalSinceCost !== 0 ? (totalSinceDollar / totalSinceCost) * 100 : null,
      dailyDollar: hasDaily ? totalDailyDollar : null,
      dailyPct: hasDaily && totalDailyBase !== 0 ? (totalDailyDollar / totalDailyBase) * 100 : null,
    }
  }, [filteredRows])

  // ─── Totals Row ─────────────────────────────────────────────────────────

  const totals = useMemo(() => {
    let totalCost = 0
    let totalSinceDollar = 0
    let totalDailyDollar = 0

    for (const r of filteredRows) {
      if (r.totalCost != null) totalCost += r.totalCost
      if (r.sinceDollar != null) totalSinceDollar += r.sinceDollar
      if (r.dailyDollar != null && r.qty !== 0) {
        totalDailyDollar += r.dailyDollar * Math.abs(r.qty)
      }
    }

    return { totalCost, totalSinceDollar, totalDailyDollar }
  }, [filteredRows])

  // ─── Watching Stocks & Options ──────────────────────────────────────────

  const watchingStocks = useMemo<WatchlistItem[]>(() => {
    return (watchlistData?.items ?? []).filter(
      (w) => w.sec_type === 'STK' && w.category?.toLowerCase().includes('watching'),
    )
  }, [watchlistData])

  const watchingOptions = useMemo<WatchlistItem[]>(() => {
    return (watchlistData?.items ?? []).filter((w) => w.sec_type === 'OPT')
  }, [watchlistData])

  // ─── Open Orders Split ──────────────────────────────────────────────────

  const { optOrders, stkOrders } = useMemo(() => {
    const orders = openOrders ?? []
    return {
      optOrders: orders.filter((o) => o.sec_type === 'OPT'),
      stkOrders: orders.filter((o) => o.sec_type !== 'OPT'),
    }
  }, [openOrders])

  // ─── Refresh Handler ────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['market'] })
    queryClient.invalidateQueries({ queryKey: ['monitor'] })
  }, [queryClient])

  // ─── Lamps ──────────────────────────────────────────────────────────────

  const streamsLamp = computeMarketStreamsLamp(status)
  const ordersLamp = computeOpenOrdersLamp(status)

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 p-6">
      {quotesError && (
        <QueryErrorAlert error="Failed to load live quotes — check Market API connection." />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Live</h1>
          {strategyActive && (
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {strategyActive.structure?.name && (
                <Badge variant="secondary" className="font-normal">
                  S: {strategyActive.structure.name}
                </Badge>
              )}
              {strategyActive.gate_safety?.name && (
                <Badge variant="secondary" className="font-normal">
                  G: {strategyActive.gate_safety.name}
                </Badge>
              )}
              {strategyActive.allocation?.name && (
                <Badge variant="secondary" className="font-normal">
                  A: {strategyActive.allocation.name}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-6 rounded-md border px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">SINCE</span>
          <span className={cn('font-medium', pnlColorClass(summary.sinceDollar))}>
            {fmtDollar(summary.sinceDollar)}
          </span>
          <span className={cn('text-xs', pnlColorClass(summary.sincePct))}>
            ({fmtPct(summary.sincePct)})
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">DAILY</span>
          <span className={cn('font-medium', pnlColorClass(summary.dailyDollar))}>
            {fmtDollar(summary.dailyDollar)}
          </span>
          <span className={cn('text-xs', pnlColorClass(summary.dailyPct))}>
            ({fmtPct(summary.dailyPct)})
          </span>
        </div>
      </div>

      {/* Market Streams Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Market Streams</CardTitle>
            <StatusLamp lamp={streamsLamp} />
          </div>
          {hasMultipleAccounts && (
            <div className="flex items-center gap-1">
              {(['all', 'host', 'secondary'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setAccountFilter(f)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    accountFilter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {f === 'all' ? 'All' : f === 'host' ? 'Host' : 'Secondary'}
                </button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {quotesLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Last (Bid/Ask)</TableHead>
                  <TableHead className="text-right">Daily %</TableHead>
                  <TableHead className="text-right">Daily $</TableHead>
                  <TableHead className="text-right">Since %</TableHead>
                  <TableHead className="text-right">Since $</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.contractKey}>
                    <TableCell>
                      <span className={cn('font-medium', freshnessCls(row.ts))}>
                        {row.symbol}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.qty !== 0 ? row.qty : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.avgCost != null ? fmtPrice(row.avgCost) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="tabular-nums">
                        <span className="font-medium">{fmtPrice(row.last)}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({fmtPrice(row.bid)}/{fmtPrice(row.ask)})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', pnlColorClass(row.dailyPct))}>
                      {fmtPct(row.dailyPct)}
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', pnlColorClass(row.dailyDollar))}>
                      {row.qty !== 0 && row.dailyDollar != null
                        ? fmtDollar(row.dailyDollar * Math.abs(row.qty))
                        : fmtDollar(row.dailyDollar)}
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', pnlColorClass(row.sincePct))}>
                      {fmtPct(row.sincePct)}
                    </TableCell>
                    <TableCell className={cn('text-right tabular-nums', pnlColorClass(row.sinceDollar))}>
                      {fmtDollar(row.sinceDollar)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {filteredRows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums font-medium">
                      {totals.totalCost !== 0 ? fmtDollar(totals.totalCost) : '—'}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className={cn('text-right tabular-nums font-medium', pnlColorClass(totals.totalDailyDollar))}>
                      {fmtDollar(totals.totalDailyDollar)}
                    </TableCell>
                    <TableCell />
                    <TableCell className={cn('text-right tabular-nums font-medium', pnlColorClass(totals.totalSinceDollar))}>
                      {fmtDollar(totals.totalSinceDollar)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Watching Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Watching Stocks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Watching Stocks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {watchingStocks.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">No watching stocks</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Last (Bid/Ask)</TableHead>
                    <TableHead className="text-right">Daily %</TableHead>
                    <TableHead className="text-right">Daily $</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchingStocks.map((w) => {
                    const quote = quotesMap[w.contract_key] ?? quotesMap[w.symbol]
                    const bm = benchmarks[w.symbol]
                    const last = quote?.last ?? null
                    const basePrice = resolveDailyBasePrice(undefined, bm)
                    const { dailyDollar, dailyPct } = computeDailyChange(last, basePrice)
                    return (
                      <TableRow key={w.contract_key}>
                        <TableCell>
                          <span className={cn('font-medium', freshnessCls(quote?.ts))}>
                            {w.symbol}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium">{fmtPrice(last)}</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({fmtPrice(quote?.bid ?? null)}/{fmtPrice(quote?.ask ?? null)})
                          </span>
                        </TableCell>
                        <TableCell className={cn('text-right tabular-nums', pnlColorClass(dailyPct))}>
                          {fmtPct(dailyPct)}
                        </TableCell>
                        <TableCell className={cn('text-right tabular-nums', pnlColorClass(dailyDollar))}>
                          {fmtDollar(dailyDollar)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Watching Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Watching Options</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {watchingOptions.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">No watching options</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Last (Bid/Ask)</TableHead>
                    <TableHead className="text-right">Expiry</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchingOptions.map((w) => {
                    const quote = quotesMap[w.contract_key] ?? quotesMap[w.symbol]
                    const ckParts = w.contract_key.split('_')
                    const expiry = ckParts[1] ?? ''
                    const strike = ckParts[2] ?? ''
                    const right = ckParts[3]?.charAt(0)?.toUpperCase() ?? ''
                    const label = `${w.symbol} ${formatExpiry(expiry)} ${strike} ${right}`
                    return (
                      <TableRow key={w.contract_key}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className="font-medium">{fmtPrice(quote?.last ?? null)}</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({fmtPrice(quote?.bid ?? null)}/{fmtPrice(quote?.ask ?? null)})
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatExpiry(expiry)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {w.category ?? '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <CardTitle className="text-base">Open Orders</CardTitle>
          <StatusLamp lamp={ordersLamp} />
        </CardHeader>
        <CardContent className="space-y-4 p-0 pb-4">
          {/* OPT Orders */}
          {optOrders.length > 0 && (
            <div>
              <h4 className="px-4 pb-1 text-xs font-medium uppercase text-muted-foreground">
                Options
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Strike</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Filled/Rem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optOrders.map((o) => {
                    const ckParts = (o.contract_key ?? '').split('_')
                    return (
                      <TableRow key={o.order_id ?? o.perm_id ?? o.contract_key}>
                        <TableCell className="text-xs text-muted-foreground">
                          {o.account_id ?? '—'}
                        </TableCell>
                        <TableCell className="font-medium">{o.symbol ?? '—'}</TableCell>
                        <TableCell>{formatExpiry(ckParts[1] ?? null)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {ckParts[2] ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={o.action === 'BUY' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {o.action ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {o.total_quantity ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {o.limit_price != null ? fmtPrice(o.limit_price) : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{o.status ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {o.filled ?? 0}/{o.remaining ?? 0}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* STK Orders */}
          {stkOrders.length > 0 && (
            <div>
              <h4 className="px-4 pb-1 text-xs font-medium uppercase text-muted-foreground">
                Stocks
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Filled/Rem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stkOrders.map((o) => (
                    <TableRow key={o.order_id ?? o.perm_id ?? o.contract_key}>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.account_id ?? '—'}
                      </TableCell>
                      <TableCell className="font-medium">{o.symbol ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={o.action === 'BUY' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {o.action ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {o.total_quantity ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {o.limit_price != null ? fmtPrice(o.limit_price) : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{o.status ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {o.filled ?? 0}/{o.remaining ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {optOrders.length === 0 && stkOrders.length === 0 && (
            <p className="px-4 text-sm text-muted-foreground">No open orders</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
