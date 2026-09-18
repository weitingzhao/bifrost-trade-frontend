import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken, fmtOccContractToken, fmtUsd } from '@/lib/format'
import { DenseTag } from '@/components/data-display'
import { daysBetween } from '@/lib/isoDate'
import { fmtSignedUsd0 } from '@/pages/portfolio/performance/performanceReading'
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
  matchPairLegCashFlows,
  ledgerOptionExecutionCashFlowSigned,
} from '@/utils/ledger/performanceUtils'
import {
  realizedPnlFifoMatchPlusStock,
  scaledLedgerOptDetailRowPnl,
  getOptionStockLinkDetailForExecution,
} from '@/utils/ledger/ledgerOptHelpers'
import { getStkLedgerBucketForExecution } from '@/utils/ledger/stkBuckets'
import { stkSignedTradeNotionalUsd, stkFillNotional, stkFixedIncomeStreamUsd } from '@/utils/ledger/performanceBulk'
import { pnlColorClass } from '@/utils/dailyChange'

// ─── Format helpers ───


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
  /** First day of the selected range, `YYYY-MM-DD`: a matched leg before it is flagged. */
  rangeStart: string
}

// ─── Main Component ───

export function CalendarDayDetail({
  selectedDay,
  calendarAssetTab,
  rawExecsWindow,
  linkByOptionId,
  positionCategoryByAccountContract,
  rangeStart,
}: CalendarDayDetailProps) {
  if (calendarAssetTab === 'options') {
    return (
      <OptionsDayDetail
        selectedDay={selectedDay}
        rawExecsWindow={rawExecsWindow}
        linkByOptionId={linkByOptionId}
        rangeStart={rangeStart}
      />
    )
  }

  return (
    <StkDayDetail
      selectedDay={selectedDay}
      rawExecsWindow={rawExecsWindow}
      positionCategoryByAccountContract={positionCategoryByAccountContract}
      assetTab={calendarAssetTab as Exclude<CalendarAssetTab, 'options'>}
    />
  )
}

// ─── Options Day Detail ───

const STK_TAB_LABELS: Record<string, string> = {
  stocks: 'Stocks',
  fixed_income: 'Fixed Income Stream',
  cash_like: 'Cash-like',
}

interface OptionsDayDetailProps {
  selectedDay: string
  rawExecsWindow: Execution[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  rangeStart: string
}

interface LinkDialogState {
  open: boolean
  title: string
  links: OptionStockLinkSummary['links']
  slippageTotal: number | null
}

type OptionsDayComputed = ReturnType<typeof buildOptionsDayComputed>

function buildOptionsDayComputed(
  rawExecsWindow: Execution[],
  selectedDay: string,
  linkByOptionId: Record<number, OptionStockLinkSummary>,
) {
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
}

// ─── Shared table cells (prototype `.pf-th` / `.pf-td`) ───

const th = 'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const thLeft = cn(th, 'text-left')
const td = 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums'
const tdLeft = cn(td, 'text-left')

function OptionsDayDetail({
  selectedDay,
  rawExecsWindow,
  linkByOptionId,
  rangeStart,
}: OptionsDayDetailProps) {
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    open: false, title: '', links: [], slippageTotal: null,
  })

  const handleViewLinks = useCallback(
    (links: OptionStockLinkSummary['links'], title: string, slippageTotal: number | null) => {
      setLinkDialog({ open: true, title, links, slippageTotal })
    },
    [],
  )

  const computed = useMemo(
    () => buildOptionsDayComputed(rawExecsWindow, selectedDay, linkByOptionId),
    [rawExecsWindow, selectedDay, linkByOptionId],
  )

  if (computed.contractKeys.length === 0) {
    return <p className="m-0 px-3 py-4 text-xs text-muted-foreground">No option executions on this trade date.</p>
  }

  const count = (m: Map<string, string[]>, syms: string[]) => syms.reduce((n, s) => n + (m.get(s) ?? []).length, 0)

  return (
    <div className="min-w-0">
      <p className="m-0 border-b border-border/55 px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground text-pretty">
        Realized: FIFO-matched legs and pairs — each Match row carries open cash (opening premium), close cash (cover
        cost) and net, plus prorated slippage from the linked stock fill. Unrealized: open quantity on unmatched fills,
        shown without direction colour. Commission sits beside each total.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23.75rem),1fr))] gap-px bg-border">
        <OptionsPnlColumn
          variant="realized"
          computed={computed}
          contractCount={count(computed.keysBySymbolRealized, computed.symbolsRealized)}
          linkByOptionId={linkByOptionId}
          onViewLinks={handleViewLinks}
          rangeStart={rangeStart}
        />
        <OptionsPnlColumn
          variant="unrealized"
          computed={computed}
          contractCount={count(computed.keysBySymbolUnrealized, computed.symbolsUnrealized)}
          linkByOptionId={linkByOptionId}
          onViewLinks={handleViewLinks}
          rangeStart={rangeStart}
        />
      </div>

      <OptionStockLinkDialog
        open={linkDialog.open}
        title={linkDialog.title}
        links={linkDialog.links}
        slippageTotal={linkDialog.slippageTotal}
        onClose={() => setLinkDialog((s) => ({ ...s, open: false }))}
      />
    </div>
  )
}

