/**
 * The limit book: every rule the design names, what it reads now, and whether
 * anything has written a number to hold it against.
 *
 * The design draws twelve rules in five groups. All twelve are here even though
 * only three carry a stored limit, because a limit book with the unwritten rules
 * removed reads as a complete book — and the whole point of the page is to show
 * which lines exist and which were never drawn.
 *
 * Every reading belongs to the page that computes it, and is cited rather than
 * rebuilt (§14.2). Where the app has no number for the limit, the row says the
 * limit is unwritten and there is nothing to breach; where it has no reading
 * either, it says which of the two is missing.
 */

/**
 * `gate` is the third kind, and it is not a severity — it is a *scope*.
 *
 * Design DECISIONS 2026-09-18 collapsed gates and limits into one model: a gate
 * is a limit whose scope is an allocation, enforced by the daemon before the
 * action happens rather than noticed after it. So it breaches like any other
 * line, but there is nothing to acknowledge — the open simply does not happen,
 * and the attempt is what lands here. The definition lives in Trade › Rules.
 */
import { fmtPct0 } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'

export type LimitKind = 'hard' | 'soft' | 'gate'
export type LimitGroup = 'Concentration' | 'Velocity' | 'Margin' | 'Greeks' | 'Event' | 'Gate'

/** How a reading is printed — the three shapes the book actually holds. */
export type LimitUnit = 'pct' | 'usd' | 'count'

export interface LimitRule {
  key: string
  group: LimitGroup
  name: string
  kind: LimitKind
  scope: string
  unit: LimitUnit
  /** What it reads now; null when nothing can read it. */
  current: number | null
  /** The line, when something has written one. */
  limit: number | null
  /**
   * Direction of the limit. `ceiling` is breached above it, `floor` below —
   * a buying-power buffer is a floor, a concentration share is a ceiling.
   */
  bound: 'ceiling' | 'floor'
  /** What the house says happens when it is crossed. */
  onBreach: string
  /** The page that owns the reading. */
  citedFrom: { label: string; to: string } | null
  /** Why there is no reading, when there is none. */
  noReading: string | null
}

export interface LimitRow extends LimitRule {
  /** 0–1+ of the limit consumed; null when either side is missing. */
  use: number | null
  breached: boolean
  /** Headroom as a share, or how far past — null when there is no line. */
  headroom: number | null
}

export const LIMITS_UNRECORDED = {
  store:
    'Nine of the twelve rules have no number behind them. The design edits limits in Trade › Rules and this page only reads them; that store does not exist yet. Seven of those nine still carry a live reading and only want a line; the other two — sector share and earnings-week premium — have no reading either, and say on the row which half is missing.',
  history:
    'Nothing records when a line was crossed. A breach is computable right now — the readings are live — but there is no store behind it, so there is no yesterday, no acknowledgement and no duration. An empty history table would read as a clean record rather than as no record.',
  ack: 'Acknowledging a soft breach would be a write into that missing store. The row names what to do instead, and on which page.',
  rules:
    'The Rules engine the design escalates to is not built, and the trading daemon it would act through is frozen (D10) and configured for paper trading. Nothing on this page acts; it reads.',
} as const

/** Over this share of a limit, a line is worth seeing before it is crossed. */
export const LIMIT_WATCH = 0.8

export const LIMIT_GROUPS: readonly LimitGroup[] = [
  'Concentration',
  'Velocity',
  'Margin',
  'Greeks',
  'Event',
  'Gate',
]

export interface LimitReadings {
  topNameShare: number | null
  concentrationFloor: number
  clusterShare: number | null
  contractsToday: number | null
  contractsTodayDate: string | null
  newUnderlyingsThisWeek: number | null
  buyingPowerBuffer: number | null
  bufferFloor: number
  backingUsed: number | null
  backingGate: number
  maintenanceOverNlv: number | null
  netBetaDelta: number | null
  shortGamma: number | null
  nakedShortPuts: number | null
}

/**
 * The twelve rules, in the design's groups and order.
 *
 * A rule with no stored limit keeps its reading: knowing the book is at 41% of
 * β-Δ in one correlated cluster is worth something even when nobody has said
 * what 41% would be too much.
 */
