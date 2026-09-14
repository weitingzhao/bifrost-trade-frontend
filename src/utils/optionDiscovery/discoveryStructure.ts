/**
 * Build RiskPosition legs for the Chain Structure panel from a selected contract.
 *
 * Mirrors the prototype's Single / Vertical / Covered × Long / Short — enough to
 * drive `computeRiskProfile` without inventing a second payoff engine.
 */
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import type { RiskPosition } from '@/utils/riskProfile'

export type StructureKind = 'single' | 'vertical' | 'covered'
export type StructureSide = 'long' | 'short'

export function premiumOf(row: OptionSnapshotRow): number {
  const mid = row.mid ?? row.mark ?? row.last
  if (mid != null && Number.isFinite(mid) && mid > 0) return mid
  if (row.bid != null && row.ask != null && Number.isFinite(row.bid) && Number.isFinite(row.ask)) {
    return (row.bid + row.ask) / 2
  }
  return row.bid ?? row.ask ?? 0
}

export function rightOf(row: OptionSnapshotRow): 'C' | 'P' {
  const r = (row.right || '').trim().toUpperCase()
  return r === 'C' || r === 'CALL' ? 'C' : 'P'
}

/** Wing strike for a vertical — one step away; falls back to 5% of spot. */
export function wingStrike(
  row: OptionSnapshotRow,
  spot: number | null,
  stepHint?: number | null,
): number {
  const step =
    stepHint && stepHint > 0
      ? stepHint
      : spot && spot > 0
        ? Math.max(1, Math.round(spot * 0.05))
        : 5
  const isCall = rightOf(row) === 'C'
  return isCall ? row.strike + step : row.strike - step
}

export function adjacentStrikeStep(
  strikes: readonly number[],
  strike: number,
  right: 'C' | 'P',
): number | null {
  const sorted = [...strikes].sort((a, b) => a - b)
  const i = sorted.indexOf(strike)
  if (i < 0) return null
  if (right === 'C') {
    return i + 1 < sorted.length ? sorted[i + 1] - strike : null
  }
  return i > 0 ? strike - sorted[i - 1] : null
}

/** Mid of the vertical's wing if that contract is on the chain with a quote. */
export function wingPremiumOnChain(
  row: OptionSnapshotRow,
  chain: readonly OptionSnapshotRow[],
  spot: number | null,
  stepHint?: number | null,
): { wing: number; wingMid: number | null } {
  const wing = wingStrike(row, spot, stepHint)
  const right = rightOf(row)
  const match = chain.find((r) => r.strike === wing && rightOf(r) === right)
  if (!match) return { wing, wingMid: null }
  const mid = premiumOf(match)
  return { wing, wingMid: mid > 0 ? mid : null }
}

export function buildStructureLegs(input: {
  row: OptionSnapshotRow
  kind: StructureKind
  side: StructureSide
  spot: number | null
  wingMid?: number | null
  stepHint?: number | null
}): { legs: RiskPosition[]; coveredShares: number; wing: number | null; unquotedWing: boolean } {
  const { row, kind, side, spot } = input
  const sgn = side === 'long' ? 1 : -1
  const right = rightOf(row)
  const mid = premiumOf(row)
  const primary: RiskPosition = {
    strike: row.strike,
    right,
    qty: sgn,
    avg_cost: mid,
  }

  if (kind === 'single') {
    return { legs: [primary], coveredShares: 0, wing: null, unquotedWing: false }
  }

  if (kind === 'covered') {
    // Covered call / CSP: short the option, long/short 100 shares vs call/put.
    const opt: RiskPosition = { ...primary, qty: -1 }
    const shares = right === 'C' ? 100 : -100
    return { legs: [opt], coveredShares: shares, wing: null, unquotedWing: false }
  }

  // Vertical: buy one, sell the wing. No quote on the wing → do not chart (§2.1).
  const wing = wingStrike(row, spot, input.stepHint)
  const wingPrem = input.wingMid
  if (wingPrem == null || !Number.isFinite(wingPrem) || wingPrem <= 0) {
    return { legs: [], coveredShares: 0, wing, unquotedWing: true }
  }
  const wingLeg: RiskPosition = {
    strike: wing,
    right,
    qty: -sgn,
    avg_cost: wingPrem,
  }
  return { legs: [primary, wingLeg], coveredShares: 0, wing, unquotedWing: false }
}

export function structureTitle(
  kind: StructureKind,
  side: StructureSide,
  row: OptionSnapshotRow,
  wing: number | null,
): string {
  const right = rightOf(row) === 'C' ? 'call' : 'put'
  if (kind === 'covered') {
    return rightOf(row) === 'C' ? `Covered call ${row.strike}` : `Cash-secured put ${row.strike}`
  }
  if (kind === 'vertical' && wing != null) {
    const lo = Math.min(row.strike, wing)
    const hi = Math.max(row.strike, wing)
    return `${side === 'short' ? 'Credit' : 'Debit'} ${right} vertical ${lo}/${hi}`
  }
  return `${side === 'short' ? 'Short' : 'Long'} ${right} ${row.strike}`
}
