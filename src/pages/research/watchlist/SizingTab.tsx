import { useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtUsd } from '@/utils/positions'
import type { AtrResult, PositionSizeResult } from '@/utils/riskSizing'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { PositionCategory } from '@/types/portfolio'
import type { WatchlistWorkflow } from '@/hooks/useWatchlistWorkflow'
import type { PerformanceSummary } from '@/types/trading'
import { PortfolioRiskPower } from './PortfolioRiskPower'
import { PromoteToSizing } from './PromoteToSizing'
import { StockWatchlistTable } from './StockWatchlistTable'
import type { StatusResponse } from '@/types/monitor'
import { buildPortfolioCashRollup, aggregateCapital } from '@/utils/accountsSnapshot'

export interface SizingTabProps {
  status: StatusResponse | null | undefined
  workflow: WatchlistWorkflow
  categories: PositionCategory[]
  quoteBySymbol: Record<string, QuoteItem>
  quoteByContractKey: Record<string, QuoteItem>
  perfSummary: PerformanceSummary | null | undefined
  sizingCategoryId: number | null
  addPending: boolean
  staticMaxDdPctCap: number
  staticRiskPctPerTrade: number
  kellyFraction: number
  sizeAtrMultiplier: number
  selectedSizingSymbol: string | null
  sizeComputeLoading: boolean
  sizeComputeError: string | null
  sizeAtrResult: AtrResult | null
  sizePosResult: PositionSizeResult | null
  sizeCurrentPrice: number | null
  orderEntryPrice: string
  orderExitPrice: string
  orderShareAmt: string
  portfolioRiskCollapsed: boolean
  onPromote: (contractKey: string) => Promise<void>
  onSymbolClick: (item: WatchlistItem, openSizing?: boolean) => void
  onRemove: (item: WatchlistItem) => void
  onMaxDdChange: (v: number) => void
  onStaticRiskPctChange: (v: number) => void
  onKellyFractionChange: (v: number) => void
  onAtrMultiplierChange: (v: number) => void
  onPortfolioRiskCollapsed: (v: boolean) => void
  onRecompute: (sym: string) => void
  onCloseSizingPanel: () => void
  onOrderEntryChange: (v: string) => void
  onOrderExitChange: (v: string) => void
  onOrderShareChange: (v: string) => void
}

