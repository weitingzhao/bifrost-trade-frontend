/**
 * The one option `contract_key` the frontend builds (TD-25, Owner 2026-10-03).
 *
 * `SYM|OPT|YYYYMMDD|STRIKE|R` in core's positions format
 * (`bifrost_core/portfolio/contract_key.opt_key` over a float strike): the
 * strike as Python prints a float — a whole number keeps one decimal (`80.0`,
 * `1000.0`), any other the shortest form (`82.5`, `82.25`, `0.5`). The golden
 * test holds it to core's strings byte for byte.
 *
 * Five writers used to spell this inline, and they disagreed: watchlist adds
 * wrote `80` where positions write `80.0` (so one contract got two keys and two
 * quote subscriptions), the add-option form let a 6-digit expiry through, and
 * the manual-fill form rounded with `toFixed(1)`, turning 82.25 into 82.3 — a
 * different contract. Every writer goes through here now; so do the readers
 * that build a key for a row that came without one.
 */

/** `YYYYMMDD` from `2026-10-16`, `20261016` or `261016` (read as 20YY); other input keeps its digits. */
export function optExpiryDigits(expiry: string | number | null | undefined): string {
  const digits = String(expiry ?? '').replace(/\D/g, '')
  if (digits.length === 6) return `20${digits}`
  return digits.length >= 8 ? digits.slice(0, 8) : digits
}

/** The strike as core prints a float strike; '' when there is none. */
export function optStrikeText(strike: number | string | null | undefined): string {
  if (strike == null || (typeof strike === 'string' && strike.trim() === '')) return ''
  const n = Number(strike)
  if (!Number.isFinite(n)) return ''
  return Number.isInteger(n) ? n.toFixed(1) : String(n)
}

/** `C` / `P` from C, CALL, P, PUT (any case); otherwise the first letter, upper-cased. */
export function optRightLetter(right: string | null | undefined): string {
  const r = (right ?? '').trim().toUpperCase()
  if (r === 'CALL') return 'C'
  if (r === 'PUT') return 'P'
  return r.slice(0, 1)
}

export function optContractKey(
  symbol: string,
  expiry: string | number | null | undefined,
  strike: number | string | null | undefined,
  right: string | null | undefined,
): string {
  return `${(symbol ?? '').trim().toUpperCase()}|OPT|${optExpiryDigits(expiry)}|${optStrikeText(strike)}|${optRightLetter(right)}`
}
