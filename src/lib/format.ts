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

/** Legacy dashboard strip: signed % with "--" placeholder. */
export function fmtPctCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '--'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

/** Legacy dashboard strip: USD 0dp with "--" placeholder. */
export function fmtUsdCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
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

export function getContractLabelParts(contract_key: string): { symbol: string; rightLabel: string } {
  const parts = contract_key.split('|')
  const symbol = parts[0]?.trim() || ''
  const right = (parts[4] ?? parts[parts.length - 1] ?? '').toString().toUpperCase()
  const rightLabel = right === 'C' ? 'CALL' : right === 'P' ? 'PUT' : right || ''
  return { symbol, rightLabel }
}

export function parseOptionContractKey(contract_key: string | null | undefined): {
  expiry: string
  strike: string
  right: string
  rightLabel: string
} {
  if (!contract_key || !contract_key.trim()) {
    return { expiry: '—', strike: '—', right: '—', rightLabel: '—' }
  }
  const parts = contract_key.split('|')
  const expiry = (parts[2] ?? '').trim() || '—'
  const strike = (parts[3] ?? '').trim() || '—'
  const right = ((parts[4] ?? '').toString().toUpperCase().slice(0, 1)) || '—'
  const rightLabel = right === 'C' ? 'CALL' : right === 'P' ? 'PUT' : right
  return { expiry, strike, right, rightLabel }
}

export function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

/** Elapsed since ts (Unix sec): e.g. "5m", "2h", "1d". */
export function fmtSince(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const nowSec = Date.now() / 1000
  const elapsed = Math.max(0, Math.floor(nowSec - ts))
  if (elapsed < 60) return `${elapsed}s`
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h`
  return `${Math.floor(elapsed / 86400)}d`
}

export function fmtTsForPeriod(ts: number | null | undefined, period: string): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const d = new Date(ts * 1000)
  if (period === '1 D') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (period === '1 min' || period === '5 mins') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (period === '1 hour') {
    return (
      d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    )
  }
  return d.toLocaleString()
}