interface OptionsPnlColumnProps {
  variant: 'realized' | 'unrealized'
  computed: OptionsDayComputed
  contractCount: number
  linkByOptionId: Record<number, OptionStockLinkSummary>
  onViewLinks: (links: OptionStockLinkSummary['links'], title: string, slippageTotal: number | null) => void
  rangeStart: string
}

/** One side of the day: every contract that realized, or every contract left unmatched — all listed, no tabs. */
function OptionsPnlColumn({
  variant,
  computed,
  contractCount,
  linkByOptionId,
  onViewLinks,
  rangeStart,
}: OptionsPnlColumnProps) {
  const isRealized = variant === 'realized'
  const keysBySymbol = isRealized ? computed.keysBySymbolRealized : computed.keysBySymbolUnrealized
  const symbols = isRealized ? computed.symbolsRealized : computed.symbolsUnrealized
  const total = isRealized ? computed.totalRealizedSum : computed.totalUnrealizedSum
  const commission = isRealized ? computed.totalCommRealized : computed.totalCommUnrealized
  const keys = symbols.flatMap((sym) => keysBySymbol.get(sym) ?? [])

  return (
    <section
      className="flex min-w-0 flex-col gap-2 bg-[var(--sk-raised)] px-3 pt-2.25 pb-3"
      aria-label={isRealized ? 'Realized PnL' : 'Unrealized PnL'}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-dense-body font-bold text-foreground">{isRealized ? 'Realized' : 'Unrealized'}</span>
        <span className="font-mono text-dense-meta text-muted-foreground">({contractCount})</span>
        <span className={cn('font-mono text-dense-body font-bold tabular-nums', isRealized ? pnlColorClass(total) : 'text-unrealized')}>
          {fmtSignedUsd0(total)}
        </span>
        <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">comm {fmtUsd(Math.abs(commission))}</span>
        {!isRealized && <DenseTag variant="category" size="cell">UNREALIZED</DenseTag>}
      </div>
      <span className="text-dense-meta text-muted-foreground">
        {isRealized
          ? 'Matched legs and pairs by contract (FIFO) · sums to Realized above'
          : 'Executions by contract · unmatched quantity · sums to Unrealized above'}
      </span>

      {keys.length > 0 ? (
        keys.map((key) => (
          <ContractGroup
            key={key}
            execs={computed.byContract.get(key) ?? []}
            pairs={computed.pairByKey.get(key) ?? []}
            execById={computed.execById}
            linkByOptionId={linkByOptionId}
            isRealized={isRealized}
            onViewLinks={onViewLinks}
            rangeStart={rangeStart}
          />
        ))
      ) : (
        <p className="m-0 py-1 text-xs text-muted-foreground">
          {isRealized ? 'No matched pairs closed this day.' : 'No unmatched quantity from this day’s fills.'}
        </p>
      )}
    </section>
  )
}

// ─── Contract Group ───

interface ContractGroupProps {
  execs: Execution[]
  pairs: BackendOptPair[]
  execById: Map<number, Execution>
  linkByOptionId: Record<number, OptionStockLinkSummary>
  isRealized: boolean
  onViewLinks: (links: OptionStockLinkSummary['links'], title: string, slippageTotal: number | null) => void
  rangeStart: string
}

/** Open and close legs of one match, in the order they happened. */
function matchLegs(pair: BackendOptPair, execById: Map<number, Execution>) {
  const legC = pair.leg_c_execution_id != null ? execById.get(pair.leg_c_execution_id) : undefined
  const legP = pair.leg_p_execution_id != null ? execById.get(pair.leg_p_execution_id) : undefined
  const { cashC, cashP } = matchPairLegCashFlows(pair)
  const cFirst = matchLegSortKey(legC) <= matchLegSortKey(legP)
  const dateOf = (e: Execution | undefined) => (e ? executionDateStr(e) : '')
  return {
    open: { date: dateOf(cFirst ? legC : legP), side: cFirst ? pair.c_side : pair.p_side, px: cFirst ? pair.c_price : pair.p_price, cash: cFirst ? cashC : cashP },
    close: { date: dateOf(cFirst ? legP : legC), side: cFirst ? pair.p_side : pair.c_side, px: cFirst ? pair.p_price : pair.c_price, cash: cFirst ? cashP : cashC },
    net: pair.net_pnl ?? matchPnl(pair),
  }
}

