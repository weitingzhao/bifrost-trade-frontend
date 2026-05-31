import type { Execution } from '@/types/positions'
import type { StrategyInstance } from '@/types/positions'
import type { PerformanceSummary } from '@/types/trading'
import { parseOptionContractKey } from '@/lib/format'
import { buildOptExecutionGroups } from '@/utils/ledger/optExecutionGroups'
import { computeRiskProfile, type RiskPosition } from '@/utils/riskProfile'

const NET_QTY_EPS = 1e-9

export type InstancePositionStatus = 'no_fills' | 'open' | 'closed'

export type InstanceListMetricsReady = {
  status: 'ready'
  summary: PerformanceSummary | null | undefined
  sliced: Execution[]
  linkedStockSlippage: number
  execDerivedNetPnl: number | null
  maxRiskUsd: number
}

export type InstanceListMetricsEntry =
  | { status: 'loading' }
  | { status: 'error' }
  | InstanceListMetricsReady

export function isExecutionSellSide(e: Execution): boolean {
  const s = (e.side ?? '').toUpperCase().trim()
  return s === 'SELL' || s === 'SLD' || s === 'S'
}

function parseYmdToUtcMs(s: string | null | undefined): number | null {
  if (s == null || typeof s !== 'string') return null
  const t = s.trim().slice(0, 10)
  if (t.length < 10) return null
  const ms = Date.parse(`${t}T12:00:00.000Z`)
  return Number.isFinite(ms) ? ms : null
}

function executionStrikeUsd(e: Execution): number | null {
  const direct = Number(e.strike)
  if (Number.isFinite(direct) && direct > 0) return direct
  const parsed = parseOptionContractKey(e.contract_key)
  const fromKey = Number(parsed.strike)
  if (Number.isFinite(fromKey) && fromKey > 0) return fromKey
  return null
}

export function computeInstancePositionStatus(executions: Execution[]): InstancePositionStatus {
  if (!executions.length) return 'no_fills'

  const optGroups = buildOptExecutionGroups(executions)
  for (const g of optGroups) {
    if (Math.abs(g.net_qty) >= NET_QTY_EPS) return 'open'
  }

  const nonOpt = executions.filter((e) => (e.sec_type ?? '').toUpperCase() !== 'OPT')
  const keyOf = (e: Execution) => {
    const ck = (e.contract_key ?? '').trim()
    if (ck !== '') return ck
    const sym = (e.symbol ?? '').trim().split(/\s+/)[0] ?? ''
    const st = (e.sec_type ?? '').toUpperCase() || '—'
    return `${sym}|${st}`
  }
  const byKey = new Map<string, Execution[]>()
  for (const e of nonOpt) {
    const k = keyOf(e)
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(e)
  }
  for (const [, trades] of byKey) {
    let net = 0
    for (const t of trades) {
      const q = Math.abs(Number(t.quantity ?? t.qty) || 0)
      if (q < NET_QTY_EPS) continue
      const side = (t.side ?? '').toUpperCase()
      if (side === 'BUY' || side === 'BOT' || side === 'B') net += q
      else if (side === 'SELL' || side === 'SLD' || side === 'S') net -= q
    }
    if (Math.abs(net) >= NET_QTY_EPS) return 'open'
  }

  return 'closed'
}

export function underlyingCostSellOptUsd(executions: Execution[]): number {
  let total = 0
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    if (!isExecutionSellSide(e)) continue
    const strike = executionStrikeUsd(e)
    if (strike == null || strike <= 0) continue
    const q = Math.abs(Number(e.quantity ?? e.qty) || 0)
    if (q <= 0) continue
    total += strike * q * 100
  }
  return total
}

export function reportDateStartEnd(executions: Execution[]): { start: string | null; end: string | null } {
  let min: string | null = null
  let max: string | null = null
  for (const e of executions) {
    const raw = e.report_date
    if (raw == null || typeof raw !== 'string') continue
    const d = raw.trim().slice(0, 10)
    if (d.length < 10) continue
    if (min == null || d < min) min = d
    if (max == null || d > max) max = d
  }
  return { start: min, end: max }
}

