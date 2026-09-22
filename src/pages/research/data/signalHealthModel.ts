/**
 * Signal Health, read rather than listed.
 *
 * `Research Signal Health.dc.html` calls this page **"ground truth for every
 * asof in the console (§17) — every AsofTag reads this page's asof, never its
 * own clock."** That is a strong claim, and the design earns it with one line
 * next to the Overall tag: not *degraded*, but *which* lens is late and what
 * that does to the readings downstream of it.
 *
 * This file is that line, plus the two compositions the page was printing a
 * headline over.
 *
 * ## The headline that hides its own composition
 *
 * Measured on DEV 2026-09-22 and it is the finding of this walk:
 *
 * - **Canonical P&L** answers `insufficient_pct: 0.0` — every leg priced —
 *   with `by_quality: { iv_interpolated: 234415 }`. Not one row priced off a
 *   full chain; *all* of them are interpolated. "0% insufficient" is true and
 *   says the opposite of what a reader takes from it.
 * - **IV reconstruction** answers `solver_ok_pct: 0.997`, and `by_status`
 *   says 1,950,684 of 2,130,014 rows are `vendor_snapshot` — 91.6% never went
 *   through the solver at all. The solver succeeded on what it was asked;
 *   it was asked about 8% of the data.
 *
 * Neither number is wrong. Both are worth less than the breakdown under them,
 * so the breakdown is what the panel leads with.
 *
 * ## And a sub-query that fails silently
 *
 * Both blocks carry an `error` field that the page never read. On DEV the IV
 * block answers `rows: 0` with `error: "canceling statement due to statement
 * timeout"` — a Postgres timeout on that one query, intermittently — and the
 * page rendered it as `0 rows · Solver OK —`, which reads as *the solver
 * produced nothing* rather than *this did not run*. `blockError` is the
 * difference between those two sentences.
 */
import type { SignalFreshnessItem, SignalHealthResponse } from '@/api/research/similarRegime'

/**
 * Where a feature table is read, for the design's `Downstream` column.
 *
 * The design names a destination per lens. This side's tables are its own, so
 * the map is by table name and anything unmapped renders plain — a link to an
 * approximate page would answer "where does this land" with a guess.
 */
const DOWNSTREAM: Record<string, { label: string; to: string }> = {
  vrp: { label: 'Symbol › Volatility', to: '/research/symbol?tab=volatility' },
  scan: { label: 'Vol ratings', to: '/research/scan' },
  canonical_pnl: { label: 'Review › Single trade', to: '/review/fit' },
  iv_reconstructed: { label: 'Symbol › Chain', to: '/research/symbol?tab=chain' },
  playbook_trigger: { label: 'Review › Playbook stats', to: '/review/playbook-stats' },
  forecast_settlement: { label: 'Signal Decay', to: '/research/signal-decay' },
}

export interface HealthLens extends SignalFreshnessItem {
  /** `within 36h of its run` — the cadence this row is judged against. */
  expected: string
  downstream: { label: string; to: string } | null
}

export function healthLenses(rows: readonly SignalFreshnessItem[]): HealthLens[] {
  return rows.map((f) => ({
    ...f,
    expected:
      f.sla_hours == null ? 'no cadence recorded' : `within ${Math.round(f.sla_hours)}h of its run`,
    downstream: DOWNSTREAM[f.label] ?? null,
  }))
}

/**
 * The line beside the Overall tag — the design's, and the reason the page is
 * called ground truth rather than a status board.
 *
 * "Degraded" tells a reader to distrust the console. Naming the late table
 * and its consumers tells them *which* readings to distrust, which is the
 * only version of this sentence that is actionable.
 */
export function overallRule(data: SignalHealthResponse | undefined): {
  text: string
  tone: 'ok' | 'warn'
} {
  const rows = data?.freshness ?? []
  if (rows.length === 0) return { text: 'no lens was probed', tone: 'warn' }
  const late = rows.filter((f) => f.status !== 'fresh' && f.status !== 'ok')
  if (late.length === 0) {
    const oldest = rows.reduce((a, b) => ((a.age_hours ?? 0) > (b.age_hours ?? 0) ? a : b))
    return {
      text: `all ${rows.length} lenses within cadence — the oldest is ${oldest.label} at ${(oldest.age_hours ?? 0).toFixed(1)}h against a ${Math.round(oldest.sla_hours ?? 0)}h SLA`,
      tone: 'ok',
    }
  }
  const named = late
    .map((f) => {
      const where = DOWNSTREAM[f.label]
      return `${f.label} (${(f.age_hours ?? 0).toFixed(1)}h${where ? ` → ${where.label}` : ''})`
    })
    .join(' · ')
  return {
    text: `${named} — readings grounded in ${late.length === 1 ? 'it' : 'them'} carry the amber asof; everything else is current`,
    tone: 'warn',
  }
}

/**
 * What went wrong inside one block, when something did.
 *
 * A sub-query that failed and a sub-query that found nothing both arrive as
 * zeroes; only this field tells them apart, and printing the zeroes without
 * it is the page asserting a measurement it did not make.
 */
export function blockError(block: { error?: string } | undefined): string | null {
  const e = block?.error?.trim()
  return e ? e.replace(/\s+/g, ' ') : null
}

export interface CompositionRow {
  key: string
  n: number
  share: number
}

/** A `by_*` map as shares, largest first — what the headline is made of. */
export function composition(by: Record<string, number> | undefined): CompositionRow[] {
  const entries = Object.entries(by ?? {})
  const total = entries.reduce((s, [, n]) => s + n, 0)
  if (total === 0) return []
  return entries
    .map(([key, n]) => ({ key, n, share: n / total }))
    .sort((a, b) => b.n - a.n)
}

export interface ReadinessRow {
  label: string
  value: string
  /** Null when this side cannot answer the design's row at all. */
  owed?: string
  strong?: boolean
  warn?: boolean
}

/**
 * The design's Universe readiness, from the SEPA criteria stats.
 *
 * Its own note is the important half — *readiness is a coverage fact, not a
 * stock pick*: a symbol short of bars or statements is excluded from ratings
 * and screens until a backfill lands, which is a statement about the data and
 * not about the company.
 */
export function readinessRows(stats: {
  universe_count?: number
  fundamental?: { cached_count?: number; no_data_count?: number }
  technical?: { pass_count_distribution?: { symbol_count: number }[] }
}): ReadinessRow[] {
  const universe = stats.universe_count ?? 0
  const fund = stats.fundamental?.cached_count ?? 0
  const noData = stats.fundamental?.no_data_count ?? 0
  const tech = (stats.technical?.pass_count_distribution ?? []).reduce(
    (s, b) => s + (b.symbol_count ?? 0),
    0,
  )
  const share = (n: number) => (universe > 0 ? ` · ${Math.round((n / universe) * 100)}%` : '')
  return [
    { label: 'Universe symbols', value: universe.toLocaleString() },
    { label: 'Tech-ready (bars evaluated)', value: `${tech.toLocaleString()}${share(tech)}` },
    { label: 'Fund-ready (statements cached)', value: `${fund.toLocaleString()}${share(fund)}` },
    {
      label: 'Both · enters ratings',
      value: '—',
      // The two blocks are counted independently and the payload carries no
      // intersection, so a number here would be an assumption about overlap.
      owed: 'the payload counts the two sides separately and carries no intersection',
    },
    {
      label: 'No fundamentals · excluded',
      value: noData.toLocaleString(),
      warn: noData > 0,
    },
  ]
}
