/**
 * B0 — Same-day option roll detection + Economic day delta.
 * Book OPT R unchanged; Economic replaces roll-close Book realized with net roll cash.
 */

import type { Execution } from '@/types/positions'
import type { BackendOptPair, EconomicOptDayCell, PerformanceDayPnLCell } from '@/types/trading'
import { isBuySide } from '@/utils/instanceDetail/executionSide'
import {
  computeBackendOptPairsFromExecutions,
  executionDateStr,
  ledgerOptionExecutionCashFlowSigned,
  matchPnl,
  sortExecByExecutionDateThenTime,
} from '@/utils/ledger/performanceUtils'

const QTY_EPS = 1e-9

export type SameDayRollEvent = {
  dateStr: string
  accountId: string
  underlying: string
  optionRight: string
  qty: number
  closeExecutionId: number
  openExecutionId: number
  closeContractKey: string
  openContractKey: string
  /** Signed cash for matched close qty + matched open qty. */
  cashRoll: number
  /** Book FIFO realized share attributed to the close leg match. */
  bookCloseRealized: number
}

export type { EconomicOptDayCell }

function underlyingOf(e: Execution): string {
  return (e.symbol ?? '').trim().split(/\s+/)[0] ?? ''
}

function optionRightNorm(e: Execution): string {
  const r = (e.option_right ?? e.right ?? '').toString().trim().toUpperCase()
  if (r === 'CALL' || r === 'C') return 'C'
  if (r === 'PUT' || r === 'P') return 'P'
  return r.slice(0, 1) || '?'
}

function contractKeyOf(e: Execution): string {
  if (e.contract_key?.trim()) return e.contract_key.trim()
  const sym = underlyingOf(e)
  const exp = (e.expiry ?? '').replace(/-/g, '')
  const strike = e.strike ?? 0
  const right = optionRightNorm(e)
  return `${sym}|OPT|${exp}|${strike}|${right}`
}

function rollAbsQty(e: Execution): number {
  return Math.abs(Number(e.quantity ?? e.qty) || 0)
}

/** Signed inventory: Buy +, Sell −. */
function signedQty(e: Execution): number {
  const q = rollAbsQty(e)
  return isBuySide(e) ? q : -q
}

function cashForMatchedQty(e: Execution, matchedQty: number): number {
  const q = rollAbsQty(e)
  if (q <= QTY_EPS || matchedQty <= QTY_EPS) return 0
  const full = ledgerOptionExecutionCashFlowSigned(e)
  return (matchedQty / q) * full
}

/**
 * Net signed position per contract from executions strictly before dateStr
 * (by executionDateStr).
 */
export function positionByContractBeforeDay(
  execs: Execution[],
  dateStr: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of execs) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const d = executionDateStr(e)
    if (d === '—' || d >= dateStr) continue
    const ck = contractKeyOf(e)
    map.set(ck, (map.get(ck) ?? 0) + signedQty(e))
  }
  return map
}

type DayFillSlice = {
  e: Execution
  eid: number
  contractKey: string
  remaining: number
  /** True when this qty reduces prior inventory on this contract. */
  closing: boolean
}

function buildDaySlices(
  dayExecs: Execution[],
  posBefore: Map<string, number>,
): DayFillSlice[] {
  const pos = new Map(posBefore)
  const slices: DayFillSlice[] = []
  const sorted = [...dayExecs].sort(sortExecByExecutionDateThenTime)

  for (const e of sorted) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const eid = e.account_executions_id
    if (eid == null || !Number.isFinite(eid)) continue
    let rem = rollAbsQty(e)
    if (rem <= QTY_EPS) continue
    const ck = contractKeyOf(e)
    let inv = pos.get(ck) ?? 0
    const buy = isBuySide(e)

    // Closing portion: opposite to inventory sign.
    let closeQty = 0
    if (inv > QTY_EPS && !buy) closeQty = Math.min(rem, inv)
    else if (inv < -QTY_EPS && buy) closeQty = Math.min(rem, -inv)

    if (closeQty > QTY_EPS) {
      slices.push({ e, eid, contractKey: ck, remaining: closeQty, closing: true })
      rem -= closeQty
      inv += buy ? closeQty : -closeQty
    }
    if (rem > QTY_EPS) {
      slices.push({ e, eid, contractKey: ck, remaining: rem, closing: false })
      inv += buy ? rem : -rem
    }
    pos.set(ck, inv)
  }
  return slices
}

function bookRealizedForCloseMatch(
  closeEid: number,
  matchedQty: number,
  pairs: BackendOptPair[],
  execById: Map<number, Execution>,
  dateStr: string,
): number {
  let allocated = 0
  let pairQtyOnClose = 0
  for (const p of pairs) {
    const involves =
      p.leg_c_execution_id === closeEid || p.leg_p_execution_id === closeEid
    if (!involves) continue
    const legC = execById.get(p.leg_c_execution_id)
    const legP = execById.get(p.leg_p_execution_id)
    if (legC == null || legP == null) continue
    const cOnDay = executionDateStr(legC) === dateStr
    const pOnDay = executionDateStr(legP) === dateStr
    // Day-relevant pairs: at least one leg on dateStr (same filterRelevant spirit).
    if (!cOnDay && !pOnDay) continue
    const pq = Math.abs(p.quantity) || 0
    if (pq <= QTY_EPS) continue
    if (p.leg_c_execution_id === closeEid || p.leg_p_execution_id === closeEid) {
      pairQtyOnClose += pq
      allocated += p.net_pnl ?? matchPnl(p)
    }
  }
  if (pairQtyOnClose <= QTY_EPS) {
    // Without pairs, do not invent Book share (prefer 0 over marks).
    return 0
  }
  return (matchedQty / pairQtyOnClose) * allocated
}

