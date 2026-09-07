/**
 * Daily Brief — the server verdict mapped onto the page, with every link
 * carrying the research context (symbol + date) into the hub view it opens.
 * research-loop-automation C3: no client-side rules; one source.
 */
import type { DailyBriefEventsCard, DailyBriefLensCard, DailyBriefSynth, SynthVerdictSegment } from '@/api/researchEngine'
import type { LampColor } from '@/lib/researchFreshness'

export interface VerdictSegment {
  label: string
  text: string
  lamp: LampColor
  to?: string
  meta?: string | null
}

export interface DailyVerdict {
  narrative: VerdictSegment
  risk: VerdictSegment
  opportunity: VerdictSegment
  actionHint: { label: string; to: string }
  sourcesUsed: string[]
}

export const CARD_TITLES: Record<string, string> = {
  terrain: 'Terrain',
  forecast: 'Forecast',
  gex: 'GEX',
  opex: 'OpEx',
  iv: 'IV Rank',
  vrp: 'VRP',
  skew: 'Skew',
  term_slope: 'Term',
  sepa: 'SEPA',
  momentum: 'Momentum',
  events: 'Events',
  sentiment: 'Sentiment',
}

/** Hub views already carry ?view=, so the context joins with & there. */
export function contextJoiner(symbol: string, dateInput?: string | null): (path: string) => string {
  const q = new URLSearchParams()
  if (symbol) q.set('symbol', symbol)
  if (dateInput) q.set('date', dateInput)
  const query = q.toString()
  return (path: string) => (query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path)
}

function segment(seg: SynthVerdictSegment, withContext: (p: string) => string): VerdictSegment {
  return { ...seg, to: seg.to ? withContext(seg.to) : undefined }
}

export function mapDailyVerdict(synth: DailyBriefSynth, withContext: (p: string) => string): DailyVerdict {
  const sourcesUsed = Object.entries(synth.cards)
    .filter(([, card]) => (card as DailyBriefLensCard | DailyBriefEventsCard).present)
    .map(([key]) => CARD_TITLES[key] ?? key)
  return {
    narrative: segment(synth.verdict.narrative, withContext),
    risk: segment(synth.verdict.risk, withContext),
    opportunity: segment(synth.verdict.opportunity, withContext),
    actionHint: { ...synth.verdict.action_hint, to: withContext(synth.verdict.action_hint.to) },
    sourcesUsed,
  }
}

/** The source-lamp row: one lamp per card, in reading order. */
export const LAMP_ORDER: readonly string[] = [
  'terrain',
  'forecast',
  'gex',
  'opex',
  'iv',
  'vrp',
  'skew',
  'term_slope',
  'sepa',
  'momentum',
  'events',
  'sentiment',
]

export function sourceLamps(synth: DailyBriefSynth): { label: string; lamp: LampColor }[] {
  return LAMP_ORDER.filter((key) => key in synth.freshness).map((key) => ({
    label: key === 'sentiment' ? 'Sentiment*' : (CARD_TITLES[key] ?? key),
    lamp: synth.freshness[key],
  }))
}

/** "as of 2026-09-04" — the exhibit's own date; the lamp already says how it sits against the selected date. */
export function asOfLine(card: Pick<DailyBriefLensCard, 'as_of'>): string | null {
  return card.as_of ? `as of ${card.as_of}` : null
}

// Notes every exhibit of a kind carries; they say nothing about this reading.
const GENERIC_CAVEATS = [
  'No settled track record for this lens yet',
  'Similar-regime summary unavailable',
  'Read as a track record; the per-regime split is /research/backtest/regime-stats',
  'No options trades tape on the current data plan — the score is an OI proxy and carries no verdict',
]

/** The first caveat worth a line on the card — the generic evidence notes are not. */
export function cardCaveat(card: Pick<DailyBriefLensCard, 'present' | 'caveats'>): string | null {
  if (!card.present) return null
  return card.caveats.find((c) => !GENERIC_CAVEATS.includes(c)) ?? null
}
