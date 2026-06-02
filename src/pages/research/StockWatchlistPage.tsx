import { useCallback, useMemo, useRef, useState } from 'react'
import { PageShell } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useWatchlistMutations } from '@/hooks/useStockWatchlist'
import { useEnsureWatchlistCategories } from '@/hooks/useEnsureWatchlistCategories'
import { useWatchlistPerformance } from '@/hooks/useWatchlistPerformance'
import { useWatchlistWorkflow } from '@/hooks/useWatchlistWorkflow'
import { useQuoteStream } from '@/hooks/useQuoteStream'
import type { QuoteItem, WatchlistItem } from '@/types/market'
import type { InspectorState } from '@/components/positions/InspectorDrawer'
import { InspectorDrawer } from '@/components/positions/InspectorDrawer'
import { fetchBars, fetchQuotes } from '@/api/market'
import {
  computeAtr,
  computeKelly,
  computePositionSize,
  type AtrResult,
  type PositionSizeResult,
} from '@/utils/riskSizing'
import {
  defaultShareAmt,
  formatOrderInputNumber,
  normalizeExpiryInput,
  normalizeToContractKey,
  positionToContractKey,
  quoteDisplayLast,
  symbolFromItem,
  type PrimaryWorkflowTab,
} from '@/utils/watchlistHelpers'
import { WorkflowStepper } from './watchlist/WorkflowStepper'
import { WatchlistPageHeader } from './watchlist/WatchlistPageHeader'
import { WatchingTab } from './watchlist/WatchingTab'
import { SizingTab } from './watchlist/SizingTab'
import { PositionsTab } from './watchlist/PositionsTab'

