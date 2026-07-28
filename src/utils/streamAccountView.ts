import type { MarketStreamsRow, OptPositionRow } from '@/utils/marketStreamsRows'

/** How Host/Secondary position metrics are shown in merged Qty / Cost / Since $ columns. */
export type StreamAccountViewMode = 'host' | 'secondary' | 'combine' | 'all'

export const STREAM_ACCOUNT_VIEW_OPTIONS: ReadonlyArray<{
  value: StreamAccountViewMode
  label: string
  title: string
}> = [
  { value: 'host', label: 'Host', title: 'Host account only' },
  { value: 'secondary', label: 'Secondary', title: 'Secondary account only' },
  { value: 'combine', label: 'Combine', title: 'Host + Secondary summed' },
  { value: 'all', label: 'All', title: 'Host / Secondary side-by-side in each cell' },
]

export const DEFAULT_STREAM_ACCOUNT_VIEW: StreamAccountViewMode = 'all'

/** How option premium (Cost / Last) is displayed in Market Streams. */
export type OptPremiumUnit = 'contract' | 'share'

export const DEFAULT_OPT_PREMIUM_UNIT: OptPremiumUnit = 'contract'

export const OPT_PREMIUM_UNIT_OPTIONS: ReadonlyArray<{
  value: OptPremiumUnit
  label: string
  title: string
}> = [
  {
    value: 'contract',
    label: 'Contract',
    title: 'Per contract (一手): premium × 100',
  },
  {
    value: 'share',
    label: 'Share',
    title: 'Per share (一股): IB premium as quoted',
  },
]

/** Scale a per-share option premium for display. PnL dollars are already ×100 — do not use this on Since $. */
export function scaleOptPremiumDisplay(
  perShare: number | null | undefined,
  unit: OptPremiumUnit,
): number | null {
  if (perShare == null || !Number.isFinite(perShare)) return null
  return unit === 'contract' ? perShare * 100 : perShare
}

/** Price return % vs avg cost: (last − avg) / avg × 100. */
export function sincePctFromAvg(
  avgCost: number | null | undefined,
  last: number | null | undefined,
): number | null {
  if (
    avgCost == null ||
    !Number.isFinite(avgCost) ||
    avgCost <= 0 ||
    last == null ||
    !Number.isFinite(last)
  ) {
    return null
  }
  return ((last - avgCost) / avgCost) * 100
}

/** Portfolio since % for totals: pnl / costBasis × 100. */
export function sincePctFromBasis(
  costBasis: number | null | undefined,
  pnl: number | null | undefined,
): number | null {
  if (
    costBasis == null ||
    !Number.isFinite(costBasis) ||
    costBasis === 0 ||
    pnl == null ||
    !Number.isFinite(pnl)
  ) {
    return null
  }
  return (pnl / Math.abs(costBasis)) * 100
}

export type AccountMetricSingle = {
  kind: 'single'
  qty: number | null
  avgCost: number | null
  pnl: number | null
}

export type AccountMetricSplit = {
  kind: 'split'
  hostQty: number | null
  hostAvgCost: number | null
  hostPnl: number | null
  secondaryQty: number | null
  secondaryAvgCost: number | null
  secondaryPnl: number | null
}

export type AccountMetrics = AccountMetricSingle | AccountMetricSplit

export function filterStkByAccountView(
  rows: MarketStreamsRow[],
  mode: StreamAccountViewMode,
  hasStreamAccounts: boolean,
): MarketStreamsRow[] {
  if (!hasStreamAccounts) return rows
  if (mode === 'host') {
    return rows.filter(r => r.streamCategory === 'host' || r.streamCategory === 'both')
  }
  if (mode === 'secondary') {
    return rows.filter(r => r.streamCategory === 'secondary' || r.streamCategory === 'both')
  }
  return rows
}

export function filterOptByAccountView(
  rows: OptPositionRow[],
  mode: StreamAccountViewMode,
  hasStreamAccounts: boolean,
  streamHostId: string | null,
  streamSecondaryId: string | null,
): OptPositionRow[] {
  if (!hasStreamAccounts) return rows
  const host = (streamHostId ?? '').trim().toLowerCase()
  const secondary = (streamSecondaryId ?? '').trim().toLowerCase()
  if (mode === 'host') {
    if (!host) return rows
    return rows.filter(r => (r.account_id ?? '').trim().toLowerCase() === host)
  }
  if (mode === 'secondary') {
    if (!secondary) return rows
    return rows.filter(r => (r.account_id ?? '').trim().toLowerCase() === secondary)
  }
  return rows
}

