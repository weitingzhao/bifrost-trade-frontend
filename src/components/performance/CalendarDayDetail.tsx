import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Execution } from '@/types/positions'
import type { BackendOptPair, OptionStockLinkSummary } from '@/types/trading'
import {
  executionDateStr,
  optionRightToFull,
  normalizeStrike,
  sortExecByExecutionDateThenTime,
  computeBackendOptPairsFromExecutions,
  filterRelevantOptPairsForDay,
  matchPnl,
  ledgerOptionExecutionCashFlowSigned,
} from '@/utils/ledger/performanceUtils'
import {
  realizedPnlFifoMatchPlusStock,
  scaledLedgerOptDetailRowPnl,
  getOptionStockLinkDetailForExecution,
  executionLegPnlToneClass,
} from '@/utils/ledger/ledgerOptHelpers'
import { getStkLedgerBucketForExecution } from '@/utils/ledger/stkBuckets'
import { stkSignedTradeNotionalUsd, stkFillNotional } from '@/utils/ledger/performanceBulk'
import { pnlColorClass } from '@/utils/dailyChange'

// ─── Format helpers ───

function fmtUsd(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtPnl(v: number): string {
  if (Math.abs(v) < 0.005) return '$0.00'
  const prefix = v >= 0 ? '' : ''
  return `${prefix}${fmtUsd(v)}`
}

// ─── Types ───

type CalendarAssetTab = 'options' | 'stocks' | 'fixed_income' | 'cash_like'

interface CalendarDayDetailProps {
  selectedDay: string
  calendarAssetTab: CalendarAssetTab
  rawExecsWindow: Execution[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  positionCategoryByAccountContract: Map<string, string>
  onClose: () => void
}

// ─── Main Component ───

export function CalendarDayDetail({
  selectedDay,
  calendarAssetTab,
  rawExecsWindow,
  linkByOptionId,
  positionCategoryByAccountContract,
  onClose,
}: CalendarDayDetailProps) {
  if (calendarAssetTab === 'options') {
    return (
      <OptionsDayDetail
        selectedDay={selectedDay}
        rawExecsWindow={rawExecsWindow}
        linkByOptionId={linkByOptionId}
        onClose={onClose}
      />
    )
  }

  return (
    <StkDayDetail
      selectedDay={selectedDay}
      rawExecsWindow={rawExecsWindow}
      positionCategoryByAccountContract={positionCategoryByAccountContract}
      assetTab={calendarAssetTab as Exclude<CalendarAssetTab, 'options'>}
      onClose={onClose}
    />
  )
}

// ─── Options Day Detail ───

const STK_TAB_LABELS: Record<string, string> = {
  stocks: 'Stocks',
  fixed_income: 'Fixed income',
  cash_like: 'Cash-like',
}

interface OptionsDayDetailProps {
  selectedDay: string
  rawExecsWindow: Execution[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  onClose: () => void
}

interface LinkDialogState {
  open: boolean
  title: string
  links: OptionStockLinkSummary['links']
  slippageTotal: number | null
}

function OptionsDayDetail({
  selectedDay,
  rawExecsWindow,
  linkByOptionId,
  onClose,
}: OptionsDayDetailProps) {
  const [pnlType, setPnlType] = useState<'realized' | 'unrealized'>('realized')
  const [symbolTab, setSymbolTab] = useState<string | null>(null)
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    open: false, title: '', links: [], slippageTotal: null,
  })

  const handleViewLinks = useCallback(
    (links: OptionStockLinkSummary['links'], title: string, slippageTotal: number | null) => {
      setLinkDialog({ open: true, title, links, slippageTotal })
    },
    [],
  )

  const computed = useMemo(() => {
    const allExecs = rawExecsWindow
    const dayExecs = allExecs.filter((e) => executionDateStr(e) === selectedDay)
    const optExecs = dayExecs.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT')

    const backendPairs = computeBackendOptPairsFromExecutions(allExecs)
    const execById = new Map<number, Execution>()
    for (const e of allExecs) {
      if (e.account_executions_id != null) execById.set(e.account_executions_id, e)
    }
    const relevantPairs = filterRelevantOptPairsForDay(backendPairs, execById, selectedDay)

    const contractKey = (e: Execution) =>
      `${e.account_id ?? ''}\t${e.symbol ?? ''}\t${e.expiry ?? ''}\t${normalizeStrike(e.strike)}`
    const pairKey = (p: { account_id: string; symbol: string; expiry: string; strike: string | number }) =>
      `${p.account_id}\t${p.symbol}\t${p.expiry}\t${normalizeStrike(p.strike)}`

    const pairsEnriched = relevantPairs.map((p) => ({
      ...p,
      account_id:
        p.account_id ||
        (p.leg_c_execution_id != null ? execById.get(p.leg_c_execution_id)?.account_id : undefined) ||
        (p.leg_p_execution_id != null ? execById.get(p.leg_p_execution_id)?.account_id : undefined) ||
        '',
    }))

    const pairByKey = new Map<string, BackendOptPair[]>()
    for (const p of pairsEnriched) {
      const k = pairKey(p)
      if (!pairByKey.has(k)) pairByKey.set(k, [])
      pairByKey.get(k)!.push(p)
    }

    const byContract = new Map<string, Execution[]>()
    for (const e of optExecs) {
      const k = contractKey(e)
      if (!byContract.has(k)) byContract.set(k, [])
      byContract.get(k)!.push(e)
    }

    const allContractKeys = new Set<string>(byContract.keys())
    for (const p of pairsEnriched) {
      allContractKeys.add(pairKey(p))
    }

    const contractKeys = Array.from(allContractKeys).sort((a, b) => {
      const execsA = byContract.get(a) ?? []
      const execsB = byContract.get(b) ?? []
      const tA = execsA.length > 0 ? Math.min(...execsA.map((e) => e.time ?? 0)) : 0
      const tB = execsB.length > 0 ? Math.min(...execsB.map((e) => e.time ?? 0)) : 0
      return tA - tB
    })

    // Classify each contract into realized / unrealized buckets, compute PnL
    const keysBySymbolRealized = new Map<string, string[]>()
    const keysBySymbolUnrealized = new Map<string, string[]>()
    const symbolSumRealized = new Map<string, number>()
    const symbolSumUnrealized = new Map<string, number>()
    const symbolCommRealized = new Map<string, number>()
    const symbolCommUnrealized = new Map<string, number>()
    let totalRealizedSum = 0
    let totalUnrealizedSum = 0
    let totalCommRealized = 0
    let totalCommUnrealized = 0

    for (const key of contractKeys) {
      const pairs = pairByKey.get(key) ?? []
      const execs = byContract.get(key) ?? []
      const first = execs[0]
      const firstPair = pairs[0]
      const symbol = first?.symbol ?? firstPair?.symbol ?? '—'
      const sortedExecs = [...execs].sort(sortExecByExecutionDateThenTime)

      const matchedQtyById = new Map<number, number>()
      for (const p of pairs) {
        const pq = Math.abs(p.quantity) || 0
        if (p.leg_c_execution_id != null) matchedQtyById.set(p.leg_c_execution_id, (matchedQtyById.get(p.leg_c_execution_id) ?? 0) + pq)
        if (p.leg_p_execution_id != null) matchedQtyById.set(p.leg_p_execution_id, (matchedQtyById.get(p.leg_p_execution_id) ?? 0) + pq)
      }

      const pairNetSum = pairs.reduce((s, p) => s + (p.net_pnl ?? matchPnl(p)), 0)
      const realizedPnl = realizedPnlFifoMatchPlusStock(pairNetSum, sortedExecs, matchedQtyById, linkByOptionId)
      const realizedComm = pairs.reduce((s, p) => s + (Number(p.commission) || 0), 0)

      let unrealizedPnl = 0
      let unrealizedComm = 0
      let hasUnmatched = false
      for (const e of sortedExecs) {
        const eq = Math.abs(Number(e.quantity ?? e.qty) || 0)
        if (eq <= 0) continue
        const mq = e.account_executions_id != null ? (matchedQtyById.get(e.account_executions_id) ?? 0) : 0
        const uq = eq - mq
        if (uq > 1e-9) {
          const ratio = uq / eq
          unrealizedPnl += ratio * ledgerOptionExecutionCashFlowSigned(e)
          unrealizedComm += ratio * (Number(e.commission) || 0)
          hasUnmatched = true
        }
      }

      if (pairs.length > 0) {
        if (!keysBySymbolRealized.has(symbol)) keysBySymbolRealized.set(symbol, [])
        keysBySymbolRealized.get(symbol)!.push(key)
        symbolSumRealized.set(symbol, (symbolSumRealized.get(symbol) ?? 0) + realizedPnl)
        symbolCommRealized.set(symbol, (symbolCommRealized.get(symbol) ?? 0) + realizedComm)
        totalRealizedSum += realizedPnl
        totalCommRealized += realizedComm
      }
      if (hasUnmatched) {
        if (!keysBySymbolUnrealized.has(symbol)) keysBySymbolUnrealized.set(symbol, [])
        keysBySymbolUnrealized.get(symbol)!.push(key)
        symbolSumUnrealized.set(symbol, (symbolSumUnrealized.get(symbol) ?? 0) + unrealizedPnl)
        symbolCommUnrealized.set(symbol, (symbolCommUnrealized.get(symbol) ?? 0) + unrealizedComm)
        totalUnrealizedSum += unrealizedPnl
        totalCommUnrealized += unrealizedComm
      }
    }

    return {
      contractKeys,
      byContract,
      pairByKey,
      execById,
      keysBySymbolRealized,
      keysBySymbolUnrealized,
      symbolSumRealized,
      symbolSumUnrealized,
      symbolCommRealized,
      symbolCommUnrealized,
      totalRealizedSum,
      totalUnrealizedSum,
      totalCommRealized,
      totalCommUnrealized,
      symbolsRealized: Array.from(keysBySymbolRealized.keys()).sort(),
      symbolsUnrealized: Array.from(keysBySymbolUnrealized.keys()).sort(),
    }
  }, [rawExecsWindow, selectedDay, linkByOptionId])

  const isRealized = pnlType === 'realized'
  const keysBySymbolForType = isRealized ? computed.keysBySymbolRealized : computed.keysBySymbolUnrealized
  const symbolsForType = isRealized ? computed.symbolsRealized : computed.symbolsUnrealized
  const symbolSumForType = isRealized ? computed.symbolSumRealized : computed.symbolSumUnrealized
  const symbolCommForType = isRealized ? computed.symbolCommRealized : computed.symbolCommUnrealized
  const effectiveSymbol =
    (symbolTab && symbolsForType.includes(symbolTab) ? symbolTab : symbolsForType[0]) ?? null

  if (computed.contractKeys.length === 0) {
    return (
      <DayDetailShell title={selectedDay} onClose={onClose}>
        <p className="text-sm text-muted-foreground py-4">
          No Option executions in DB for this trade date.
        </p>
      </DayDetailShell>
    )
  }

  return (
    <DayDetailShell title={selectedDay} onClose={onClose}>
      {/* Subtitle */}
      <p className="text-sm font-medium text-foreground/80 mb-1">
        {isRealized ? 'Matched legs and pairs by contract (FIFO)' : 'Executions by contract (unmatched quantity)'}
      </p>
      {isRealized && (
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          Realized lists execution legs that participate in a FIFO match (scaled to matched qty when partial), then match rows.
          Match row PnL is option (FIFO) only. Execution rows show per-leg premium plus prorated linked stock.
          Symbol totals = sum of Match option PnL (FIFO) plus prorated linked-stock slippage. Open quantity appears under Unrealized.
        </p>
      )}

      {/* Realized / Unrealized tabs */}
      <div className="flex gap-1 mb-3" role="tablist" aria-label="PnL type">
        <PnlTypeTab
          label="Realized"
          count={computed.symbolsRealized.reduce((n, s) => n + (computed.keysBySymbolRealized.get(s) ?? []).length, 0)}
          total={computed.totalRealizedSum}
          commission={computed.totalCommRealized}
          isActive={isRealized}
          isRealized
          onClick={() => setPnlType('realized')}
        />
        <PnlTypeTab
          label="Unrealized"
          count={computed.symbolsUnrealized.reduce((n, s) => n + (computed.keysBySymbolUnrealized.get(s) ?? []).length, 0)}
          total={computed.totalUnrealizedSum}
          commission={computed.totalCommUnrealized}
          isActive={!isRealized}
          isRealized={false}
          onClick={() => setPnlType('unrealized')}
        />
      </div>

      {/* Symbol sub-tabs */}
      {symbolsForType.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4" role="tablist" aria-label="Symbol">
          {symbolsForType.map((sym) => {
            const sum = symbolSumForType.get(sym) ?? 0
            const comm = symbolCommForType.get(sym) ?? 0
            return (
              <button
                key={sym}
                role="tab"
                aria-selected={sym === effectiveSymbol}
                onClick={() => setSymbolTab(sym)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  sym === effectiveSymbol
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                {sym}
                <span className={cn('tabular-nums', isRealized ? pnlColorClass(sum) : 'text-blue-500 dark:text-blue-400')}>
                  {fmtUsd(sum)}
                </span>
                <span className="text-yellow-600 dark:text-yellow-400 tabular-nums">{fmtUsd(comm)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {symbolsForType.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          {isRealized
            ? 'No realized (matched BUY↔SELL) pairs for this day.'
            : 'No unrealized (unmatched) executions for this day.'}
        </p>
      )}

      {/* Contract groups */}
      {effectiveSymbol &&
        (keysBySymbolForType.get(effectiveSymbol) ?? []).map((key) => (
          <ContractGroup
            key={key}
            contractKey={key}
            execs={computed.byContract.get(key) ?? []}
            pairs={computed.pairByKey.get(key) ?? []}
            execById={computed.execById}
            linkByOptionId={linkByOptionId}
            isRealized={isRealized}
            onViewLinks={handleViewLinks}
          />
        ))}

      {/* Option-Stock Link Dialog */}
      <OptionStockLinkDialog
        open={linkDialog.open}
        title={linkDialog.title}
        links={linkDialog.links}
        slippageTotal={linkDialog.slippageTotal}
        onClose={() => setLinkDialog((s) => ({ ...s, open: false }))}
      />
    </DayDetailShell>
  )
}

// ─── Contract Group ───

interface ContractGroupProps {
  contractKey: string
  execs: Execution[]
  pairs: BackendOptPair[]
  execById: Map<number, Execution>
  linkByOptionId: Record<number, OptionStockLinkSummary>
  isRealized: boolean
  onViewLinks: (links: OptionStockLinkSummary['links'], title: string, slippageTotal: number | null) => void
}

function ContractGroup({
  execs,
  pairs,
  execById,
  linkByOptionId,
  isRealized,
  onViewLinks,
}: ContractGroupProps) {
  const first = execs[0]
  const firstPair = pairs[0]
  const symbol = first?.symbol ?? firstPair?.symbol ?? '—'
  const expiry = first?.expiry ?? firstPair?.expiry ?? '—'
  const strike = first?.strike ?? firstPair?.strike ?? '—'
  const rightFull = optionRightToFull(
    first?.option_right ??
      (firstPair?.leg_c_execution_id != null
        ? execById.get(firstPair.leg_c_execution_id)?.option_right
        : firstPair?.leg_p_execution_id != null
          ? execById.get(firstPair.leg_p_execution_id)?.option_right
          : undefined),
  )

  const sortedExecs = useMemo(() => [...execs].sort(sortExecByExecutionDateThenTime), [execs])

  const matchedQtyById = useMemo(() => {
    const m = new Map<number, number>()
    for (const p of pairs) {
      const pq = Math.abs(p.quantity) || 0
      if (p.leg_c_execution_id != null) m.set(p.leg_c_execution_id, (m.get(p.leg_c_execution_id) ?? 0) + pq)
      if (p.leg_p_execution_id != null) m.set(p.leg_p_execution_id, (m.get(p.leg_p_execution_id) ?? 0) + pq)
    }
    return m
  }, [pairs])

  type Row =
    | { type: 'Execution'; e: Execution; ratio: number }
    | { type: 'Match'; p: BackendOptPair }

  const { rows, tabPnl, tabComm } = useMemo(() => {
    const pairedLegIdSet = new Set<number>()
    for (const p of pairs) {
      if (p.leg_c_execution_id != null) pairedLegIdSet.add(p.leg_c_execution_id)
      if (p.leg_p_execution_id != null) pairedLegIdSet.add(p.leg_p_execution_id)
    }

    if (isRealized) {
      const execRows: { e: Execution; matchedRatio: number }[] = []
      for (const e of sortedExecs) {
        const id = e.account_executions_id
        if (id == null || !pairedLegIdSet.has(id)) continue
        const eq = Math.abs(Number(e.quantity ?? e.qty) || 0)
        if (eq <= 0) continue
        const mq = matchedQtyById.get(id) ?? 0
        if (mq <= 1e-9) continue
        execRows.push({ e, matchedRatio: mq / eq })
      }
      const rows: Row[] = [
        ...execRows.map(({ e, matchedRatio }) => ({ type: 'Execution' as const, e, ratio: matchedRatio })),
        ...pairs.map((p) => ({ type: 'Match' as const, p })),
      ]
      const pairNetSum = pairs.reduce((s, p) => s + (p.net_pnl ?? matchPnl(p)), 0)
      const tabPnl = realizedPnlFifoMatchPlusStock(pairNetSum, sortedExecs, matchedQtyById, linkByOptionId)
      const tabComm = pairs.reduce((s, p) => s + (Number(p.commission) || 0), 0)
      return { rows, tabPnl, tabComm }
    }

    let tabPnl = 0
    let tabComm = 0
    const unmatchedRows: { e: Execution; unmatchedRatio: number }[] = []
    for (const e of sortedExecs) {
      const eq = Math.abs(Number(e.quantity ?? e.qty) || 0)
      if (eq <= 0) continue
      const mq = e.account_executions_id != null ? (matchedQtyById.get(e.account_executions_id) ?? 0) : 0
      const uq = eq - mq
      if (uq > 1e-9) {
        const ratio = uq / eq
        unmatchedRows.push({ e, unmatchedRatio: ratio })
        tabPnl += ratio * ledgerOptionExecutionCashFlowSigned(e)
        tabComm += ratio * (Number(e.commission) || 0)
      }
    }
    const rows: Row[] = unmatchedRows.map(({ e, unmatchedRatio }) => ({ type: 'Execution' as const, e, ratio: unmatchedRatio }))

    return { rows, tabPnl, tabComm }
  }, [isRealized, sortedExecs, pairs, matchedQtyById, linkByOptionId])

  if (rows.length === 0) return null

  return (
    <div className="mb-4 last:mb-0">
      {/* Contract header */}
      <div className="flex items-baseline gap-2 mb-1.5 px-1">
        <span className="text-xs font-semibold text-foreground">
          {symbol} {expiry} {strike} {rightFull !== '—' ? rightFull : ''}
        </span>
        <span className={cn('text-xs font-semibold tabular-nums', isRealized ? pnlColorClass(tabPnl) : 'text-blue-500 dark:text-blue-400')}>
          {fmtUsd(tabPnl)}
        </span>
        <span className="text-xs tabular-nums text-yellow-600 dark:text-yellow-400">{fmtUsd(tabComm)}</span>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[10px] uppercase tracking-wider w-[80px]">Record type</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Id</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Account</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Trade Date</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Side</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Price</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Commission</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">PnL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) =>
              row.type === 'Match' ? (
                <MatchRow key={`match-${idx}`} pair={row.p} execById={execById} />
              ) : (
                <ExecutionRow
                  key={row.e.account_executions_id ?? idx}
                  ex={row.e}
                  ratio={row.ratio}
                  linkByOptionId={linkByOptionId}
                  isRealized={isRealized}
                  onViewLinks={onViewLinks}
                />
              ),
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Execution Row ───

function ExecutionRow({
  ex,
  ratio,
  linkByOptionId,
  isRealized,
  onViewLinks,
}: {
  ex: Execution
  ratio: number
  linkByOptionId: Record<number, OptionStockLinkSummary>
  isRealized: boolean
  onViewLinks: (links: OptionStockLinkSummary['links'], title: string, slippageTotal: number | null) => void
}) {
  const eq = Math.abs(Number(ex.quantity ?? ex.qty) || 0)
  const displayQty = ratio < 1 - 1e-9 ? Math.round(eq * ratio * 1e4) / 1e4 : (ex.quantity ?? ex.qty ?? '—')
  const ec = (Number(ex.commission) || 0) * ratio

  const { displayPnl, hasCombinedStock } = isRealized
    ? scaledLedgerOptDetailRowPnl(ex, ratio, linkByOptionId)
    : { displayPnl: ledgerOptionExecutionCashFlowSigned(ex) * ratio, hasCombinedStock: false }

  const pnlClass = isRealized
    ? pnlColorClass(displayPnl)
    : executionLegPnlToneClass(ex, displayPnl)

  const { linkIds, links, slippageTotal } = getOptionStockLinkDetailForExecution(ex, linkByOptionId)

  const sym0 = (ex.symbol ?? '').trim().split(/\s+/)[0]?.trim() ?? ''
  const detailTitle = [sym0, optionRightToFull(ex.option_right), ex.strike != null ? String(ex.strike) : '']
    .filter((x) => String(x).trim() !== '' && x !== '—')
    .join(' ')

  return (
    <TableRow>
      <TableCell className="text-xs">Execution</TableCell>
      <TableCell className="text-xs tabular-nums">
        <span className="inline-flex items-center gap-1">
          {ex.account_executions_id ?? '—'}
          {isRealized && linkIds.length > 0 && (
            <span className="inline-flex gap-0.5">
              {linkIds.map((lid) => (
                <button
                  key={lid}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewLinks(
                      links,
                      `Link #${lid} · Exec #${ex.account_executions_id ?? '?'} · ${detailTitle || 'Option'}`,
                      slippageTotal,
                    )
                  }}
                  className="inline-block rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-px text-[9px] font-mono cursor-pointer hover:bg-amber-500/30 transition-colors"
                >
                  #{lid}
                </button>
              ))}
            </span>
          )}
        </span>
      </TableCell>
      <TableCell className="text-xs">{ex.account_id ?? '—'}</TableCell>
      <TableCell className="text-xs tabular-nums">{(ex.trade_date ?? '').trim() || '—'}</TableCell>
      <TableCell className="text-xs">{ex.side ?? '—'}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{displayQty}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{fmtUsd(ex.price)}</TableCell>
      <TableCell className="text-xs text-right tabular-nums">{fmtUsd(ec)}</TableCell>
      <TableCell
        className={cn('text-xs text-right tabular-nums font-medium', pnlClass)}
        title={isRealized && hasCombinedStock ? 'Option premium cash flow for matched quantity plus linked stock slippage' : undefined}
      >
        {fmtPnl(displayPnl)}
      </TableCell>
    </TableRow>
  )
}

// ─── Match Row ───

function MatchRow({
  pair,
  execById,
}: {
  pair: BackendOptPair
  execById: Map<number, Execution>
}) {
  const legC = pair.leg_c_execution_id != null ? execById.get(pair.leg_c_execution_id) : undefined
  const legP = pair.leg_p_execution_id != null ? execById.get(pair.leg_p_execution_id) : undefined
  const tdC = (legC?.trade_date ?? '').trim()
  const tdP = (legP?.trade_date ?? '').trim()
  const tradeDateStr = tdC !== '' ? tdC : tdP !== '' ? tdP : '—'
  const mp = pair.net_pnl ?? matchPnl(pair)

  return (
    <TableRow className="bg-muted/20">
      <TableCell className="text-xs font-medium text-muted-foreground">Match</TableCell>
      <TableCell className="text-xs tabular-nums text-muted-foreground">
        {pair.leg_c_execution_id != null && pair.leg_p_execution_id != null
          ? `${pair.leg_c_execution_id} / ${pair.leg_p_execution_id}`
          : '—'}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{pair.account_id || '—'}</TableCell>
      <TableCell className="text-xs tabular-nums text-muted-foreground">{tradeDateStr}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{`${pair.c_side} / ${pair.p_side}`}</TableCell>
      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{String(pair.quantity)}</TableCell>
      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
        {`${fmtUsd(pair.c_price)} / ${fmtUsd(pair.p_price)}`}
      </TableCell>
      <TableCell className="text-xs text-right tabular-nums text-muted-foreground">{fmtUsd(pair.commission)}</TableCell>
      <TableCell className={cn('text-xs text-right tabular-nums font-medium', pnlColorClass(mp))}>
        {fmtPnl(mp)}
      </TableCell>
    </TableRow>
  )
}

// ─── STK Day Detail ───

interface StkDayDetailProps {
  selectedDay: string
  rawExecsWindow: Execution[]
  positionCategoryByAccountContract: Map<string, string>
  assetTab: 'stocks' | 'fixed_income' | 'cash_like'
  onClose: () => void
}

function StkDayDetail({
  selectedDay,
  rawExecsWindow,
  positionCategoryByAccountContract,
  assetTab,
  onClose,
}: StkDayDetailProps) {
  const bucketExecs = useMemo(() => {
    const dayExecs = rawExecsWindow.filter((e) => executionDateStr(e) === selectedDay)
    return dayExecs.filter(
      (e) => getStkLedgerBucketForExecution(e, positionCategoryByAccountContract) === assetTab,
    )
  }, [rawExecsWindow, selectedDay, positionCategoryByAccountContract, assetTab])

  const label = STK_TAB_LABELS[assetTab] ?? assetTab

  if (bucketExecs.length === 0) {
    return (
      <DayDetailShell title={selectedDay} onClose={onClose}>
        <p className="text-sm text-muted-foreground py-4">
          No {label} executions on this trade date in the loaded window.
        </p>
      </DayDetailShell>
    )
  }

  return (
    <DayDetailShell title={selectedDay} onClose={onClose}>
      <p className="text-sm font-medium text-foreground/80 mb-1">STK executions ({label})</p>
      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        Calendar daily realized is the sum of broker realized_pnl on fills for this trade date in this bucket.
        {assetTab === 'cash_like'
          ? ' Cash-like Notional uses |qty|×price.'
          : ' Stocks / Fixed income Notional is signed trade size (qty×price, net buy vs sell).'}
      </p>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[10px] uppercase tracking-wider">Account</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Symbol</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider">Side</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Qty</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Price</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Notional</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Realized PnL</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider text-right">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bucketExecs.map((ex) => {
              const signedNv = stkSignedTradeNotionalUsd(ex)
              const notionalDisplay = assetTab === 'cash_like' ? stkFillNotional(ex) : signedNv
              const notionalColor =
                assetTab === 'cash_like'
                  ? ''
                  : signedNv > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : signedNv < 0
                      ? 'text-red-600 dark:text-red-400'
                      : ''
              return (
                <TableRow key={ex.account_executions_id ?? `${ex.time}-${ex.symbol}`}>
                  <TableCell className="text-xs">{ex.account_id ?? '—'}</TableCell>
                  <TableCell className="text-xs">{ex.symbol ?? '—'}</TableCell>
                  <TableCell className="text-xs">{ex.side ?? '—'}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {ex.quantity != null ? Number(ex.quantity) : (ex.qty ?? '—')}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{fmtUsd(ex.price)}</TableCell>
                  <TableCell className={cn('text-xs text-right tabular-nums', notionalColor)}>
                    {fmtUsd(notionalDisplay)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {fmtUsd(Number(ex.realized_pnl) || 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {fmtUsd(ex.commission ?? 0)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </DayDetailShell>
  )
}

// ─── Shared shell ───

function DayDetailShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Records for {title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ─── Option-Stock Link Dialog ───

function OptionStockLinkDialog({
  open,
  title,
  links,
  slippageTotal,
  onClose,
}: {
  open: boolean
  title: string
  links: OptionStockLinkSummary['links']
  slippageTotal: number | null
  onClose: () => void
}) {
  type LinkRow = Record<string, unknown>
  const rows = links as unknown as LinkRow[]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Linked stock executions</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-2">{title}</p>
        {slippageTotal != null && Number.isFinite(slippageTotal) && (
          <p className="text-xs text-muted-foreground mb-3">
            Total stock slippage vs close:{' '}
            <span className={cn('font-semibold tabular-nums', pnlColorClass(slippageTotal))}>{fmtUsd(slippageTotal)}</span>
          </p>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No link rows.</p>
        ) : (
          <div className="max-h-[360px] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[10px] uppercase tracking-wider">Link id</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Stock id</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Symbol</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Trade date</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Qty</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Price</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Close</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider text-right">Slippage</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={(row.link_id as number) ?? idx}>
                    <TableCell className="text-xs tabular-nums">#{String(row.link_id ?? '—')}</TableCell>
                    <TableCell className="text-xs tabular-nums">#{String(row.stock_account_executions_id ?? '—')}</TableCell>
                    <TableCell className="text-xs">{String(row.stock_symbol ?? '—')}</TableCell>
                    <TableCell className="text-xs tabular-nums">{String(row.stock_trade_date ?? '—')}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {row.stock_quantity != null ? String(Number(row.stock_quantity)) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtUsd(row.stock_price as number)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{fmtUsd(row.stock_close_price as number)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {row.slippage_vs_close != null ? fmtUsd(row.slippage_vs_close as number) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{String(row.role ?? '—')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── PnL Type Tab Button ───

function PnlTypeTab({
  label,
  count,
  total,
  commission,
  isActive,
  isRealized,
  onClick,
}: {
  label: string
  count: number
  total: number
  commission: number
  isActive: boolean
  isRealized: boolean
  onClick: () => void
}) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
        isActive
          ? 'border-primary bg-primary/10 text-foreground shadow-sm'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {label}
      {count > 0 && (
        <>
          <span className="text-muted-foreground">({count})</span>
          <span className={cn('tabular-nums', isRealized ? pnlColorClass(total) : 'text-blue-500 dark:text-blue-400')}>
            {fmtUsd(total)}
          </span>
          <span className="text-yellow-600 dark:text-yellow-400 tabular-nums">{fmtUsd(commission)}</span>
        </>
      )}
    </button>
  )
}
