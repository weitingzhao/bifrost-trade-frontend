/** Format API decimal ratios (0.05 → 5.00%) for model analysis fields. */
export function fmtRatioAsPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(2)}%`
}

export function fmtModelDelta(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(2)
}

export function fmtSpotPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtIvShockLabel(ivShock: number): string {
  if (ivShock === 0) return '0 (base σ)'
  const pct = (ivShock * 100).toFixed(0)
  return `${ivShock > 0 ? '+' : ''}${pct} abs vol`
}

export function fmtSpotShockLabel(spotShock: number): string {
  return `${(spotShock * 100).toFixed(0)}%`
}

export function riskBadgeLabel(riskType: string): string {
  return riskType === 'unlimited' ? 'Unlimited' : 'Defined'
}
