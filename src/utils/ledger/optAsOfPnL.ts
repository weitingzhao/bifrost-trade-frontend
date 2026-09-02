/**
 * Options PnL as-of a calendar date (Chicago): open (unmatched) premium cash,
 * distinct from path daily OPT U summed across months.
 */

import type { Execution } from '@/types/positions'
import {
  computeBackendOptPairsFromExecutions,
  executionDateStr,
  ledgerOptionExecutionCashFlowSigned,
  sortExecByExecutionDateThenTime,
  unixTimeToChicagoDateStr,
} from '@/utils/ledger/performanceUtils'

const QTY_EPS = 1e-9

export type OptAsOfSnapshot = {
  /** Chicago YYYY-MM-DD used for the open inventory cut. */
  asOfDateStr: string
  /** Unmatched OPT legs through as-of — premium cash convention (same as day U legs). */
  openUnrealized: number
}

export type OpenOptCashLeg = {
  executionId: number
  openDateStr: string
  cash: number
  unmatchedQty: number
  accountId: string
  symbol: string
  contractKey: string
  side: string
  expiry: string | null
  strike: number | null
  optionRight: string | null
  price: number
}

/** America/Chicago calendar date for "now". */
export function chicagoTodayDateStr(nowMs: number = Date.now()): string {
  return unixTimeToChicagoDateStr(Math.floor(nowMs / 1000))
}

function asOfAbsQty(e: Execution): number {
  return Math.abs(Number(e.quantity ?? e.qty) || 0)
}

/**
 * Normalize option expiry to YYYY-MM-DD (Flex often uses YYYYMMDD).
 * Returns null when unparseable.
 */
