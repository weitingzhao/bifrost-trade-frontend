/**
 * Lens coverage — `GET /research/screen/coverage`.
 *
 * How much of the option universe each of the blueprint's faces actually
 * covers. The number moves every night as the collector widens; it used to be
 * measured by hand and written into the calibration document.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'
import {
  LensCoverageSchema,
} from '@/lib/schemas/research'

export type CoverageFace = 'trend' | 'volatility' | 'positioning' | 'forecast' | 'validation'

export interface CoverageLens {
  lens: string
  label: string
  face: CoverageFace | string
  /** How many symbols had a reading — null when the lens cannot be screened. */
  read: number | null
  of: number
  /** Why this lens cannot be screened at all, when it cannot. */
  unscreenable?: string | null
}

export interface LensCoverage {
  universe: number
  tiers: string[]
  lenses: CoverageLens[]
  /** Symbols with a reading on every screenable lens. */
  every_face: number
  /** Symbols with no option-side reading at all — the stock-only names. */
  no_option_face: number
  screenable_lenses: number
  unscreenable: Record<string, string>
}

const validate = withValidation<LensCoverage>(LensCoverageSchema, 'research/screen/coverage')

export async function fetchLensCoverage(tiers?: readonly string[]): Promise<LensCoverage> {
  const q = new URLSearchParams()
  if (tiers && tiers.length > 0) q.set('tiers', tiers.join(','))
  const suffix = q.toString() ? `?${q}` : ''
  return validate(unwrap(await fetch(researchEngineUrl(`/research/screen/coverage${suffix}`))))
}
