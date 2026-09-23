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
 *   has-store      Stock ratings · Vol ratings · Backtest
 *   store-owed     Stock screen · Option screen · Symbol · Narrative ·
 *                  Signal decay
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
 *   backtest_run                  43 rows, newest 2026-09-06
 *
 * ## Narrative was counted on the wrong store until 2026-09-23
 *
 * This census first gave Narrative `sentiment_row` — the 100 rows of
 * `/research/flow/sentiment` — and called it the one Analyze page with a
 * store. Those rows are options order flow (call/put notional, PCR, strike
 * concentration): not one word of text. The design's Narrative reads what
 * filings and calls *say*, and the engine had no route that holds any of it,
 * so the row owes its store like Symbol does. Design took the old reading at
 * face value ("有库有数、只差一张页"), which is how a label this side wrote
 * came back as a design ruling; it was this side's mislabel, not theirs.
 *
 * The source is not missing. Massive's SEC filing endpoints are in the
 * Stocks plan already paid for (measured the same day: 8-K disclosures and
 * risk factors answer with classified, quoted rows), and nothing ingests
 * them yet — Owner ruling 2026-09-23 is to ingest those two first. Until a
 * store exists the row says so rather than counting someone else's.
 *
 * **`moved on` read zero on every station row**, and never because the join
 * was missing. The write side stamps a vocabulary the reading side had never
 * learned: 19 Save-as-Hypothesis buttons write short tokens (`analyze-scan`,
 * `sepa-daily-core`), while this census keys by the design's routes, so every
 * stamp fell through. `STAMP_ROW` below is where the two meet.
 *
 * It still reads zero on DEV, and now for a reason the page can state: all 53
 * hypotheses on file came from the loop (36), the Copilot (9) or a container
 * page (8), and none from a station. A save from any station page lands on
 * its row from here on.
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
  { to: '/research/narrative', label: 'Narrative', station: 'analyze', store: 'narrative_tag', storeState: 'store-owed', note: 'store owed — the filings it reads are entitled and not yet ingested' },
  { to: '/research/compare', label: 'Compare', station: 'analyze', store: null, storeState: 'no-store-owed', note: 'no store owed — it assembles, it does not produce' },
  { to: '/research/history', label: 'History', station: 'analyze', store: null, storeState: 'no-store-owed', note: 'no store owed — it recomputes a denominator nobody names again' },
  { to: '/research/signal-decay', label: 'Signal decay', station: 'validate', store: 'decay_check', storeState: 'store-owed', note: 'store owed — a page that declares a signal dead should hold the certificate' },
  { to: '/research/backtest', label: 'Backtest', station: 'validate', store: 'backtest_run', storeState: 'has-store', note: null },
]

const APP_ROUTES: ReadonlySet<string> = new Set(ROUTES.map((r) => r.path))

/**
 * A station by the name the write side stamps for it.
 *
 * The census keys by the design's routes; the app's Save-as-Hypothesis
 * buttons have stamped short tokens since long before those routes existed,
 * and the same tokens key the Copilot's page context and `operatorOf`. So the
 * join lives here, on the reading side, rather than in 19 write sites: one
 * table, measured 2026-09-21 by reading which page each button is on and, for
 * a page the design is moving, where `routeTable`'s design note sends it.
 *
 * Nine of these tokens are the Symbol page's own faces — `/research/symbol`
 * absorbed six pages, so a hypothesis saved from its volatility, dealer,
 * scenario or flow face came out of Symbol. Narrative has no token because
 * its page is not built: nothing can stamp it yet, which is what its row
 * already says.
 */
const STAMP_ROW: Record<string, string> = {
  'analysis-model': '/research/symbol',
  'analyze-scan': '/research/scan',
  'analyze-signal-decay': '/research/signal-decay',
  backtest: '/research/backtest',
  discovery: '/research/symbol',
  'event-radar': '/research/event-radar',
  'forecast-sessions': '/research/symbol',
  'gex-intraday': '/research/symbol',
  'intraday-playbook': '/research/symbol',
  'iv-radar': '/research/symbol',
  'momentum-radar': '/research/ratings/stocks',
  'opex-cycle-lab': '/research/symbol',
  'order-sentiment': '/research/symbol',
  // Historical: the Stock screener stamped `sepa` until 2026-09-21, so rows
  // already on file read as SEPA's. They are kept pointing at Stock ratings
  // rather than silently re-labelled — the page that writes them now says
  // `stock-screener`.
  sepa: '/research/ratings/stocks',
  'sepa-daily-core': '/research/ratings/stocks',
  // The Overview face stamps the page itself rather than one of the six tab
  // tokens beside it: a hypothesis written from the identity line or the rail
  // was read across every face, not out of one.
  symbol: '/research/symbol',
  screener: '/research/contract-screener',
  'stock-screener': '/research/screener',
  'vol-surface-lab': '/research/symbol',
  'vrp-lab': '/research/symbol',
}

/**
 * Stamps that name no station, each with the reason it is not a gap.
 *
 * A `Moved on` of zero is only honest if the things that legitimately came
 * from elsewhere are named as such. These are the container pages, the
 * operators' own paths and the pages that are not on this bench.
 */
export const NOT_A_STATION: Record<string, string> = {
  'candidate-pool': 'the loop’s own pool, not a station',
  candidate_batch_approve: 'the loop promoted it; no station made it',
  cockpit_inbox: 'the Copilot’s inbox',
  'contract-greeks': 'Contract Greeks is not on this bench',
  'copilot-loop': 'the Copilot wrote it',
  'daily-brief': 'a brief assembles other pages’ output',
  greeks: 'Contract Greeks is not on this bench',
  'market-live': 'outside Research',
  positions: 'outside Research',
  'research-copilot-desk': 'the Copilot’s desk',
  'research-home': 'a container page — the old defect’s stamp',
  'research-workbench': 'this page itself is a container',
  'trade-rules': 'outside Research',
  watchlist: 'a data page, not a station',
}

/**
 * The census row a stamp belongs to, or null when it belongs to none.
 *
 * Takes both vocabularies: an address as it stands (what the discovery lanes
 * and the shell's ambient Copilot context write) and a token (what the 19
 * Save buttons write). An address that is not a bench page answers null, the
 * same as an unknown token — a stamp this census cannot place is not a row it
 * may invent.
 */
export function censusRowFor(originPage: string | null | undefined): string | null {
  if (!originPage) return null
  if (originPage.startsWith('/')) return CENSUS_ROUTES.includes(originPage) ? originPage : null
  return STAMP_ROW[originPage] ?? null
}

/**
 * The routes this census counts, for whoever writes a stamp it has to read.
 *
 * A station's `Moved on` number is only ever as good as what the write side
 * puts in `origin_page`, and the two lists sat in different files with no way
 * to fail when they drifted — which is exactly how the column came to read
 * zero. The discovery lanes now assert against this.
 */
export const CENSUS_ROUTES: readonly string[] = SPECS.map((s) => s.to)

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
