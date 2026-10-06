/**
 * Whether a name's listed options are only adjusted contracts — what a
 * corporate action leaves behind (CUE after its 1:30 reverse split lists only
 * `CUE1`): the OCC root is the underlying's plus a digit and the deliverable is
 * no longer 100 shares. Research leaves adjusted contracts out of every option
 * metric (`engines/adjusted_contracts.py`, 0.154.0), so on such a name max
 * pain, ATM IV, GEX, flow and PCR are empty by design, not for want of data.
 *
 * The rule is Research's own, read off the ticker: the root is what sits
 * between `O:` and the last 15 characters (YYMMDD, right, strike), and an
 * adjusted root ends in a digit (root aliases such as SPXW or BRKB do not).
 */
import { exhibitFailed, type ExhibitPayload } from '@/api/research/exhibit'

/** The option lenses that read the chain — empty together on an adjusted-only name. */
export const OPTION_METRIC_LENSES = ['iv_rank', 'gex_regime', 'opex_pin', 'order_sentiment'] as const

/** The OCC root of an option ticker (`O:CUE1261016C00000500` → `CUE1`); null when it does not parse. */
export function optionRoot(ticker: string | null | undefined): string | null {
  const t = (ticker ?? '').trim().toUpperCase()
  const body = t.startsWith('O:') ? t.slice(2) : t
  if (body.length <= 15) return null
  return body.slice(0, body.length - 15)
}

export function isAdjustedOptionTicker(ticker: string | null | undefined): boolean {
  const root = optionRoot(ticker)
  return root != null && /[0-9]$/.test(root)
}

export interface ChainListing {
  standard: number
  adjusted: number
  /** The adjusted roots seen, sorted (`CUE1`). */
  adjustedRoots: string[]
}

export function chainListing(rows: readonly { option_ticker?: string | null }[]): ChainListing {
  let standard = 0
  let adjusted = 0
  const roots = new Set<string>()
  for (const r of rows) {
    const root = optionRoot(r.option_ticker)
    if (root == null) continue
    if (/[0-9]$/.test(root)) {
      adjusted += 1
      roots.add(root)
    } else standard += 1
  }
  return { standard, adjusted, adjustedRoots: [...roots].sort() }
}

/** True when the chain read lists adjusted contracts and no standard one. */
export function adjustedOnly(listing: ChainListing | null | undefined): boolean {
  return listing != null && listing.adjusted > 0 && listing.standard === 0
}

/**
 * Every option lens answered, and none of them has a reading — the state in
 * which asking the chain whether it is adjusted-only is worth a read. A lens
 * whose builder failed is a failure, not an absence, so it does not count.
 */
export function optionMetricsEmpty(exhibits: readonly ExhibitPayload[]): boolean {
  const by = new Map(exhibits.map((e) => [e.lens, e]))
  return OPTION_METRIC_LENSES.every((lens) => {
    const ex = by.get(lens)
    return ex != null && ex.freshness === 'missing' && !exhibitFailed(ex)
  })
}
