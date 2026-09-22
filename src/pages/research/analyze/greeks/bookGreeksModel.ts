/**
 * Every option leg in the book, greek by greek.
 *
 * `Research Contract Greeks.dc.html` (Rev 2026-09-19.2) calls this *"the
 * per-leg detail behind Risk › Exposure's aggregates"*, and its footer is the
 * rule that shapes this file: **β-weighted aggregation across the whole book —
 * including stock — is Risk › Exposure's job; this page never re-aggregates
 * differently.**
 *
 * So the strip is not computed here. It is `useOptionGreeks`'s rollup — the
 * same object `usePositionsBook` hands Risk › Exposure — printed with Risk's
 * own captions. Two pages summing one book two ways is the failure the
 * design's own sentence is written to prevent (§14.2).
 *
 * ## What the book holds, and what the vendor can price
 *
 * Measured on DEV 2026-09-22: **11 short option legs** across three expiries
 * (2026-11-20 ×7 · 2026-12-18 ×3 · 2027-01-15 ×1), nine underlyings, nine
 * calls and two puts.
 *
 * The two that do not price are both AMD, and the reason is not a stale
 * chain: `/market/options/snapshots` answers `count: 0` for AMD at *every*
 * expiry tried — 2026-10-16, 11-20, 12-18 and 2027-01-15 — while the other
 * eight underlyings answer with today's snapshot. AMD is absent from the
 * option snapshot store, not behind in it. An unpriced leg keeps its row, is
 * counted, and never contributes zero to a total.
 *
 * ## One row per contract, not per holding
 *
 * The book flattens a leg per account × strategy instance, so one contract can
 * arrive three times — RKLB 18DEC26 90C does. Greeks are a property of the
 * contract and the net quantity, so the rows are netted by ticker before they
 * are scaled. The first pass did not, and drew three RKLB rows carrying
 * identical greeks against different quantities, because `byTicker` holds one
 * position's numbers per contract and the last leg written wins. Scaling from
 * the vendor's per-share row instead is what makes a row's Γ match its own Qty.
 */
import { buildOptionTicker, daysTo } from '@/utils/optionTicker'
import { cushionBand, normalizeRight, type CushionBand } from '@/utils/positionsOptionRisk'
import { cushionPct, type OptionRight } from '@/utils/optionMoneyness'
import { fmtIsoDateToken } from '@/lib/format'
import type { GreeksRollup } from '@/hooks/useOptionGreeks'

export interface BookLegInput {
  underlying: string
  /** `YYYYMMDD` or `YYYY-MM-DD`. */
  expiry: string
  strike: number
  right: string
  /** Signed contracts — negative is short. */
  qty: number
  spot: number | null
}

export interface BookLegRow {
  ticker: string | null
  /** The §14.4 contract token: `AMD 20NOV26 620C`. */
  token: string
  underlying: string
  expiry: string
  qty: number
  /** The vendor's dated close — the same mark Expiration prices from. */
  mark: number | null
  /** Per share, as the vendor reports it. */
  iv: number | null
  /** Position greeks: per-share × contracts × 100, signed by the position. */
  delta: number | null
  gamma: number | null
  vega: number | null
  theta: number | null
  dte: number | null
  /** Room before the strike is in play, signed towards trouble. */
  cushion: number | null
  band: CushionBand | null
  /** Short and inside the tight line, or under 21 days. The design's TIGHT. */
  tight: boolean
  /** No vendor row at all, or a row with no greeks. */
  unpriced: boolean
}

export interface ExpiryGroup {
  expiry: string
  /** `20NOV26 · 59 DTE` — the design's group heading. */
  label: string
  dte: number | null
  rows: BookLegRow[]
}

/** The design's own line: under this many days a short leg is tight whatever its cushion. */
export const TIGHT_DTE = 21

/** Net the book's per-instance holdings down to one entry per contract. */
function netByContract(legs: readonly BookLegInput[]): BookLegInput[] {
  const out = new Map<string, BookLegInput>()
  for (const leg of legs) {
    const right = normalizeRight(leg.right) ?? ''
    const key = `${leg.underlying}|${leg.expiry.replace(/\D/g, '').slice(0, 8)}|${leg.strike}|${right}`
    const prev = out.get(key)
    if (prev) prev.qty += leg.qty
    else out.set(key, { ...leg, right })
  }
  // A contract held long and short in equal size is flat, and a flat row on a
  // greeks page is noise wearing a position's clothes.
  return [...out.values()].filter((l) => l.qty !== 0)
}

