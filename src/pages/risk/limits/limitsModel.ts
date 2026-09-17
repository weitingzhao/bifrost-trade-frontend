/**
 * The limits that exist, and what they read right now.
 *
 * Two kinds, and the page keeps them apart because they bind different things.
 *
 * The **house lines** are the ones this app already enforces and already draws
 * elsewhere: the 85% backing gate, the concentration floor on β-weighted Δ$,
 * the pressure ceiling on Room to add. Each has a live reading, and each of
 * those readings is the page that owns it — cited, never rebuilt (§14.2).
 *
 * The **gate** is `gate_safety`, the daemon's own parameter set. Its numbers are
 * real and stored, but they bind an engine that is frozen (D10) and running in
 * paper mode, so nothing there can trip today. Showing them as limits on the
 * book would be wrong; showing them as what the engine would enforce is what
 * they are.
 *
 * What does not exist at all is a record of *when* a limit was crossed. A
 * breach can be computed right now; a history of breaches has no store, and the
 * page says so rather than showing an empty table as a clean record.
 */

export type LimitKind = 'hard' | 'soft'

export interface LimitRow {
  key: string
  name: string
  kind: LimitKind
  /** The limit itself, formatted the way the house states it. */
  limit: string
  /** What it reads now, or null when nothing can read it today. */
  current: number | null
  /** The limit as a number, when the two are comparable. */
  ceiling: number | null
  /** How much of the limit is used: 1 is exactly at it. */
  use: number | null
  /** What happens when it is crossed, in the house's own words. */
  onBreach: string
  scope: string
  /** Where the reading comes from — this page cites, it does not compute. */
  citedFrom: { label: string; to: string }
  /** Null when nothing can read it; the reason goes here instead. */
  noReading: string | null
}

export interface GateParam {
  section: string
  key: string
  value: string
}

export const LIMITS_UNRECORDED = {
  history:
    'Nothing records when a limit was crossed. A breach is computable right now — the readings are live — but there is no store behind it, so there is no yesterday to show and no acknowledgement to keep.',
  ack: 'Acknowledging a soft breach would be a write into a store that does not exist yet. The row names what to do instead, on the page that can do it.',
  daemon:
    'These bind the trading daemon, which is frozen (D10) and configured for paper trading. They are real, stored limits — and nothing can trip them while the engine is not running, which is why they sit apart from the house lines above.',
} as const

/** Over this share of a limit, a soft line is worth looking at before it is crossed. */
export const LIMIT_WATCH = 0.8

function shareOfLimit(current: number | null, ceiling: number | null): number | null {
  if (current == null || ceiling == null || !Number.isFinite(ceiling) || ceiling <= 0) return null
  return current / ceiling
}

/**
 * The house lines, each carrying the reading from the page that owns it.
 *
 * A limit with no reading keeps its row: the limit exists whether or not this
 * side can measure it today, and hiding it would make the book look smaller
 * than it is.
 */
export function houseLimits(input: {
  backingUsedPct: number | null
  backingGatePct: number
  topNameShare: number | null
  concentrationFloor: number
  pressure: number | null
  pressureCeiling: number
  nakedShortCalls: number | null
  nakedShortCallLimit: number | null
}): LimitRow[] {
  return [
    {
      key: 'backing',
      name: 'Backing used',
      kind: 'hard',
      limit: `gate ${Math.round(input.backingGatePct * 100)}%`,
      current: input.backingUsedPct,
      ceiling: input.backingGatePct,
      use: shareOfLimit(input.backingUsedPct, input.backingGatePct),
      onBreach: 'auto-derisk — the house line Rules would act on',
      scope: 'pool',
      citedFrom: { label: 'Backing & Model', to: '/portfolio/backing' },
      noReading: input.backingUsedPct == null ? 'nothing priced the pool' : null,
    },
    {
      key: 'concentration',
      name: 'Single name share of β-Δ',
      kind: 'soft',
      limit: `${Math.round(input.concentrationFloor * 100)}%`,
      current: input.topNameShare,
      ceiling: input.concentrationFloor,
      use: shareOfLimit(input.topNameShare, input.concentrationFloor),
      onBreach: 'acknowledge — one name is the book',
      scope: 'per underlying',
      citedFrom: { label: 'Portfolio Exposure', to: '/risk/portfolio' },
      noReading: input.topNameShare == null ? 'no name carries a β-weighted Δ$' : null,
    },
    {
      key: 'pressure',
      name: 'Pressure · 1 − Cushion',
      kind: 'hard',
      limit: `ceiling ${Math.round(input.pressureCeiling * 100)}%`,
      current: input.pressure,
      ceiling: input.pressureCeiling,
      use: shareOfLimit(input.pressure, input.pressureCeiling),
      onBreach: 'the broker acts, not the house — at 1 it closes positions',
      scope: 'account',
      citedFrom: { label: 'Margin & Buying Power', to: '/risk/margin' },
      noReading: input.pressure == null ? 'the broker reported no Cushion' : null,
    },
    {
      key: 'naked',
      name: 'Naked short calls',
      kind: 'hard',
      limit: input.nakedShortCallLimit == null ? 'no house number' : String(input.nakedShortCallLimit),
      current: input.nakedShortCalls,
      ceiling: input.nakedShortCallLimit,
      use: shareOfLimit(input.nakedShortCalls, input.nakedShortCallLimit),
      onBreach: 'block new naked shorts',
      scope: 'book',
      citedFrom: { label: 'Positions', to: '/portfolio/positions' },
      noReading:
        input.nakedShortCallLimit == null
          ? 'the count is live; the house has never written a number to hold it against'
          : null,
    },
  ]
}

/** A limit is breached when its reading is past it — not when it is close. */
export function breached(rows: readonly LimitRow[]): LimitRow[] {
  return rows.filter((r) => r.use != null && r.use > 1)
}

/** Approaching, but not past — the ones worth seeing before they trip. */
export function watching(rows: readonly LimitRow[], floor: number = LIMIT_WATCH): LimitRow[] {
  return rows.filter((r) => r.use != null && r.use > floor && r.use <= 1)
}

/** The daemon's stored parameters, flattened for reading. Nested objects only. */
export function gateParams(gates: unknown): GateParam[] {
  const out: GateParam[] = []
  const walk = (node: unknown, section: string, prefix: string) => {
    if (node == null || typeof node !== 'object' || Array.isArray(node)) return
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (v != null && typeof v === 'object' && !Array.isArray(v)) {
        walk(v, section || k, section ? `${prefix}${k}.` : '')
        continue
      }
      if (Array.isArray(v)) continue
      out.push({ section: section || 'gate', key: `${prefix}${k}`, value: String(v) })
    }
  }
  walk(gates, '', '')
  return out
}
