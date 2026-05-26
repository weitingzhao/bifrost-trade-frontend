/**
 * Canonical formatting utilities for the entire app.
 *
 * All components should import from here instead of defining local formatters.
 * This ensures consistent locale, precision, and null-handling throughout.
 */

// ─── Currency ───

/** $1,234.56  (2dp) — or "—" for null/NaN */
export function fmtUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** $1,235  (0dp, rounded) — or "—" */
export function fmtUsdRound(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

// ─── Percentages ───

/** "24.1%"  (1dp, no sign) */
export function fmtPct1(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(1)}%`
}

/** "56.54%"  (2dp, no sign) */
export function fmtPct2(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(2)}%`
}

/** "+1.23%" / "-0.50%"  (signed, 2dp) — used for daily change */
export function fmtPctSigned(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

// ─── Numbers ───

/** Integer or "—" */
export function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—'
  return String(Math.round(v))
}

/** Profit factor: 2dp, or "∞" for Infinity, or "—" */
export function fmtFactor(v: number | null | undefined): string {
  if (v == null) return '—'
  if (!Number.isFinite(v)) return '∞'
  return v.toFixed(2)
}

// ─── Time ───

/** Relative time since a unix timestamp: "12s", "5m", "3h", "2d" */
export function fmtRelativeTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  const secs = Math.floor(Date.now() / 1000 - ts)
  if (secs < 90) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 90) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 36) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

// ─── Options ───

/** YYYYMMDD → MM/DD/YY, YYYYMM → MM/YY */
export function fmtExpiry(s: string | undefined): string {
  if (!s) return '—'
  if (s.length === 8) return `${s.slice(4, 6)}/${s.slice(6, 8)}/${s.slice(2, 4)}`
  if (s.length === 6) return `${s.slice(4, 6)}/${s.slice(2, 4)}`
  return s
}

export function fmtOptionRight(r: string | undefined): 'Call' | 'Put' | '—' {
  if (r === 'C') return 'Call'
  if (r === 'P') return 'Put'
  return '—'
}