export function limitRules(r: LimitReadings): LimitRule[] {
  return [
    {
      key: 'single-name',
      group: 'Concentration',
      name: 'Single-name share of β-Δ',
      kind: 'hard',
      scope: 'per underlying',
      unit: 'pct',
      current: r.topNameShare,
      limit: r.concentrationFloor,
      bound: 'ceiling',
      onBreach: 'block adds in the name · derisk ticket',
      citedFrom: { label: 'Exposure', to: '/risk/portfolio' },
      noReading: r.topNameShare == null ? 'no name carries a β-weighted Δ$' : null,
    },
    {
      key: 'cluster',
      group: 'Concentration',
      name: 'Cluster share of β-Δ',
      kind: 'soft',
      scope: 'correlation cluster',
      unit: 'pct',
      current: r.clusterShare,
      limit: null,
      bound: 'ceiling',
      onBreach: 'acknowledge',
      citedFrom: { label: 'Exposure', to: '/risk/portfolio' },
      noReading: r.clusterShare == null ? 'no cluster of more than one name' : null,
    },
    {
      key: 'sector',
      group: 'Concentration',
      name: 'Sector share of NLV',
      kind: 'soft',
      scope: 'sector',
      unit: 'pct',
      current: null,
      limit: null,
      bound: 'ceiling',
      onBreach: 'acknowledge',
      citedFrom: null,
      noReading: 'the vendor’s ticker reference carries no sector, so no name can be placed in one',
    },
    {
      key: 'contracts-today',
      group: 'Velocity',
      name: 'Contracts added',
      kind: 'soft',
      scope: r.contractsTodayDate ? `session ${r.contractsTodayDate}` : 'per session',
      unit: 'count',
      current: r.contractsToday,
      limit: null,
      bound: 'ceiling',
      onBreach: 'acknowledge · flag in Review',
      citedFrom: { label: 'Orders & Fills', to: '/trade/fills' },
      noReading: r.contractsToday == null ? 'no fill carries a trade date' : null,
    },
    {
      key: 'new-underlyings',
      group: 'Velocity',
      name: 'New underlyings this week',
      kind: 'soft',
      scope: 'per week',
      unit: 'count',
      current: r.newUnderlyingsThisWeek,
      limit: null,
      bound: 'ceiling',
      onBreach: 'acknowledge',
      citedFrom: { label: 'Orders & Fills', to: '/trade/fills' },
      noReading: r.newUnderlyingsThisWeek == null ? 'no fill carries a trade date' : null,
    },
    {
      key: 'bp-buffer',
      group: 'Margin',
      name: 'Buying-power buffer',
      kind: 'hard',
      scope: 'account',
      unit: 'pct',
      current: r.buyingPowerBuffer,
      limit: r.bufferFloor,
      bound: 'floor',
      onBreach: 'block opens · derisk ticket',
      citedFrom: { label: 'Margin', to: '/risk/margin' },
      noReading: r.buyingPowerBuffer == null ? 'the broker reported no Cushion' : null,
    },
    {
      key: 'backing',
      group: 'Margin',
      name: 'Backing used',
      kind: 'hard',
      scope: 'pool',
      unit: 'pct',
      current: r.backingUsed,
      limit: r.backingGate,
      bound: 'ceiling',
      onBreach: 'auto-derisk — the one line something would act on',
      citedFrom: { label: 'Backing & Model', to: '/portfolio/backing' },
      noReading: r.backingUsed == null ? 'nothing priced the pool' : null,
    },
    {
      key: 'maint-nlv',
      group: 'Margin',
      name: 'Maintenance / NLV',
      kind: 'soft',
      scope: 'account',
      unit: 'pct',
      current: r.maintenanceOverNlv,
      limit: null,
      bound: 'ceiling',
      onBreach: 'acknowledge',
      citedFrom: { label: 'Margin', to: '/risk/margin' },
      noReading: r.maintenanceOverNlv == null ? 'the broker reported no maintenance' : null,
    },
    {
      key: 'net-beta-delta',
      group: 'Greeks',
      name: 'Net β-wtd Δ$',
      kind: 'soft',
      scope: 'book',
      unit: 'usd',
      current: r.netBetaDelta,
      limit: null,
      bound: 'ceiling',
      onBreach: 'acknowledge',
      citedFrom: { label: 'Exposure', to: '/risk/portfolio' },
      noReading: r.netBetaDelta == null ? 'no name carries a β-weighted Δ$' : null,
    },
    {
      key: 'short-gamma',
      group: 'Greeks',
      name: 'Short Γ$ per point',
      kind: 'hard',
      // The reading is the book's net Γ$; the rule binds it from below, so a
      // negative number is the one that would trip it.
      scope: 'book net — negative is short',
      unit: 'usd',
      current: r.shortGamma,
      limit: null,
      bound: 'floor',
      onBreach: 'block short-gamma adds',
      citedFrom: { label: 'Exposure', to: '/risk/portfolio' },
      noReading: r.shortGamma == null ? 'the vendor priced no leg' : null,
    },
    {
      key: 'naked-puts',
      group: 'Greeks',
      name: 'Naked short puts',
      kind: 'hard',
      // Naked in the options sense: short puts with no long put in the same
      // name behind them. Whether the rest is cash-secured is Backing's answer.
      scope: 'short puts net of long puts',
      unit: 'count',
      current: r.nakedShortPuts,
      limit: null,
      bound: 'ceiling',
      onBreach: 'block new naked shorts',
      citedFrom: { label: 'Positions', to: '/portfolio/positions' },
      noReading: r.nakedShortPuts == null ? 'nothing priced the book' : null,
    },
    {
      key: 'earnings-premium',
      group: 'Event',
      name: 'Short premium into earnings week',
      kind: 'soft',
      scope: 'per name in window',
      unit: 'count',
      current: null,
      limit: null,
      bound: 'ceiling',
      onBreach: 'acknowledge',
      citedFrom: null,
      noReading: 'no future earnings date reaches this side, so no window can be drawn',
    },
  ]
}

