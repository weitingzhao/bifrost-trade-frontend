/**
 * The dossier — one symbol, the six faces the blueprint (§3.2) asks of every
 * name, each face a card of the registry lenses that answer it. Pure: the
 * page hands it the symbol's exhibits, it hands back what each card shows.
 *
 * A face with no lens in the registry says so ("not measured") rather than
 * borrowing a neighbour's reading; the validation face reads every lens's
 * track record on this symbol instead of a lens of its own.
 */
import type { ExhibitLens, ExhibitPayload } from '@/api/research/exhibit'
import type { AnalyzeVerdictTone } from '@/components/research/AnalyzeVerdictStrip'
import { ANALYZE_HUB } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { trackRecordDetail, trackRecordLine } from '@/lib/lensVerdict'
import { canonicalLens, regimeItems, type RegimeLensItem } from '@/lib/regimeRibbon'
import type { LampColor } from '@/lib/researchFreshness'

export type DossierFaceId =
  | 'trend'
  | 'volatility'
  | 'positioning'
  | 'events'
  | 'forecast'
  | 'validation'

export interface DossierFace {
  id: DossierFaceId
  title: string
  /** The question the face answers — blueprint §3.2. */
  question: string
  /** The registry lenses that answer it; empty when none does yet. */
  lenses: readonly ExhibitLens[]
  /** Where the face is read in full. */
  openTo: string
}

export const DOSSIER_FACES: readonly DossierFace[] = [
  {
    id: 'trend',
    title: 'Trend & structure',
    question: 'Where is the price in its cycle — stage, path, momentum?',
    lenses: ['sepa', 'momentum'],
    openTo: '/research/explorer',
  },
  {
    id: 'volatility',
    title: 'Volatility',
    question: 'Is its volatility priced rich or cheap — rank, VRP, skew, term, the pin?',
    lenses: ['iv_rank', 'iv_percentile', 'vrp', 'skew', 'term_slope', 'opex_pin'],
    openTo: ANALYZE_HUB.volRegime,
  },
  {
    id: 'positioning',
    title: 'Positioning',
    question: 'Who is on the other side — dealer gamma, order flow?',
    lenses: ['gex_regime', 'order_sentiment'],
    openTo: ANALYZE_HUB.dealerLevels,
  },
  {
    id: 'events',
    title: 'Events',
    question: 'What is on the calendar — earnings, macro?',
    lenses: [],
    openTo: '/docs/research-calibration',
  },
  {
    id: 'forecast',
    title: 'Forecast',
    question: 'What does the model expect — terrain, the forecast path?',
    lenses: ['terrain_regime', 'forecast_path'],
    openTo: ANALYZE_HUB.scenario,
  },
  {
    id: 'validation',
    title: 'Validation',
    question: 'What has each signal been worth on this symbol before?',
    lenses: [],
    openTo: '/research/signal-decay',
  },
]

/** Every lens the dossier fetches — each face's lenses, once. */
export const DOSSIER_LENSES: readonly ExhibitLens[] = [
  ...new Set(DOSSIER_FACES.flatMap((f) => f.lenses)),
]

export interface DossierRow extends RegimeLensItem {
  /** The lens's track record on this symbol, in words — or null before any trigger settled. */
  record: string | null
  /** The same record with its pipeline state, for the hover — never the only home of a fact. */
  recordDetail: string | null
}

export interface DossierFaceView {
  face: DossierFace
  rows: DossierRow[]
  /** The face in one line: its decisive lens, else its first read lens, else why it is empty. */
  headline: string
  tone: AnalyzeVerdictTone
  lamp: LampColor
  /** Lenses with a reading over lenses the face has; null when the face has no lens at all. */
  coverage: { read: number; of: number } | null
  /**
   * Validation only: which lenses have settled on *this* symbol and which are
   * reading a pooled record, by name.
   *
   * The face used to re-list every settled lens as a full row — label, verdict
   * and record line — but FaceCard already renders `record` on every face, so
   * each of those lines was its second appearance on the same screen. What this
   * face alone knows is the split, and a split is a list of names rather than
   * eight repeated readings.
   */
  recordScopes: { scoped: string[]; pooled: string[] } | null
  href: string
}

export const NOT_MEASURED = 'Not measured — no lens in the registry covers this face yet'

type SpecOf = (canonical: string) => { label: string; page_route: string } | undefined

function ownExhibits(face: DossierFace, exhibits: readonly ExhibitPayload[]): ExhibitPayload[] {
  if (face.id === 'validation') return exhibits.filter((ex) => (ex.track_record?.n ?? 0) > 0)
  return face.lenses.flatMap((lens) => {
    const ex = exhibits.find((e) => canonicalLens(e.lens_id ?? e.lens) === lens)
    return ex ? [ex] : []
  })
}

export function faceView(
  face: DossierFace,
  exhibits: readonly ExhibitPayload[],
  symbol: string,
  specOf: SpecOf
): DossierFaceView {
  const own = ownExhibits(face, exhibits)
  const items = regimeItems(own, symbol, specOf)
  const rows: DossierRow[] = items.map((it, i) => ({
    ...it,
    // The validation face is the record itself; the meaning line would repeat the face above.
    means: face.id === 'validation' ? null : it.means,
    record: trackRecordLine(own[i].track_record, it.band),
    recordDetail: trackRecordDetail(own[i].track_record, it.band),
  }))
  const href = withSymbolParam(face.openTo, symbol)
  if (face.id === 'validation') {
    // A record pooled over all symbols is a record, not this symbol's — say which is which.
    const scoped = own.filter((ex) => ex.track_record?.symbol_scoped).length
    const pooled = own.length - scoped
    const headline =
      own.length === 0
        ? `No settled track record on ${symbol} yet`
        : `${scoped} ${scoped === 1 ? 'lens has' : 'lenses have'} a settled record on ${symbol}` +
          (pooled > 0 ? `; ${pooled} ${pooled === 1 ? 'reads' : 'read'} all symbols` : '')
    return {
      face,
      rows: [],
      headline,
      tone: 'neutral',
      lamp: scoped > 0 ? 'green' : 'yellow',
      coverage: null,
      recordScopes: {
        scoped: items.filter((_, i) => own[i].track_record?.symbol_scoped).map((it) => it.label),
        pooled: items.filter((_, i) => !own[i].track_record?.symbol_scoped).map((it) => it.label),
      },
      href,
    }
  }
  if (face.lenses.length === 0) {
    return {
      face,
      rows,
      headline: NOT_MEASURED,
      tone: 'neutral',
      lamp: 'red',
      recordScopes: null,
      coverage: null,
      href,
    }
  }
  const read = rows.filter((r) => r.band != null)
  const pick = read.find((r) => r.band === 'hot' || r.band === 'cold') ?? read[0]
  const allFresh = rows.length === face.lenses.length && rows.every((r) => r.lamp === 'green')
  return {
    face,
    rows,
    headline: pick ? `${pick.label} · ${pick.verdict}` : 'No reading yet',
    tone: pick?.tone ?? 'neutral',
    lamp:
      read.length === 0
        ? 'red'
        : allFresh && read.length === face.lenses.length
          ? 'green'
          : 'yellow',
    coverage: { read: read.length, of: face.lenses.length },
    recordScopes: null,
    href,
  }
}