export function holdTimeDaysFromReportDateSpan(executions: Execution[]): number | null {
  let minMs = Infinity
  let maxMs = -Infinity
  let any = false
  for (const e of executions) {
    const ms = parseYmdToUtcMs(e.report_date)
    if (ms == null) continue
    any = true
    minMs = Math.min(minMs, ms)
    maxMs = Math.max(maxMs, ms)
  }
  if (!any || !Number.isFinite(minMs) || !Number.isFinite(maxMs)) return null
  return Math.max((maxMs - minMs) / 86_400_000, 0)
}

export function holdDaysForAnnualization(spanDays: number): number {
  if (!Number.isFinite(spanDays) || spanDays < 0) return 1
  return Math.max(spanDays + 1, 1)
}

function expirySortValueFromRaw(exp: string): number {
  const d = String(exp).replace(/\D/g, '')
  if (d.length >= 8) return parseInt(d.slice(0, 8), 10)
  if (d.length >= 6) {
    const y = parseInt(d.slice(0, 4), 10)
    const m = parseInt(d.slice(4, 6), 10)
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 0
    const lastDay = new Date(y, m, 0).getDate()
    return y * 10_000 + m * 100 + lastDay
  }
  return 0
}

/** Legacy-compatible YYYY-MM-DD / YYYY-MM from raw expiry digits. */
export function formatExpiryYmd(expiry: string | null | undefined): string | null {
  if (!expiry || !expiry.trim()) return null
  const s = String(expiry).trim().replace(/\D/g, '')
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  if (s.length === 6) return `${s.slice(0, 4)}-${s.slice(4, 6)}`
  return null
}

function openPositionLatestOptExpiryRaw(executions: Execution[]): string | null {
  const groups = buildOptExecutionGroups(executions)
  let bestRaw: string | null = null
  let bestVal = -Infinity
  for (const g of groups) {
    if (Math.abs(g.net_qty) < NET_QTY_EPS) continue
    const raw = String(g.expiry ?? '').trim()
    const fromKey = parseOptionContractKey(g.contract_key).expiry
    const exp = raw && raw !== '—' ? raw : fromKey !== '—' ? fromKey : ''
    if (!exp || exp === '—') continue
    const v = expirySortValueFromRaw(exp)
    if (v > bestVal) {
      bestVal = v
      bestRaw = exp
    }
  }
  return bestRaw
}

function parseEndDisplayToUtcMs(s: string | null | undefined): number | null {
  if (s == null || typeof s !== 'string') return null
  const t = s.trim()
  if (!t) return null
  if (t.length >= 10) {
    const ms = Date.parse(`${t.slice(0, 10)}T12:00:00.000Z`)
    return Number.isFinite(ms) ? ms : null
  }
  const m = t.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null
  const last = new Date(y, mo, 0).getDate()
  return Date.UTC(y, mo - 1, last, 12, 0, 0)
}