export function optionExpiryToDateStr(expiry: string | null | undefined): string | null {
  const s = (expiry ?? '').trim()
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

/**
 * True when the contract is already settled as of `asOfDateStr` (expiry on or
 * before that Chicago calendar day). Expired options with no Flex close must
 * not remain in Open inventory.
 */
export function isOptionExpiredAsOf(
  expiry: string | null | undefined,
  asOfDateStr: string,
): boolean {
  const exp = optionExpiryToDateStr(expiry)
  if (exp == null) return false
  return exp <= asOfDateStr
}

/**
 * Unmatched OPT legs as of `asOfDateStr` (inclusive), with premium cash
 * proportional to unmatched qty. Same FIFO pairing as Performance day U.
 * Contracts expired on/before as-of are excluded (no longer Active inventory).
 */
export function listOpenOptCashLegsAsOf(
  execs: Execution[],
  asOfDateStr: string,
): OpenOptCashLeg[] {
  const through = execs.filter((e) => {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') return false
    const d = executionDateStr(e)
    return d !== '—' && d <= asOfDateStr
  })
  if (through.length === 0) return []

  const pairs = computeBackendOptPairsFromExecutions(through, sortExecByExecutionDateThenTime)
  const matchedQtyById = new Map<number, number>()
  for (const p of pairs) {
    const pq = Math.abs(p.quantity) || 0
    matchedQtyById.set(p.leg_c_execution_id, (matchedQtyById.get(p.leg_c_execution_id) ?? 0) + pq)
    matchedQtyById.set(p.leg_p_execution_id, (matchedQtyById.get(p.leg_p_execution_id) ?? 0) + pq)
  }

  const legs: OpenOptCashLeg[] = []
  for (const e of through) {
    const eid = e.account_executions_id
    if (eid == null) continue
    if (isOptionExpiredAsOf(e.expiry, asOfDateStr)) continue
    const eq = asOfAbsQty(e)
    if (eq <= QTY_EPS) continue
    const mq = matchedQtyById.get(eid) ?? 0
    const uq = eq - mq
    if (uq <= QTY_EPS) continue
    const d = executionDateStr(e)
    if (d === '—') continue
    legs.push({
      executionId: eid,
      openDateStr: d,
      unmatchedQty: uq,
      cash: (uq / eq) * ledgerOptionExecutionCashFlowSigned(e),
      accountId: e.account_id ?? '',
      symbol: (e.symbol ?? '').toUpperCase(),
      contractKey: e.contract_key ?? '',
      side: e.side ?? '',
      expiry: e.expiry ?? null,
      strike: e.strike != null && Number.isFinite(Number(e.strike)) ? Number(e.strike) : null,
      optionRight: e.option_right ?? e.right ?? null,
      price: Number(e.price) || 0,
    })
  }
  return legs
}

/** Still-open legs whose open fill falls in `monthKey` (YYYY-MM). */
export function filterOpenOptCashLegsByOpenMonth(
  legs: OpenOptCashLeg[],
  monthKey: string,
): OpenOptCashLeg[] {
  return legs.filter((l) => l.openDateStr.slice(0, 7) === monthKey)
}

/**
 * Aggregate open fill legs by account + contract for drill-down.
 * Qty / cash sum; open date = earliest fill still open.
 */
export function aggregateOpenOptLegsByContract(legs: OpenOptCashLeg[]): Array<{
  accountId: string
  symbol: string
  contractKey: string
  side: string
  expiry: string | null
  strike: number | null
  optionRight: string | null
  unmatchedQty: number
  cash: number
  openDateStr: string
  fillCount: number
}> {
  const map = new Map<string, {
    accountId: string
    symbol: string
    contractKey: string
    side: string
    expiry: string | null
    strike: number | null
    optionRight: string | null
    unmatchedQty: number
    cash: number
    openDateStr: string
    fillCount: number
  }>()
  for (const leg of legs) {
    const key = `${leg.accountId}\t${leg.contractKey || `${leg.symbol}|${leg.expiry}|${leg.strike}|${leg.optionRight}`}`
    const prev = map.get(key)
    if (!prev) {
      map.set(key, {
        accountId: leg.accountId,
        symbol: leg.symbol,
        contractKey: leg.contractKey,
        side: leg.side,
        expiry: leg.expiry,
        strike: leg.strike,
        optionRight: leg.optionRight,
        unmatchedQty: leg.unmatchedQty,
        cash: leg.cash,
        openDateStr: leg.openDateStr,
        fillCount: 1,
      })
      continue
    }
    prev.unmatchedQty += leg.unmatchedQty
    prev.cash += leg.cash
    prev.fillCount += 1
    if (leg.openDateStr < prev.openDateStr) prev.openDateStr = leg.openDateStr
    if (prev.side && leg.side && prev.side !== leg.side) prev.side = 'Mixed'
  }
  return [...map.values()].sort((a, b) => Math.abs(b.cash) - Math.abs(a.cash) || a.symbol.localeCompare(b.symbol))
}

export function computeOptOpenUnrealizedAsOf(
  execs: Execution[],
  asOfDateStr: string,
): OptAsOfSnapshot {
  const legs = listOpenOptCashLegsAsOf(execs, asOfDateStr)
  const openUnrealized = legs.reduce((s, l) => s + l.cash, 0)
  return { asOfDateStr, openUnrealized }
}

/**
 * Of as-of-today open inventory, sum unmatched cash by the month the open
 * fill occurred (YYYY-MM). Months with no still-open fills are omitted.
 */
export function attributeOpenUnrealizedByOpenMonth(
  execs: Execution[],
  asOfDateStr: string,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const leg of listOpenOptCashLegsAsOf(execs, asOfDateStr)) {
    const mk = leg.openDateStr.slice(0, 7)
    out[mk] = (out[mk] ?? 0) + leg.cash
  }
  return out
}

/**
 * Open unrealized for each calendar day in `dateStrs` (sorted ascending).
 * Computed on each OPT trade date (and range bounds), then forward-filled.
 */
export function computeOptOpenUnrealizedByDay(
  execs: Execution[],
  dateStrs: string[],
): Record<string, number> {
  if (dateStrs.length === 0) return {}

  const minD = dateStrs[0]!
  const maxD = dateStrs[dateStrs.length - 1]!
  const opt = execs.filter((e) => (e.sec_type ?? '').toUpperCase() !== 'OPT' ? false : true)

  const sampleDates = new Set<string>([minD, maxD])
  for (const e of opt) {
    const d = executionDateStr(e)
    if (d !== '—' && d >= minD && d <= maxD) sampleDates.add(d)
  }

  const samples = new Map<string, number>()
  for (const d of [...sampleDates].sort()) {
    samples.set(d, computeOptOpenUnrealizedAsOf(opt, d).openUnrealized)
  }

  const sortedSamples = [...samples.keys()].sort()
  const out: Record<string, number> = {}
  let si = 0
  let last = 0
  for (const day of dateStrs) {
    while (si < sortedSamples.length && sortedSamples[si]! <= day) {
      last = samples.get(sortedSamples[si]!) ?? last
      si += 1
    }
    out[day] = last
  }
  return out
}