/**
 * Detect same-day rolls: closing qty on contract A matched to opening qty on
 * contract B (same account, underlying, right; A ≠ B).
 */
export function detectSameDayOptionRolls(execs: Execution[]): SameDayRollEvent[] {
  const opt = execs.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT')
  const byDay = new Map<string, Execution[]>()
  for (const e of opt) {
    const d = executionDateStr(e)
    if (d === '—') continue
    const arr = byDay.get(d) ?? []
    arr.push(e)
    byDay.set(d, arr)
  }

  const allPairs = computeBackendOptPairsFromExecutions(opt, sortExecByExecutionDateThenTime)
  const execById = new Map<number, Execution>()
  for (const e of opt) {
    if (e.account_executions_id != null) execById.set(e.account_executions_id, e)
  }

  const events: SameDayRollEvent[] = []

  for (const [dateStr, dayExecs] of [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const posBefore = positionByContractBeforeDay(opt, dateStr)
    const slices = buildDaySlices(dayExecs, posBefore)

    // Bucket by account|underlying|right
    type Bucket = { closes: DayFillSlice[]; opens: DayFillSlice[] }
    const buckets = new Map<string, Bucket>()
    for (const s of slices) {
      const acc = s.e.account_id ?? ''
      const und = underlyingOf(s.e)
      const right = optionRightNorm(s.e)
      const key = `${acc}\t${und}\t${right}`
      const b = buckets.get(key) ?? { closes: [], opens: [] }
      if (s.closing) b.closes.push({ ...s })
      else b.opens.push({ ...s })
      buckets.set(key, b)
    }

    for (const [bKey, bucket] of buckets) {
      const [accountId, underlying, optionRight] = bKey.split('\t')
      const closes = bucket.closes.map((s) => ({ ...s }))
      const opens = bucket.opens.map((s) => ({ ...s }))

      for (const c of closes) {
        if (c.remaining <= QTY_EPS) continue
        for (const o of opens) {
          if (o.remaining <= QTY_EPS) continue
          if (o.contractKey === c.contractKey) continue
          // Roll: opposite sides (close long→sell vs open long→buy, etc.)
          if (isBuySide(c.e) === isBuySide(o.e)) continue

          const qty = Math.min(c.remaining, o.remaining)
          if (qty <= QTY_EPS) continue

          const cashRoll =
            cashForMatchedQty(c.e, qty) + cashForMatchedQty(o.e, qty)
          const bookCloseRealized = bookRealizedForCloseMatch(
            c.eid,
            qty,
            allPairs,
            execById,
            dateStr,
          )

          events.push({
            dateStr,
            accountId: accountId ?? '',
            underlying: underlying ?? '',
            optionRight: optionRight ?? '',
            qty,
            closeExecutionId: c.eid,
            openExecutionId: o.eid,
            closeContractKey: c.contractKey,
            openContractKey: o.contractKey,
            cashRoll,
            bookCloseRealized,
          })

          c.remaining -= qty
          o.remaining -= qty
        }
      }
    }
  }

  return events
}

/**
 * Build Economic options day deltas from Book cells + roll events.
 * `E(d) = R_book(d) - Σ bookCloseRealized + Σ cashRoll` for rolls on d.
 */
export function buildEconomicOptDeltaByDay(
  bookOptByDay: Record<string, PerformanceDayPnLCell>,
  rolls: SameDayRollEvent[],
): Record<string, EconomicOptDayCell> {
  const rollByDay = new Map<string, SameDayRollEvent[]>()
  for (const r of rolls) {
    const arr = rollByDay.get(r.dateStr) ?? []
    arr.push(r)
    rollByDay.set(r.dateStr, arr)
  }

  const out: Record<string, EconomicOptDayCell> = {}
  const dates = new Set([...Object.keys(bookOptByDay), ...rollByDay.keys()])

  for (const dateStr of dates) {
    const rBook = bookOptByDay[dateStr]?.realized ?? 0
    const dayRolls = rollByDay.get(dateStr) ?? []
    let cashRoll = 0
    let bookRollRealized = 0
    for (const r of dayRolls) {
      cashRoll += r.cashRoll
      bookRollRealized += r.bookCloseRealized
    }
    const delta = rBook - bookRollRealized + cashRoll
    out[dateStr] = {
      delta,
      rollCount: dayRolls.length,
      cashRoll,
      bookRollRealized,
    }
  }
  return out
}

/** Convenience: detect rolls then build Economic series. */
export function computeEconomicOptByDayFromExecutions(
  bookOptByDay: Record<string, PerformanceDayPnLCell>,
  execs: Execution[],
): Record<string, EconomicOptDayCell> {
  const rolls = detectSameDayOptionRolls(execs)
  return buildEconomicOptDeltaByDay(bookOptByDay, rolls)
}
