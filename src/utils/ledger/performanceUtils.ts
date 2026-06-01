import type { Execution } from '@/types/positions'
import type { BackendOptPair, OptionStockLinkSummary } from '@/types/trading'
import { realizedPnlFifoMatchPlusStock } from './ledgerOptHelpers'

const QTY_EPS = 1e-9

export type PerformanceTimeRange = 'quarter' | 'halfyear' | 'year' | '3year'

export function optionRightToFull(r: string | null | undefined): string {
  if (!r) return '—'
  const u = r.toUpperCase()
  if (u === 'C' || u === 'CALL') return 'CALL'
  if (u === 'P' || u === 'PUT') return 'PUT'
  return '—'
}

export function normalizeStrike(s: number | string | null | undefined): string {
  if (s == null) return '—'
  const n = typeof s === 'string' ? parseFloat(s) : s
  return Number.isFinite(n) ? String(n) : String(s).trim()
}

function isBuy(side: string): boolean {
  const s = side.toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

/**
 * Resolve the trade date for an execution, using Flex trade_date or Chicago-localized time.
 */
export function executionDateStr(e: Execution): string {
  if (e.trade_date) {
    const d = e.trade_date.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  }
  if (e.time != null && e.time > 0) {
    return unixTimeToChicagoDateStr(e.time)
  }
  return '—'
}

export function sortExecByTradeDateThenTime(a: Execution, b: Execution): number {
  const da = a.trade_date ?? ''
  const db = b.trade_date ?? ''
  if (da !== db) return da < db ? -1 : 1
  return (a.time ?? 0) - (b.time ?? 0)
}

export function sortExecByExecutionDateThenTime(a: Execution, b: Execution): number {
  const da = executionDateStr(a)
  const db = executionDateStr(b)
  if (da !== db) return da < db ? -1 : 1
  if ((a.time ?? 0) !== (b.time ?? 0)) return (a.time ?? 0) - (b.time ?? 0)
  return (a.account_executions_id ?? 0) - (b.account_executions_id ?? 0)
}

// --- Chicago timezone ---

const chicagoFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function unixTimeToChicagoDateStr(ts: number): string {
  const ms = ts < 1e12 ? ts * 1000 : ts
  const parts = chicagoFmt.formatToParts(new Date(ms))
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${y}-${m}-${d}`
}

export function getChicagoDayRange(dateStr: string): { since_ts: number; until_ts: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const noonUtc = Date.UTC(y, m - 1, d, 12, 0, 0)
  const noonChicago = chicagoFmt.format(new Date(noonUtc))
  const parsed = new Date(noonChicago)
  const offsetMs = noonUtc - parsed.getTime()

  const startOfDayUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMs
  const since_ts = Math.floor(startOfDayUtcMs / 1000)
  const until_ts = since_ts + 86400 - 1
  return { since_ts, until_ts }
}

export function dateStrMinusDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - days)
  const ny = dt.getFullYear()
  const nm = String(dt.getMonth() + 1).padStart(2, '0')
  const nd = String(dt.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

// --- Time ranges for Performance Calendar ---

const MONTHS_BACK: Record<PerformanceTimeRange, number> = {
  quarter: 2,
  halfyear: 5,
  year: 11,
  '3year': 35,
}

export function getTimeRangeDates(
  timeRange: PerformanceTimeRange,
  calendarMonth: string,
): { sinceStr: string; untilStr: string } {
  const [cy, cm] = calendarMonth.split('-').map(Number)

  const lastDay = new Date(cy, cm, 0).getDate()
  const untilStr = `${calendarMonth}-${String(lastDay).padStart(2, '0')}`

  const back = MONTHS_BACK[timeRange]
  const sinceDate = new Date(cy, cm - 1 - back, 1)
  const sy = sinceDate.getFullYear()
  const sm = String(sinceDate.getMonth() + 1).padStart(2, '0')
  const sinceStr = `${sy}-${sm}-01`

  return { sinceStr, untilStr }
}

export function listDateStrings(sinceStr: string, untilStr: string): string[] {
  const dates: string[] = []
  const [sy, sm, sd] = sinceStr.split('-').map(Number)
  const cur = new Date(sy, sm - 1, sd)
  const [ey, em, ed] = untilStr.split('-').map(Number)
  const end = new Date(ey, em - 1, ed)

  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function listMonthKeysInRange(sinceStr: string, untilStr: string): string[] {
  const months: string[] = []
  const [sy, sm] = sinceStr.split('-').map(Number)
  const [ey, em] = untilStr.split('-').map(Number)
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

// --- FIFO pairing ---

export interface FifoPair {
  buy_price: number
  sell_price: number
  qty: number
  buy_commission: number
  sell_commission: number
  net_pnl: number
  buy_eid?: number | null
  sell_eid?: number | null
  contract_key: string
  symbol: string
  expiry: string
  strike: number
  option_right: string
}

interface WorkItem {
  side: 'buy' | 'sell'
  price: number
  remQty: number
  remComm: number
  eid: number | null
  e: Execution
}

export function computeOptPairsFromExecutions(
  executions: Execution[],
  sortExec: (a: Execution, b: Execution) => number = sortExecByExecutionDateThenTime,
): FifoPair[] {
  const optExecs = executions.filter((e) => e.sec_type === 'OPT')
  const grouped = new Map<string, Execution[]>()

  for (const e of optExecs) {
    const sym = (e.symbol ?? '').split(' ')[0]
    const key = `${sym}\t${e.expiry ?? ''}\t${e.strike ?? 0}\t${e.account_id}`
    const arr = grouped.get(key) ?? []
    arr.push(e)
    grouped.set(key, arr)
  }

  const pairs: FifoPair[] = []

  for (const [, group] of grouped) {
    const sorted = [...group].sort(sortExec)
    const work: WorkItem[] = sorted
      .filter((e) => isBuy(e.side) || !isBuy(e.side))
      .map((e) => ({
        side: isBuy(e.side) ? 'buy' as const : 'sell' as const,
        price: e.price,
        remQty: Math.abs(e.quantity ?? e.qty),
        remComm: Math.abs(e.commission ?? 0),
        eid: e.account_executions_id,
        e,
      }))

    let changed = true
    while (changed) {
      changed = false
      for (let i = 0; i < work.length; i++) {
        if (work[i].remQty < QTY_EPS) continue
        for (let j = i + 1; j < work.length; j++) {
          if (work[j].remQty < QTY_EPS) continue
          if (work[i].side === work[j].side) continue

          const buyItem = work[i].side === 'buy' ? work[i] : work[j]
          const sellItem = work[i].side === 'sell' ? work[i] : work[j]
          const qMatch = Math.min(buyItem.remQty, sellItem.remQty)

          const bCommAlloc = buyItem.remQty > QTY_EPS
            ? (qMatch / buyItem.remQty) * buyItem.remComm : 0
          const sCommAlloc = sellItem.remQty > QTY_EPS
            ? (qMatch / sellItem.remQty) * sellItem.remComm : 0

          const legB = -(qMatch * buyItem.price * 100) - bCommAlloc
          const legS = qMatch * sellItem.price * 100 - sCommAlloc
          const net_pnl = Math.round((legB + legS) * 100) / 100

          pairs.push({
            buy_price: buyItem.price,
            sell_price: sellItem.price,
            qty: qMatch,
            buy_commission: bCommAlloc,
            sell_commission: sCommAlloc,
            net_pnl,
            buy_eid: buyItem.eid,
            sell_eid: sellItem.eid,
            contract_key: buyItem.e.contract_key ?? '',
            symbol: buyItem.e.symbol,
            expiry: buyItem.e.expiry ?? '',
            strike: buyItem.e.strike ?? 0,
            option_right: buyItem.e.option_right ?? buyItem.e.right ?? '',
          })

          buyItem.remQty -= qMatch
          buyItem.remComm -= bCommAlloc
          sellItem.remQty -= qMatch
          sellItem.remComm -= sCommAlloc
          changed = true
        }
      }
    }
  }

  return pairs
}

// --- Bulk Performance PnL functions ---

function execQty(e: Execution): number {
  return Math.abs(Number(e.quantity ?? e.qty) || 0)
}

function sideUpper(e: Execution): string {
  return (e.side ?? 'BUY').toString().trim().toUpperCase()
}

/**
 * Signed cash flow for one option leg.
 * BUY = outflow (negative), SELL = inflow (positive).
 */
export function ledgerOptionExecutionCashFlowSigned(e: Execution): number {
  const s = sideUpper(e)
  const buy = s === 'BUY' || s === 'BOT' || s === 'B'
  const q = execQty(e)
  const p = Number(e.price) || 0
  const c = Math.abs(Number(e.commission) || 0)
  const value = q * p * 100 - c
  return buy ? -value : value
}

/** Per-row display PnL (ledger Details table): Sell uses abs for display. */
export function ledgerOptionExecutionDisplayPnl(e: Execution): number {
  const s = sideUpper(e)
  const buy = s === 'BUY' || s === 'BOT' || s === 'B'
  const sell = s === 'SELL' || s === 'SLD' || s === 'S'
  const raw = ledgerOptionExecutionCashFlowSigned(e)
  if (sell) return Math.abs(raw)
  if (buy) return raw
  return raw
}

/**
 * On-the-fly STK row: per-fill Unrealized PnL = quantity × price.
 * Sign: BUY positive, SELL negative.
 */
export function stockOnTheFlyUnrealizedPnlLeg(e: Execution): number | null {
  if ((e.sec_type ?? '').toUpperCase() !== 'STK') return null
  const q = execQty(e)
  const p = Number(e.price) || 0
  if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p)) return null
  const s = sideUpper(e)
  const buy = s === 'BUY' || s === 'BOT' || s === 'B'
  const sell = s === 'SELL' || s === 'SLD' || s === 'S'
  const gross = q * p
  if (buy) return gross
  if (sell) return -gross
  return gross
}

export function computeDayRealizedUnrealizedStock(
  executions: Execution[],
  sortExec: (a: Execution, b: Execution) => number = sortExecByTradeDateThenTime,
): { realized: number; unrealized: number } {
  const stk = executions.filter((e) => (e.sec_type ?? '').toUpperCase() === 'STK')
  const byKey: Record<string, Execution[]> = {}
  for (const e of stk) {
    const side = sideUpper(e)
    if (side !== 'BUY' && side !== 'SELL' && side !== 'BOT' && side !== 'B' && side !== 'SLD' && side !== 'S') continue
    const key = `${e.symbol ?? ''}\t${e.account_id ?? ''}`
    if (!byKey[key]) byKey[key] = []
    byKey[key].push(e)
  }
  let totalRealized = 0
  let totalUnrealized = 0
  for (const list of Object.values(byKey)) {
    const sorted = [...list].sort(sortExec)
    const buyQueue: { q: number; p: number; c: number }[] = []
    const sellQueue: { q: number; p: number; c: number }[] = []

    for (const x of sorted) {
      const q = Number(x.quantity) || 0
      const p = Number(x.price) || 0
      const comm = Number(x.commission) || 0
      if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p)) continue
      const side = sideUpper(x)
      const isBuy = side === 'BUY' || side === 'BOT' || side === 'B'

      if (isBuy) {
        let remaining = q
        while (remaining > 0 && sellQueue.length > 0) {
          const ss = sellQueue[0]!
          const qMatch = Math.min(remaining, ss.q)
          if (qMatch <= 0) break
          const bAlloc = (qMatch / q) * comm
          const sAlloc = (qMatch / ss.q) * ss.c
          const legB = -qMatch * p - bAlloc
          const legS = qMatch * ss.p - sAlloc
          totalRealized += legB + legS
          remaining -= qMatch
          if (qMatch >= ss.q) sellQueue.shift()
          else sellQueue[0] = { q: ss.q - qMatch, p: ss.p, c: ss.c * (1 - qMatch / ss.q) }
        }
        if (remaining > 0) buyQueue.push({ q: remaining, p, c: (remaining / q) * comm })
      } else {
        let remaining = q
        while (remaining > 0 && buyQueue.length > 0) {
          const bb = buyQueue[0]!
          const qMatch = Math.min(remaining, bb.q)
          if (qMatch <= 0) break
          const bAlloc = (qMatch / bb.q) * bb.c
          const sAlloc = (qMatch / q) * comm
          const legB = -qMatch * bb.p - bAlloc
          const legS = qMatch * p - sAlloc
          totalRealized += legB + legS
          remaining -= qMatch
          if (qMatch >= bb.q) buyQueue.shift()
          else buyQueue[0] = { q: bb.q - qMatch, p: bb.p, c: bb.c * (1 - qMatch / bb.q) }
        }
        if (remaining > 0) sellQueue.push({ q: remaining, p, c: (remaining / q) * comm })
      }
    }
    for (const b of buyQueue) totalUnrealized += b.q * b.p + b.c
    for (const s of sellQueue) totalUnrealized += -s.q * s.p + s.c
  }
  return { realized: totalRealized, unrealized: totalUnrealized }
}

export function matchPnl(p: {
  quantity: number
  c_side: string
  p_side: string
  c_price: number
  p_price: number
  commission: number
}): number {
  const qty = Number(p.quantity) || 0
  const halfComm = (Number(p.commission) || 0) / 2
  const legC = qty * Number(p.c_price) * 100 + halfComm
  const legP = qty * Number(p.p_price) * 100 + halfComm
  const sideC = (p.c_side ?? '').toUpperCase()
  const sideP = (p.p_side ?? '').toUpperCase()
  const pnlC = sideC === 'BUY' ? legC : -legC
  const pnlP = sideP === 'BUY' ? legP : -legP
  const pnl = pnlC + pnlP
  return Number.isFinite(pnl) ? pnl : 0
}

/**
 * FIFO OPT pairing that emits leg_c/p_execution_id (for day filtering).
 * Uses queue-style matching: first opposite-side item encountered is matched.
 */
export function computeBackendOptPairsFromExecutions(
  executions: Execution[],
  sortExec: (a: Execution, b: Execution) => number = sortExecByExecutionDateThenTime,
): BackendOptPair[] {
  const optExecs = executions.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT')

  const byKey = new Map<string, Execution[]>()
  for (const e of optExecs) {
    const side = sideUpper(e)
    if (side !== 'BUY' && side !== 'SELL') continue
    const sym = (e.symbol ?? '').split(' ')[0]
    const key = `${sym}\t${e.expiry ?? ''}\t${e.strike ?? ''}\t${e.account_id ?? ''}`
    const arr = byKey.get(key) ?? []
    arr.push(e)
    byKey.set(key, arr)
  }

  const pairs: BackendOptPair[] = []

  for (const [, group] of byKey) {
    const sorted = [...group].sort(sortExec)

    interface WorkItem {
      eid: number
      side: string
      price: number
      remQty: number
      remComm: number
    }

    const work: WorkItem[] = []
    for (const x of sorted) {
      const q = execQty(x)
      const p = Number(x.price) || 0
      const comm = Math.abs(Number(x.commission) || 0)
      const eid = x.account_executions_id
      if (eid == null || !Number.isFinite(q) || q <= 0 || !Number.isFinite(p)) continue
      work.push({ eid, side: sideUpper(x), price: p, remQty: q, remComm: comm })
    }

    const sym = sorted[0]?.symbol ?? ''
    const exp = sorted[0]?.expiry ?? ''
    const str = String(sorted[0]?.strike ?? '')
    const acc = sorted[0]?.account_id ?? ''

    for (;;) {
      let found = false
      const buyQ: WorkItem[] = []
      const sellQ: WorkItem[] = []

      for (const w of work) {
        if (w.remQty <= QTY_EPS) continue
        const isBuyW = w.side === 'BUY' || w.side === 'BOT' || w.side === 'B'

        if (isBuyW) {
          if (sellQ.length > 0) {
            const s = sellQ[0]
            const qm = Math.min(w.remQty, s.remQty)
            if (qm <= QTY_EPS) { buyQ.push(w); continue }
            const bAlloc = (qm / w.remQty) * w.remComm
            const sAlloc = (qm / s.remQty) * s.remComm
            const legB = -(qm * w.price * 100) - bAlloc
            const legS = qm * s.price * 100 - sAlloc
            pairs.push({
              leg_c_execution_id: s.eid,
              leg_p_execution_id: w.eid,
              account_id: acc, symbol: sym, expiry: exp, strike: str,
              quantity: Math.round(qm * 1e4) / 1e4,
              c_side: s.side, c_price: Math.round(s.price * 1e4) / 1e4,
              p_side: w.side, p_price: Math.round(w.price * 1e4) / 1e4,
              commission: Math.round((bAlloc + sAlloc) * 100) / 100,
              net_pnl: Math.round((legB + legS) * 100) / 100,
            })
            w.remQty -= qm; w.remComm -= bAlloc
            s.remQty -= qm; s.remComm -= sAlloc
            found = true
            break
          } else {
            buyQ.push(w)
          }
        } else {
          if (buyQ.length > 0) {
            const b = buyQ[0]
            const qm = Math.min(w.remQty, b.remQty)
            if (qm <= QTY_EPS) { sellQ.push(w); continue }
            const bAlloc = (qm / b.remQty) * b.remComm
            const sAlloc = (qm / w.remQty) * w.remComm
            const legB = -(qm * b.price * 100) - bAlloc
            const legS = qm * w.price * 100 - sAlloc
            pairs.push({
              leg_c_execution_id: b.eid,
              leg_p_execution_id: w.eid,
              account_id: acc, symbol: sym, expiry: exp, strike: str,
              quantity: Math.round(qm * 1e4) / 1e4,
              c_side: b.side, c_price: Math.round(b.price * 1e4) / 1e4,
              p_side: w.side, p_price: Math.round(w.price * 1e4) / 1e4,
              commission: Math.round((bAlloc + sAlloc) * 100) / 100,
              net_pnl: Math.round((legB + legS) * 100) / 100,
            })
            b.remQty -= qm; b.remComm -= bAlloc
            w.remQty -= qm; w.remComm -= sAlloc
            found = true
            break
          } else {
            sellQ.push(w)
          }
        }
      }
      if (!found) break
    }
  }

  return pairs
}

/**
 * Filter backend opt pairs to those relevant for a given calendar day.
 */
export function filterRelevantOptPairsForDay(
  backendPairs: BackendOptPair[],
  execById: Map<number, Execution>,
  selectedDay: string,
): BackendOptPair[] {
  return backendPairs.filter((p) => {
    if (!execById.has(p.leg_c_execution_id) || !execById.has(p.leg_p_execution_id)) return false
    const pairQty = Math.abs(Number(p.quantity) || 0)
    const legC = execById.get(p.leg_c_execution_id)!
    const legP = execById.get(p.leg_p_execution_id)!
    const cOnDay = executionDateStr(legC) === selectedDay
    const pOnDay = executionDateStr(legP) === selectedDay
    if (!cOnDay && !pOnDay) return false
    if (cOnDay && pairQty > execQty(legC)) return false
    if (pOnDay && pairQty > execQty(legP)) return false
    return true
  })
}

/**
 * Compute realized + unrealized PnL for OPT executions using FIFO pairs + link slippage.
 */
export function computeDayRealizedUnrealized(
  executions: Execution[],
  optPairs: BackendOptPair[] | null,
  sortExec: (a: Execution, b: Execution) => number = sortExecByExecutionDateThenTime,
  linkByOptionId?: Record<number, OptionStockLinkSummary>,
): { realized: number; unrealized: number; symbolsRealized: string[]; symbolsUnrealized: string[] } {
  const allExecs = executions
  const optExecs = allExecs.filter((e) => (e.sec_type ?? '').toUpperCase() === 'OPT')

  const dayPairs = optPairs != null && optPairs.length > 0
    ? optPairs
    : computeBackendOptPairsFromExecutions(allExecs, sortExec)

  const pairKey = (p: { account_id: string; symbol: string; expiry: string; strike: string | number }) =>
    `${p.account_id}\t${p.symbol}\t${p.expiry}\t${normalizeStrike(p.strike)}`
  const contractKey = (e: Execution) =>
    `${e.account_id ?? ''}\t${(e.symbol ?? '').split(' ')[0]}\t${e.expiry ?? ''}\t${normalizeStrike(e.strike)}`

  const execById = new Map<number, Execution>()
  for (const e of allExecs) {
    if (e.account_executions_id != null) execById.set(e.account_executions_id, e)
  }

  const enrichedPairs = dayPairs.map((p) => ({
    ...p,
    account_id: p.account_id ||
      (execById.get(p.leg_c_execution_id)?.account_id) ||
      (execById.get(p.leg_p_execution_id)?.account_id) || '',
  }))

  const pairByKey = new Map<string, typeof enrichedPairs>()
  for (const p of enrichedPairs) {
    const k = pairKey(p)
    const arr = pairByKey.get(k) ?? []
    arr.push(p)
    pairByKey.set(k, arr)
  }

  const byContract = new Map<string, Execution[]>()
  for (const e of optExecs) {
    const k = contractKey(e)
    const arr = byContract.get(k) ?? []
    arr.push(e)
    byContract.set(k, arr)
  }

  const allContractKeys = new Set<string>([...byContract.keys()])
  for (const p of enrichedPairs) allContractKeys.add(pairKey(p))

  let totalRealized = 0
  let totalUnrealized = 0
  const symbolsRealizedSet = new Set<string>()
  const symbolsUnrealizedSet = new Set<string>()

  for (const key of allContractKeys) {
    const pairs = pairByKey.get(key) ?? []
    const execs = byContract.get(key) ?? []
    const symbol = execs[0]?.symbol ?? pairs[0]?.symbol ?? '—'
    const sortedExecs = [...execs].sort(sortExec)

    const matchedQtyById = new Map<number, number>()
    for (const p of pairs) {
      const pq = Math.abs(p.quantity) || 0
      matchedQtyById.set(p.leg_c_execution_id, (matchedQtyById.get(p.leg_c_execution_id) ?? 0) + pq)
      matchedQtyById.set(p.leg_p_execution_id, (matchedQtyById.get(p.leg_p_execution_id) ?? 0) + pq)
    }

    const pairNetSum = pairs.reduce((s, p) => s + (p.net_pnl ?? matchPnl(p)), 0)
    const realizedPnl = realizedPnlFifoMatchPlusStock(pairNetSum, sortedExecs, matchedQtyById, linkByOptionId)

    let unrealizedPnl = 0
    let hasUnmatched = false
    for (const e of sortedExecs) {
      const eq = execQty(e)
      if (eq <= 0) continue
      const mq = e.account_executions_id != null ? (matchedQtyById.get(e.account_executions_id) ?? 0) : 0
      const uq = eq - mq
      if (uq > QTY_EPS) {
        unrealizedPnl += (uq / eq) * ledgerOptionExecutionCashFlowSigned(e)
        hasUnmatched = true
      }
    }

    if (Math.abs(realizedPnl) >= 0.005 || pairs.length > 0) {
      totalRealized += realizedPnl
      symbolsRealizedSet.add(symbol)
    }
    if (Math.abs(unrealizedPnl) >= 0.005 || hasUnmatched) {
      totalUnrealized += unrealizedPnl
      symbolsUnrealizedSet.add(symbol)
    }
  }

  return {
    realized: totalRealized,
    unrealized: totalUnrealized,
    symbolsRealized: Array.from(symbolsRealizedSet).sort(),
    symbolsUnrealized: Array.from(symbolsUnrealizedSet).sort(),
  }
}

/**
 * Option Realized/Unrealized for one calendar day.
 * execs + optPairs should cover a lookback window ending on dateStr.
 */
export function computeOptionDayPnLForPerformanceDate(
  dateStr: string,
  execs: Execution[],
  optPairs: BackendOptPair[] | null,
  linkByOptionId?: Record<number, OptionStockLinkSummary>,
): { realized: number; unrealized: number; symbolsRealized: string[]; symbolsUnrealized: string[] } {
  const execByIdForDate = new Map<number, Execution>(
    execs.filter((e) => e.account_executions_id != null).map((e) => [e.account_executions_id!, e]),
  )
  const dayExecs = execs.filter((e) => executionDateStr(e) === dateStr)
  const relevantPairs = optPairs != null && optPairs.length > 0
    ? filterRelevantOptPairsForDay(optPairs, execByIdForDate, dateStr)
    : null
  return computeDayRealizedUnrealized(
    dayExecs,
    relevantPairs != null && relevantPairs.length > 0 ? relevantPairs : null,
    sortExecByExecutionDateThenTime,
    linkByOptionId,
  )
}
