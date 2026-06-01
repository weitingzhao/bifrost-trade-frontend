export function passBadgeTone(count: number | null, full: number): string {
  if (count == null) return 'unknown'
  if (count === full) return 'full'
  if (count >= Math.ceil(full * 0.5)) return 'partial'
  return 'poor'
}

export function fmtCondVal(v: number | string | null | undefined): string {
  if (v == null) return '—'
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1e4) return v.toLocaleString(undefined, { maximumFractionDigits: 0 })
    if (Math.abs(v) < 1 && Math.abs(v) > 0) return `${(v * 100).toFixed(1)}%`
    return v.toFixed(1)
  }
  return String(v)
}

export function fmtMarketCapChip(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

export function fmtEmployees(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K emp` : `${n} emp`
}

export function fmtEps(v: number | null): string {
  if (v == null) return '—'
  return `$${v.toFixed(2)}`
}

export function fmtRev(v: number | null): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

export function fmtRatio(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(3)
}

export function humanizeId(id: string): string {
  return id.replace(/_/g, ' ')
}