function ContractGroup({
  execs,
  pairs,
  execById,
  linkByOptionId,
  isRealized,
  onViewLinks,
  rangeStart,
}: ContractGroupProps) {
  // The group key is account · symbol · expiry · strike, not a contract key; the
  // token is built from the fill itself (§14.4), the broker symbol kept for hover.
  const first = execs[0]
  const firstPair = pairs[0]
  const occ = first?.symbol ?? firstPair?.symbol ?? ''
  const token = (() => {
    const fromOcc = fmtOccContractToken(occ)
    if (fromOcc !== occ.trim()) return fromOcc
    const right = (
      first?.option_right ??
      (firstPair?.leg_c_execution_id != null ? execById.get(firstPair.leg_c_execution_id)?.option_right : undefined) ??
      ''
    ).toUpperCase().slice(0, 1)
    const strike = Number(first?.strike ?? firstPair?.strike)
    return [
      occ.trim().split(/\s+/)[0] || '—',
      fmtIsoDateToken(first?.expiry ?? firstPair?.expiry ?? ''),
      Number.isFinite(strike) && strike > 0 ? `${strike}${right === 'C' || right === 'P' ? right : ''}` : '',
    ].filter((p) => p && p !== '—').join(' ') || '—'
  })()

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

  const { rows, tabPnl, tabComm, pairNetSum } = useMemo(() => {
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
      return { rows, tabPnl, tabComm, pairNetSum }
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
    return { rows, tabPnl, tabComm, pairNetSum: 0 }
  }, [isRealized, sortedExecs, pairs, matchedQtyById, linkByOptionId])

  if (rows.length === 0) return null

  const matches = isRealized ? pairs.map((p) => matchLegs(p, execById)) : []
  const slippage = tabPnl - pairNetSum
  const earliestOpen = matches.map((m) => m.open.date).filter(Boolean).sort()[0]
  const outsideDays = earliestOpen && earliestOpen < rangeStart ? (daysBetween(earliestOpen, rangeStart) ?? 0) : 0

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <div className="flex flex-wrap items-baseline gap-2 bg-[var(--sk-raised2)] px-2.25 py-1.5">
        <span className="font-mono text-xs text-foreground" title={occ}>{token}</span>
        <span className="text-dense-meta text-muted-foreground">{isRealized ? 'matched FIFO' : 'unmatched quantity'}</span>
        <span className={cn('ml-auto font-mono text-xs font-semibold tabular-nums', isRealized ? pnlColorClass(tabPnl) : 'text-unrealized')}>
          {fmtSignedUsd0(tabPnl)}
        </span>
        <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">{fmtUsd(Math.abs(tabComm))}</span>
      </div>

      <div className="overflow-x-auto">
        {/* §14.6: nine columns, 720 floor; the panel scrolls sideways below it. */}
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th className={thLeft}>Record</th>
              <th className={thLeft}>Id</th>
              <th className={thLeft}>Account</th>
              <th className={thLeft}>Trade date</th>
              <th className={thLeft}>Side</th>
              <th className={th}>Qty</th>
              <th className={th}>Price</th>
              <th className={th}>Comm</th>
              <th className={th}>P&amp;L</th>
            </tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      </div>

      {matches.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border/55 px-2.25 py-1.5 text-dense-meta">
          {matches.map((m, i) => (
            <span key={i} className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-baseline gap-1.25">
                <span className="text-muted-foreground">Open {fmtIsoDateToken(m.open.date)} · {m.open.side} @ {fmtUsd(m.open.px)}</span>
                <span className={cn('font-mono font-semibold tabular-nums', pnlColorClass(m.open.cash))}>{fmtSignedUsd0(m.open.cash)}</span>
              </span>
              <span className="flex items-baseline gap-1.25">
                <span className="text-muted-foreground">Close {fmtIsoDateToken(m.close.date)} · {m.close.side} @ {fmtUsd(m.close.px)}</span>
                <span className={cn('font-mono font-semibold tabular-nums', pnlColorClass(m.close.cash))}>{fmtSignedUsd0(m.close.cash)}</span>
              </span>
              <span className="flex items-baseline gap-1.25">
                <span className="text-muted-foreground">Net</span>
                <span className={cn('font-mono font-semibold tabular-nums', pnlColorClass(m.net))}>{fmtSignedUsd0(m.net)}</span>
              </span>
            </span>
          ))}
          {Math.abs(slippage) >= 0.5 && (
            <span className="flex items-baseline gap-1.25">
              <span className="text-muted-foreground">Linked stock slippage (prorated)</span>
              <span className={cn('font-mono font-semibold tabular-nums', pnlColorClass(slippage))}>{fmtSignedUsd0(slippage)}</span>
            </span>
          )}
        </div>
      )}

      {outsideDays > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/55 px-2.25 py-1.5">
          <DenseTag variant="warning" size="cell">leg outside range</DenseTag>
          <span className="text-dense-meta text-muted-foreground text-pretty">
            The opening leg is {outsideDays} {outsideDays === 1 ? 'day' : 'days'} before the selected range — pairing
            looks back 365 days, so this realized figure will not reconcile against range-only sums.
          </span>
        </div>
      )}
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

  const { linkIds, links, slippageTotal } = getOptionStockLinkDetailForExecution(ex, linkByOptionId)

  const sym0 = (ex.symbol ?? '').trim().split(/\s+/)[0]?.trim() ?? ''
  const detailTitle = [sym0, optionRightToFull(ex.option_right), ex.strike != null ? String(ex.strike) : '']
    .filter((x) => String(x).trim() !== '' && x !== '—')
    .join(' ')

  return (
    <tr>
      <td className={cn(tdLeft, 'font-sans text-muted-foreground')}>Execution</td>
      <td className={cn(tdLeft, 'text-muted-foreground')}>
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
                  className="inline-block cursor-pointer rounded bg-amber-500/20 px-1 py-px font-mono text-dense-micro text-amber-600 transition-colors hover:bg-amber-500/30 dark:text-amber-400"
                >
                  #{lid}
                </button>
              ))}
            </span>
          )}
        </span>
      </td>
      <td className={cn(tdLeft, 'text-muted-foreground')}>{ex.account_id ?? '—'}</td>
      <td className={cn(tdLeft, 'text-secondary-foreground')}>{fmtIsoDateToken(ex.trade_date)}</td>
      <td className={cn(tdLeft, 'text-secondary-foreground')}>{ex.side ?? '—'}</td>
      <td className={cn(td, 'text-secondary-foreground')}>{displayQty}</td>
      <td className={cn(td, 'text-secondary-foreground')}>{fmtUsd(ex.price)}</td>
      <td className={cn(td, 'text-muted-foreground')}>{fmtUsd(ec)}</td>
      <td
        className={cn(td, 'font-semibold', isRealized ? pnlColorClass(displayPnl) : 'text-unrealized')}
        title={isRealized && hasCombinedStock ? 'Option premium cash flow for matched quantity plus linked stock slippage' : undefined}
      >
        {fmtPnl(displayPnl)}
      </td>
    </tr>
  )
}

