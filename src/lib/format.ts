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

/**
 * Percentage helpers come in two families, and mixing them is a 100x error.
 *
 *   fmtPct1 / fmtPct2 / fmtPctSigned  input is ALREADY a percentage (12.5 -> "12.5%")
 *   fmtPctFromFraction                input is a FRACTION       (0.125 -> "12.5%")
 *
 * Prefer these over a local `fmtPct`: that name was defined in 13 files with
 * both meanings, so its behaviour depended on which file you were reading.
 */

/** 0.125 -> "12.5%"  — for API values expressed as fractions (IV, VRP, rates). */
export function fmtPctFromFraction(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

/** "24.1%"  (1dp, no sign) — input is already a percentage. */
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

/** `toFixed(digits)` or "—" — default 2dp. Prefer over local `fmtNum` copies. */
export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

/** Locale-grouped number with fixed fraction digits — or "—". */
export function fmtNumLocale(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

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

const MONTH_TOKENS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

/**
 * The app-wide date token (DESIGN_CONTRACTS §14.4): `11SEP26`. Same shape as the
 * expiry inside an option contract label, so a date reads the same wherever it
 * appears and never depends on the reader's locale.
 *
 * Takes epoch seconds or milliseconds, as a number or the string an API sends
 * when the SQL forgot its `::bigint`, and reads it in UTC.
 */
export function fmtDateToken(ts: number | string | null | undefined): string {
  const n = Number(ts)
  if (ts == null || ts === '' || !Number.isFinite(n)) return '—'
  const d = new Date(n > 1e12 ? n : n * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${day}${MONTH_TOKENS[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(2)}`
}

/** `SEP 2026` — the month a group of dated rows belongs to, same token family. */
export function fmtMonthToken(ts: number | string | null | undefined): string {
  const n = Number(ts)
  if (ts == null || ts === '' || !Number.isFinite(n)) return '—'
  const d = new Date(n > 1e12 ? n : n * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  return `${MONTH_TOKENS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** `11SEP26` from a `YYYY-MM-DD` (or `YYYYMMDD`) calendar date, no timezone. */
export function fmtIsoDateToken(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '—'
  const s = String(iso).trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(s)
  if (!m) return s
  const month = Number(m[2]) - 1
  if (month < 0 || month > 11) return s
  return `${m[3]}${MONTH_TOKENS[month]}${m[1].slice(2)}`
}

/**
 * The option contract token (§14.4) from a broker OCC symbol:
 * `AMD   261120C00620000` → `AMD 20NOV26 620C`. Anything that is not an OCC
 * symbol comes back unchanged, so a stock ticker passes straight through.
 */
export function fmtOccContractToken(symbol: string | null | undefined): string {
  const s = String(symbol ?? '').trim()
  const m = /^([A-Z0-9.]+)\s+(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(s)
  if (!m) return s
  const month = Number(m[3]) - 1
  if (month < 0 || month > 11) return s
  const strike = Number(m[6]) / 1000
  return `${m[1]} ${m[4]}${MONTH_TOKENS[month]}${m[2]} ${strike}${m[5]}`
}

/** `SEP 2026` from a `YYYY-MM` bucket key. */
export function fmtMonthKeyToken(monthKey: string | null | undefined): string {
  if (monthKey == null || String(monthKey).trim() === '') return '—'
  const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey).trim())
  if (!m) return monthKey
  const month = Number(m[2]) - 1
  if (month < 0 || month > 11) return monthKey
  return `${MONTH_TOKENS[month]} ${m[1]}`
}

export const ET_ZONE = 'America/New_York'

export function fmtEtClock(d: Date): string {
  return d.toLocaleTimeString('en-US', { hourCycle: 'h23', timeZone: ET_ZONE })
}

/** Epoch seconds as `HH:MM:SS ET` in America/New_York. One formatter for every source. */
export function fmtEpochEtClock(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  return `${fmtEtClock(new Date(sec * 1000))} ET`
}

export function fmtTs(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString()
}

/**
 * Same, for an ISO-8601 string. `fmtTs` takes epoch seconds, so every caller
 * holding an API timestamp string wrote its own — four functions named fmtTs
 * across the app, taking two different input types. Naming the input keeps them
 * apart.
 */
export function fmtIsoTs(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

/** Format trade_date (YYYY-MM-DD string from API) for display. */
export function fmtTradeDate(tradeDate: string | null | undefined): string {
  if (tradeDate == null || String(tradeDate).trim() === '') return '—'
  const s = String(tradeDate).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  return s
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
