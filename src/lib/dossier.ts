/**
 * The dossier — one symbol, its six faces, each a card of the registry lenses
 * that answer it. Pure: the page hands it the symbol's exhibits, it hands back
 * what each card shows.
 *
 * ## The faces are the page's own tabs (Rev 2026-09-18.2)
 *
 * They were cut by the blueprint's six questions — Trend, Volatility,
 * Positioning, Events, Forecast, Validation — and the design cuts them by the
 * faces this page already has tabs for: **Trend & structure · Volatility ·
 * Dealer levels · Scenario · Flow · Events**, each card a preview of the tab it
 * opens. Three differences, and each one is a reading that had nowhere to go:
 *
 * - **Positioning split into Dealer levels and Flow.** They were one card
 *   holding dealer gamma and order flow, which are two tabs and two different
 *   questions; a card that previews two tabs cannot have an `Open`.
 * - **Forecast became Scenario**, the name of its tab.
 * - **Validation left the grid for the rail.** It never had a lens of its own —
 *   it read every *other* lens's track record — so as a card it repeated
 *   readings the cards beside it were already showing. In the rail it is
 *   `Record on <symbol>`, ranked, which is the one shape that says something
 *   the other cards cannot.
 *
 * The blueprint's questions survive as each face's `question`, on the card's
 * hover: the cut changed, the questions did not.
 *
 * A face with no lens in the registry says so ("not measured") rather than
 * borrowing a neighbour's reading.
 */
import type { ExhibitLens, ExhibitPayload } from '@/api/research/exhibit'
import type { AnalyzeVerdictTone } from '@/components/research/AnalyzeVerdictStrip'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { recordColumns } from '@/lib/lensValue'
import { trackRecordDetail, trackRecordLine } from '@/lib/lensVerdict'
import { canonicalLens, regimeItems, type RegimeLensItem } from '@/lib/regimeRibbon'
import type { LampColor } from '@/lib/researchFreshness'

export type DossierFaceId =
  | 'trend'
  | 'volatility'
  | 'dealer'
  | 'scenario'
  | 'flow'
  | 'events'

export interface DossierFace {
  id: DossierFaceId
  title: string
  /** The question the face answers — blueprint §3.2, now the card's hover. */
  question: string
  /** The registry lenses that answer it; empty when none does yet. */
  lenses: readonly ExhibitLens[]
  /** Where the face is read in full. */
  openTo: string
  /** What the link says — the design writes the destination, not "Open". */
  openLabel: string
  /**
   * True when `openTo` is one of this page's own tabs.
   *
   * A face whose full reading is a tab of the page you are on should switch the
   * tab, not navigate: the design's cards read `Volatility tab →`, and landing
   * back on the same route through the router would remount the whole page to
   * change one panel.
   */
  isTab: boolean
}

export const DOSSIER_FACES: readonly DossierFace[] = [
  {
    id: 'trend',
    title: 'Trend & structure',
    question: 'Where is the price in its cycle — stage, path, momentum?',
    lenses: ['sepa', 'momentum'],
    // The one face whose full reading is another page: the equity model ranks
    // every name, and this card is that ranking for one of them.
    openTo: '/research/ratings/stocks',
    openLabel: 'Ratings › Stocks →',
    isTab: false,
  },
  {
    id: 'volatility',
    title: 'Volatility',
    question: 'Is its volatility priced rich or cheap — rank, VRP, skew, term?',
    // Four, as the design draws them. `iv_percentile` is still fetched and
    // still read on the tab, where it sits beside the rank as its second form
    // rather than as a fifth verdict.
    lenses: ['iv_rank', 'vrp', 'term_slope', 'skew'],
    openTo: 'volatility',
    openLabel: 'Volatility tab →',
    isTab: true,
  },
  {
    id: 'dealer',
    title: 'Dealer levels',
    question: 'Who is on the other side — dealer gamma, the OpEx cycle?',
    lenses: ['gex_regime', 'opex_pin'],
    openTo: 'dealer',
    openLabel: 'Dealer tab →',
    isTab: true,
  },
  {
    id: 'scenario',
    title: 'Scenario',
    question: 'What does the model expect — terrain, the forecast path?',
    lenses: ['terrain_regime', 'forecast_path'],
    openTo: 'scenario',
    openLabel: 'Scenario tab →',
    isTab: true,
  },
  {
    id: 'flow',
    title: 'Flow',
    question: 'Which way is the tape leaning — order flow, open interest?',
    lenses: ['order_sentiment'],
    openTo: 'flow',
    openLabel: 'Flow tab →',
    isTab: true,
  },
  {
    id: 'events',
    title: 'Events',
    question: 'What is on the calendar — earnings, OpEx, do we hold it?',
    // No lens, and that is the point: a calendar is a gate, not a lens. It has
    // no band and no track record, so it cannot be scored — the card carries
    // the dates themselves, which the page supplies.
    lenses: [],
    openTo: 'chain',
    openLabel: 'Chain tab →',
    isTab: true,
  },
]

