import type { Execution } from '@/types/positions'
import type {
  PerformanceDayPnLCell,
  PerformanceDayPnLBulkResult,
} from '@/types/trading'
import type { StkLedgerBucket, PerformanceCalendarAssetTab } from './stkBuckets'
import { getStkLedgerBucketForExecution } from './stkBuckets'
import { fetchExecutionsRange } from '@/api/trading'
import { fetchOptionStockLinkMapForExecutions } from './fetchOptionStockLinkMap'
import {
  computeBackendOptPairsFromExecutions,
  computeOptionDayPnLForPerformanceDate,
  dateStrMinusDays,
  executionDateStr,
  getChicagoDayRange,
  listDateStrings,
  listMonthKeysInRange,
  sortExecByExecutionDateThenTime,
} from './performanceUtils'

const FETCH_LIMIT = 10000
const STK_BUCKETS: readonly StkLedgerBucket[] = ['stocks', 'fixed_income', 'cash_like']

// --- Execution fetch helpers ---

export function filterExecutionsByUnixRange(
  execs: Execution[],
  since_ts: number,
  until_ts: number,
): Execution[] {
  return execs.filter((e) => {
    const t = e.time
    if (t == null || !Number.isFinite(t)) return false
    return t >= since_ts && t <= until_ts
  })
}

function dedupeExecutionsById(rows: Execution[]): Execution[] {
  const m = new Map<number, Execution>()
  for (const e of rows) {
    const id = e.account_executions_id
    if (id != null && Number.isFinite(id)) m.set(id, e)
  }
  return [...m.values()].sort(sortExecByExecutionDateThenTime)
}

/**
 * Fetch all executions in a date range, with auto-chunking when row cap is hit.
 */
