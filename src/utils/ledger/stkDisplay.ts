import type { Execution } from '@/types/positions'

/** Dollar cost basis for STK snapshot: |shares| × avg cost per share. */
export function stkCostBasisFromSnapshot(
  snap: { position: number; avgCost: number } | null | undefined,
): number | null {
  if (!snap) return null
  const { position, avgCost } = snap
  if (!Number.isFinite(position) || !Number.isFinite(avgCost)) return null
  if (Math.abs(position) < 1e-12) return null
  return Math.abs(position) * avgCost
}

/** Percent = 100 × numer / denom; null if denominator unusable. */
export function stkPctOf(numer: number, denom: number | null): number | null {
  if (denom == null || !Number.isFinite(denom) || Math.abs(denom) < 1e-6) return null
  if (!Number.isFinite(numer)) return null
  return (100 * numer) / denom
}

export function stkNotionalAbsUsd(ex: Execution): number | null {
  const p = Number(ex.price)
  const q = Math.abs(Number(ex.quantity ?? ex.qty) || 0)
  if (!Number.isFinite(p) || q <= 0) return null
  return q * p
}

export type StkNotionalTone = 'buy' | 'sell' | 'neutral'

export function stkNotionalTone(ex: Execution): StkNotionalTone {
  const s = (ex.side ?? '').toString().trim().toUpperCase()
  if (s === 'BUY' || s === 'BOT' || s === 'B') return 'buy'
  if (s === 'SELL' || s === 'SLD' || s === 'S') return 'sell'
  return 'neutral'
}

export function stkSideLabel(ex: Execution): string {
  const s = (ex.side ?? '').toUpperCase()
  if (s === 'BUY' || s === 'BOT' || s === 'B') return 'Buy'
  if (s === 'SELL' || s === 'SLD' || s === 'S') return 'Sell'
  return ex.side ?? '—'
}

export function stkContractKeyForExec(ex: Execution): string {
  return ex.contract_key?.trim() ?? `${(ex.symbol ?? '').trim().toUpperCase()}|STK|||`
}

export function stkAccountContractKey(ex: Execution): string {
  return `${ex.account_id}|${stkContractKeyForExec(ex)}`
}

export function getExecCategory(ex: Execution, catMap: Map<string, string>): string {
  return catMap.get(stkAccountContractKey(ex)) ?? '—'
}