// ─── Match Row ───

function matchLegSortKey(e: Execution | undefined): string {
  if (!e) return '9999-99-99\t9'
  const d = executionDateStr(e)
  const t = String(e.time ?? 0).padStart(16, '0')
  const id = String(e.account_executions_id ?? 0).padStart(12, '0')
  return `${d}\t${t}\t${id}`
}

function MatchRow({
  pair,
  execById,
}: {
  pair: BackendOptPair
  execById: Map<number, Execution>
}) {
  const legC = pair.leg_c_execution_id != null ? execById.get(pair.leg_c_execution_id) : undefined
  const legP = pair.leg_p_execution_id != null ? execById.get(pair.leg_p_execution_id) : undefined
  const dateC = legC ? fmtIsoDateToken(executionDateStr(legC)) : '—'
  const dateP = legP ? fmtIsoDateToken(executionDateStr(legP)) : '—'
  const tradeDateStr =
    dateC !== '—' && dateP !== '—' && dateC !== dateP
      ? `${dateC} / ${dateP}`
      : dateC !== '—'
        ? dateC
        : dateP
  const mp = pair.net_pnl ?? matchPnl(pair)

  return (
    <tr>
      <td className={cn(tdLeft, 'font-sans text-foreground')}>Match</td>
      <td className={cn(tdLeft, 'text-muted-foreground')}>
        {pair.leg_c_execution_id != null && pair.leg_p_execution_id != null
          ? `${pair.leg_c_execution_id} / ${pair.leg_p_execution_id}`
          : '—'}
      </td>
      <td className={cn(tdLeft, 'text-muted-foreground')}>{pair.account_id || '—'}</td>
      <td className={cn(tdLeft, 'text-secondary-foreground')}>{tradeDateStr}</td>
      <td className={cn(tdLeft, 'text-secondary-foreground')}>{`${pair.c_side} / ${pair.p_side}`}</td>
      <td className={cn(td, 'text-secondary-foreground')}>{String(pair.quantity)}</td>
      <td className={cn(td, 'text-secondary-foreground')}>{`${fmtUsd(pair.c_price)} / ${fmtUsd(pair.p_price)}`}</td>
      <td className={cn(td, 'text-muted-foreground')}>{fmtUsd(pair.commission)}</td>
      <td className={cn(td, 'font-semibold', pnlColorClass(mp))}>{fmtPnl(mp)}</td>
    </tr>
  )
}