export async function fetchPerformanceExecutionsMerged(
  lookbackStartDateStr: string,
  rangeEndDateStr: string,
  strategyOpportunityId: number | null,
  strategyInstanceId: number | null,
  sourceScope: 'performance_book' | 'on_the_fly' = 'performance_book',
): Promise<Execution[]> {
  const { since_ts: gSince } = getChicagoDayRange(lookbackStartDateStr)
  const { until_ts: gUntil } = getChicagoDayRange(rangeEndDateStr)

  const res = await fetchExecutionsRange({
    since_ts: gSince,
    until_ts: gUntil,
    limit: FETCH_LIMIT,
    include_opt_pairs: false,
    strategy_opportunity_id: strategyOpportunityId ?? undefined,
    strategy_instance_id: strategyInstanceId ?? undefined,
    source_scope: sourceScope,
  })

  const rows = res.items ?? (res as unknown as { executions?: Execution[] }).executions ?? []
  if (rows.length < FETCH_LIMIT) {
    return dedupeExecutionsById(rows)
  }

  const monthKeys = listMonthKeysInRange(lookbackStartDateStr, rangeEndDateStr)
  const merged: Execution[] = []
  for (const mk of monthKeys) {
    const [y, m] = mk.split('-').map(Number)
    const firstDateStr = `${mk}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const lastDateStr = `${mk}-${String(lastDay).padStart(2, '0')}`
    const chunkLb = dateStrMinusDays(firstDateStr, 180)
    const { since_ts: cs } = getChicagoDayRange(chunkLb)
    const { until_ts: cu } = getChicagoDayRange(lastDateStr)
    const chunkRes = await fetchExecutionsRange({
      since_ts: cs,
      until_ts: cu,
      limit: FETCH_LIMIT,
      include_opt_pairs: false,
      strategy_opportunity_id: strategyOpportunityId ?? undefined,
      strategy_instance_id: strategyInstanceId ?? undefined,
      source_scope: sourceScope,
    })
    const chunkRows = chunkRes.items ?? (chunkRes as unknown as { executions?: Execution[] }).executions ?? []
    merged.push(...chunkRows)
  }
  return dedupeExecutionsById(merged)
}

// --- STK helpers ---

/** Absolute fill notional for Cash-like: |qty| * price */
export function stkFillNotional(e: Execution): number {
  if ((e.sec_type ?? '').toUpperCase() !== 'STK') return 0
  const q = Math.abs(Number(e.quantity ?? e.qty) || 0)
  const p = Number(e.price) || 0
  return q * p
}

/**
 * Signed trade notional for STK: SELL = +|q|*p, BUY = -|q|*p.
 * Used for Stocks and Fixed Income daily aggregates.
 */
export function stkSignedTradeNotionalUsd(e: Execution): number {
  if ((e.sec_type ?? '').toUpperCase() !== 'STK') return 0
  const p = Number(e.price) || 0
  if (!Number.isFinite(p)) return 0
  const absQ = Math.abs(Number(e.quantity ?? e.qty) || 0)
  if (absQ <= 0) return 0
  const nv = absQ * p
  const side = (e.side ?? '').toString().trim().toUpperCase()
  if (side === 'SELL' || side === 'SLD' || side === 'S') return nv
  if (side === 'BUY' || side === 'BOT' || side === 'B') return -nv
  return nv
}

/**
 * Sum broker-reported realized_pnl on STK fills for a given trade date,
 * optionally filtered by Ledger bucket.
 */
export function sumStkBrokerRealizedPnlForTradeDate(
  execs: readonly Execution[],
  tradeDateStr: string,
  bucket: 'all' | StkLedgerBucket,
  positionCategoryByAccountContract: Map<string, string>,
): number {
  let sum = 0
  for (const e of execs) {
    if ((e.sec_type ?? '').toUpperCase() !== 'STK') continue
    if (executionDateStr(e) !== tradeDateStr) continue
    if (bucket !== 'all') {
      if (getStkLedgerBucketForExecution(e, positionCategoryByAccountContract) !== bucket) continue
    }
    sum += Number(e.realized_pnl) || 0
  }
  return sum
}

// --- Calendar month grid helpers ---

function monthGridForSource(
  cy: number,
  cm: number,
  source: Record<string, PerformanceDayPnLCell>,
): Record<string, PerformanceDayPnLCell> {
  const lastD = new Date(cy, cm, 0).getDate()
  const out: Record<string, PerformanceDayPnLCell> = {}
  for (let day = 1; day <= lastD; day++) {
    const dateStr = `${cy}-${String(cm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const o = source[dateStr]
    out[dateStr] = o ? { realized: o.realized, unrealized: o.unrealized } : { realized: 0, unrealized: 0 }
  }
  return out
}

function monthGridForNotional(
  cy: number,
  cm: number,
  source: Record<string, number>,
): Record<string, number> {
  const lastD = new Date(cy, cm, 0).getDate()
  const out: Record<string, number> = {}
  for (let day = 1; day <= lastD; day++) {
    const dateStr = `${cy}-${String(cm).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    out[dateStr] = source[dateStr] ?? 0
  }
  return out
}

// --- Main bulk engine ---

/**
 * One batched load: merged executions + bulk link query, then per-day OPT/STK PnL in memory.
 * STK bucket realized uses broker reported realized_pnl; OPT uses FIFO day logic.
 */
export async function loadPerformanceDayPnLBulk(params: {
  sinceStr: string
  untilStr: string
  calendarMonth: string
  strategyOpportunityId: number | null
  strategyInstanceId: number | null
  lookBackDays: number
  positionCategoryByAccountContract: Map<string, string>
}): Promise<PerformanceDayPnLBulkResult> {
  const {
    sinceStr,
    untilStr,
    calendarMonth,
    strategyOpportunityId,
    strategyInstanceId,
    lookBackDays,
    positionCategoryByAccountContract,
  } = params

  const lookbackStartDateStr = dateStrMinusDays(sinceStr, lookBackDays)
  const rawExecsWindow = await fetchPerformanceExecutionsMerged(
    lookbackStartDateStr,
    untilStr,
    strategyOpportunityId,
    strategyInstanceId,
    'performance_book',
  )
  const linkByOptionId = await fetchOptionStockLinkMapForExecutions(rawExecsWindow)

  const rangeDates = listDateStrings(sinceStr, untilStr)
  const opt: Record<string, PerformanceDayPnLCell> = {}
  const stock: Record<string, PerformanceDayPnLCell> = {}
  const stocks: Record<string, PerformanceDayPnLCell> = {}
  const fixed_income: Record<string, PerformanceDayPnLCell> = {}
  const cash_like: Record<string, PerformanceDayPnLCell> = {}
  const notionalStocks: Record<string, number> = {}
  const notionalFi: Record<string, number> = {}
  const notionalCash: Record<string, number> = {}

  for (const dateStr of rangeDates) {
    const lb = dateStrMinusDays(dateStr, lookBackDays)
    const { since_ts } = getChicagoDayRange(lb)
    const { until_ts: dayEnd } = getChicagoDayRange(dateStr)
    const slice = filterExecutionsByUnixRange(rawExecsWindow, since_ts, dayEnd)
    const pairs = computeBackendOptPairsFromExecutions(slice, sortExecByExecutionDateThenTime)
    const optRes = computeOptionDayPnLForPerformanceDate(dateStr, slice, pairs, linkByOptionId)
    opt[dateStr] = { realized: optRes.realized, unrealized: optRes.unrealized }

    const stockR = sumStkBrokerRealizedPnlForTradeDate(rawExecsWindow, dateStr, 'all', positionCategoryByAccountContract)
    stock[dateStr] = { realized: stockR, unrealized: 0 }

    for (const b of STK_BUCKETS) {
      const r = sumStkBrokerRealizedPnlForTradeDate(rawExecsWindow, dateStr, b, positionCategoryByAccountContract)
      const cell: PerformanceDayPnLCell = { realized: r, unrealized: 0 }
      if (b === 'stocks') stocks[dateStr] = cell
      else if (b === 'fixed_income') fixed_income[dateStr] = cell
      else cash_like[dateStr] = cell
    }

    let ns = 0, nf = 0, nc = 0
    for (const e of rawExecsWindow) {
      if ((e.sec_type ?? '').toUpperCase() !== 'STK') continue
      if (executionDateStr(e) !== dateStr) continue
      const buck = getStkLedgerBucketForExecution(e, positionCategoryByAccountContract)
      if (buck === 'stocks') ns += stkSignedTradeNotionalUsd(e)
      else if (buck === 'fixed_income') nf += stkSignedTradeNotionalUsd(e)
      else if (buck === 'cash_like') nc += stkFillNotional(e)
    }
    notionalStocks[dateStr] = ns
    notionalFi[dateStr] = nf
    notionalCash[dateStr] = nc
  }

  const [cy, cm] = calendarMonth.split('-').map(Number)

  const calendarDayPnLByAsset: Record<PerformanceCalendarAssetTab, Record<string, PerformanceDayPnLCell>> = {
    options: monthGridForSource(cy, cm, opt),
    stocks: monthGridForSource(cy, cm, stocks),
    fixed_income: monthGridForSource(cy, cm, fixed_income),
    cash_like: monthGridForSource(cy, cm, cash_like),
  }

  const calendarStkNotionalByBucket: Record<StkLedgerBucket, Record<string, number>> = {
    stocks: monthGridForNotional(cy, cm, notionalStocks),
    fixed_income: monthGridForNotional(cy, cm, notionalFi),
    cash_like: monthGridForNotional(cy, cm, notionalCash),
  }

  return {
    calendarDayPnLByAsset,
    calendarStkNotionalByBucket,
    byDayRangeData: {
      opt,
      stock,
      stocks,
      fixed_income,
      cash_like,
      stkBucketNotional: {
        stocks: notionalStocks,
        fixed_income: notionalFi,
        cash_like: notionalCash,
      },
    },
    linkByOptionId,
    rawExecsWindow,
  }
}
