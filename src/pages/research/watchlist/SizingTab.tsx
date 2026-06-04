import { useMemo } from 'react'
import type { KellyMetrics } from '@/utils/riskSizing'
import type { AtrResult, PositionSizeResult } from '@/utils/riskSizing'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { PositionCategory } from '@/types/portfolio'
import type { WatchlistWorkflow } from '@/hooks/useWatchlistWorkflow'
import type { PerformanceSummary } from '@/types/trading'
import { PortfolioRiskPower } from './PortfolioRiskPower'
import { PromoteToSizing } from './PromoteToSizing'
import { StockWatchlistTable } from './StockWatchlistTable'
import { SizingOrderPanel } from './SizingOrderPanel'
import { SizingOrderRiskVerify } from './SizingOrderRiskVerify'
import { SizingOrderSection } from './SizingOrderSection'
import type { StatusResponse } from '@/types/monitor'
import { buildPortfolioCashRollup, aggregateCapital } from '@/utils/accountsSnapshot'
import {
  watchlistSectionHintClass,
  watchlistStepLeadClass,
} from './watchlistUi'
import {
  sizingDashSubtitleClass,
  sizingDashWorkflowColClass,
  sizingSheetBlockPromoteClass,
  sizingSheetOrderRowClass,
  sizingSymbolSheetWrapClass,
} from './sizingUi'

export interface SizingTabProps {
  status: StatusResponse | null | undefined
  workflow: WatchlistWorkflow
  categories: PositionCategory[]
  quoteBySymbol: Record<string, QuoteItem>
  quoteByContractKey: Record<string, QuoteItem>
  perfSummary: PerformanceSummary | null | undefined
  kellyMetrics: KellyMetrics
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
    kellyMetrics,
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

    const kellyShares = sizePosResult?.is_valid ? sizePosResult.shares : null
    const kellyRiskUsd = sizePosResult?.is_valid ? sizePosResult.dollar_risk : null
    const capRows = [
      {
        key: 'kelly',
        label: 'Order sizing (Kelly)',
        maxRiskUsd: kellyRiskUsd,
        maxShares: kellyShares,
      },
      {
        key: 'portfolioDd',
        label: `Portfolio max DD budget (${pctCap}% NAV, linked)`,
        maxRiskUsd: portfolioScenarioRiskUsd,
        maxShares: maxSharesFromRisk(portfolioScenarioRiskUsd),
      },
      {
        key: 'histMax',
        label: 'History max loss (abs)',
        maxRiskUsd: histMaxLossUsd,
        maxShares: maxSharesFromRisk(histMaxLossUsd),
      },
      {
        key: 'histAvg',
        label: 'History avg loss (abs)',
        maxRiskUsd: histAvgLossUsd,
        maxShares: maxSharesFromRisk(histAvgLossUsd),
      },
    ]

    const cashCapShares =
      price != null && price > 0 && portfolioCashRollup.totalCashMerged > 0
        ? Math.floor(portfolioCashRollup.totalCashMerged / price)
        : null

    const shareCandidates = [
      ...capRows.map(r => r.maxShares).filter((x): x is number => x != null && Number.isFinite(x) && x >= 0),
      cashCapShares,
    ].filter((x): x is number => x != null && Number.isFinite(x))

    return {
      intendedShares: shares,
      intendedRiskPct,
      investmentUsd: notional,
      investmentWeightPct,
      cashLeftAfter,
      capRows,
      cashCapShares,
      availableMinShares: shareCandidates.length > 0 ? Math.min(...shareCandidates) : null,
    }
  }, [
    sizeAtrResult,
    sizePosResult,
    sizeAtrMultiplier,
    sizeCurrentPrice,
    capital,
    portfolioCashRollup,
    staticMaxDdPctCap,
    perfSummary,
  ])

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

  const showOrderSidePanels =
    selectedSizingSymbol != null && !sizeComputeLoading && sizeAtrResult != null

  return (
    <div className="space-y-4">
      <p className={watchlistSectionHintClass}>
        <strong className={watchlistStepLeadClass}>Step 2.</strong> The table lists stocks tagged{' '}
        <strong className={watchlistStepLeadClass}>Sizing</strong>. Pick any stock symbol from your watchlist
        below, then <strong className={watchlistStepLeadClass}>Move to Sizing</strong>.
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

      <div className={sizingSheetOrderRowClass}>
        <div className="min-w-0">
          <section className={sizingDashWorkflowColClass}>
            <h5 id="watchlist-sizing-symbol-sheet-head" className={sizingDashSubtitleClass}>
              Sizing symbol sheet
            </h5>
            <div className={sizingSymbolSheetWrapClass}>
              {sizingStockRows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No Sizing symbols yet. Promote from Watching below.
                </p>
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
                  sizingSheet
                  onSymbolClick={(item, openSizing) => onSymbolClick(item, openSizing)}
                  onToggleOptionable={() => {}}
                  onCategoryChange={() => {}}
                  onRemove={onRemove}
                  symbolFromItem={symbolFromItem}
                />
              )}
            </div>

            {showOrderSidePanels && selectedSizingSymbol ? (
              <>
                <SizingOrderSection
                  symbol={selectedSizingSymbol}
                  bid={selectedBid}
                  entry={orderEntryPrice}
                  exit={orderExitPrice}
                  shares={orderShareAmt}
                  onEntryChange={onOrderEntryChange}
                  onExitChange={onOrderExitChange}
                  onSharesChange={onOrderShareChange}
                />
                <SizingOrderRiskVerify analytics={manualOrderAnalytics} />
              </>
            ) : null}
          </section>
        </div>

        <div className="min-w-0">
          {selectedSizingSymbol ? (
            <SizingOrderPanel
              symbol={selectedSizingSymbol}
              kellyFraction={kellyFraction}
              sizeAtrMultiplier={sizeAtrMultiplier}
              sizeComputeLoading={sizeComputeLoading}
              sizeComputeError={sizeComputeError}
              sizeAtrResult={sizeAtrResult}
              sizePosResult={sizePosResult}
              sizeCurrentPrice={sizeCurrentPrice}
              kellyMetrics={kellyMetrics}
              sizingOrderAnalytics={sizingOrderAnalytics}
              totalBuyingPower={portfolioCashRollup.totalBuyingPower}
              onKellyFractionChange={onKellyFractionChange}
              onAtrMultiplierChange={onAtrMultiplierChange}
              onRecompute={() => onRecompute(selectedSizingSymbol)}
              onClose={onCloseSizingPanel}
            />
          ) : null}
        </div>
      </div>

      <div className={sizingSheetBlockPromoteClass} aria-labelledby="watchlist-sizing-workflow-head">
        <h4 id="watchlist-sizing-workflow-head" className="text-base font-semibold tracking-tight">
          Sizing sheet
        </h4>
        <PromoteToSizing
          stocks={stocksForPromoteToSizing}
          sizingCategoryId={sizingCategoryId}
          addPending={addPending}
          onPromote={onPromote}
          inline
        />
      </div>
    </div>
  )
}