// ─── STK Day Detail ───

interface StkDayDetailProps {
  selectedDay: string
  rawExecsWindow: Execution[]
  positionCategoryByAccountContract: Map<string, string>
  assetTab: 'stocks' | 'fixed_income' | 'cash_like'
}

function StkDayDetail({
  selectedDay,
  rawExecsWindow,
  positionCategoryByAccountContract,
  assetTab,
}: StkDayDetailProps) {
  const bucketExecs = useMemo(() => {
    const dayExecs = rawExecsWindow.filter((e) => executionDateStr(e) === selectedDay)
    return dayExecs.filter(
      (e) => getStkLedgerBucketForExecution(e, positionCategoryByAccountContract) === assetTab,
    )
  }, [rawExecsWindow, selectedDay, positionCategoryByAccountContract, assetTab])

  const label = STK_TAB_LABELS[assetTab] ?? assetTab

  if (bucketExecs.length === 0) {
    return <p className="m-0 px-3 py-4 text-xs text-muted-foreground">No {label} fills on this trade date in the loaded window.</p>
  }

  return (
    <div className="min-w-0">
      <p className="m-0 border-b border-border/55 px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground text-pretty">
        {label}: daily realized is the sum of broker realized_pnl on the day’s fills in this bucket.
        {assetTab === 'cash_like'
          ? ' Notional is |qty| × price.'
          : assetTab === 'fixed_income'
            ? ' Stream is money flow: buy +, sell −.'
            : ' Notional is signed trade size: sell +, buy −.'}
      </p>
      <div className="overflow-x-auto px-3 py-2.5">
        <table className="w-full min-w-[560px] border-collapse rounded-sm border border-border">
          <thead>
            <tr>
              <th className={thLeft}>Account</th>
              <th className={thLeft}>Symbol</th>
              <th className={thLeft}>Side</th>
              <th className={th}>Qty</th>
              <th className={th}>Price</th>
              <th className={th}>{assetTab === 'fixed_income' ? 'Stream' : 'Notional'}</th>
              <th className={th}>Realized</th>
              <th className={th}>Comm</th>
            </tr>
          </thead>
          <tbody>
            {bucketExecs.map((ex) => {
              const signedNv = assetTab === 'fixed_income' ? stkFixedIncomeStreamUsd(ex) : stkSignedTradeNotionalUsd(ex)
              const notionalDisplay = assetTab === 'cash_like' ? stkFillNotional(ex) : signedNv
              const realized = Number(ex.realized_pnl) || 0
              return (
                <tr key={ex.account_executions_id ?? `${ex.time}-${ex.symbol}`}>
                  <td className={cn(tdLeft, 'text-muted-foreground')}>{ex.account_id ?? '—'}</td>
                  <td className={cn(tdLeft, 'font-bold text-sky-400')}>{ex.symbol ?? '—'}</td>
                  <td className={cn(tdLeft, 'text-secondary-foreground')}>{ex.side ?? '—'}</td>
                  <td className={cn(td, 'text-secondary-foreground')}>
                    {ex.quantity != null ? Number(ex.quantity) : (ex.qty ?? '—')}
                  </td>
                  <td className={cn(td, 'text-secondary-foreground')}>{fmtUsd(ex.price)}</td>
                  <td className={cn(td, 'text-secondary-foreground')}>{fmtUsd(notionalDisplay)}</td>
                  <td className={cn(td, 'font-semibold', pnlColorClass(realized))}>{realized === 0 ? '—' : fmtUsd(realized)}</td>
                  <td className={cn(td, 'text-muted-foreground')}>{fmtUsd(ex.commission ?? 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
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
                  <TableHead className="text-dense-caption uppercase tracking-wider">Link id</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider">Stock id</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider">Symbol</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider">Trade date</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider text-right">Qty</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider text-right">Price</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider text-right">Close</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider text-right">Slippage</TableHead>
                  <TableHead className="text-dense-caption uppercase tracking-wider">Role</TableHead>
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