export default function StockWatchlistPage() {
  const { data: status } = useMonitorStatus()
  const { data: watchlistData, isLoading, isError, error } = useWatchlist()
  const { data: perfSummary } = useWatchlistPerformance()
  const { categories, watchingId, sizingId } = useEnsureWatchlistCategories()
  const { addItem, removeItem, upsertFromItem } = useWatchlistMutations()

  const items = useMemo(() => watchlistData?.items ?? [], [watchlistData])
  const workflow = useWatchlistWorkflow(items, categories, status)

  const allSymbols = useMemo(
    () => Array.from(new Set(items.map(i => i.symbol?.toUpperCase()).filter(Boolean) as string[])),
    [items],
  )
  const allContractKeys = useMemo(() => items.map(i => i.contract_key), [items])
  const { quotesMap } = useQuoteStream(allSymbols, allContractKeys)

  const quoteBySymbol = useMemo(() => {
    const m: Record<string, QuoteItem> = {}
    for (const q of Object.values(quotesMap)) {
      const sym = (q.symbol ?? '').trim().toUpperCase()
      const st = (q.sec_type ?? '').toUpperCase()
      if (sym && (st === 'STK' || (!q.contract_key && st !== 'OPT'))) {
        m[sym] = q
      }
    }
    return m
  }, [quotesMap])

  const quoteByContractKey = useMemo(() => {
    const m: Record<string, QuoteItem> = {}
    for (const q of Object.values(quotesMap)) {
      if (q.contract_key) m[q.contract_key] = q
    }
    return m
  }, [quotesMap])

  const [primaryTab, setPrimaryTab] = useState<PrimaryWorkflowTab>('watching')
  const [addInput, setAddInput] = useState('')
  const [showPositionPicker, setShowPositionPicker] = useState(false)
  const [inspector, setInspector] = useState<InspectorState>({ type: null })

  const [addOptionSymbol, setAddOptionSymbol] = useState<string | null>(null)
  const [addOptExpiry, setAddOptExpiry] = useState('')
  const [addOptRight, setAddOptRight] = useState<'CALL' | 'PUT'>('CALL')
  const [addOptStrike, setAddOptStrike] = useState('')

  const [kellyFraction, setKellyFraction] = useState(0.5)
  const [sizeAtrMultiplier, setSizeAtrMultiplier] = useState(2)
  const [selectedSizingSymbol, setSelectedSizingSymbol] = useState<string | null>(null)
  const [sizeComputeLoading, setSizeComputeLoading] = useState(false)
  const [sizeComputeError, setSizeComputeError] = useState<string | null>(null)
  const [sizeCurrentPrice, setSizeCurrentPrice] = useState<number | null>(null)
  const [sizeAtrResult, setSizeAtrResult] = useState<AtrResult | null>(null)
  const [orderEntryPrice, setOrderEntryPrice] = useState('')
  const [orderExitPrice, setOrderExitPrice] = useState('')
  const [orderShareAmt, setOrderShareAmt] = useState('100')
  const [portfolioRiskCollapsed, setPortfolioRiskCollapsed] = useState(false)
  const [staticMaxDdPctCap, setStaticMaxDdPctCap] = useState(20)
  const [staticRiskPctPerTrade, setStaticRiskPctPerTrade] = useState(1)

  const sizingPanelDismissedRef = useRef(false)
  const sizingRowsKeySigRef = useRef('')
  const orderDraftSymbolRef = useRef<string | null>(null)

  const capital = useMemo(() => {
    const accounts = status?.portfolio?.accounts ?? []
    return accounts.reduce((sum, a) => {
      const v = a.summary?.NetLiquidation
      const n = v != null ? parseFloat(String(v)) : 0
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
  }, [status?.portfolio?.accounts])

  const kellyMetrics = useMemo(
    () => computeKelly(perfSummary?.win_rate, perfSummary?.profit_factor, kellyFraction),
    [perfSummary, kellyFraction],
  )

  const sizePosResult = useMemo<PositionSizeResult | null>(() => {
    if (sizeAtrResult == null || sizeCurrentPrice == null) return null
    return computePositionSize(capital, sizeCurrentPrice, sizeAtrResult, kellyMetrics, sizeAtrMultiplier)
  }, [capital, sizeCurrentPrice, sizeAtrResult, kellyMetrics, sizeAtrMultiplier])

  const handleSizeCompute = useCallback(async (sym: string) => {
    setPortfolioRiskCollapsed(true)
    setSelectedSizingSymbol(sym)
    setSizeComputeLoading(true)
    setSizeComputeError(null)
    setSizeAtrResult(null)
    setSizeCurrentPrice(null)
    try {
      const [barsRes, quotesRes] = await Promise.all([
        fetchBars(sym, '1 D', 20),
        fetchQuotes([sym]),
      ])
      const bars = barsRes.bars ?? []
      if (bars.length < 2) {
        setSizeComputeError(`Insufficient bar data for ${sym} (${bars.length} bars, need ≥ 2)`)
        return
      }
      const atr = computeAtr(bars)
      const quote = quotesRes.quotes.find(q => (q.symbol ?? '').toUpperCase() === sym.toUpperCase())
      const price = quoteDisplayLast(quote) ?? bars[bars.length - 1]?.close ?? null
      const pos =
        price != null
          ? computePositionSize(capital, price, atr, kellyMetrics, sizeAtrMultiplier)
          : null
      setSizeAtrResult(atr)
      setSizeCurrentPrice(price)
      const symU = sym.trim().toUpperCase()
      orderDraftSymbolRef.current = symU
      const bid =
        quote?.bid != null && Number.isFinite(Number(quote.bid)) && Number(quote.bid) > 0
          ? Number(quote.bid)
          : null
      const entrySeed = bid ?? price
      setOrderEntryPrice(entrySeed != null ? formatOrderInputNumber(entrySeed) : '')
      setOrderExitPrice(
        pos?.is_valid ? formatOrderInputNumber(pos.stop_loss_long) : '',
      )
      setOrderShareAmt(pos?.is_valid ? defaultShareAmt(pos.shares) : '100')
    } catch (e) {
      setSizeComputeError(e instanceof Error ? e.message : `Failed to fetch data for ${sym}`)
    } finally {
      setSizeComputeLoading(false)
    }
  }, [capital, kellyMetrics, sizeAtrMultiplier])

  const fillOrderDraftFromPos = useCallback((pos: PositionSizeResult | null, onlyIfEmpty: boolean) => {
    if (!pos?.is_valid) return
    const exit = formatOrderInputNumber(pos.stop_loss_long)
    const shares = defaultShareAmt(pos.shares)
    if (onlyIfEmpty) {
      setOrderExitPrice(prev => (prev.trim() ? prev : exit))
      setOrderShareAmt(prev => (prev.trim() ? prev : shares))
    } else {
      setOrderExitPrice(exit)
      setOrderShareAmt(shares)
    }
  }, [])

  const handleKellyFractionChange = useCallback(
    (v: number) => {
      setKellyFraction(v)
      if (sizeAtrResult == null || sizeCurrentPrice == null) return
      const metrics = computeKelly(perfSummary?.win_rate, perfSummary?.profit_factor, v)
      const pos = computePositionSize(capital, sizeCurrentPrice, sizeAtrResult, metrics, sizeAtrMultiplier)
      fillOrderDraftFromPos(pos, true)
    },
    [sizeAtrResult, sizeCurrentPrice, sizeAtrMultiplier, capital, perfSummary, fillOrderDraftFromPos],
  )

  const handleAtrMultiplierChange = useCallback(
    (v: number) => {
      setSizeAtrMultiplier(v)
      if (sizeAtrResult == null || sizeCurrentPrice == null) return
      const metrics = computeKelly(perfSummary?.win_rate, perfSummary?.profit_factor, kellyFraction)
      const pos = computePositionSize(capital, sizeCurrentPrice, sizeAtrResult, metrics, v)
      fillOrderDraftFromPos(pos, true)
    },
    [sizeAtrResult, sizeCurrentPrice, kellyFraction, capital, perfSummary, fillOrderDraftFromPos],
  )

  const handlePrimaryTabChange = useCallback(
    (tab: PrimaryWorkflowTab) => {
      setPrimaryTab(tab)
      setInspector({ type: null })
      if (tab !== 'watching' && tab !== 'positions') setShowPositionPicker(false)

      if (tab !== 'sizing') return

      sizingPanelDismissedRef.current = false
      const keysSig = workflow.sizingStockRows.map(r => r.contract_key).join('|')
      if (keysSig !== sizingRowsKeySigRef.current) {
        sizingRowsKeySigRef.current = keysSig
        sizingPanelDismissedRef.current = false
      }

      if (workflow.sizingStockRows.length === 0) {
        setSelectedSizingSymbol(null)
        setSizeAtrResult(null)
        setSizeCurrentPrice(null)
        setSizeComputeError(null)
        orderDraftSymbolRef.current = null
        setOrderEntryPrice('')
        setOrderExitPrice('')
        setOrderShareAmt('100')
        return
      }

      const syms = workflow.sizingStockRows
        .map(s => symbolFromItem(s).trim().toUpperCase())
        .filter(Boolean)
      const cur = (selectedSizingSymbol ?? '').trim().toUpperCase()
      if (cur && syms.includes(cur)) return
      if (sizingPanelDismissedRef.current) return

      const first = symbolFromItem(workflow.sizingStockRows[0]).trim()
      if (first) void handleSizeCompute(first)
    },
    [workflow.sizingStockRows, selectedSizingSymbol, handleSizeCompute],
  )

  const handleAddSymbol = useCallback(async () => {
    const { contract_key, symbol, sec_type } = normalizeToContractKey(addInput)
    if (!contract_key) return
    await addItem.mutateAsync({
      contract_key,
      symbol,
      sec_type,
      source: 'manual',
      category_id: watchingId ?? undefined,
    })
    setAddInput('')
  }, [addInput, watchingId, addItem])

  const handleAddFromPosition = useCallback(
    async (p: (typeof workflow.positions)[number]) => {
      const ck = positionToContractKey(p)
      const exp = (p.expiry ?? p.lastTradeDateOrContractMonth) as string | undefined
      await addItem.mutateAsync({
        contract_key: ck,
        symbol: p.symbol || undefined,
        sec_type: p.secType || undefined,
        source: 'position',
        category_id: watchingId ?? undefined,
        expiry: exp,
        strike: p.strike,
        option_right: p.right,
      })
      setShowPositionPicker(false)
    },
    [addItem, watchingId, workflow],
  )

  const handleSymbolClick = useCallback(
    (item: WatchlistItem, openSizing?: boolean) => {
      const sym = symbolFromItem(item).trim().toUpperCase()
      if (!sym) return
      if (openSizing && primaryTab === 'sizing') {
        void handleSizeCompute(sym)
      }
      setInspector({ type: 'stock', symbol: sym })
    },
    [primaryTab, handleSizeCompute],
  )

  const handlePromote = useCallback(
    async (contractKey: string) => {
      if (sizingId == null) return
      const item = workflow.stocksForPromoteToSizing.find(i => i.contract_key.trim() === contractKey.trim())
      if (!item) return
      await upsertFromItem(item, { category_id: sizingId })
    },
    [sizingId, workflow.stocksForPromoteToSizing, upsertFromItem],
  )

  const submitAddOption = useCallback(async () => {
    if (!addOptionSymbol) return
    const expiry = normalizeExpiryInput(addOptExpiry)
    const strikeNum = parseFloat(addOptStrike.trim())
    if (!expiry || Number.isNaN(strikeNum) || strikeNum < 0) return
    const rightLetter = addOptRight === 'CALL' ? 'C' : 'P'
    const contract_key = `${addOptionSymbol}|OPT|${expiry}|${strikeNum}|${rightLetter}`
    await addItem.mutateAsync({
      contract_key,
      symbol: addOptionSymbol,
      sec_type: 'OPT',
      expiry,
      strike: strikeNum,
      option_right: rightLetter,
      source: 'manual',
    })
    setAddOptionSymbol(null)
    setAddOptExpiry('')
    setAddOptStrike('')
  }, [addOptionSymbol, addOptExpiry, addOptStrike, addOptRight, addItem])

  if (isLoading) {
    return (
      <PageShell className="w-full min-w-0 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    )
  }

  return (
    <PageShell className="flex w-full min-w-0 flex-col gap-4">
      <WatchlistPageHeader
        itemCount={items.length}
        primaryTab={primaryTab}
        addInput={addInput}
        isAdding={addItem.isPending}
        positionsNotInWatchlistCount={workflow.positionsNotInWatchlist.length}
        showPositionPicker={showPositionPicker}
        onAddInputChange={setAddInput}
        onAdd={() => void handleAddSymbol()}
        onTogglePositionPicker={() => setShowPositionPicker(v => !v)}
      />

      {isError && <QueryErrorAlert error={error} />}

      <WorkflowStepper
        active={primaryTab}
        watchingCount={workflow.watchingTabCount}
        sizingCount={workflow.sizingTabCount}
        positionsCount={workflow.positionsTabCount}
        onChange={handlePrimaryTabChange}
      />

      {primaryTab === 'watching' && (
        <WatchingTab
          workflow={workflow}
          categories={categories}
          quoteBySymbol={quoteBySymbol}
          quoteByContractKey={quoteByContractKey}
          watchingCategoryId={watchingId}
          showPositionPicker={showPositionPicker}
          positionsNotInWatchlist={workflow.positionsNotInWatchlist}
          addPending={addItem.isPending}
          itemCount={items.length}
          onSymbolClick={item => handleSymbolClick(item)}
          onToggleOptionable={item => void upsertFromItem(item, { optionable: !item.optionable })}
          onCategoryChange={(item, catId) => void upsertFromItem(item, { category_id: catId })}
          onRemove={item => void removeItem.mutateAsync(item.contract_key)}
          onAddOption={item => setAddOptionSymbol(symbolFromItem(item))}
          onAddFromPosition={handleAddFromPosition}
        />
      )}

      {primaryTab === 'sizing' && (
        <SizingTab
          status={status}
          workflow={workflow}
          categories={categories}
          quoteBySymbol={quoteBySymbol}
          quoteByContractKey={quoteByContractKey}
          perfSummary={perfSummary ?? undefined}
          sizingCategoryId={sizingId}
          addPending={addItem.isPending}
          staticMaxDdPctCap={staticMaxDdPctCap}
          staticRiskPctPerTrade={staticRiskPctPerTrade}
          kellyFraction={kellyFraction}
          sizeAtrMultiplier={sizeAtrMultiplier}
          selectedSizingSymbol={selectedSizingSymbol}
          sizeComputeLoading={sizeComputeLoading}
          sizeComputeError={sizeComputeError}
          sizeAtrResult={sizeAtrResult}
          sizePosResult={sizePosResult}
          sizeCurrentPrice={sizeCurrentPrice}
          orderEntryPrice={orderEntryPrice}
          orderExitPrice={orderExitPrice}
          orderShareAmt={orderShareAmt}
          portfolioRiskCollapsed={portfolioRiskCollapsed}
          onPromote={handlePromote}
          onSymbolClick={handleSymbolClick}
          onRemove={item => void removeItem.mutateAsync(item.contract_key)}
          onMaxDdChange={setStaticMaxDdPctCap}
          onStaticRiskPctChange={setStaticRiskPctPerTrade}
          onKellyFractionChange={handleKellyFractionChange}
          onAtrMultiplierChange={handleAtrMultiplierChange}
          onPortfolioRiskCollapsed={setPortfolioRiskCollapsed}
          onRecompute={sym => void handleSizeCompute(sym)}
          onCloseSizingPanel={() => {
            sizingPanelDismissedRef.current = true
            setSelectedSizingSymbol(null)
            setSizeAtrResult(null)
            setSizeCurrentPrice(null)
            setSizeComputeError(null)
            orderDraftSymbolRef.current = null
            setOrderEntryPrice('')
            setOrderExitPrice('')
            setOrderShareAmt('100')
          }}
          onOrderEntryChange={setOrderEntryPrice}
          onOrderExitChange={setOrderExitPrice}
          onOrderShareChange={setOrderShareAmt}
        />
      )}

      {primaryTab === 'positions' && (
        <PositionsTab
          workflow={workflow}
          categories={categories}
          quoteBySymbol={quoteBySymbol}
          quoteByContractKey={quoteByContractKey}
          onSymbolClick={item => handleSymbolClick(item)}
          onToggleOptionable={item => void upsertFromItem(item, { optionable: !item.optionable })}
          onCategoryChange={(item, catId) => void upsertFromItem(item, { category_id: catId })}
          onRemove={item => void removeItem.mutateAsync(item.contract_key)}
          onAddOption={item => setAddOptionSymbol(symbolFromItem(item))}
        />
      )}

      <InspectorDrawer state={inspector} onClose={() => setInspector({ type: null })} />

      <Dialog open={addOptionSymbol != null} onOpenChange={open => { if (!open) setAddOptionSymbol(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add option — {addOptionSymbol}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="opt-exp">Expiry (YYYYMMDD)</Label>
              <Input id="opt-exp" value={addOptExpiry} onChange={e => setAddOptExpiry(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label>Right</Label>
              <Select value={addOptRight} onValueChange={v => setAddOptRight(v as 'CALL' | 'PUT')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="PUT">Put</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="opt-strike">Strike</Label>
              <Input id="opt-strike" value={addOptStrike} onChange={e => setAddOptStrike(e.target.value)} className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOptionSymbol(null)}>Cancel</Button>
            <Button type="button" onClick={() => void submitAddOption()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