/**
 * The lenses the rating is read from — the design's "n of 8 lenses decisive".
 *
 * Trend and momentum are deliberately out: they are the *screen* that put the
 * name on a list, not the rating of the name, and the design says so in the
 * same breath ("volatility drove the rating" / "trend drove the screen").
 */
export const RATING_FACE_IDS: readonly DossierFaceId[] = [
  'volatility',
  'dealer',
  'scenario',
  'flow',
]

export const RATING_LENSES: readonly ExhibitLens[] = DOSSIER_FACES.filter((f) =>
  RATING_FACE_IDS.includes(f.id),
).flatMap((f) => f.lenses)

/**
 * Every lens the dossier fetches — each face's lenses, once, plus the two the
 * cards no longer show.
 *
 * `iv_percentile` is the rank's second form and is read on the Volatility tab;
 * it left the card when the design cut that face to four rows. It stays in the
 * batch because the tab below reads the same one request.
 */
export const DOSSIER_LENSES: readonly ExhibitLens[] = [
  ...new Set([...DOSSIER_FACES.flatMap((f) => f.lenses), 'iv_percentile' as ExhibitLens]),
]

export interface DossierRow extends RegimeLensItem {
  /** The lens's track record on this symbol, in words — or null before any trigger settled. */
  record: string | null
  /** `60% · 67%` — the same record as the design's two columns, 5d then 20d. */
  rates: string | null
  /** `n9` — the sample the 20d rate rests on, never separated from it. */
  sample: string | null
  /** The same record with its pipeline state, for the hover — never the only home of a fact. */
  recordDetail: string | null
}

export interface DossierFaceView {
  face: DossierFace
  rows: DossierRow[]
  /** The face in one line: its decisive lens, else its first read lens, else why it is empty. */
  headline: string
  /** What that verdict means, in the lens's own words — the design's second line. */
  means: string | null
  tone: AnalyzeVerdictTone
  lamp: LampColor
  /** Lenses with a reading over lenses the face has; null when the face has no lens at all. */
  coverage: { read: number; of: number } | null
  href: string
}

/**
 * The 3px rail the design paints beside a verdict, in the verdict's tone —
 * read by the face cards and by the Symbol page's 440 rows.
 */
export const TONE_BAR: Record<string, string> = {
  success: 'bg-success',
  danger: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-primary',
  neutral: 'bg-border',
}

/** The verdict wears the bar's colour — the design paints both from one value. */
export const TONE_TEXT: Record<string, string> = {
  success: 'text-success',
  danger: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
  neutral: 'text-foreground',
}

export const NOT_MEASURED = 'Not measured — no lens in the registry covers this face yet'

type SpecOf = (canonical: string) => { label: string; page_route: string } | undefined

