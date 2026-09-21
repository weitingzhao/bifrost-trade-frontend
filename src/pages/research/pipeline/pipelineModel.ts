/**
 * Pipeline — the layer reading for `/research/workbench`.
 *
 * Shell Spec §5a.6, rescaled twice in one day by a conversation this side
 * started. The first scale was *what you made today that was never distilled*,
 * and this side measured that no station page records what it made. Design's
 * answer was to change the scale rather than wait for a store:
 *
 *   **made**      rows the station's *engine* wrote into a store today
 *   **moved on**  a hypothesis, watchlist promotion or pin carrying that page
 *                 as its origin
 *
 * Both are joins over stores that exist, so nothing here waits on a backend.
 *
 * ## The four classes (§5a.6, "欠背面 ≠ 欠存储")
 *
 * Design's second pass replaced "which pages have a store" with a criterion:
 * a page **owes a store** when its product is *an object you will name again
 * later* — one you fork, compare, or cite as another product's origin.
 *
 *   has-store      Stock ratings · Vol ratings · Narrative · Backtest
 *   store-owed     Stock screen · Option screen · Symbol · Signal decay
 *   no-store-owed  Compare (assembles only) · History (recomputes a
 *                  denominator; nobody names one run of it again)
 *   off-bench      Alerts — it belongs to Home › Alerts, so it keeps a row
 *                  and stays out of every denominator
 *
 * That criterion is also why fork lineage cannot be drawn: a screen and a
 * verdict are exactly the objects a fork would branch, and neither is kept.
 *
 * ## What DEV actually holds, measured 2026-09-21
 *
 *   sepa_daily_core              500 rows, trade_date 2026-09-19
 *   option_snapshot_aggregates   500 rows (`/research/scan`)
 *   sentiment_row                100 rows (`/research/flow/sentiment`)
 *   backtest_run                  43 rows, newest 2026-09-06
 *
 * **`moved on` is zero on every station row**, and not because the join is
 * missing. Every Save-as-Hypothesis button on the discovery list stamps
 * `origin_page: 'research-home'` — the page the list is *rendered* on, not
 * the station that produced the hit — so all 53 hypotheses carry one of four
 * container pages and none carries a station. The join Design describes works;
 * what is wrong is what this side writes into it. Until the stamp is fixed the
 * column reads 0 and the page says why, which is the honest version.
 */
import { ROUTES } from '@/layout/routeTable'

export type StationId = 'discover' | 'analyze' | 'validate' | 'off-bench'

/** Why a row has a number, or does not. */
export type StoreState = 'has-store' | 'store-owed' | 'no-store-owed' | 'off-bench'

export interface CensusRow {
  to: string
  label: string
  station: StationId
  stationLabel: string
  /** The store behind it, named whether it exists or is owed. */
  store: string | null
  storeState: StoreState
  /** Rows the engine wrote, or null when no store holds them. */
  made: number | null
  /** Products that left carrying this page as their origin. */
  movedOn: number
  /** The engine's own newest stamp — no page-read log needed. */
  oldest: string | null
  /** False when the design has this page and the app has not built it. */
  pageBuilt: boolean
  /** The amber sub-row: what is owed, or why nothing is. */
  note: string | null
}

const STATION_LABEL: Record<StationId, string> = {
  discover: 'Discover',
  analyze: 'Analyze',
  validate: 'Validate',
  'off-bench': 'Off bench',
}

interface Spec {
  to: string
  label: string
  station: StationId
  store: string | null
  storeState: StoreState
  note: string | null
}

/**
 * The eleven rows, in the stations' own order.
 *
 * Written out rather than derived from the menu: four of them are pages this
 * side has not built, so the menu cannot be the source. The route is the key,
 * and `pageBuilt` is decided against the app's own route table — Design's
 * ruling on our question 3.1 was that the mark belongs to us, because "not
 * built" is a fact about this side.
 */
const SPECS: readonly Spec[] = [
  { to: '/research/ratings/stocks', label: 'Stock ratings', station: 'discover', store: 'sepa_daily_core', storeState: 'has-store', note: null },
  { to: '/research/scan', label: 'Vol ratings', station: 'discover', store: 'option_snapshot_aggregates', storeState: 'has-store', note: null },
  { to: '/research/screener', label: 'Stock screen', station: 'discover', store: 'screen_run', storeState: 'store-owed', note: 'store owed — a screen is an object you fork and cite' },
  { to: '/research/contract-screener', label: 'Option screen', station: 'discover', store: 'screen_run', storeState: 'store-owed', note: 'store owed — a screen is an object you fork and cite' },
  { to: '/research/event-radar', label: 'Alerts', station: 'off-bench', store: null, storeState: 'off-bench', note: 'off this bench — Home › Alerts' },
  { to: '/research/symbol', label: 'Symbol', station: 'analyze', store: 'symbol_verdict', storeState: 'store-owed', note: 'store owed — a verdict is cited as a hypothesis’s origin' },
  { to: '/research/narrative', label: 'Narrative', station: 'analyze', store: 'sentiment_row', storeState: 'has-store', note: null },
  { to: '/research/compare', label: 'Compare', station: 'analyze', store: null, storeState: 'no-store-owed', note: 'no store owed — it assembles, it does not produce' },
  { to: '/research/history', label: 'History', station: 'analyze', store: null, storeState: 'no-store-owed', note: 'no store owed — it recomputes a denominator nobody names again' },
  { to: '/research/signal-decay', label: 'Signal decay', station: 'validate', store: 'decay_check', storeState: 'store-owed', note: 'store owed — a page that declares a signal dead should hold the certificate' },
  { to: '/research/backtest', label: 'Backtest', station: 'validate', store: 'backtest_run', storeState: 'has-store', note: null },
]

