/**
 * One expiry's chain, read off the vendor's EOD snapshots — the shape Compare
 * places rules on and the Payoff face builds structures from (§14.2: promoted
 * from `compareModel` when the Payoff face became its second reader).
 *
 * `mark` is the session's last trade (day_close), not a quote: the plugin's
 * snapshots carry no bid/ask, which both readers say out loud rather than
 * dressing a close as a market.
 */
import type { VendorGreeksRow } from '@/api/marketData/optionGreeks'
import { daysTo, parseOptionTicker } from '@/utils/optionTicker'

export interface ChainContract {
  ticker: string
  strike: number
  right: 'C' | 'P'
  /** The session's last trade — not a quote. */
  mark: number | null
  /** The vendor's implied vol for the contract, as a fraction (0.42 = 42%). */
  iv: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  oi: number | null
  volume: number | null
}

export function chainFromSnapshots(rows: readonly VendorGreeksRow[]): ChainContract[] {
  const out: ChainContract[] = []
  for (const r of rows) {
    const p = parseOptionTicker(r.option_ticker)
    if (!p || (p.right !== 'C' && p.right !== 'P')) continue
    out.push({
      ticker: r.option_ticker,
      strike: p.strike,
      right: p.right,
      mark: r.day_close != null && r.day_close > 0 ? r.day_close : null,
      iv: r.iv != null && Number.isFinite(r.iv) && r.iv > 0 ? r.iv : null,
      delta: r.delta,
      gamma: r.gamma,
      theta: r.theta,
      vega: r.vega,
      oi: r.open_interest,
      volume: r.day_volume ?? null,
    })
  }
  return out
}

/** A standard monthly: the third Friday, the only Friday that falls on the 15th–21st. */
export function isMonthly(expiry: string): boolean {
  const d = new Date(`${expiry.slice(0, 10)}T12:00:00Z`)
  const day = d.getUTCDate()
  return d.getUTCDay() === 5 && day >= 15 && day <= 21
}

/**
 * The first listed expiry at least `horizon` days out — a monthly when the
 * rule's own time dimension says monthly, since that is what the rule was
 * written for. Null when nothing that far is listed.
 */
export function pickExpiry(
  expiries: readonly string[],
  today: string,
  horizon: number,
  monthly: boolean
): string | null {
  for (const e of [...expiries].sort()) {
    const dte = daysTo(e, today)
    if (dte == null || dte < horizon) continue
    if (monthly && !isMonthly(e)) continue
    return e
  }
  return null
}