const scale = (perShare: number | null | undefined, qty: number): number | null =>
  perShare == null || !Number.isFinite(perShare) ? null : perShare * qty * 100

export function bookLegRows(
  legs: readonly BookLegInput[],
  greeks: Pick<GreeksRollup, 'perShareByTicker' | 'closeByTicker'>,
  opts: { todayIso: string; tightPct: number },
): BookLegRow[] {
  return netByContract(legs).map((leg) => {
    const ticker = buildOptionTicker(leg)
    const v = ticker ? greeks.perShareByTicker.get(ticker) : undefined
    const close = ticker ? greeks.closeByTicker.get(ticker) : undefined
    const right = (leg.right || '') as OptionRight
    const dte = daysTo(leg.expiry, opts.todayIso)
    const cushion = cushionPct(leg.spot, leg.strike, right)
    const short = leg.qty < 0
    return {
      ticker,
      token: `${leg.underlying} ${fmtIsoDateToken(leg.expiry)} ${leg.strike}${right}`,
      underlying: leg.underlying,
      expiry: leg.expiry,
      qty: leg.qty,
      mark: close?.close ?? null,
      iv: v?.iv ?? null,
      delta: scale(v?.delta, leg.qty),
      gamma: scale(v?.gamma, leg.qty),
      vega: scale(v?.vega, leg.qty),
      theta: scale(v?.theta, leg.qty),
      dte,
      cushion,
      band: cushion == null ? null : cushionBand(cushion, opts.tightPct),
      // Only a short leg can be tight: a long leg near its strike is an
      // opportunity, not an obligation about to arrive.
      tight:
        short &&
        ((cushion != null && cushion < opts.tightPct) || (dte != null && dte < TIGHT_DTE)),
      unpriced: v == null,
    }
  })
}

/** Grouped by expiry, nearest first — the design's reading order. */
export function byExpiry(rows: readonly BookLegRow[]): ExpiryGroup[] {
  const groups = new Map<string, BookLegRow[]>()
  for (const r of rows) {
    const key = r.expiry.replace(/\D/g, '').slice(0, 8)
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([expiry, list]) => {
      const dte = list[0]?.dte ?? null
      return {
        expiry,
        label: `${fmtIsoDateToken(expiry)}${dte == null ? '' : ` · ${dte} DTE`}`,
        dte,
        // Tightest first inside a group, so the leg that needs a decision is
        // the one the eye lands on.
        rows: [...list].sort((a, b) => (a.cushion ?? 9) - (b.cushion ?? 9)),
      }
    })
}

export interface MarksStanding {
  /** `snapshot 2026-09-22` — the day the vendor captured what is on screen. */
  text: string
  /** Legs the vendor could not price, named rather than summed as zero. */
  unpriced: number
  /** Legs captured on an earlier day than the newest. */
  stale: number
  tone: 'ok' | 'warn'
}

/**
 * Counted over contracts, not over holdings.
 *
 * The rollup's `matched` / `unmatched` count the book's per-instance legs, and
 * the table shows one row per contract — quoting the rollup's numbers beside a
 * shorter table is two counts of one thing on one screen.
 */
export function marksStanding(
  rollup: Pick<GreeksRollup, 'newestAsOf' | 'staleLegs'>,
  rows: readonly BookLegRow[],
): MarksStanding {
  const day = rollup.newestAsOf ? rollup.newestAsOf.slice(0, 10) : null
  const dead = rows.filter((r) => r.unpriced)
  const names = [...new Set(dead.map((r) => r.underlying))]
  const parts: string[] = [day ? `snapshot ${fmtIsoDateToken(day)}` : 'no snapshot yet']
  if (dead.length > 0) {
    parts.push(
      `${rows.length - dead.length} of ${rows.length} contracts priced — ${names.join(', ')} not in the snapshot store`,
    )
  }
  if (rollup.staleLegs > 0) parts.push(`${rollup.staleLegs} on an older capture`)
  return {
    text: parts.join(' · '),
    unpriced: dead.length,
    stale: rollup.staleLegs,
    tone: dead.length > 0 || rollup.staleLegs > 0 ? 'warn' : 'ok',
  }
}