const APP_ROUTES: ReadonlySet<string> = new Set(ROUTES.map((r) => r.path))

/** What a station's engines wrote, keyed by route. Absent means unmeasured. */
export interface StoreReading {
  made: number
  /** The store's own newest stamp, ISO or a date. */
  newest: string | null
}

export function censusRows(
  readings: ReadonlyMap<string, StoreReading>,
  movedOnByPage: ReadonlyMap<string, number>,
): CensusRow[] {
  return SPECS.map((s) => {
    const reading = s.storeState === 'has-store' ? readings.get(s.to) : undefined
    const built = APP_ROUTES.has(s.to)
    const notes: string[] = []
    if (s.note) notes.push(s.note)
    if (!built) notes.push('page not built')
    const movedOn = movedOnByPage.get(s.to) ?? 0
    if (s.storeState === 'store-owed' && movedOn > 0) {
      notes.push(`${movedOn} out, base unknown`)
    }
    return {
      to: s.to,
      label: s.label,
      station: s.station,
      stationLabel: STATION_LABEL[s.station],
      store: s.store,
      storeState: s.storeState,
      made: reading?.made ?? null,
      movedOn,
      oldest: reading?.newest ?? null,
      pageBuilt: built,
      note: notes.length > 0 ? notes.join(' · ') : null,
    }
  })
}

export interface StationReading {
  station: StationId
  label: string
  /** Rows written across the station's stores. */
  made: number
  /** Products that left, whichever of its pages they came from. */
  movedOn: number
  /** The share of what was written that nothing came out of. */
  stuck: number | null
  /** Pages with a store, over pages on the bench. */
  withStore: number
  onBench: number
}

/**
 * The design's **Stops here**, now two readings rather than one.
 *
 * Stuck share alone misreads: Analyze is 100% stuck on DEV, which sounds like
 * the worst station and actually means *one of its four pages can be measured
 * at all*. So coverage is reported beside it — Design's ruling on our question
 * 1.2, and the sentence our own first version had already written into its
 * amber box.
 *
 * The coverage denominator counts pages **on the bench**: a page that owes no
 * store is still a page you work at, and only Alerts is excluded.
 */
export function stationReadings(rows: readonly CensusRow[]): StationReading[] {
  const order: StationId[] = ['discover', 'analyze', 'validate']
  return order.map((station) => {
    const mine = rows.filter((r) => r.station === station)
    const made = mine.reduce((n, r) => n + (r.made ?? 0), 0)
    const movedOn = mine.reduce((n, r) => n + r.movedOn, 0)
    return {
      station,
      label: STATION_LABEL[station],
      made,
      movedOn,
      stuck: made > 0 ? (made - movedOn) / made : null,
      withStore: mine.filter((r) => r.storeState === 'has-store').length,
      onBench: mine.length,
    }
  })
}

export interface CensusTotals {
  written: number
  left: number
  stillHere: number
  /** Pages with a store, over pages on the bench. */
  withStore: number
  onBench: number
  /** Products that left a page which keeps no store — real, but with no base. */
  leftWithoutBase: number
}

export function censusTotals(rows: readonly CensusRow[]): CensusTotals {
  const onBench = rows.filter((r) => r.station !== 'off-bench')
  const written = onBench.reduce((n, r) => n + (r.made ?? 0), 0)
  const left = onBench.reduce((n, r) => n + r.movedOn, 0)
  return {
    written,
    left,
    stillHere: Math.max(0, written - left),
    withStore: onBench.filter((r) => r.storeState === 'has-store').length,
    onBench: onBench.length,
    leftWithoutBase: onBench
      .filter((r) => r.made == null)
      .reduce((n, r) => n + r.movedOn, 0),
  }
}

/** The oldest thing still sitting at a station, by the engine's own stamp. */
export function oldestUntouched(rows: readonly CensusRow[]): CensusRow | null {
  const dated = rows.filter((r) => r.oldest != null && (r.made ?? 0) > r.movedOn)
  if (dated.length === 0) return null
  return dated.reduce((oldest, r) => (r.oldest! < oldest.oldest! ? r : oldest))
}
