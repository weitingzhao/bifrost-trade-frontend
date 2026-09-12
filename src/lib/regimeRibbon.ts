/**
 * The regime row's items — pure, so the row is testable without a page.
 *
 * One item per hub lens from the composite exhibits: the band decides the
 * tone, the lab's own words (`labelForBand`) are the text, the exhibit's
 * `means` sentence is the detail, freshness is the lamp. Labels and routes
 * come from the lens registry, with a fallback table until it has loaded.
 */
import type { LensBand } from '@/api/research/lenses'
import type { AnalyzeVerdictTone } from '@/components/research/AnalyzeVerdictStrip'
import { withSymbolParam } from '@/lib/symbolLink'
import { labelForBand, toneForBand } from '@/lib/lensVerdict'
import type { LampColor } from '@/lib/researchFreshness'

/** What the composite endpoint returns per lens, as much of it as the row reads. */
export interface RegimeExhibit {
  lens: string
  freshness: string
  as_of?: string | null
  verdict?: { band?: string | null; means?: string | null } | null
  caveats?: string[]
}

export interface RegimeLensItem {
  id: string
  label: string
  band: LensBand | null
  /** The lab's words for the band — the same text its verdict strip shows. */
  verdict: string
  means: string | null
  asOf: string | null
  href: string
  lamp: LampColor
  tone: AnalyzeVerdictTone
}

/** The row's lenses — one per hub view, in reading order. `terrain` is the registry's terrain_regime. */
export const RIBBON_LENSES = [
  'iv_rank',
  'vrp',
  'skew',
  'gex_regime',
  'opex_pin',
  'terrain',
] as const

/** The registry id behind a composite lens key. */
export function canonicalLens(lensId: string): string {
  return lensId === 'terrain' ? 'terrain_regime' : lensId
}

// Fallback names and routes when the registry has not loaded; the registry wins once it has.
const LENS_ROUTES: Record<string, string> = {
  vrp: '/research/vol-regime?view=vrp',
  iv_rank: '/research/vol-regime?view=iv-rank',
  skew: '/research/vol-regime?view=skew',
  gex_regime: '/research/dealer-levels?view=gex',
  opex_pin: '/research/dealer-levels?view=opex',
  terrain: '/research/scenario?view=model',
  terrain_regime: '/research/scenario?view=model',
  order_sentiment: '/research/flow',
  iv_percentile: '/research/vol-regime?view=iv-rank',
  term_slope: '/research/vol-regime?view=skew',
  momentum: '/research/momentum-radar',
  sepa: '/research/explorer',
  forecast_path: '/research/scenario?view=sessions',
}

const LENS_LABELS: Record<string, string> = {
  vrp: 'VRP',
  iv_rank: 'IV Rank',
  skew: 'Skew',
  gex_regime: 'Gamma',
  opex_pin: 'OpEx pin',
  terrain: 'Terrain',
  terrain_regime: 'Terrain',
  order_sentiment: 'Sentiment',
  iv_percentile: 'IV Percentile',
  term_slope: 'Term slope',
  momentum: 'Momentum',
  sepa: 'SEPA',
  forecast_path: 'Forecast path',
}

export function lampFromFreshness(freshness: string): LampColor {
  if (freshness === 'fresh') return 'green'
  if (freshness === 'stale') return 'yellow'
  return 'red'
}

/** Every lens with no reading and an amber lamp — the row before exhibits arrive, or when none exist. */
export function placeholderExhibits(): RegimeExhibit[] {
  return RIBBON_LENSES.map((lens) => ({ lens, freshness: 'stale' }))
}

/** The row's items from the composite exhibits and the registry, when it has loaded. */
export function regimeItems(
  exhibits: RegimeExhibit[],
  symbol: string,
  specOf: (canonical: string) => { label: string; page_route: string } | undefined
): RegimeLensItem[] {
  return exhibits.map((ex) => {
    const canonical = canonicalLens(ex.lens)
    const spec = specOf(canonical)
    const band = (ex.verdict?.band ?? null) as LensBand | null
    return {
      id: ex.lens,
      label: spec?.label ?? LENS_LABELS[ex.lens] ?? ex.lens,
      band,
      verdict: labelForBand(canonical, band, 'no reading'),
      means: ex.verdict?.means ?? ex.caveats?.[0] ?? null,
      asOf: ex.as_of ?? null,
      href: withSymbolParam(spec?.page_route ?? LENS_ROUTES[ex.lens] ?? '/research', symbol),
      lamp: lampFromFreshness(ex.freshness),
      tone: toneForBand(canonical, band),
    }
  })
}
