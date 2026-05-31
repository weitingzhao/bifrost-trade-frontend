import type { WinRateStructureRow } from '@/types/strategy'

export const WIN_RATE_PNL_RECONCILE_USD = 0.05

/** Sum of Net PnL for instances with net > 0. */
export function winRateTotalProfitDisplayUsd(row: WinRateStructureRow): number {
  const pt = row.profit_trades ?? 0
  if (pt <= 0) return 0

  const raw = row.total_profit
  const rawNum = raw != null && Number.isFinite(raw) ? raw : null

  const pa = row.profit_avg_usd
  if (pa == null || !Number.isFinite(pa)) {
    return rawNum != null && rawNum > 0 ? rawNum : 0
  }

  const impliedSum = Math.round(pa * pt * 100) / 100
  if (!Number.isFinite(impliedSum) || impliedSum <= 0) {
    return rawNum != null && rawNum > 0 ? rawNum : 0
  }
  if (rawNum == null || rawNum <= 0) return impliedSum
  if (Math.abs(impliedSum - rawNum) > WIN_RATE_PNL_RECONCILE_USD) return impliedSum
  return rawNum
}

/** Sum of Net PnL for instances with net < 0; $0 when loss_trades is 0. */
export function winRateTotalLossDisplayUsd(row: WinRateStructureRow): number | null {
  const lt = row.loss_trades ?? 0
  if (lt <= 0) return 0

  const raw = row.total_loss
  const rawNum = raw != null && Number.isFinite(raw) ? raw : null

  const la = row.loss_avg_usd
  if (la == null || !Number.isFinite(la)) return rawNum

  const impliedSum = Math.round(la * lt * 100) / 100
  if (rawNum == null) return impliedSum
  if (Math.abs(impliedSum - rawNum) > WIN_RATE_PNL_RECONCILE_USD) return impliedSum
  return rawNum
}

export type WinPctTone = 'positive' | 'negative' | 'dim'

export function winPctLabel(total: number, wins: number): string {
  return total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '—'
}

/** Win % color: strictly >50% green, strictly <50% red; 50% or no trades neutral. */
export function winPctTone(total: number, wins: number): WinPctTone {
  if (total <= 0) return 'dim'
  const pct = (wins / total) * 100
  if (pct > 50) return 'positive'
  if (pct < 50) return 'negative'
  return 'dim'
}

