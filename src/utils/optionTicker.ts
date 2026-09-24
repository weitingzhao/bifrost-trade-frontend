/**
 * The OCC-style ticker the market-data warehouse keys option rows by.
 *
 * Positions carry symbol / expiry / strike / right as separate fields; the
 * vendor snapshot carries one string. Building the string is the only way to
 * join them, and it is the kind of format that fails silently — a strike padded
 * to the wrong width matches nothing, and "no Greeks for this leg" looks exactly
 * like "the vendor had no data", so it gets tested rather than eyeballed.
 *
 *   O:MU261120C01200000
 *   │ │  │     │└ strike × 1000, zero-padded to 8
 *   │ │  │     └ right
 *   │ │  └ expiry YYMMDD
 *   │ └ underlying root
 *   └ literal prefix
 */
import { normalizeRight } from './positionsOptionRisk'

export interface OptionTickerParts {
  underlying: string
  /** YYYYMMDD or YYYY-MM-DD. */
  expiry: string
  strike: number
  right: string
}

export function buildOptionTicker(p: OptionTickerParts): string | null {
  const root = (p.underlying ?? '').trim().toUpperCase()
  if (!root || !/^[A-Z][A-Z0-9.]{0,9}$/.test(root)) return null

  const digits = (p.expiry ?? '').replace(/\D/g, '')
  if (digits.length < 8) return null
  const yymmdd = digits.slice(2, 8)

  const right = normalizeRight(p.right)
  if (right == null) return null

  if (!Number.isFinite(p.strike) || p.strike <= 0) return null
  // Strikes are quoted in thousandths; rounding avoids 1200.0000000002 → 1199999.
  const milli = Math.round(p.strike * 1000)
  if (milli > 99_999_999) return null

  return `O:${root}${yymmdd}${right}${String(milli).padStart(8, '0')}`
}

/**
 * The inverse of `buildOptionTicker`: `O:PLTR261016P00150000` → its parts.
 *
 * The root is matched non-greedily from the left and the fixed fifteen-character
 * tail (date, right, strike) is anchored on the right, so a root carrying a
 * digit after a corporate action (`O:WDC1250221C…`) still splits one way only —
 * the same reasoning as the plugin's own parser.
 */
export function parseOptionTicker(ticker: string): OptionTickerParts | null {
  const m = /^O:([A-Z0-9.]+?)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec((ticker ?? '').trim().toUpperCase())
  if (!m) return null
  return {
    underlying: m[1],
    expiry: `20${m[2]}-${m[3]}-${m[4]}`,
    right: m[5],
    strike: Number(m[6]) / 1000,
  }
}

/** Vendor Greeks are per share; a position holds `qty` contracts of 100. */
export function positionGreek(perShare: number | null | undefined, qty: number): number | null {
  if (perShare == null || !Number.isFinite(perShare)) return null
  return perShare * qty * 100
}

/**
 * OCC equity root is left-justified (often space-padded) before YYMMDD + C/P + strike.
 * Examples: "FN    261016P00350000", "GOOG  261120C00370000"
 */
export function extractUnderlyingRootSymbol(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  const occ = s.match(/^([A-Za-z][A-Za-z0-9.]{0,9}?)\s+\d{6}[CPcp]/)
  if (occ?.[1]) return occ[1].toUpperCase()
  const beforeSpace = s.split(/\s+/)[0]?.trim()
  if (beforeSpace && /^[A-Za-z][A-Za-z0-9.]{0,9}$/.test(beforeSpace)) {
    return beforeSpace.toUpperCase()
  }
  return beforeSpace ? beforeSpace.toUpperCase() : ''
}

/**
 * Calendar days from today to an expiry, or null when either is unreadable.
 *
 * Shared because three pages ask it of the same contract — Expiration for the
 * ladder, Assignment for the window, Corporate Actions for whether an event
 * lands before a leg dies — and two copies would eventually disagree about
 * which side of midnight a date sits on.
 */
export function daysTo(expiry: string, todayIso: string): number | null {
  const e = expiry.replace(/\D/g, '').slice(0, 8)
  const t = todayIso.replace(/\D/g, '').slice(0, 8)
  if (e.length !== 8 || t.length !== 8) return null
  const toUtc = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)))
  return Math.round((toUtc(e) - toUtc(t)) / 86_400_000)
}
