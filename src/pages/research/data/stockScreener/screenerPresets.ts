/**
 * The rail's presets — starting points, not models.
 *
 * The design names four. An earlier pass of this walk wrote "no preset store
 * on this side, so none are offered", which was **wrong**: three of the four
 * name readings this app already produces, two of them from pages that exist
 * and work. What is missing is not the data, it is the wiring from a name in
 * a rail to a set in Results.
 *
 * Measured on DEV 2026-09-20 against the endpoints the pages themselves call:
 *
 *   SEPA Daily Core  `/research/sepa/model/daily` — 298 SETUP + 15 PIVOT.
 *                    Note the route: `/research/sepa/daily` is the screener-
 *                    wide rank table and carries no `path` at all, which is
 *                    how the first probe of this walk read as empty. The model
 *                    route is the one with the SETUP/PIVOT call on it.
 *   Momentum Radar   `/research/momentum/radar` — A+ 2, A 92. This is also
 *                    why the funnel's Momentum stage was mis-marked: the tier
 *                    mart behind `momentum-filter` is still accumulating, but
 *                    the radar answers today.
 *   Event Radar      the feed returns zero rows. Empty, and it says so.
 *   Premium seller   IV rank across a universe has no source here at all.
 *
 * A preset resolves to a list of symbols, which is what Results reads. It is
 * not a saved screen: nothing on this side stores criteria, and the rail's
 * "My screens" says so separately.
 */
import { fetchMomentumRadar, fetchSepaDaily } from '@/api/researchEngine'

/** The endpoints cap here, so a fuller set needs more than one call. */
export const PRESET_PAGE_LIMIT = 500

export interface ScreenerPreset {
  id: string
  label: string
  /** The design's own sub-line: what the preset selects. */
  meta: string
  /** Null when this side has no source for it. */
  load: (() => Promise<string[]>) | null
  /** Why it cannot be offered, when it cannot. */
  missing: string | null
}

function symbolsOf(rows: readonly { symbol?: string | null }[]): string[] {
  const out = new Set<string>()
  for (const r of rows) {
    const s = (r.symbol ?? '').trim().toUpperCase()
    if (s) out.add(s)
  }
  return [...out]
}

export const SCREENER_PRESETS: readonly ScreenerPreset[] = [
  {
    id: 'sepa-daily-core',
    label: 'SEPA Daily Core',
    meta: 'setup · pivot',
    missing: null,
    load: async () => {
      // Two calls because the route filters by one path at a time, and
      // "setup · pivot" is the design's preset, not either one alone.
      const [setup, pivot] = await Promise.all([
        fetchSepaDaily({ path: 'SETUP', limit: PRESET_PAGE_LIMIT }),
        fetchSepaDaily({ path: 'PIVOT', limit: PRESET_PAGE_LIMIT }),
      ])
      return symbolsOf([...(setup.rows ?? []), ...(pivot.rows ?? [])])
    },
  },
  {
    id: 'momentum-radar',
    label: 'Momentum Radar',
    meta: 'A+ · A',
    missing: null,
    load: async () => {
      const [aplus, a] = await Promise.all([
        fetchMomentumRadar({ grade: 'A+', limit: PRESET_PAGE_LIMIT }),
        fetchMomentumRadar({ grade: 'A', limit: PRESET_PAGE_LIMIT }),
      ])
      return symbolsOf([...(aplus.rows ?? []), ...(a.rows ?? [])])
    },
  },
  {
    id: 'event-radar',
    label: 'Event Radar',
    meta: '≤ 30d',
    load: null,
    missing:
      'The event feed returns no rows at all, so there is no window to select on. Empty because nothing has been written, not because nothing qualifies.',
  },
  {
    id: 'premium-seller',
    label: 'Premium seller',
    meta: 'IV · no print',
    load: null,
    missing:
      'IV rank is read one symbol at a time on Symbol; nothing ranks it across a universe here, so this preset has no set to resolve to.',
  },
]
