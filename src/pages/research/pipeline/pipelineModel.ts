/**
 * Pipeline — the layer page for `/research/workbench`.
 *
 * The design's question (Shell Spec §5a.6) is *where is my hand-run pipeline
 * stuck*, and its scale is the one the Risk layer page uses: put every unit
 * on the same measure and put the most consumed first. Risk measures limit
 * consumption; Pipeline measures **what you made today that has not moved
 * on** — and "moved on" is exact, because Distill is the only one of the six
 * verbs that writes (Vision §6), so an artifact you never distilled is still
 * sitting at the station that made it.
 *
 * ## What this side can measure, read on DEV 2026-09-21
 *
 * Almost none of it, and the reason is worth stating precisely because it is
 * the page's real finding.
 *
 * **Not one of the station pages records what it made.** Ratings and Vol
 * ratings are model outputs the server recomputes each day — there is no
 * artifact saying *you read this*. A Symbol verdict is generated on request
 * (`/research/verdicts/{sym}` answers with a `generated_at`, not a stored
 * row). Signal decay is computed on request the same way. Nothing saves a
 * screen, which the Stock screen walk had already established. Backtest is
 * the one store that keeps a timestamped artifact — 43 runs — and its newest
 * is 2026-09-06, a fortnight before this was written.
 *
 * Two stores do record a birthplace, and neither names a station:
 * `hypothesis.origin_page` carries only `copilot-loop`, `research-home`,
 * `candidate_batch_approve` and `candidate-pool`; `backtest.created_at` has
 * no page at all.
 *
 * So `Made` has no source, which means `Moved on` and the three states
 * (`out` · `wait` · `cold`) have none either — and `cold`, "produced and
 * nobody opened it", would additionally need a page-read log that does not
 * exist anywhere in the app.
 *
 * The page is built anyway, with the design's rows and columns and the
 * numbers marked: a census that says *this station records nothing, and here
 * is what it would have to record* answers a real question — why the
 * pipeline cannot be measured, one page at a time — where a page of zeroes
 * would answer a false one, that nothing was made today.
 */
import type { ShellNavItem } from '@bifrost/ui'
import { BENCHES } from '@/layout/researchNavCatalog'

export type StationId = 'discover' | 'analyze' | 'validate'

export interface StationPage {
  /** The route, which is also the row's link. */
  to: string
  label: string
  station: StationId
  stationLabel: string
  /** What working on this page produces, in the design's words. */
  writes: string
  /**
   * How many artifacts it made in the window, or null when the page keeps no
   * record of what it made. Null is the answer for eight of the nine.
   */
  made: number | null
  /** Why `made` is null — named per page, never "no data". */
  missing: string | null
}

/**
 * What each station page produces, and whether anything stores it.
 *
 * Keyed by route so it cannot drift from the menu: the rows come from
 * `BENCHES`, which is the same list the sidebar builds its captions over, and
 * a page that joins a bench without an entry here shows up as unrecorded
 * rather than silently vanishing from the census.
 */
const WRITES: Record<string, { writes: string; missing: string | null }> = {
  '/research/ratings/stocks': {
    writes: 'rating read',
    missing: 'the model recomputes daily; nothing records that you read it',
  },
  '/research/scan': {
    writes: 'rating read',
    missing: 'the model recomputes daily; nothing records that you read it',
  },
  '/research/screener': {
    writes: 'screen',
    missing: 'nothing saves a screen on this side',
  },
  '/research/contract-screener': {
    writes: 'screen',
    missing: 'nothing saves a screen on this side',
  },
  '/research/symbol': {
    writes: 'read · verdict',
    missing: 'a verdict is generated on request, not stored',
  },
  '/research/signal-decay': {
    writes: 'decay check',
    missing: 'a check is computed on request, not stored',
  },
  '/research/backtest': {
    writes: 'backtest',
    missing: null,
  },
}

/** The station a bench is, and how the page names it. */
const STATION_LABEL: Record<StationId, string> = {
  discover: 'Discover',
  analyze: 'Analyze',
  validate: 'Validate',
}

function pageOf(item: ShellNavItem, station: StationId): StationPage | null {
  const to = item.to ?? null
  if (to == null) return null
  const entry = WRITES[to]
  return {
    to,
    label: item.label,
    station,
    stationLabel: STATION_LABEL[station],
    writes: entry?.writes ?? '—',
    made: null,
    missing: entry?.missing ?? 'this page is not in the census yet',
  }
}

/**
 * The census rows, in the stations' own order.
 *
 * `backtestMade` is passed in rather than fetched here so the one page that
 * *can* be counted is counted from the same query the page already runs, and
 * the model stays a pure function.
 */
export function stationCensus(backtestMade: number | null): StationPage[] {
  const out: StationPage[] = []
  for (const bench of BENCHES) {
    for (const item of bench.items) {
      const page = pageOf(item, bench.id)
      if (page == null) continue
      if (page.to === '/research/backtest' && backtestMade != null) {
        out.push({ ...page, made: backtestMade, missing: null })
      } else {
        out.push(page)
      }
    }
  }
  return out
}

export interface StationRollup {
  station: StationId
  label: string
  pages: number
  /** Pages at this station that record what they make. */
  recorded: number
}

/**
 * The design's **Stops here** panel, which ranks stations by how much of
 * today's work is stuck at them.
 *
 * It cannot be ranked that way here, so the panel ranks what is true instead:
 * how much of each station can be measured at all. A station with nothing
 * recorded cannot be the most stuck *or* the least — it is simply not
 * reporting, and saying so is the honest version of the same shape.
 */
export function stationRollup(rows: readonly StationPage[]): StationRollup[] {
  const byId = new Map<StationId, StationRollup>()
  for (const r of rows) {
    const at = byId.get(r.station) ?? {
      station: r.station,
      label: r.stationLabel,
      pages: 0,
      recorded: 0,
    }
    at.pages += 1
    if (r.missing == null) at.recorded += 1
    byId.set(r.station, at)
  }
  return [...byId.values()]
}

/** How many of the census rows can be counted at all. */
export function censusReach(rows: readonly StationPage[]): { recorded: number; total: number } {
  return { recorded: rows.filter((r) => r.missing == null).length, total: rows.length }
}