export function fmtWinRatePct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(2)}%`
}

export function fmtStructureReturnPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

export type ProfitLossTone = 'positive' | 'negative' | 'muted'

export function winRateTotalProfitTone(row: WinRateStructureRow): ProfitLossTone {
  const v = winRateTotalProfitDisplayUsd(row)
  if (v > 0) return 'positive'
  if (v === 0) return 'muted'
  return 'negative'
}

export function winRateTotalLossTone(row: WinRateStructureRow): ProfitLossTone {
  const v = winRateTotalLossDisplayUsd(row)
  if (v == null) return 'muted'
  if (v < 0) return 'negative'
  return 'muted'
}

export function structureReturnTone(v: number | null | undefined): ProfitLossTone {
  if (v == null || !Number.isFinite(v)) return 'muted'
  return v >= 0 ? 'positive' : 'negative'
}

export function fallbackTotalsAllFromStructures(structures: WinRateStructureRow[]): WinRateStructureRow {
  const acc = structures.reduce(
    (a, r) => {
      const tl = winRateTotalLossDisplayUsd(r)
      const tlNum = tl != null && Number.isFinite(tl) ? tl : null
      return {
        profit_trades: a.profit_trades + r.profit_trades,
        loss_trades: a.loss_trades + r.loss_trades,
        total_instances: a.total_instances + r.total_instances,
        total_profit: a.total_profit + winRateTotalProfitDisplayUsd(r),
        total_max_risk: (a.total_max_risk ?? 0) + (r.total_max_risk ?? 0),
        profit_investment: (a.profit_investment ?? 0) + (r.profit_investment ?? 0),
        loss_investment: (a.loss_investment ?? 0) + (r.loss_investment ?? 0),
        total_loss_sum: tlNum != null ? a.total_loss_sum + tlNum : a.total_loss_sum,
        total_loss_any: tlNum != null ? true : a.total_loss_any,
        w_profit_pct:
          r.profit_avg_pct != null && r.profit_trades > 0
            ? a.w_profit_pct + r.profit_avg_pct * r.profit_trades
            : a.w_profit_pct,
        n_profit_pct:
          r.profit_avg_pct != null && r.profit_trades > 0
            ? a.n_profit_pct + r.profit_trades
            : a.n_profit_pct,
        w_loss_pct:
          r.loss_avg_pct != null && r.loss_trades > 0
            ? a.w_loss_pct + r.loss_avg_pct * r.loss_trades
            : a.w_loss_pct,
        n_loss_pct:
          r.loss_avg_pct != null && r.loss_trades > 0
            ? a.n_loss_pct + r.loss_trades
            : a.n_loss_pct,
        w_profit_usd:
          r.profit_avg_usd != null && Number.isFinite(r.profit_avg_usd) && r.profit_trades > 0
            ? a.w_profit_usd + r.profit_avg_usd * r.profit_trades
            : a.w_profit_usd,
        n_profit_usd:
          r.profit_avg_usd != null && Number.isFinite(r.profit_avg_usd) && r.profit_trades > 0
            ? a.n_profit_usd + r.profit_trades
            : a.n_profit_usd,
        w_loss_usd:
          r.loss_avg_usd != null && Number.isFinite(r.loss_avg_usd) && r.loss_trades > 0
            ? a.w_loss_usd + r.loss_avg_usd * r.loss_trades
            : a.w_loss_usd,
        n_loss_usd:
          r.loss_avg_usd != null && Number.isFinite(r.loss_avg_usd) && r.loss_trades > 0
            ? a.n_loss_usd + r.loss_trades
            : a.n_loss_usd,
        min_loss_pct:
          r.single_max_loss_pct != null && Number.isFinite(r.single_max_loss_pct)
            ? a.min_loss_pct == null
              ? r.single_max_loss_pct
              : Math.min(a.min_loss_pct, r.single_max_loss_pct)
            : a.min_loss_pct,
      }
    },
    {
      profit_trades: 0,
      loss_trades: 0,
      total_instances: 0,
      total_profit: 0,
      total_max_risk: 0,
      profit_investment: 0,
      loss_investment: 0,
      total_loss_sum: 0,
      total_loss_any: false,
      w_profit_pct: 0,
      n_profit_pct: 0,
      w_loss_pct: 0,
      n_loss_pct: 0,
      w_profit_usd: 0,
      n_profit_usd: 0,
      w_loss_usd: 0,
      n_loss_usd: 0,
      min_loss_pct: null as number | null,
    },
  )

  const pi = Math.round((acc.profit_investment ?? 0) * 100) / 100
  const li = Math.round((acc.loss_investment ?? 0) * 100) / 100
  const profit_avg_pct =
    acc.n_profit_pct > 0 ? Math.round((acc.w_profit_pct / acc.n_profit_pct) * 100) / 100 : null
  const loss_avg_pct =
    acc.n_loss_pct > 0 ? Math.round((acc.w_loss_pct / acc.n_loss_pct) * 100) / 100 : null
  const profit_avg_usd =
    acc.n_profit_usd > 0 ? Math.round((acc.w_profit_usd / acc.n_profit_usd) * 100) / 100 : null
  const loss_avg_usd =
    acc.n_loss_usd > 0 ? Math.round((acc.w_loss_usd / acc.n_loss_usd) * 100) / 100 : null
  const totalMaxRisk = Math.round((acc.total_max_risk ?? 0) * 100) / 100
  const totalNet = Math.round(
    ((acc.total_profit ?? 0) + (acc.total_loss_any ? acc.total_loss_sum : 0)) * 100,
  ) / 100
  const structureReturnPct =
    totalMaxRisk > 0 ? Math.round((totalNet / totalMaxRisk) * 10000) / 100 : null

  return {
    structure_name: 'All structures',
    total_instances: acc.total_instances,
    profit_trades: acc.profit_trades,
    loss_trades: acc.loss_trades,
    total_profit: Math.round((acc.total_profit ?? 0) * 100) / 100,
    total_loss: acc.total_loss_any ? Math.round(acc.total_loss_sum * 100) / 100 : null,
    total_max_risk: totalMaxRisk,
    structure_return_pct: structureReturnPct,
    profit_investment: pi,
    loss_investment: li,
    total_investment: Math.round((pi + li) * 100) / 100,
    profit_avg_pct,
    loss_avg_pct,
    single_max_loss_pct: acc.min_loss_pct,
    profit_avg_usd,
    loss_avg_usd,
  }
}

export function resolveWinRateTotals(
  structures: WinRateStructureRow[],
  totalsAllFromApi: WinRateStructureRow | null | undefined,
): WinRateStructureRow | null {
  if (structures.length <= 1) return null
  return totalsAllFromApi ?? fallbackTotalsAllFromStructures(structures)
}
