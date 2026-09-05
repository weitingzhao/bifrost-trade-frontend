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

/** Vendor Greeks are per share; a position holds `qty` contracts of 100. */
export function positionGreek(perShare: number | null | undefined, qty: number): number | null {
  if (perShare == null || !Number.isFinite(perShare)) return null
  return perShare * qty * 100
}