export function resolveStkAccountMetrics(
  row: MarketStreamsRow,
  mode: StreamAccountViewMode,
): AccountMetrics {
  if (mode === 'host') {
    return {
      kind: 'single',
      qty: row.hostQty,
      avgCost: row.hostAvgCost,
      pnl: row.hostPnlCost,
    }
  }
  if (mode === 'secondary') {
    return {
      kind: 'single',
      qty: row.secondaryQty,
      avgCost: row.secondaryAvgCost,
      pnl: row.secondaryPnlCost,
    }
  }
  if (mode === 'all') {
    return {
      kind: 'split',
      hostQty: row.hostQty,
      hostAvgCost: row.hostAvgCost,
      hostPnl: row.hostPnlCost,
      secondaryQty: row.secondaryQty,
      secondaryAvgCost: row.secondaryAvgCost,
      secondaryPnl: row.secondaryPnlCost,
    }
  }
  return {
    kind: 'single',
    qty: row.qty,
    avgCost: row.avgCost,
    pnl: row.pnlCost,
  }
}

/** Sum cost basis (qty × avgCost) for totals under the active account view. */
export function sumStkCostBasis(
  rows: MarketStreamsRow[],
  mode: StreamAccountViewMode,
): { costSum: number; pnlSum: number } {
  let costSum = 0
  let pnlSum = 0
  for (const r of rows) {
    const m = resolveStkAccountMetrics(r, mode)
    if (m.kind === 'single') {
      const q = m.qty != null && Number.isFinite(m.qty) ? m.qty : 0
      const c = m.avgCost != null && Number.isFinite(m.avgCost) ? m.avgCost : 0
      costSum += q * c
      if (m.pnl != null && Number.isFinite(m.pnl)) pnlSum += m.pnl
    } else {
      const hq = m.hostQty != null && Number.isFinite(m.hostQty) ? m.hostQty : 0
      const hc = m.hostAvgCost != null && Number.isFinite(m.hostAvgCost) ? m.hostAvgCost : 0
      const sq = m.secondaryQty != null && Number.isFinite(m.secondaryQty) ? m.secondaryQty : 0
      const sc =
        m.secondaryAvgCost != null && Number.isFinite(m.secondaryAvgCost) ? m.secondaryAvgCost : 0
      costSum += hq * hc + sq * sc
      if (m.hostPnl != null && Number.isFinite(m.hostPnl)) pnlSum += m.hostPnl
      if (m.secondaryPnl != null && Number.isFinite(m.secondaryPnl)) pnlSum += m.secondaryPnl
    }
  }
  return { costSum, pnlSum }
}

export type DailyMetrics =
  | { kind: 'single'; pct: number | null; dollar: number | null }
  | {
      kind: 'split'
      hostPct: number | null
      hostDollar: number | null
      secondaryPct: number | null
      secondaryDollar: number | null
    }

/** Daily % is price return (same per account); Daily $ scales with account qty. */
export function resolveStkDailyMetrics(
  row: MarketStreamsRow,
  mode: StreamAccountViewMode,
): DailyMetrics {
  const pct = row.changePct
  if (mode === 'host') {
    return { kind: 'single', pct, dollar: row.hostPnlVsBench }
  }
  if (mode === 'secondary') {
    return { kind: 'single', pct, dollar: row.secondaryPnlVsBench }
  }
  if (mode === 'all') {
    return {
      kind: 'split',
      hostPct: pct,
      hostDollar: row.hostPnlVsBench,
      secondaryPct: pct,
      secondaryDollar: row.secondaryPnlVsBench,
    }
  }
  return { kind: 'single', pct, dollar: row.pnlVsBench }
}

export function sumStkDailyDollar(
  rows: MarketStreamsRow[],
  mode: StreamAccountViewMode,
): number {
  let sum = 0
  for (const r of rows) {
    const m = resolveStkDailyMetrics(r, mode)
    if (m.kind === 'single') {
      if (m.dollar != null && Number.isFinite(m.dollar)) sum += m.dollar
    } else {
      if (m.hostDollar != null && Number.isFinite(m.hostDollar)) sum += m.hostDollar
      if (m.secondaryDollar != null && Number.isFinite(m.secondaryDollar)) sum += m.secondaryDollar
    }
  }
  return sum
}