export function SizingTab(props: SizingTabProps) {
  const {
    status,
    workflow,
    categories,
    quoteBySymbol,
    quoteByContractKey,
    perfSummary,
    sizingCategoryId,
    addPending,
    staticMaxDdPctCap,
    staticRiskPctPerTrade,
    kellyFraction,
    sizeAtrMultiplier,
    selectedSizingSymbol,
    sizeComputeLoading,
    sizeComputeError,
    sizeAtrResult,
    sizePosResult,
    sizeCurrentPrice,
    orderEntryPrice,
    orderExitPrice,
    orderShareAmt,
    portfolioRiskCollapsed,
    onPromote,
    onSymbolClick,
    onRemove,
    onMaxDdChange,
    onStaticRiskPctChange,
    onKellyFractionChange,
    onAtrMultiplierChange,
    onPortfolioRiskCollapsed,
    onRecompute,
    onCloseSizingPanel,
    onOrderEntryChange,
    onOrderExitChange,
    onOrderShareChange,
  } = props

  const { sizingStockRows, stocksForPromoteToSizing, hasPosition, symbolFromItem } = workflow

  const capital = useMemo(() => aggregateCapital(status), [status])
  const portfolioCashRollup = useMemo(() => buildPortfolioCashRollup(status), [status])

  const staticRiskBudgetUsd = useMemo(() => {
    if (capital <= 0) return 0
    const pct = Math.max(5, Math.min(50, staticMaxDdPctCap))
    return (capital * pct) / 100
  }, [capital, staticMaxDdPctCap])

  const staticRiskUsdPerTrade = useMemo(() => {
    if (capital <= 0) return 0
    const pct = Math.max(0.1, Math.min(5, staticRiskPctPerTrade))
    return (capital * pct) / 100
  }, [capital, staticRiskPctPerTrade])

  const portfolioDd = useMemo(() => {
    const md = perfSummary?.max_drawdown
    if (md == null || !Number.isFinite(md)) return { usd: null as number | null, pctOfNav: null as number | null }
    const usd = Math.abs(md)
    return { usd, pctOfNav: capital > 0 ? (usd / capital) * 100 : null }
  }, [perfSummary?.max_drawdown, capital])

  const selectedQuote = useMemo(() => {
    if (!selectedSizingSymbol) return null
    return quoteBySymbol[selectedSizingSymbol.trim().toUpperCase()] ?? null
  }, [quoteBySymbol, selectedSizingSymbol])

  const selectedBid = useMemo(() => {
    const bid = selectedQuote?.bid
    return bid != null && Number.isFinite(Number(bid)) && Number(bid) > 0 ? Number(bid) : null
  }, [selectedQuote])

  const sizingOrderAnalytics = useMemo(() => {
    const atr14 = sizeAtrResult?.atr14 ?? 0
    const stopD =
      sizePosResult != null && sizePosResult.stop_distance > 0
        ? sizePosResult.stop_distance
        : atr14 > 0
          ? sizeAtrMultiplier * atr14
          : 0
    const price = sizeCurrentPrice
    const shares = sizePosResult?.is_valid ? sizePosResult.shares : 0
    const notional = price != null && price > 0 && shares > 0 ? shares * price : null
    const investmentWeightPct = notional != null && capital > 0 ? (notional / capital) * 100 : null
    const intendedRiskPct = sizePosResult?.is_valid ? sizePosResult.risk_pct : null
    const cashLeftAfter = notional != null ? portfolioCashRollup.totalCashMerged - notional : null

    const maxSharesFromRisk = (usd: number | null | undefined) => {
      if (usd == null || !Number.isFinite(usd) || usd <= 0 || stopD <= 0) return null
      return Math.floor(usd / stopD)
    }

    const pctCap = Math.max(5, Math.min(50, staticMaxDdPctCap))
    const portfolioScenarioRiskUsd = capital > 0 ? (capital * pctCap) / 100 : null
    const histMaxLossUsd =
      perfSummary?.max_loss != null && Number.isFinite(perfSummary.max_loss)
        ? Math.abs(perfSummary.max_loss)
        : null
    const histAvgLossUsd =
      perfSummary?.avg_loss != null && Number.isFinite(perfSummary.avg_loss)
        ? Math.abs(perfSummary.avg_loss)
        : null

    const shareCandidates = [
      sizePosResult?.is_valid ? sizePosResult.shares : null,
      maxSharesFromRisk(portfolioScenarioRiskUsd),
      maxSharesFromRisk(histMaxLossUsd),
      maxSharesFromRisk(histAvgLossUsd),
      price != null && price > 0 && portfolioCashRollup.totalCashMerged > 0
        ? Math.floor(portfolioCashRollup.totalCashMerged / price)
        : null,
    ].filter((x): x is number => x != null && Number.isFinite(x))

    return {
      intendedShares: shares,
      intendedRiskPct,
      investmentUsd: notional,
      investmentWeightPct,
      cashLeftAfter,
      capRows: [
        { key: 'kelly', label: 'Order sizing (Kelly)', maxRiskUsd: sizePosResult?.is_valid ? sizePosResult.dollar_risk : null, maxShares: sizePosResult?.is_valid ? sizePosResult.shares : null },
        { key: 'dd', label: `Portfolio max DD budget (${pctCap}% NAV)`, maxRiskUsd: portfolioScenarioRiskUsd, maxShares: maxSharesFromRisk(portfolioScenarioRiskUsd) },
        { key: 'max', label: 'History max loss (abs)', maxRiskUsd: histMaxLossUsd, maxShares: maxSharesFromRisk(histMaxLossUsd) },
        { key: 'avg', label: 'History avg loss (abs)', maxRiskUsd: histAvgLossUsd, maxShares: maxSharesFromRisk(histAvgLossUsd) },
      ],
      availableMinShares: shareCandidates.length > 0 ? Math.min(...shareCandidates) : null,
    }
  }, [sizeAtrResult, sizePosResult, sizeAtrMultiplier, sizeCurrentPrice, capital, portfolioCashRollup, staticMaxDdPctCap, perfSummary])

  const manualOrderAnalytics = useMemo(() => {
    const entryNum = Number(orderEntryPrice)
    const exitNum = Number(orderExitPrice)
    const sharesNum = Number(orderShareAmt)
    const entry = Number.isFinite(entryNum) && entryNum > 0 ? entryNum : null
    const exit = Number.isFinite(exitNum) && exitNum > 0 ? exitNum : null
    const shares = Number.isFinite(sharesNum) && sharesNum > 0 ? Math.floor(sharesNum) : null
    const bid = selectedBid
    const distance = entry != null && bid != null ? entry - bid : null
    const distancePctOfBid =
      entry != null && bid != null && bid !== 0 ? Math.round(((entry - bid) / bid) * 100) / 100 : null
    const riskPerShare = entry != null && exit != null ? entry - exit : null
    const riskPerShareAbs = riskPerShare != null ? Math.abs(riskPerShare) : null
    const orderRiskUsd = riskPerShareAbs != null && shares != null ? riskPerShareAbs * shares : null
    const riskPct = orderRiskUsd != null && capital > 0 ? (orderRiskUsd / capital) * 100 : null
    const investmentUsd = entry != null && shares != null ? entry * shares : null
    const investmentWeightPct = investmentUsd != null && capital > 0 ? (investmentUsd / capital) * 100 : null
    const cashLeftAfter = investmentUsd != null ? portfolioCashRollup.totalCashMerged - investmentUsd : null
    const atr14 = sizeAtrResult?.atr14 ?? null
    const atrPctPercent =
      atr14 != null && entry != null && entry > 0 ? Math.round((atr14 / entry) * 100 * 100) / 100 : null
    const atrRisk =
      atr14 != null && atr14 > 0 && riskPerShare != null ? Math.round((riskPerShare / atr14) * 100) / 100 : null
    const positionalDrawdownRatio =
      riskPerShare != null && entry != null && entry > 0 ? Math.round((riskPerShare / entry) * 100) / 100 : null
    return {
      distance,
      distancePctOfBid,
      positionalDrawdownRatio,
      riskPerShare,
      orderRiskUsd,
      riskPct,
      investmentUsd,
      investmentWeightPct,
      cashLeftAfter,
      atr14,
      atrPctPercent,
      atrRisk,
      isComplete: entry != null && exit != null && shares != null && riskPerShare != null,
    }
  }, [orderEntryPrice, orderExitPrice, orderShareAmt, capital, portfolioCashRollup.totalCashMerged, sizeAtrResult, selectedBid])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Step 2.</strong> Stocks tagged <strong>Sizing</strong>. Pick a symbol
        below or promote from the combobox.
      </p>

      <PortfolioRiskPower
        status={status}
        staticMaxDdPctCap={staticMaxDdPctCap}
        staticRiskPctPerTrade={staticRiskPctPerTrade}
        capital={capital}
        staticRiskBudgetUsd={staticRiskBudgetUsd}
        staticRiskUsdPerTrade={staticRiskUsdPerTrade}
        portfolioDdUsd={portfolioDd.usd}
        portfolioDdPctOfNav={portfolioDd.pctOfNav}
        collapsed={portfolioRiskCollapsed}
        onCollapsedChange={onPortfolioRiskCollapsed}
        onMaxDdChange={v => onMaxDdChange(Math.max(5, Math.min(50, v)))}
        onStaticRiskPctChange={v => onStaticRiskPctChange(Math.max(0.1, Math.min(5, v)))}
      />

      <PromoteToSizing
        stocks={stocksForPromoteToSizing}
        sizingCategoryId={sizingCategoryId}
        addPending={addPending}
        onPromote={onPromote}
      />

      <div className="space-y-2">
        <h5 className="text-sm font-semibold">Sizing symbol sheet</h5>
        {sizingStockRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Sizing symbols yet. Promote from Watching above.</p>
        ) : (
          <StockWatchlistTable
            items={sizingStockRows}
            categories={categories}
            quoteBySymbol={quoteBySymbol}
            quoteByContractKey={quoteByContractKey}
            hasPosition={hasPosition}
            selectedSizingSymbol={selectedSizingSymbol}
            showSizeBtn
            hideCategory
            hideOpt
            onSymbolClick={(item, openSizing) => onSymbolClick(item, openSizing)}
            onToggleOptionable={() => {}}
            onCategoryChange={() => {}}
            onRemove={onRemove}
            symbolFromItem={symbolFromItem}
          />
        )}
      </div>

      {selectedSizingSymbol && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Order sizing — {selectedSizingSymbol}</h4>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCloseSizingPanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 min-w-[140px]">
                <label className="text-xs text-muted-foreground">Kelly fraction</label>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={kellyFraction}
                  onChange={e => onKellyFractionChange(Number.parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs font-mono">{kellyFraction.toFixed(2)}</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="atr-mult">ATR multiplier</label>
                <Input
                  id="atr-mult"
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={sizeAtrMultiplier}
                  onChange={e => onAtrMultiplierChange(Number.parseFloat(e.target.value) || 2)}
                  className="h-8 w-20 font-mono"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={sizeComputeLoading}
                onClick={() => onRecompute(selectedSizingSymbol)}
              >
                {sizeComputeLoading ? 'Computing…' : 'Recompute'}
              </Button>
            </div>

            {sizeComputeError && (
              <p className="text-sm text-destructive" role="alert">{sizeComputeError}</p>
            )}

            {sizeAtrResult && !sizeComputeLoading && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    ['ATR(14)', fmtUsd(sizeAtrResult.atr14)],
                    ['Price', sizeCurrentPrice != null ? fmtUsd(sizeCurrentPrice) : '—'],
                    ['Shares', sizePosResult?.is_valid ? String(sizePosResult.shares) : '—'],
                    ['Risk %', sizePosResult?.is_valid ? `${sizePosResult.risk_pct.toFixed(2)}%` : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-md border p-2 bg-muted/20">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="font-mono font-semibold">{val}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border p-3 space-y-3 bg-destructive/5 border-destructive/20">
                  <h5 className="text-sm font-semibold">Order section</h5>
                  <p className="text-xs text-muted-foreground">
                    Current bid: <span className="font-mono">{selectedBid != null ? fmtUsd(selectedBid) : '—'}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Entry</label>
                      <Input value={orderEntryPrice} onChange={e => onOrderEntryChange(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Exit</label>
                      <Input value={orderExitPrice} onChange={e => onOrderExitChange(e.target.value)} className="h-8 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Amt (step 100)</label>
                      <Input value={orderShareAmt} onChange={e => onOrderShareChange(e.target.value)} className="h-8 font-mono" type="number" step={100} />
                    </div>
                  </div>
                </div>

                {manualOrderAnalytics.isComplete && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Order risk ($)</div>
                      <div className="font-mono">{manualOrderAnalytics.orderRiskUsd != null ? fmtUsd(manualOrderAnalytics.orderRiskUsd) : '—'}</div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">Positional DD</div>
                      <div className="font-mono">
                        {manualOrderAnalytics.positionalDrawdownRatio != null
                          ? `${(manualOrderAnalytics.positionalDrawdownRatio * 100).toFixed(2)}%`
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">ATR risk</div>
                      <div className="font-mono">
                        {manualOrderAnalytics.atrRisk != null ? `${manualOrderAnalytics.atrRisk.toFixed(2)} ATR` : '—'}
                      </div>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Max $ risk</TableHead>
                      <TableHead className="text-right">Max shares</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sizingOrderAnalytics.capRows.map(row => (
                      <TableRow key={row.key}>
                        <TableCell className="text-xs">{row.label}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{row.maxRiskUsd != null ? fmtUsd(row.maxRiskUsd) : '—'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{row.maxShares != null ? row.maxShares.toLocaleString() : '—'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>Available (min)</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono">
                        {sizingOrderAnalytics.availableMinShares != null
                          ? sizingOrderAnalytics.availableMinShares.toLocaleString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