/**
 * A rule with its headroom worked out.
 *
 * A floor and a ceiling are breached from opposite directions, so `use` is
 * taken against the side that matters: a ceiling at 37/35 is 106% used, a floor
 * at 74/50 has room. Neither reads as a breach without both numbers.
 */
export function withHeadroom(rules: readonly LimitRule[]): LimitRow[] {
  return rules.map((r) => {
    if (r.current == null || r.limit == null || !Number.isFinite(r.limit) || r.limit === 0) {
      return { ...r, use: null, breached: false, headroom: null }
    }
    const use = r.bound === 'ceiling' ? r.current / r.limit : r.limit / r.current
    return {
      ...r,
      use,
      breached: use > 1,
      headroom: 1 - use,
    }
  })
}

/**
 * A reading in its own unit.
 *
 * One printer, because the limit and the current value have to look like the
 * same kind of thing on every surface that shows them — the page's table, the
 * status bar's Alerts panel, and Today's checks all print this pair, and a
 * percentage rendered three ways is three chances to read the wrong one.
 */
export function fmtReading(row: Pick<LimitRule, 'unit'>, v: number | null): string {
  if (v == null) return '—'
  if (row.unit === 'pct') return fmtPct0(v)
  if (row.unit === 'usd') return fmtMvAbbrev(v)
  return String(v)
}

export function openBreaches(rows: readonly LimitRow[]): LimitRow[] {
  return rows.filter((r) => r.breached)
}

export function watching(rows: readonly LimitRow[], floor: number = LIMIT_WATCH): LimitRow[] {
  return rows.filter((r) => r.use != null && r.use > floor && r.use <= 1)
}

/** Rules the app can read but nobody has drawn a line for. */
export function unwritten(rows: readonly LimitRow[]): LimitRow[] {
  return rows.filter((r) => r.limit == null && r.current != null)
}