function expiryRawToEndUtcMs(raw: string): number | null {
  const d = String(raw).replace(/\D/g, '')
  if (d.length >= 8) return parseYmdToUtcMs(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`)
  if (d.length >= 6) return parseEndDisplayToUtcMs(`${d.slice(0, 4)}-${d.slice(4, 6)}`)
  return null
}

export function holdTimeSpanDaysForInstanceList(
  executions: Execution[],
  positionStatus: InstancePositionStatus,
): number | null {
  if (positionStatus !== 'open') {
    return holdTimeDaysFromReportDateSpan(executions)
  }
  const raw = openPositionLatestOptExpiryRaw(executions)
  const endMs = raw != null ? expiryRawToEndUtcMs(raw) : null
  const report = reportDateStartEnd(executions)
  const startMs = parseYmdToUtcMs(report.start)
  if (endMs == null || startMs == null) {
    return holdTimeDaysFromReportDateSpan(executions)
  }
  return Math.max((endMs - startMs) / 86_400_000, 0)
}

export function holdSpanDaysForMetrics(
  executions: Execution[],
  positionStatus?: InstancePositionStatus,
): number | null {
  if (positionStatus === undefined) {
    return holdTimeDaysFromReportDateSpan(executions)
  }
  return holdTimeSpanDaysForInstanceList(executions, positionStatus) ?? holdTimeDaysFromReportDateSpan(executions)
}

function openPositionLatestOptExpiryYmd(executions: Execution[]): string | null {
  const bestRaw = openPositionLatestOptExpiryRaw(executions)
  if (bestRaw == null) return null
  return formatExpiryYmd(bestRaw)
}

export function instanceListEndDateColumn(
  executions: Execution[],
  positionStatus: InstancePositionStatus,
): { display: string | null; sortUtcMs: number | null; cellTitle: string | undefined } {
  const report = reportDateStartEnd(executions)
  if (positionStatus === 'open') {
    const exp = openPositionLatestOptExpiryYmd(executions)
    if (exp != null) {
      return {
        display: exp,
        sortUtcMs: parseEndDisplayToUtcMs(exp),
        cellTitle: `Option expiry (latest among open legs). Max report date: ${report.end ?? '—'}.`,
      }
    }
  }
  const sortUtcMs = parseYmdToUtcMs(report.end)
  return {
    display: report.end,
    sortUtcMs,
    cellTitle: report.end != null ? 'Max report date in the performance window.' : undefined,
  }
}

function parseYmdPartsForList(s: string | null | undefined): { y: number; m: number; d: number } | null {
  if (s == null || typeof s !== 'string') return null
  const t = s.trim()
  const full = t.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (full) {
    const y = parseInt(full[1], 10)
    const m = parseInt(full[2], 10)
    const d = parseInt(full[3], 10)
    if (![y, m, d].every(Number.isFinite)) return null
    if (m < 1 || m > 12 || d < 1 || d > 31) return null
    return { y, m, d }
  }
  const mon = t.match(/^(\d{4})-(\d{2})$/)
  if (mon) {
    const y = parseInt(mon[1], 10)
    const m = parseInt(mon[2], 10)
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null
    const last = new Date(y, m, 0).getDate()
    return { y, m, d: last }
  }
  return null
}

function mdDotStart(m: number, d: number): string {
  return `${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`
}

function mdDotEnd(m: number, d: number): string {
  return `${m}.${String(d).padStart(2, '0')}`
}

export function formatInstanceListPeriodCell(
  startYmd: string | null | undefined,
  endDisplay: string | null | undefined,
  holdSpanDays: number | null | undefined,
  endCellTitle: string | undefined,
): { yearLabel: string; rangeLabel: string; dayLabel: string | null; title: string | undefined } {
  const startP = startYmd != null ? parseYmdPartsForList(String(startYmd).slice(0, 10)) : null
  const endP = endDisplay != null ? parseYmdPartsForList(String(endDisplay).trim()) : null

  const holdInclusiveDays =
    holdSpanDays != null && Number.isFinite(holdSpanDays) ? holdDaysForAnnualization(holdSpanDays) : null

  if (startP == null && endP == null) {
    return {
      yearLabel: '—',
      rangeLabel: '(—~—)',
      dayLabel: holdInclusiveDays != null ? `${holdInclusiveDays}d` : null,
      title: undefined,
    }
  }

  let yearLabel: string
  if (startP && endP) yearLabel = startP.y === endP.y ? String(startP.y) : `${startP.y}~${endP.y}`
  else if (startP) yearLabel = String(startP.y)
  else yearLabel = String(endP!.y)

  const startSeg = startP ? mdDotStart(startP.m, startP.d) : '—'
  const endSeg = endP ? mdDotEnd(endP.m, endP.d) : '—'
  const rangeLabel = `(${startSeg}~${endSeg})`

  const bits: string[] = []
  if (startYmd) bits.push(`Start ${String(startYmd).slice(0, 10)}`)
  if (endDisplay) bits.push(`End ${endDisplay}`)
  if (endCellTitle) bits.push(endCellTitle)
  const title = bits.length > 0 ? bits.join(' · ') : undefined
  return {
    yearLabel,
    rangeLabel,
    dayLabel: holdInclusiveDays != null ? `${holdInclusiveDays}d` : null,
    title,
  }
}

export function computeInstanceExecDerivedNetPnl(
  sliced: Execution[],
  linkedStockSlippage: number,
): number | null {
  if (sliced.length === 0) return null
  const groups = buildOptExecutionGroups(sliced)
  let sum = groups.reduce((s, g) => s + g.realized_pnl, 0)
  for (const e of sliced) {
    if ((e.sec_type ?? '').toUpperCase() === 'OPT') continue
    const rp = e.realized_pnl
    if (rp != null && Number.isFinite(Number(rp))) sum += Number(rp)
  }
  const slip = Number.isFinite(linkedStockSlippage) ? linkedStockSlippage : 0
  return sum + slip
}

export function netPnlUsdPerDayFromNetAndExecutions(
  netPnl: number | null | undefined,
  executions: Execution[],
  positionStatus?: InstancePositionStatus,
): number | null {
  const spanDays = holdSpanDaysForMetrics(executions, positionStatus)
  if (spanDays == null) return null
  const net = Number(netPnl)
  if (!Number.isFinite(net)) return null
  const daysUsed = holdDaysForAnnualization(spanDays)
  if (!Number.isFinite(daysUsed) || daysUsed <= 0) return null
  return net / daysUsed
}

export function annualReturnDetailFromNetAndExecutions(
  netPnl: number | null | undefined,
  executions: Execution[],
  maxRiskUsd?: number | null,
  positionStatus?: InstancePositionStatus,
): { annualReturnPct: number } | null {
  const holdSpanDays = holdSpanDaysForMetrics(executions, positionStatus)
  if (holdSpanDays == null) return null
  const maxRiskN = Number(maxRiskUsd)
  const useMaxRisk = Number.isFinite(maxRiskN) && maxRiskN > 0
  const denominatorUsd = useMaxRisk ? maxRiskN : underlyingCostSellOptUsd(executions)
  if (denominatorUsd <= 0) return null
  const net = Number(netPnl)
  if (!Number.isFinite(net)) return null
  const daysUsedForAnnual = holdDaysForAnnualization(holdSpanDays)
  const netPnlPerDayUsd = net / daysUsedForAnnual
  const denominatorPerDayUsd = denominatorUsd / daysUsedForAnnual
  const factor = 365.25 / daysUsedForAnnual
  let annualReturnPct = (netPnlPerDayUsd / denominatorPerDayUsd) * factor * 100
  if (!Number.isFinite(annualReturnPct)) annualReturnPct = 0
  if (annualReturnPct > 999) annualReturnPct = 999
  if (annualReturnPct < -999) annualReturnPct = -999
  return { annualReturnPct }
}

export function computeInstanceMaxRiskUsd(sliced: Execution[], underlyingFallback: number): number {
  const netByKey = new Map<string, { strike: number; right: 'C' | 'P'; qty: number; totalCost: number }>()
  for (const e of sliced) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const parsed = parseOptionContractKey(e.contract_key)
    const right = parsed.right === 'C' || parsed.right === 'P' ? parsed.right : null
    const strike = Number(parsed.strike) || 0
    if (right == null || strike <= 0) continue
    const key = `${strike}|${right}`
    const side = (e.side ?? '').toUpperCase()
    const qty = Math.abs(Number(e.quantity ?? e.qty) || 0)
    if (qty <= 0) continue
    const price = Number(e.price) || 0
    const signedQty = side === 'BUY' || side === 'BOT' || side === 'B' ? qty : -qty
    const prev = netByKey.get(key) ?? { strike, right, qty: 0, totalCost: 0 }
    prev.qty += signedQty
    prev.totalCost += price * qty * (signedQty > 0 ? 1 : -1)
    netByKey.set(key, prev)
  }

  const positions: RiskPosition[] = []
  for (const v of netByKey.values()) {
    if (Math.abs(v.qty) < 1e-9) continue
    const avgCost = Math.abs(v.totalCost / v.qty)
    positions.push({ strike: v.strike, right: v.right, qty: Math.round(v.qty), premium: avgCost })
  }
  if (positions.length === 0) return underlyingFallback

  const rp = computeRiskProfile(positions, 0, 0)
  if (rp.max_loss != null && Number.isFinite(rp.max_loss) && rp.max_loss < 0) {
    return Math.abs(rp.max_loss)
  }
  return underlyingFallback
}

export function computeSymbolGroupRollup(
  rows: StrategyInstance[],
  metrics: Map<number, InstanceListMetricsEntry>,
): { totalNet: number | null; sumUnderlying: number | null; groupAnnualPct: number | null } {
  let totalNet = 0
  let sumU = 0
  let sumDenDays = 0
  let anyNet = false

  for (const row of rows) {
    const m = metrics.get(row.strategy_instance_id)
    if (m == null || m.status !== 'ready') continue
    const { sliced, execDerivedNetPnl, maxRiskUsd } = m
    if (execDerivedNetPnl == null || !Number.isFinite(execDerivedNetPnl)) continue
    anyNet = true
    totalNet += execDerivedNetPnl

    const u = underlyingCostSellOptUsd(sliced)
    if (!Number.isFinite(u) || u <= 0) continue
    const den = Number.isFinite(maxRiskUsd) && maxRiskUsd > 0 ? maxRiskUsd : u
    const ps = computeInstancePositionStatus(sliced)
    const hold = holdSpanDaysForMetrics(sliced, ps)
    if (hold == null) continue
    const daysU = holdDaysForAnnualization(hold)
    sumU += u
    sumDenDays += den * daysU
  }

  let groupAnnualPct: number | null = null
  if (anyNet && sumDenDays > 0) {
    let pct = (totalNet * 365.25) / sumDenDays * 100
    if (!Number.isFinite(pct)) pct = 0
    if (pct > 999) pct = 999
    if (pct < -999) pct = -999
    groupAnnualPct = pct
  }

  return {
    totalNet: anyNet ? totalNet : null,
    sumUnderlying: sumU > 0 ? sumU : null,
    groupAnnualPct,
  }
}

export function computeCostPerDay(
  sliced: Execution[],
  maxRiskUsd: number,
  positionStatus: InstancePositionStatus,
): number | null {
  const hold = holdSpanDaysForMetrics(sliced, positionStatus)
  if (hold == null || !Number.isFinite(hold)) return null
  const u = underlyingCostSellOptUsd(sliced)
  const den = Number.isFinite(maxRiskUsd) && maxRiskUsd > 0 ? maxRiskUsd : u
  if (!Number.isFinite(den) || den <= 0) return null
  return den / holdDaysForAnnualization(hold)
}

export function computeReturnPct(
  execDerivedNetPnl: number | null,
  sliced: Execution[],
  maxRiskUsd: number,
): number | null {
  if (execDerivedNetPnl == null || !Number.isFinite(execDerivedNetPnl)) return null
  const u = underlyingCostSellOptUsd(sliced)
  const den = Number.isFinite(maxRiskUsd) && maxRiskUsd > 0 ? maxRiskUsd : u
  if (!Number.isFinite(den) || den <= 0) return null
  let pct = (execDerivedNetPnl / den) * 100
  if (!Number.isFinite(pct)) return null
  if (pct > 999) pct = 999
  if (pct < -999) pct = -999
  return pct
}
