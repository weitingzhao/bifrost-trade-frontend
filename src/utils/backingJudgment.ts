/**
 * House backing gate (85% of pool) versus the pressure ceiling (default 50% of
 * 1 − Cushion). Owner 2026-09-15: both stand. They are not the same quantity.
 *
 * Used / pool come from the same slices BackingPoolCard draws — one compute,
 * the strip and the ring both cite. Income ETFs sit in the pool and do not
 * add to Used (via buying power, not as cash).
 */
import type { BookVsBase } from '@/utils/bookVsBase'
import { baseRoleSegments } from '@/utils/positionsCharts'

/** Rules auto-derisk line, as a fraction of the backing pool. Not 1 − Cushion. */
export const HOUSE_GATE_PCT = 0.85 as const

export interface BackingPoolUsage {
  /** Priced market value of the three-layer pool (stocks + cash/SGOV + income). */
  pool: number
  /** Stock backing calls + cash backing puts. Income is never in this sum. */
  used: number
}

export interface BackingJudgment {
  pool: number
  used: number
  usedPct: number | null
  gatePct: typeof HOUSE_GATE_PCT
  gate: number
  spendable: number
  overGate: boolean
}

export function backingPoolUsage(book: BookVsBase): BackingPoolUsage {
  const segments = baseRoleSegments(book)
  let pool = 0
  let used = 0
  for (const s of segments) {
    pool += s.value
    if (s.target === 'calls' || s.target === 'puts') used += s.value
  }
  return { pool, used }
}

export function deriveBackingJudgment(usage: BackingPoolUsage): BackingJudgment {
  const pool = usage.pool
  const used = usage.used
  if (!(pool > 0) || !Number.isFinite(pool)) {
    return {
      pool: 0,
      used: Number.isFinite(used) ? used : 0,
      usedPct: null,
      gatePct: HOUSE_GATE_PCT,
      gate: 0,
      spendable: 0,
      overGate: false,
    }
  }
  const gate = pool * HOUSE_GATE_PCT
  const spendable = Math.max(0, gate - used)
  return {
    pool,
    used,
    usedPct: used / pool,
    gatePct: HOUSE_GATE_PCT,
    gate,
    spendable,
    overGate: used > gate,
  }
}