/** What the Gate group needs: the active allocation, its gate, and what they read now. */
export interface GateReadings {
  allocationName: string | null
  gateName: string | null
  gateVersion: number | null
  /** `guard.risk` as the record stores it. */
  guard: Record<string, unknown> | null
  /** Instances open under the allocation right now. */
  openInstances: number | null
  /** The allocation's own ceiling on concurrent instances. */
  maxPositions: number | null
  /** Realised on the allocation's instances today. */
  lossToday: number | null
  /** True when the gate is configured for paper trading. */
  paperTrade: boolean | null
}

/** One numeric guard off the gate record, or null when the record has no such line. */
function guardNumber(guard: Record<string, unknown> | null, key: string): number | null {
  const v = guard?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * The Gate group — the only limits in this book that anybody has actually
 * written down.
 *
 * Every other group's line is missing because the design edits limits in Trade
 * › Rules and that store does not exist. The gate's store *does*: it is
 * versioned, attached to the allocation the daemon runs, and read here as it
 * stands. Which makes the group's real reading uncomfortable and worth having —
 * the written limits bound a daemon that is frozen (D10) and set to paper.
 */
export function gateLimitRules(r: GateReadings): LimitRule[] {
  if (r.gateName == null) return []
  const rules: LimitRule[] = []
  const inRules = { label: 'Trade › Rules', to: '/trade/rules' }

  if (r.maxPositions != null) {
    rules.push({
      key: 'gate-open-instances',
      group: 'Gate',
      name: 'Open instances',
      kind: 'gate',
      scope: 'allocation',
      unit: 'count',
      current: r.openInstances,
      limit: r.maxPositions,
      bound: 'ceiling',
      onBreach: 'the daemon does not open another — nothing to acknowledge',
      citedFrom: inRules,
      noReading: r.openInstances == null ? 'no instance under this allocation carries a fill' : null,
    })
  }

  const dailyLoss = guardNumber(r.guard, 'max_daily_loss_usd')
  if (dailyLoss != null) {
    rules.push({
      key: 'gate-daily-loss',
      group: 'Gate',
      name: 'Daily loss on the allocation',
      kind: 'gate',
      scope: 'allocation',
      unit: 'usd',
      // A loss is a limit on how far *down* the day may go, so the reading is
      // the loss itself: a profitable day is zero consumed, not negative.
      current: r.lossToday == null ? null : Math.max(0, -r.lossToday),
      limit: dailyLoss,
      bound: 'ceiling',
      onBreach: 'the daemon halts opens for the day',
      citedFrom: inRules,
      noReading: r.lossToday == null ? 'nothing closed under this allocation today' : null,
    })
  }

  const netDelta = guardNumber(r.guard, 'max_net_delta_shares')
  if (netDelta != null) {
    rules.push({
      key: 'gate-net-delta',
      group: 'Gate',
      name: 'Net Δ on the allocation',
      kind: 'gate',
      scope: 'allocation',
      unit: 'count',
      current: null,
      limit: netDelta,
      bound: 'ceiling',
      onBreach: 'a hedge intent is issued',
      citedFrom: inRules,
      noReading: 'Δ is computed for the book, not per allocation — no reading is scoped to one',
    })
  }

  const posShares = guardNumber(r.guard, 'max_position_shares')
  if (posShares != null) {
    rules.push({
      key: 'gate-position-shares',
      group: 'Gate',
      name: 'Shares in one position',
      kind: 'gate',
      scope: 'allocation',
      unit: 'count',
      current: null,
      limit: posShares,
      bound: 'ceiling',
      onBreach: 'the daemon does not add to the name',
      citedFrom: inRules,
      noReading: 'positions are not attributed to an allocation on this side',
    })
  }

  const hedges = guardNumber(r.guard, 'max_daily_hedge_count')
  if (hedges != null) {
    rules.push({
      key: 'gate-daily-hedges',
      group: 'Gate',
      name: 'Hedges today',
      kind: 'gate',
      scope: 'allocation',
      unit: 'count',
      current: null,
      limit: hedges,
      bound: 'ceiling',
      onBreach: 'the daemon stops hedging for the day',
      citedFrom: inRules,
      noReading: 'the daemon does not hedge — execution is frozen (D10) and the gate is set to paper',
    })
  }

  return rules
}

export interface GateParam {
  section: string
  key: string
  value: string
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