/**
 * What a face carries beyond its lenses.
 *
 * The design's cards mix lens rows with readings that are not lenses at all —
 * `Structure · VCP 6.2`, `Walls 145 / 165`, `Earnings 37 days` — and with lens
 * rows printed in a second form: the SEPA trend template is `9 / 11` checks on
 * the card and `100.0` in the exhibit, and the count is the one that says which
 * checks a name is missing.
 *
 * Both arrive from the page, because both come from stores the dossier does not
 * read. Nothing is computed here; a value handed in is printed as handed in.
 */
export interface FaceExtras {
  /** Printed value overrides, keyed by canonical lens id. */
  values?: Readonly<Record<string, string>>
  /** Rows that are readings but not lenses: no band, no record, no lamp. */
  rows?: readonly { id: string; label: string; value: string; means?: string | null }[]
}

function ownExhibits(face: DossierFace, exhibits: readonly ExhibitPayload[]): ExhibitPayload[] {
  return face.lenses.flatMap((lens) => {
    const ex = exhibits.find((e) => canonicalLens(e.lens_id ?? e.lens) === lens)
    return ex ? [ex] : []
  })
}

/** Where a face is read in full — a tab of this page, or another page. */
export function faceHref(face: DossierFace, symbol: string): string {
  if (!face.isTab) return withSymbolParam(face.openTo, symbol)
  return withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=${face.openTo}`, symbol)
}

export function faceView(
  face: DossierFace,
  exhibits: readonly ExhibitPayload[],
  symbol: string,
  specOf: SpecOf,
  extras?: FaceExtras,
): DossierFaceView {
  const own = ownExhibits(face, exhibits)
  const items = regimeItems(own, symbol, specOf)
  const lensRows: DossierRow[] = items.map((it, i) => ({
    ...it,
    value: extras?.values?.[it.id] ?? it.value,
    record: trackRecordLine(own[i].track_record, it.band),
    recordDetail: trackRecordDetail(own[i].track_record, it.band),
    rates: recordColumns(own[i].track_record, it.band)?.rates ?? null,
    sample: recordColumns(own[i].track_record, it.band)?.n ?? null,
  }))
  /* A reading that is not a lens: it has no band, so it is never coloured and
     never counted as read, and its record column is a dash rather than empty —
     "this has no track record" is a different fact from "its record is 0%". */
  const plainRows: DossierRow[] = (extras?.rows ?? []).map((r) => ({
    id: r.id,
    label: r.label,
    value: r.value,
    verdict: r.value,
    means: r.means ?? null,
    band: null,
    tone: 'neutral',
    lamp: 'gray',
    asOf: null,
    href: faceHref(face, symbol),
    record: null,
    recordDetail: null,
    rates: null,
    sample: null,
  }))
  const rows = [...lensRows, ...plainRows]
  const href = faceHref(face, symbol)

  if (face.lenses.length === 0) {
    return {
      face,
      rows,
      headline: plainRows.length > 0 ? 'A gate, not a lens' : NOT_MEASURED,
      means:
        plainRows.length > 0
          ? 'A calendar has no band and no track record, so nothing here is scored — these are the dates themselves.'
          : null,
      tone: 'neutral',
      // Not measured is a coverage fact, not a fault: grey (DESIGN_CONTRACTS 2026-09-13.1).
      lamp: 'gray',
      coverage: null,
      href,
    }
  }
  const read = lensRows.filter((r) => r.band != null)
  const pick = read.find((r) => r.band === 'hot' || r.band === 'cold') ?? read[0]
  const allFresh =
    lensRows.length === face.lenses.length && lensRows.every((r) => r.lamp === 'green')
  return {
    face,
    rows,
    headline: pick ? pick.verdict : 'No reading yet',
    means: pick?.means ?? null,
    tone: pick?.tone ?? 'neutral',
    lamp:
      read.length === 0
        ? // Nothing read yet is unknown, not failed: grey, never red.
          'gray'
        : allFresh && read.length === face.lenses.length
          ? 'green'
          : 'yellow',
    coverage: { read: read.length, of: face.lenses.length },
    href,
  }
}
